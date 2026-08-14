<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ConsignedUser;
use App\Models\EmployeeMasterlist;
use Inertia\Inertia;

class ConsignedUserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search', '');
        
        $users = ConsignedUser::select([
            'id',
            'department',
            'prodline',
            'date_created',
            'date_updated'
        ])
        ->when($search, function ($query, $search) {
            return $query->where('department', 'like', '%' . $search . '%')
                        ->orWhere('prodline', 'like', '%' . $search . '%')
                        ->orWhere('username', 'like', '%' . $search . '%');
        })
        ->orderBy('date_created', 'desc')
        ->paginate($perPage)
        ->withQueryString();

        return Inertia::render('ConsignedUser', [
            'users' => $users
        ]);
    }

    public function getOptions()
    {
        // Get unique, non-empty departments from EmployeeMasterlist
        $departments = EmployeeMasterlist::whereNotNull('DEPARTMENT')
            ->where('DEPARTMENT', '!=', '')
            ->distinct()
            ->pluck('DEPARTMENT')
            ->sort()
            ->values()
            ->toArray();

        // Get unique, non-empty product lines from EmployeeMasterlist
        $prodlines = EmployeeMasterlist::whereNotNull('PRODLINE')
            ->where('PRODLINE', '!=', '')
            ->distinct()
            ->pluck('PRODLINE')
            ->sort()
            ->values()
            ->toArray();

        return response()->json([
            'departments' => $departments,
            'prodlines' => $prodlines
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'department' => 'required|string|max:255',
            'prodline' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:consigned_user,username',
            'password' => 'required|min:6',
        ]);

        ConsignedUser::create([
            'department' => $request->department,
            'prodline' => $request->prodline,
            'username' => $request->username,
            'password' => bcrypt($request->password),
        ]);

        return redirect()->back()->with('success', 'Consigned user added successfully');
    }

    public function edit($id)
    {
        try {
            $user = ConsignedUser::findOrFail($id);
            
            return response()->json([
                'id' => $user->id,
                'department' => $user->department,
                'prodline' => $user->prodline,
                'username' => $user->username,
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
        $user = ConsignedUser::findOrFail($id);

        $request->validate([
            'department' => 'required|string|max:255',
            'prodline' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:consigned_user,username,' . $id,
            'password' => 'nullable|min:6',
        ]);

        $updateData = [
            'department' => $request->department,
            'prodline' => $request->prodline,
            'username' => $request->username,
        ];

        // Only update password if provided
        if ($request->filled('password')) {
            $updateData['password'] = bcrypt($request->password);
        }

        $user->update($updateData);

        return redirect()->back()->with('success', 'Consigned user updated successfully');
    }

    public function destroy($id)
    {
        try {
            $user = ConsignedUser::findOrFail($id);
            $user->delete();

            return redirect()->back()->with('success', 'Consigned user deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to delete consigned user');
        }
    }
}