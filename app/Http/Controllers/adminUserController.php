<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\StoreUser;
use App\Models\EmployeeMasterlist;
use Inertia\Inertia;

class adminUserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search', '');
        
        $users = StoreUser::select([
            'id',
            'log_user',
            'log_category',
            'date_created'
        ])
        ->when($search, function ($query, $search) {
            return $query->where('log_user', 'like', '%' . $search . '%');
        })
        ->orderBy('date_created', 'desc')
        ->paginate($perPage)
        ->withQueryString();

        return Inertia::render('adminUser', [
            'users' => $users
        ]);
    }

    public function searchEmployees(Request $request)
    {
        $search = $request->input('search', '');
        
        try {
            $employees = EmployeeMasterlist::select('EMPID', 'EMPLOYID', 'EMPNAME')
                ->where(function($q) use ($search) {
                    $q->where('EMPLOYID', 'like', '%' . $search . '%')
                    ->orWhere('EMPNAME', 'like', '%' . $search . '%');
                })
                ->limit(10)
                ->get();

            return response()->json([
                'employees' => $employees,
                'success' => true
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'employees' => [],
                'success' => false,
                'message' => 'Error searching employees'
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required',
            'employee_name' => 'required',
            'user_type' => 'required',
            'username' => 'required|unique:store_user,log_user',
            'password' => 'required|min:6',
        ]);

        StoreUser::create([
            'log_user' => $request->username,
            'log_category' => $request->user_type,
            'log_password' => bcrypt($request->password),
            'date_created' => now(),
        ]);

        return redirect()->back()->with('success', 'User added successfully');
    }

    public function edit($id)
    {
        try {
            $user = StoreUser::findOrFail($id);
            
            return response()->json([
                'id' => $user->id,
                'employee_id' => $user->id, // or whatever field stores employee_id
                'log_user' => $user->log_user,
                'log_category' => $user->log_category,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $user = StoreUser::findOrFail($id);

        $request->validate([
            'employee_id' => 'required',
            'employee_name' => 'required',
            'user_type' => 'required',
            'username' => 'required|unique:store_user,log_user,' . $id,
            'password' => 'nullable|min:6',
        ]);

        $updateData = [
            'log_user' => $request->username,
            'log_category' => $request->user_type,
            'date_updated' => now(),
        ];

        // Only update password if provided
        if ($request->filled('password')) {
            $updateData['log_password'] = bcrypt($request->password);
        }

        $user->update($updateData);

        return redirect()->back()->with('success', 'User updated successfully');
    }

    public function destroy($id)
    {
        try {
            $user = StoreUser::findOrFail($id);
            $user->delete();

            return redirect()->back()->with('success', 'User deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete user');
        }
    }
}