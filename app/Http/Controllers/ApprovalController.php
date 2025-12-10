<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\ConsumableCart;
use App\Models\SuppliesCart;
use App\Models\Consumable;
use App\Models\Supplies;
use App\Models\SuppliesDetails;
use App\Models\EmployeeMasterlist;

class ApprovalController extends Controller
{
    public function index(Request $request)
    {
        try {
            // Fetch all employee names from masterlist database
            $employees = EmployeeMasterlist::select('EMPLOYID', 'EMPNAME')
                ->get()
                ->keyBy('EMPLOYID')
                ->toArray();
                
        } catch (\Exception $e) {
            // Log error and continue without employee names
            \Log::error('Failed to fetch employee masterlist: ' . $e->getMessage());
            $employees = [];
        }

        // Get distinct consumable orders grouped by mrs_no
        $consumables = ConsumableCart::select([
                'mrs_no',
                DB::raw('MAX(order_date) as order_date'),
                DB::raw('MAX(employee_no) as employee_no'),
                DB::raw('MAX(department) as department'),
                DB::raw('MAX(approval_status) as approval_status'),
                DB::raw('COUNT(*) as item_count')
            ])
            ->whereNotNull('mrs_no')
            ->where('mrs_no', '!=', '')
            ->groupBy('mrs_no')
            ->orderBy(DB::raw('MAX(order_date)'), 'desc')
            ->get()
            ->map(function ($item) use ($employees) {
                $employeeNo = $item->employee_no;
                $employeeName = isset($employees[$employeeNo]) 
                    ? $employees[$employeeNo]['EMPNAME'] 
                    : null;

                return [
                    'mrsNo' => $item->mrs_no,
                    'dateOrder' => Carbon::parse($item->order_date)->format('Y-m-d H:i:s'),
                    'employeeNo' => $employeeNo,
                    'employeeName' => $employeeName,
                    'department' => $item->department,
                    'status' => $item->approval_status ?? 'pending',
                    'itemCount' => $item->item_count,
                ];
            });

        // Get distinct supplies orders grouped by mrs_no
        $supplies = SuppliesCart::select([
                'mrs_no',
                DB::raw('MAX(order_date) as order_date'),
                DB::raw('MAX(employee_no) as employee_no'),
                DB::raw('MAX(department) as department'),
                DB::raw('MAX(approval_status) as approval_status'),
                DB::raw('COUNT(*) as item_count')
            ])
            ->whereNotNull('mrs_no')
            ->where('mrs_no', '!=', '')
            ->groupBy('mrs_no')
            ->orderBy(DB::raw('MAX(order_date)'), 'desc')
            ->get()
            ->map(function ($item) use ($employees) {
                $employeeNo = $item->employee_no;
                $employeeName = isset($employees[$employeeNo]) 
                    ? $employees[$employeeNo]['EMPNAME'] 
                    : null;

                return [
                    'mrsNo' => $item->mrs_no,
                    'dateOrder' => Carbon::parse($item->order_date)->format('Y-m-d H:i:s'),
                    'employeeNo' => $employeeNo,
                    'employeeName' => $employeeName,
                    'department' => $item->department,
                    'status' => $item->approval_status ?? 'pending',
                    'itemCount' => $item->item_count,
                ];
            });

        return Inertia::render('Approval', [
            'consumables' => $consumables,
            'supplies' => $supplies,
            'appPrefix' => '/' . env('APP_NAME', 'ims'),
        ]);
    }

    /**
     * Get order details including items for a specific MRS
     */
    public function show($type, $mrsNo)
    {
        try {
            $employees = EmployeeMasterlist::select('EMPLOYID', 'EMPNAME')
                ->get()
                ->keyBy('EMPLOYID')
                ->toArray();
                
        } catch (\Exception $e) {
            \Log::error('Failed to fetch employee masterlist: ' . $e->getMessage());
            $employees = [];
        }

        // Determine which model to use based on type
        $model = $type === 'consumable' ? ConsumableCart::class : SuppliesCart::class;
        
        // Get all cart items for this MRS number
        $cartItems = $model::where('mrs_no', $mrsNo)
            ->orderBy('created_at', 'asc')
            ->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['error' => 'No items found for this MRS'], 404);
        }

        // Get order header information from the first item
        $firstItem = $cartItems->first();
        
        // Get all items for this MRS
$items = $cartItems->map(function ($item) use ($type) {
    // Common fields for both types
    $itemData = [
        'itemCode' => $item->Itemcode ?? $item->stock_no ?? $item->itemCode ?? 'N/A',
        'mat_description' => $item->mat_description ?? $item->description ?? 'N/A',
        'quantity' => $item->request_qty ?? $item->quantity ?? $item->qty ?? 0,
        'unit' => $item->uom ?? $item->unit ?? $item->unit_of_measure ?? 'pcs',
        'unitPrice' => $item->price ?? 0,
        'totalPrice' => (($item->request_qty ?? $item->quantity ?? 0) * ($item->price ?? 0)),
        // Additional fields
        'brand' => $item->brand ?? null,
        'category' => $item->category ?? null,
        'remarks' => $item->remarks ?? null,
        // Always include detailed description for both types
        'detailedDescription' => $item->Long_description ?? 
                               $item->detailed_description ?? 
                               $item->item_description ?? 
                               $item->mat_description ?? 'N/A', // Fallback to main description
    ];
    
    return $itemData;
})->toArray();

        $employeeNo = $firstItem->employee_no;
        $employeeName = isset($employees[$employeeNo]) 
            ? $employees[$employeeNo]['EMPNAME'] 
            : null;

        $orderData = [
            'mrsNo' => $firstItem->mrs_no,
            'dateOrder' => Carbon::parse($firstItem->order_date)->format('Y-m-d H:i:s'),
            'employeeNo' => $employeeNo,
            'employeeName' => $employeeName,
            'department' => $firstItem->department,
            'status' => $firstItem->approval_status ?? 'pending',
            'items' => $items,
            'remarks' => $firstItem->remarks ?? null,
            'totalItems' => $cartItems->count(),
            'totalQuantity' => $cartItems->sum('request_qty') ?? $cartItems->sum('quantity'),
            'grandTotal' => $cartItems->sum(function ($item) {
                return (($item->request_qty ?? $item->quantity ?? 0) * ($item->price ?? 0));
            }),
            'type' => $type, // Add type for frontend reference
        ];

        return response()->json($orderData);
    }

    /**
     * Approve an MRS order
     */
    public function approve($type, $mrsNo, Request $request)
    {
        try {
            // Determine which model to use based on type
            $model = $type === 'consumable' ? ConsumableCart::class : SuppliesCart::class;
            
            // Get all cart items for this MRS number
            $cartItems = $model::where('mrs_no', $mrsNo)->get();
            
            if ($cartItems->isEmpty()) {
                return back()->with('error', 'No items found for this MRS');
            }

            // Check if any item is already approved/rejected
            foreach ($cartItems as $item) {
                if ($item->approval_status !== 'pending') {
                    return back()->with('error', 'This order has already been processed');
                }
            }

            // Update all items to approved status
            $model::where('mrs_no', $mrsNo)
                ->update([
                    'approval_status' => 'approved',
                    'updated_at' => now()
                ]);

            // Log the approval
            \Log::info("MRS {$mrsNo} approved for {$type}");

            return back()->with('success', 'Order approved successfully');

        } catch (\Exception $e) {
            \Log::error('Error approving order: ' . $e->getMessage());
            return back()->with('error', 'Failed to approve order');
        }
    }

    /**
     * Reject an MRS order and return quantities to inventory
     */
    public function reject($type, $mrsNo, Request $request)
    {
        try {
            DB::connection('newstore')->beginTransaction();

            // Determine which model to use based on type
            $model = $type === 'consumable' ? ConsumableCart::class : SuppliesCart::class;
            
            // Get all cart items for this MRS number
            $cartItems = $model::where('mrs_no', $mrsNo)->get();
            
            if ($cartItems->isEmpty()) {
                DB::connection('newstore')->rollBack();
                return back()->with('error', 'No items found for this MRS');
            }

            // Check if any item is already approved/rejected
            foreach ($cartItems as $item) {
                if ($item->approval_status !== 'pending') {
                    DB::connection('newstore')->rollBack();
                    return back()->with('error', 'This order has already been processed');
                }
            }

            // Return quantities to inventory based on type
            if ($type === 'consumable') {
                foreach ($cartItems as $cartItem) {
                    $consumable = Consumable::where('Itemcode', $cartItem->Itemcode)->first();
                    
                    if ($consumable) {
                        // Add back the requested quantity
                        $consumable->qty = $consumable->qty + $cartItem->request_qty;
                        $consumable->save();
                        
                        \Log::info("Returned {$cartItem->request_qty} to consumable {$cartItem->Itemcode}. New quantity: {$consumable->qty}");
                    } else {
                        \Log::warning("Consumable {$cartItem->Itemcode} not found when returning quantity");
                    }
                }
            } else { // supplies
                foreach ($cartItems as $cartItem) {
                    // Find the supply and its first detail
                    $supply = Supplies::where('itemcode', $cartItem->Itemcode)->first();
                    
                    if ($supply) {
                        $firstDetail = $supply->details()->first();
                        
                        if ($firstDetail) {
                            // Add back the requested quantity
                            $firstDetail->qty = $firstDetail->qty + $cartItem->request_qty;
                            $firstDetail->save();
                            
                            \Log::info("Returned {$cartItem->request_qty} to supply detail {$firstDetail->id} (itemcode: {$cartItem->Itemcode}). New quantity: {$firstDetail->qty}");
                        } else {
                            \Log::warning("Supply detail not found for itemcode {$cartItem->Itemcode} when returning quantity");
                        }
                    } else {
                        \Log::warning("Supply {$cartItem->Itemcode} not found when returning quantity");
                    }
                }
            }

            // Update all items to rejected status
            $model::where('mrs_no', $mrsNo)
                ->update([
                    'approval_status' => 'rejected',
                    'updated_at' => now()
                ]);

            DB::connection('newstore')->commit();

            // Log the rejection
            \Log::info("MRS {$mrsNo} rejected for {$type}. Quantities returned to inventory.");

            return back()->with('success', 'Order rejected successfully and quantities returned to inventory');

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            \Log::error('Error rejecting order: ' . $e->getMessage());
            return back()->with('error', 'Failed to reject order: ' . $e->getMessage());
        }
    }
}