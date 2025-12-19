<?php

namespace App\Http\Controllers;

use App\Models\Consumable;
use App\Models\ConsumableCart;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OrderMaterialController extends Controller
{
public function index()
{
    // Fetch all consumables with their details
    $consumables = Consumable::with(['details' => function($query) {
        // Only get details with quantity > 0
        $query->where('quantity', '>', 0);
    }])
    ->get()
    ->map(function($consumable) {
        return [
            'consumable_id' => $consumable->consumable_id,
            'material_description' => $consumable->material_description,
            'category' => $consumable->category,
            'uom' => $consumable->uom,
            'details' => $consumable->details->map(function($detail) {
                return [
                    'id' => $detail->id,
                    'item_code' => $detail->item_code,
                    'detailed_description' => $detail->detailed_description,
                    'serial' => $detail->serial,
                    'bin_location' => $detail->bin_location,
                    'quantity' => $detail->quantity,
                    'max' => $detail->max,
                    'min' => $detail->min,
                ];
            })
        ];
    });

    // Filter out consumables with no available details
    $consumables = $consumables->filter(function($consumable) {
        return $consumable['details']->isNotEmpty();
    })->values();

    // Fetch all supplies with their details
    $supplies = \App\Models\Supply::with(['details' => function($query) {
        // Only get active details with quantity > 0
        $query->where('is_deleted', false)
              ->where('qty', '>', 0);
    }])
    ->where('is_deleted', false)
    ->get()
    ->map(function($supply) {
        return [
            'supplies_no' => $supply->supplies_no,
            'material_description' => $supply->material_description,
            'uom' => $supply->uom,
            'details' => $supply->details->map(function($detail) {
                return [
                    'id' => $detail->id,
                    'item_code' => $detail->item_code,
                    'detailed_description' => $detail->detailed_description,
                    'qty' => $detail->qty,
                    'min' => $detail->min,
                    'max' => $detail->max,
                    'price' => $detail->price,
                ];
            })
        ];
    });

    // Filter out supplies with no available details
    $supplies = $supplies->filter(function($supply) {
        return $supply['details']->isNotEmpty();
    })->values();
    
    $consigned = \App\Models\Consigned::with(['details' => function($query) {
        // Only get details with quantity > 0
        $query->where('qty', '>', 0);
    }])
    ->get()
    ->map(function($item) {
        return [
            'consigned_no' => $item->consigned_no,
            'mat_description' => $item->mat_description,
            'category' => $item->category,
            'selected_itemcode' => $item->selected_itemcode, // Add this
            'selected_supplier' => $item->selected_supplier, // Add this
            'details' => $item->details->map(function($detail) {
                return [
                    'id' => $detail->id,
                    'item_code' => $detail->item_code,
                    'supplier' => $detail->supplier,
                    'uom' => $detail->uom,
                    'qty' => $detail->qty,
                    'qty_per_box' => $detail->qty_per_box,
                    'minimum' => $detail->minimum,
                    'maximum' => $detail->maximum,
                    'price' => $detail->price,
                    'bin_location' => $detail->bin_location,
                    'expiration' => $detail->expiration,
                ];
            })
        ];
    });

    // Filter out consigned items with no available details
    $consigned = $consigned->filter(function($item) {
        return $item['details']->isNotEmpty();
    })->values();

    // Get employee data from session - MOVED HERE, BEFORE THE RETURN STATEMENT
    $empData = session('emp_data');

    return Inertia::render('OrderMaterial', [
        'consumables' => $consumables,
        'supplies' => $supplies,
        'consigned' => $consigned,
        'emp_data' => $empData, // Now this will work
    ]);
}


public function submitConsumableOrder(Request $request)
{
    // Validate the request
    $validated = $request->validate([
        'approver' => 'required|string',
        'items' => 'required|array|min:1',
        'items.*.id' => 'required|integer',
        'items.*.itemCode' => 'required|string',
        'items.*.description' => 'required|string',
        'items.*.detailedDescription' => 'required|string',
        'items.*.serial' => 'nullable|string',
        'items.*.quantity' => 'required|numeric',
        'items.*.uom' => 'required|string',
        'items.*.requestQuantity' => 'required|numeric|min:1',
    ]);

    try {
        DB::beginTransaction();

        // Generate MRS number (Material Requisition Slip number)
        $mrsNo = $this->generateMRSNumber();
        
        // Get employee data from session
        $empData = session('emp_data');
        
        // Create cart entries for each item
        foreach ($validated['items'] as $item) {
            // Fetch bin_location from ConsumableDetail using the id
            $consumableDetail = \App\Models\ConsumableDetail::find($item['id']);
            
            ConsumableCart::create([
                'mrs_no' => $mrsNo,
                'order_date' => now(),
                'emp_id' => $empData['emp_id'] ?? null,
                'emp_name' => $empData['emp_name'] ?? null,
                'approver' => $validated['approver'],
                'department' => $empData['emp_dept'] ?? null,
                'prodline' => $empData['emp_prodline'] ?? null,
                'mrs_status' => 'pending',
                'approver_status' => 'pending',
                'issued_by' => null,
                'itemCode' => $item['itemCode'],
                'material_description' => $item['description'],
                'detailed_description' => $item['detailedDescription'],
                'serial' => $item['serial'] ?? null,
                'bin_location' => $consumableDetail ? $consumableDetail->bin_location : null,
                'quantity' => $item['quantity'],
                'uom' => $item['uom'],
                'request_quantity' => $item['requestQuantity'],
                'issued_quantity' => 0,
            ]);
        }

        DB::commit();

        return redirect()->back()->with('success', "Order submitted successfully! MRS No: {$mrsNo}");
        
    } catch (\Exception $e) {
        DB::rollBack();
        return redirect()->back()->with('error', 'Failed to submit order: ' . $e->getMessage());
    }
}

public function submitSuppliesOrder(Request $request)
{
    // Validate the request
    $validated = $request->validate([
        'approver' => 'required|string',
        'items' => 'required|array|min:1',
        'items.*.id' => 'required|integer',
        'items.*.itemCode' => 'required|string',
        'items.*.description' => 'required|string',
        'items.*.detailedDescription' => 'required|string',
        'items.*.quantity' => 'required|numeric',
        'items.*.uom' => 'required|string',
        'items.*.requestQuantity' => 'required|numeric|min:1',
    ]);

    try {
        DB::beginTransaction();

        // Generate MRS number (Material Requisition Slip number)
        $mrsNo = $this->generateMRSNumber('supplies');
        
        // Get employee data from session
        $empData = session('emp_data');
        
        // Create cart entries for each item
        foreach ($validated['items'] as $item) {
            \App\Models\SuppliesCart::create([
                'mrs_no' => $mrsNo,
                'order_date' => now(),
                'emp_id' => $empData['emp_id'] ?? null,
                'emp_name' => $empData['emp_name'] ?? null,
                'approver' => $validated['approver'],
                'department' => $empData['emp_dept'] ?? null,
                'prodline' => $empData['emp_prodline'] ?? null,
                'mrs_status' => 'pending',
                'approver_status' => 'pending',
                'issued_by' => null,
                'itemCode' => $item['itemCode'],
                'material_description' => $item['description'],
                'detailed_description' => $item['detailedDescription'],
                'quantity' => $item['quantity'],
                'uom' => $item['uom'],
                'request_qty' => $item['requestQuantity'],
                'issued_qty' => 0,
            ]);
        }

        DB::commit();

        return redirect()->back()->with('success', "Supplies order submitted successfully! MRS No: {$mrsNo}");
        
    } catch (\Exception $e) {
        DB::rollBack();
        return redirect()->back()->with('error', 'Failed to submit supplies order: ' . $e->getMessage());
    }
}

public function submitConsignedOrder(Request $request)
{
    // Validate the request - now accepting multiple groups
    $validated = $request->validate([
        'groups' => 'required|array|min:1',
        'groups.*.employeeId' => 'required|string',
        'groups.*.factory' => 'required|string',
        'groups.*.items' => 'required|array|min:1',
        'groups.*.items.*.id' => 'required|integer',
        'groups.*.items.*.itemCode' => 'required|string',
        'groups.*.items.*.description' => 'required|string',
        'groups.*.items.*.supplier' => 'required|string',
        'groups.*.items.*.quantity' => 'required|numeric',
        'groups.*.items.*.uom' => 'required|string',
        'groups.*.items.*.requestQuantity' => 'required|numeric|min:1',
    ]);

    try {
        DB::beginTransaction();

        // Generate ONE MRS number for ALL groups
        $mrsNo = $this->generateMRSNumber('consigned');
        
        // Get employee data from session for station
        $empData = session('emp_data');
        
        // Process each group
        foreach ($validated['groups'] as $group) {
            // Create cart entries for each item in this group
            foreach ($group['items'] as $item) {
                // Fetch additional details from ConsignedDetail using the id
                $consignedDetail = \App\Models\ConsignedDetail::find($item['id']);
                
                \App\Models\ConsignedCart::create([
                    'mrs_no' => $mrsNo, // SAME MRS number for all groups
                    'order_date' => now(),
                    'employee_no' => $group['employeeId'],
                    'factory' => $group['factory'],
                    'station' => $empData['emp_station'] ?? null,
                    'issued_by' => null,
                    'mrs_status' => 'pending',
                    'item_code' => $item['itemCode'],
                    'material_description' => $item['description'],
                    'supplier' => $item['supplier'],
                    'expiration' => $consignedDetail ? $consignedDetail->expiration : null,
                    'bin_location' => $consignedDetail ? $consignedDetail->bin_location : null,
                    'quantity' => $item['quantity'],
                    'uom' => $item['uom'],
                    'qty_per_box' => $consignedDetail ? $consignedDetail->qty_per_box : null,
                    'request_qty' => $item['requestQuantity'],
                    'issued_qty' => 0,
                ]);
            }
        }

        DB::commit();

        $groupCount = count($validated['groups']);
        return redirect()->back()->with('success', "Consigned order submitted successfully! {$groupCount} group(s) with MRS No: {$mrsNo}");
        
    } catch (\Exception $e) {
        DB::rollBack();
        return redirect()->back()->with('error', 'Failed to submit consigned order: ' . $e->getMessage());
    }
}

/**
 * Generate unique MRS number in different formats based on type
 * - Consumable: MRS24-0001
 * - Supplies: MRSS24-0001
 * - Consigned: MRSC24-0001
 * 
 * @param string $type Type of order: 'consumable', 'supplies', or 'consigned'
 * @return string
 */
private function generateMRSNumber($type = 'consumable')
{
    // Determine prefix based on type
    $prefix = match($type) {
        'supplies' => 'MRSS',
        'consigned' => 'MRSC',
        default => 'MRS',
    };
    
    $year = now()->format('y'); // 2-digit year (e.g., 24 for 2024)
    
    // Get the last MRS number for this year based on type
    $lastMRS = match($type) {
        'supplies' => \App\Models\SuppliesCart::where('mrs_no', 'like', "{$prefix}{$year}-%")
            ->orderBy('mrs_no', 'desc')
            ->first(),
        'consigned' => \App\Models\ConsignedCart::where('mrs_no', 'like', "{$prefix}{$year}-%")
            ->orderBy('mrs_no', 'desc')
            ->first(),
        default => ConsumableCart::where('mrs_no', 'like', "{$prefix}{$year}-%")
            ->orderBy('mrs_no', 'desc')
            ->first(),
    };
    
    if ($lastMRS) {
        // Extract the sequence number and increment
        $lastSequence = (int) substr($lastMRS->mrs_no, -4);
        $newSequence = str_pad($lastSequence + 1, 4, '0', STR_PAD_LEFT);
    } else {
        // First MRS for this year
        $newSequence = '0001';
    }
    
    return "{$prefix}{$year}-{$newSequence}";
}

}