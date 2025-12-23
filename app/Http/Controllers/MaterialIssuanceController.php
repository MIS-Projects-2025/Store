<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\ConsumableCart;
use App\Models\SuppliesCart;
use App\Models\ConsignedCart;
use App\Models\ConsumableDetail;
use App\Models\SupplyDetail;
use App\Models\ConsignedDetail;
use App\Models\Consumable;
use App\Models\Supply;
use App\Models\Consigned;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class MaterialIssuanceController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = session('emp_data.emp_name', null);

        // Approved Consumables
        $consumablesRaw = ConsumableCart::where('approver_status', 'approved')
            ->where(function($query) use ($currentUser) {
                // Show all Pending items
                $query->where('mrs_status', 'Pending')
                    // OR show items issued by current user for other statuses
                    ->orWhere(function($q) use ($currentUser) {
                        $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered'])
                          ->where('issued_by', $currentUser);
                    })
                    // OR show Return items (visible to all)
                    ->orWhere('mrs_status', 'Return');
            })
            ->orderBy('order_date', 'desc')
            ->get([
                'id',
                'mrs_no',
                'order_date',
                'emp_name',
                'mrs_status',
                'itemCode',
                'material_description',
                'detailed_description',
                'serial',
                'quantity',
                'request_quantity',
                'issued_quantity',
                'remarks',
            ]);

        $consumables = $consumablesRaw->groupBy('mrs_no')->map(function ($group) {
            $first = $group->first();
            $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;
            
            return [
                'id' => $first->id,
                'mrs_no' => $first->mrs_no,
                'order_date' => Carbon::parse($first->order_date)->format('Y-m-d'),
                'emp_name' => $first->emp_name,
                'mrs_status' => $displayStatus,
                'items' => $group->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'itemCode' => $item->itemCode,
                        'material_description' => $item->material_description,
                        'detailed_description' => $item->detailed_description,
                        'serial' => $item->serial,
                        'quantity' => $item->quantity,
                        'request_quantity' => $item->request_quantity,
                        'issued_quantity' => $item->issued_quantity,
                        'mrs_status' => $item->mrs_status,
                        'remarks' => $item->remarks,
                    ];
                })->values()->toArray(),
            ];
        })->values();

        // Approved Supplies
        $suppliesRaw = SuppliesCart::where('approver_status', 'approved')
            ->where(function($query) use ($currentUser) {
                // Show all Pending items
                $query->where('mrs_status', 'Pending')
                    // OR show items issued by current user for other statuses
                    ->orWhere(function($q) use ($currentUser) {
                        $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered'])
                          ->where('issued_by', $currentUser);
                    })
                    // OR show Return items (visible to all)
                    ->orWhere('mrs_status', 'Return');
            })
            ->orderBy('order_date', 'desc')
            ->get([
                'id',
                'mrs_no',
                'order_date',
                'emp_name',
                'mrs_status',
                'itemCode',
                'material_description',
                'detailed_description',
                'quantity',
                'request_qty',
                'issued_qty',
                'remarks',
            ]);

        $supplies = $suppliesRaw->groupBy('mrs_no')->map(function ($group) {
            $first = $group->first();
            $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;
            
            return [
                'id' => $first->id,
                'mrs_no' => $first->mrs_no,
                'order_date' => Carbon::parse($first->order_date)->format('Y-m-d'),
                'emp_name' => $first->emp_name,
                'mrs_status' => $displayStatus,
                'items' => $group->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'itemCode' => $item->itemCode,
                        'material_description' => $item->material_description,
                        'detailed_description' => $item->detailed_description,
                        'quantity' => $item->quantity,
                        'request_qty' => $item->request_qty,
                        'issued_qty' => $item->issued_qty,
                        'mrs_status' => $item->mrs_status,
                        'remarks' => $item->remarks,
                    ];
                })->values()->toArray(),
            ];
        })->values();

        // Approved Consigned - UPDATED TO USE STATION
        $consignedRaw = ConsignedCart::whereNotNull('mrs_status')
            ->where(function($query) use ($currentUser) {
                // Show all Pending items
                $query->where('mrs_status', 'Pending')
                    // OR show items issued by current user for other statuses
                    ->orWhere(function($q) use ($currentUser) {
                        $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered'])
                          ->where('issued_by', $currentUser);
                    })
                    // OR show Return items (visible to all)
                    ->orWhere('mrs_status', 'Return');
            })
            ->orderBy('order_date', 'desc')
            ->get([
                'id',
                'mrs_no',
                'order_date',
                'station', // Changed from employee_no
                'mrs_status',
                'item_code',
                'material_description',
                'supplier',
                'expiration',
                'bin_location',
                'quantity',
                'uom',
                'qty_per_box',
                'request_qty',
                'issued_qty',
                'remarks',
            ]);

        $consigned = $consignedRaw->groupBy('mrs_no')->map(function ($group) {
            $first = $group->first();
            $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;
            
            return [
                'id' => $first->id,
                'mrs_no' => $first->mrs_no,
                'order_date' => Carbon::parse($first->order_date)->format('Y-m-d'),
                'emp_name' => $first->station, // Using station instead of employee_no
                'mrs_status' => $displayStatus,
                'items' => $group->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'itemCode' => $item->item_code,
                        'material_description' => $item->material_description,
                        'detailed_description' => $item->material_description,
                        'supplier' => $item->supplier,
                        'expiration' => $item->expiration,
                        'bin_location' => $item->bin_location,
                        'quantity' => $item->quantity,
                        'uom' => $item->uom,
                        'qty_per_box' => $item->qty_per_box,
                        'request_qty' => $item->request_qty,
                        'issued_qty' => $item->issued_qty,
                        'mrs_status' => $item->mrs_status,
                        'remarks' => $item->remarks,
                    ];
                })->values()->toArray(),
            ];
        })->values();

        return Inertia::render('MaterialIssuance', [
            'consumables' => $consumables,
            'supplies' => $supplies,
            'consigned' => $consigned,
        ]);
    }

    // ==================== CONSUMABLE METHODS ====================

    public function updateConsumableStatus(Request $request)
    {
        $request->validate([
            'mrs_no' => 'required|string',
            'status' => 'required|string',
        ]);

        $issuedBy = session('emp_data.emp_name', 'Unknown User');

        ConsumableCart::where('mrs_no', $request->mrs_no)
            ->where('approver_status', 'approved')
            ->update([
                'mrs_status' => $request->status,
                'issued_by' => $issuedBy
            ]);

        return back()->with('success', 'Status updated successfully');
    }

    public function updateIssuedQtyConsumable(Request $request)
    {
        $request->validate([
            'mrs_no' => 'required|string',
            'items' => 'required|array',
            'items.*.id' => 'required|integer',
            'items.*.issued_qty' => 'required|numeric|min:1',
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->items as $item) {
                $cartItem = ConsumableCart::where('id', $item['id'])
                    ->where('mrs_no', $request->mrs_no)
                    ->where('approver_status', 'approved')
                    ->first();

                if (!$cartItem) continue;

                $cartItem->update([
                    'issued_quantity' => $item['issued_qty'],
                    'mrs_status' => 'For Pick Up'
                ]);

                $consumableDetail = ConsumableDetail::where('item_code', $cartItem->itemCode)->first();

                if ($consumableDetail) {
                    $newQuantity = $consumableDetail->quantity - $item['issued_qty'];
                    if ($newQuantity < 0) {
                        throw new \Exception("Insufficient stock for item: {$cartItem->itemCode}");
                    }
                    $consumableDetail->update(['quantity' => $newQuantity]);
                }
            }
        });

        return back()->with('success', 'Items ready for pick up and inventory updated');
    }

    public function markDeliveredConsumable(Request $request)
    {
        $request->validate(['mrs_no' => 'required|string']);

        ConsumableCart::where('mrs_no', $request->mrs_no)
            ->where('approver_status', 'approved')
            ->where('mrs_status', 'For Pick Up')
            ->update(['mrs_status' => 'Delivered']);

        return back()->with('success', 'Items marked as delivered');
    }

    public function returnConsumableItem(Request $request)
    {
        $request->validate([
            'item_id' => 'required|integer',
            'mrs_no' => 'required|string',
        ]);

        DB::transaction(function () use ($request) {
            $cartItem = ConsumableCart::where('id', $request->item_id)
                ->where('mrs_no', $request->mrs_no)
                ->where('mrs_status', 'Delivered')
                ->first();

            if (!$cartItem) {
                throw new \Exception("Item not found or not in delivered status");
            }

            $cartItem->update(['mrs_status' => 'Return']);

            $consumableDetail = ConsumableDetail::where('item_code', $cartItem->itemCode)
                ->where('serial', $cartItem->serial)
                ->first();

            if ($consumableDetail) {
                $consumableDetail->update([
                    'quantity' => $consumableDetail->quantity + $cartItem->issued_quantity
                ]);
            }
        });

        return back()->with('success', 'Item returned successfully and inventory updated');
    }
public function getReplacementItemsConsumable(Request $request)
{
    // Get ALL consumable details with quantity > 0
    $replacementItems = ConsumableDetail::with('consumable:consumable_id,material_description')
        ->where('quantity', '>', 0)
        ->get()
        ->map(function($item) {
            return [
                'id' => $item->id,
                'item_code' => $item->item_code,
                'material_description' => $item->consumable->material_description ?? 'N/A',
                'detailed_description' => $item->detailed_description,
                'serial' => $item->serial,
                'bin_location' => $item->bin_location,
                'quantity' => $item->quantity
            ];
        });

    return $this->returnWithAllData($replacementItems);
}

public function replaceItemConsumable(Request $request)
{
    $request->validate([
        'mrs_no' => 'required|string',
        'old_item_id' => 'required|integer',
        'new_item_code' => 'required|string',
        'new_serial' => 'nullable|string',
        'replacement_qty' => 'required|integer|min:1', // ✅ ADD THIS
    ]);

    DB::transaction(function () use ($request) {
        $cartItem = ConsumableCart::where('id', $request->old_item_id)
            ->where('mrs_no', $request->mrs_no)
            ->first();

        if (!$cartItem) {
            throw new \Exception("Cart item not found");
        }

        // ✅ Validate replacement quantity
        if ($request->replacement_qty > $cartItem->issued_quantity) {
            throw new \Exception("Replacement quantity cannot exceed issued quantity");
        }

        // ✅ STEP 1: Return old item quantity back to inventory
        $oldItem = ConsumableDetail::where('item_code', $cartItem->itemCode)
            ->where('serial', $cartItem->serial)
            ->first();

        if ($oldItem) {
            $oldItem->update([
                'quantity' => $oldItem->quantity + $request->replacement_qty
            ]);
        }

        // ✅ STEP 2: Get new item and deduct from inventory
        $newItem = ConsumableDetail::with('consumable:consumable_id,material_description')
            ->where('item_code', $request->new_item_code)
            ->where('serial', $request->new_serial)
            ->first();

        if (!$newItem) {
            throw new \Exception("Replacement item not found in inventory");
        }

        // ✅ Check if new item has enough stock
        if ($newItem->quantity < $request->replacement_qty) {
            throw new \Exception("Insufficient stock for replacement item. Available: {$newItem->quantity}");
        }

        // ✅ Deduct from new item inventory
        $newItem->update([
            'quantity' => $newItem->quantity - $request->replacement_qty
        ]);

        // ✅ STEP 3: Handle partial or full replacement in cart
        if ($request->replacement_qty < $cartItem->issued_quantity) {
            // Partial replacement - reduce original and create new entry
            $cartItem->update([
                'issued_quantity' => $cartItem->issued_quantity - $request->replacement_qty,
                'request_quantity' => $cartItem->request_quantity - $request->replacement_qty,
            ]);

            // Create new cart entry for replaced item
            ConsumableCart::create([
                'mrs_no' => $cartItem->mrs_no,
                'order_date' => $cartItem->order_date,
                'emp_id' => $cartItem->emp_id,
                'emp_name' => $cartItem->emp_name,
                'approver' => $cartItem->approver,
                'department' => $cartItem->department,
                'prodline' => $cartItem->prodline,
                'mrs_status' => $cartItem->mrs_status,
                'approver_status' => $cartItem->approver_status,
                'issued_by' => $cartItem->issued_by,
                'itemCode' => $request->new_item_code,
                'serial' => $request->new_serial,
                'material_description' => $newItem->consumable->material_description ?? $cartItem->material_description,
                'detailed_description' => $newItem->detailed_description,
                'bin_location' => $newItem->bin_location,
                'quantity' => $newItem->quantity,
                'uom' => $cartItem->uom,
                'request_quantity' => $request->replacement_qty,
                'issued_quantity' => $request->replacement_qty,
                'remarks' => $cartItem->remarks,
            ]);
        } else {
            // Full replacement - update existing cart item
            $cartItem->update([
                'itemCode' => $request->new_item_code,
                'serial' => $request->new_serial,
                'material_description' => $newItem->consumable->material_description ?? $cartItem->material_description,
                'detailed_description' => $newItem->detailed_description,
                'bin_location' => $newItem->bin_location,
            ]);
        }
    });

    return $this->getUpdatedData('consumable');
}

    // ==================== SUPPLIES METHODS ====================

    public function updateSuppliesStatus(Request $request)
    {
        $request->validate([
            'mrs_no' => 'required|string',
            'status' => 'required|string',
        ]);

        $issuedBy = session('emp_data.emp_name', 'Unknown User');

        SuppliesCart::where('mrs_no', $request->mrs_no)
            ->where('approver_status', 'approved')
            ->update([
                'mrs_status' => $request->status,
                'issued_by' => $issuedBy
            ]);

        return back()->with('success', 'Status updated successfully');
    }

    public function updateIssuedQtySupplies(Request $request)
    {
        $request->validate([
            'mrs_no' => 'required|string',
            'items' => 'required|array',
            'items.*.id' => 'required|integer',
            'items.*.issued_qty' => 'required|numeric|min:1',
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->items as $item) {
                $cartItem = SuppliesCart::where('id', $item['id'])
                    ->where('mrs_no', $request->mrs_no)
                    ->where('approver_status', 'approved')
                    ->first();

                if (!$cartItem) continue;

                $cartItem->update([
                    'issued_qty' => $item['issued_qty'],
                    'mrs_status' => 'For Pick Up'
                ]);

                $supplyDetail = SupplyDetail::where('item_code', $cartItem->itemCode)->first();

                if ($supplyDetail) {
                    $newQty = $supplyDetail->qty - $item['issued_qty'];
                    if ($newQty < 0) {
                        throw new \Exception("Insufficient stock for item: {$cartItem->itemCode}");
                    }
                    $supplyDetail->update(['qty' => $newQty]);
                }
            }
        });

        return back()->with('success', 'Items ready for pick up and inventory updated');
    }

    public function markDeliveredSupplies(Request $request)
    {
        $request->validate(['mrs_no' => 'required|string']);

        SuppliesCart::where('mrs_no', $request->mrs_no)
            ->where('approver_status', 'approved')
            ->where('mrs_status', 'For Pick Up')
            ->update(['mrs_status' => 'Delivered']);

        return back()->with('success', 'Items marked as delivered');
    }

    public function returnSuppliesItem(Request $request)
    {
        $request->validate([
            'item_id' => 'required|integer',
            'mrs_no' => 'required|string',
        ]);

        DB::transaction(function () use ($request) {
            $cartItem = SuppliesCart::where('id', $request->item_id)
                ->where('mrs_no', $request->mrs_no)
                ->where('mrs_status', 'Delivered')
                ->first();

            if (!$cartItem) {
                throw new \Exception("Item not found or not in delivered status");
            }

            $cartItem->update(['mrs_status' => 'Return']);

            $supplyDetail = SupplyDetail::where('item_code', $cartItem->itemCode)
                ->active()
                ->first();

            if ($supplyDetail) {
                $supplyDetail->update(['qty' => $supplyDetail->qty + $cartItem->issued_qty]);
            }
        });

        return back()->with('success', 'Item returned successfully and inventory updated');
    }

public function getReplacementItemsSupplies(Request $request)
{
    // Get ALL supply details with qty > 0
    $replacementItems = SupplyDetail::with('supply:supplies_no,material_description')
        ->where('qty', '>', 0)
        ->active()
        ->get()
        ->map(function($item) {
            return [
                'id' => $item->id,
                'item_code' => $item->item_code,
                'material_description' => $item->supply->material_description ?? 'N/A',
                'detailed_description' => $item->detailed_description,
                'qty' => $item->qty
            ];
        });

    return $this->returnWithAllData($replacementItems);
}

public function replaceItemSupplies(Request $request)
{
    $request->validate([
        'mrs_no' => 'required|string',
        'old_item_id' => 'required|integer',
        'new_item_code' => 'required|string',
        'replacement_qty' => 'required|integer|min:1', // ✅ ADD THIS
    ]);

    DB::transaction(function () use ($request) {
        $cartItem = SuppliesCart::where('id', $request->old_item_id)
            ->where('mrs_no', $request->mrs_no)
            ->first();

        if (!$cartItem) {
            throw new \Exception("Cart item not found");
        }

        // ✅ Validate replacement quantity
        if ($request->replacement_qty > $cartItem->issued_qty) {
            throw new \Exception("Replacement quantity cannot exceed issued quantity");
        }

        // ✅ STEP 1: Return old item quantity back to inventory
        $oldItem = SupplyDetail::where('item_code', $cartItem->itemCode)
            ->active()
            ->first();

        if ($oldItem) {
            $oldItem->update([
                'qty' => $oldItem->qty + $request->replacement_qty
            ]);
        }

        // ✅ STEP 2: Get new item and deduct from inventory
        $newItem = SupplyDetail::with('supply:supplies_no,material_description')
            ->where('item_code', $request->new_item_code)
            ->active()
            ->first();

        if (!$newItem) {
            throw new \Exception("Replacement item not found in inventory");
        }

        // ✅ Check if new item has enough stock
        if ($newItem->qty < $request->replacement_qty) {
            throw new \Exception("Insufficient stock for replacement item. Available: {$newItem->qty}");
        }

        // ✅ Deduct from new item inventory
        $newItem->update([
            'qty' => $newItem->qty - $request->replacement_qty
        ]);

        // ✅ STEP 3: Handle partial or full replacement in cart
        if ($request->replacement_qty < $cartItem->issued_qty) {
            // Partial replacement
            $cartItem->update([
                'issued_qty' => $cartItem->issued_qty - $request->replacement_qty,
                'request_qty' => $cartItem->request_qty - $request->replacement_qty,
            ]);

            // Create new cart entry
            SuppliesCart::create([
                'mrs_no' => $cartItem->mrs_no,
                'order_date' => $cartItem->order_date,
                'emp_id' => $cartItem->emp_id,
                'emp_name' => $cartItem->emp_name,
                'approver' => $cartItem->approver,
                'department' => $cartItem->department,
                'prodline' => $cartItem->prodline,
                'mrs_status' => $cartItem->mrs_status,
                'approver_status' => $cartItem->approver_status,
                'issued_by' => $cartItem->issued_by,
                'itemCode' => $request->new_item_code,
                'material_description' => $newItem->supply->material_description ?? $cartItem->material_description,
                'detailed_description' => $newItem->detailed_description,
                'quantity' => $newItem->qty,
                'uom' => $cartItem->uom,
                'request_qty' => $request->replacement_qty,
                'issued_qty' => $request->replacement_qty,
                'remarks' => $cartItem->remarks,
            ]);
        } else {
            // Full replacement
            $cartItem->update([
                'itemCode' => $request->new_item_code,
                'material_description' => $newItem->supply->material_description ?? $cartItem->material_description,
                'detailed_description' => $newItem->detailed_description,
            ]);
        }
    });

    return $this->getUpdatedData('supplies');
}

    // ==================== CONSIGNED METHODS ====================

    public function updateConsignedStatus(Request $request)
    {
        $request->validate([
            'mrs_no' => 'required|string',
            'status' => 'required|string',
        ]);

        $issuedBy = session('emp_data.emp_name', 'Unknown User');

        ConsignedCart::where('mrs_no', $request->mrs_no)
            ->update([
                'mrs_status' => $request->status,
                'issued_by' => $issuedBy
            ]);

        return back()->with('success', 'Status updated successfully');
    }

    public function updateIssuedQtyConsigned(Request $request)
    {
        $request->validate([
            'mrs_no' => 'required|string',
            'items' => 'required|array',
            'items.*.id' => 'required|integer',
            'items.*.issued_qty' => 'required|numeric|min:1',
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->items as $item) {
                $cartItem = ConsignedCart::where('id', $item['id'])
                    ->where('mrs_no', $request->mrs_no)
                    ->first();

                if (!$cartItem) continue;

                $cartItem->update([
                    'issued_qty' => $item['issued_qty'],
                    'mrs_status' => 'For Pick Up'
                ]);

                $consignedDetail = ConsignedDetail::where('item_code', $cartItem->item_code)
                    ->where('supplier', $cartItem->supplier)
                    ->first();

                if ($consignedDetail) {
                    $newQty = $consignedDetail->qty - $item['issued_qty'];
                    if ($newQty < 0) {
                        throw new \Exception("Insufficient stock for item: {$cartItem->item_code}");
                    }
                    $consignedDetail->update(['qty' => $newQty]);
                }
            }
        });

        return back()->with('success', 'Items ready for pick up and inventory updated');
    }

    public function markDeliveredConsigned(Request $request)
    {
        $request->validate(['mrs_no' => 'required|string']);

        ConsignedCart::where('mrs_no', $request->mrs_no)
            ->where('mrs_status', 'For Pick Up')
            ->update(['mrs_status' => 'Delivered']);

        return back()->with('success', 'Items marked as delivered');
    }

    public function returnConsignedItem(Request $request)
    {
        $request->validate([
            'item_id' => 'required|integer',
            'mrs_no' => 'required|string',
        ]);

        DB::transaction(function () use ($request) {
            $cartItem = ConsignedCart::where('id', $request->item_id)
                ->where('mrs_no', $request->mrs_no)
                ->where('mrs_status', 'Delivered')
                ->first();

            if (!$cartItem) {
                throw new \Exception("Item not found or not in delivered status");
            }

            $cartItem->update(['mrs_status' => 'Return']);

            $consignedDetail = ConsignedDetail::where('item_code', $cartItem->item_code)
                ->where('supplier', $cartItem->supplier)
                ->first();

            if ($consignedDetail) {
                $consignedDetail->update(['qty' => $consignedDetail->qty + $cartItem->issued_qty]);
            }
        });

        return back()->with('success', 'Item returned successfully and inventory updated');
    }

public function getReplacementItemsConsigned(Request $request)
{
    $request->validate([
        'material_description' => 'required|string'
    ]);

    // Find the consigned item by material description
    $consigned = Consigned::where('mat_description', $request->material_description)->first();
    
    if (!$consigned) {
        return $this->returnWithAllData([]);
    }

    // Get all consigned details with the same material description and qty > 0
    $replacementItems = ConsignedDetail::where('consigned_no', $consigned->consigned_no)
        ->where('qty', '>', 0)
        ->get()
        ->map(function($item) use ($consigned) {
            return [
                'id' => $item->id,
                'item_code' => $item->item_code,
                'material_description' => $consigned->mat_description,
                'detailed_description' => $consigned->mat_description,
                'supplier' => $item->supplier,
                'expiration' => $item->expiration,
                'bin_location' => $item->bin_location,
                'quantity' => $item->qty,
                'qty' => $item->qty,
                'uom' => $item->uom,
                'qty_per_box' => $item->qty_per_box
            ];
        });

    return $this->returnWithAllData($replacementItems);
}

public function replaceItemConsigned(Request $request)
{
    $request->validate([
        'mrs_no' => 'required|string',
        'old_item_id' => 'required|integer',
        'new_item_code' => 'required|string',
        'new_supplier' => 'nullable|string',
        'replacement_qty' => 'required|integer|min:1',
    ]);

    DB::transaction(function () use ($request) {
        $cartItem = ConsignedCart::where('id', $request->old_item_id)
            ->where('mrs_no', $request->mrs_no)
            ->first();

        if (!$cartItem) {
            throw new \Exception("Cart item not found");
        }

        // Validate replacement quantity doesn't exceed issued quantity
        if ($request->replacement_qty > $cartItem->issued_qty) {
            throw new \Exception("Replacement quantity cannot exceed issued quantity");
        }

        // ✅ STEP 1: Return old item quantity back to inventory
        $oldItem = ConsignedDetail::where('item_code', $cartItem->item_code)
            ->where('supplier', $cartItem->supplier)
            ->first();

        if ($oldItem) {
            $oldItem->update([
                'qty' => $oldItem->qty + $request->replacement_qty
            ]);
        }

        // ✅ STEP 2: Get new item and check/deduct inventory
        $newItem = ConsignedDetail::where('item_code', $request->new_item_code)
            ->where('supplier', $request->new_supplier)
            ->first();

        if (!$newItem) {
            throw new \Exception("Replacement item not found in inventory");
        }

        // Check if replacement item has enough stock
        if ($newItem->qty < $request->replacement_qty) {
            throw new \Exception("Insufficient stock for replacement item. Available: {$newItem->qty}");
        }

        // ✅ Deduct from new item inventory
        $newItem->update([
            'qty' => $newItem->qty - $request->replacement_qty
        ]);

        // ✅ STEP 3: Handle partial or full replacement
        if ($request->replacement_qty < $cartItem->issued_qty) {
            // Reduce the original item's quantity
            $cartItem->update([
                'issued_qty' => $cartItem->issued_qty - $request->replacement_qty,
                'request_qty' => $cartItem->request_qty - $request->replacement_qty,
            ]);

            // Create new cart item with replacement details
            ConsignedCart::create([
                'mrs_no' => $cartItem->mrs_no,
                'order_date' => $cartItem->order_date,
                'employee_no' => $cartItem->employee_no,
                'station' => $cartItem->station,
                'factory' => $cartItem->factory,
                'mrs_status' => $cartItem->mrs_status,
                'issued_by' => $cartItem->issued_by,
                'item_code' => $request->new_item_code,
                'material_description' => $newItem->material_description ?? $cartItem->material_description,
                'supplier' => $request->new_supplier,
                'expiration' => $newItem->expiration,
                'bin_location' => $newItem->bin_location,
                'quantity' => $newItem->qty,
                'uom' => $newItem->uom,
                'qty_per_box' => $newItem->qty_per_box,
                'request_qty' => $request->replacement_qty,
                'issued_qty' => $request->replacement_qty,
                'remarks' => $cartItem->remarks,
            ]);
        } else {
            // Full replacement - update the existing item
            $cartItem->update([
                'item_code' => $request->new_item_code,
                'supplier' => $request->new_supplier,
                'expiration' => $newItem->expiration,
                'bin_location' => $newItem->bin_location,
                'uom' => $newItem->uom,
                'qty_per_box' => $newItem->qty_per_box,
                'material_description' => $newItem->material_description ?? $cartItem->material_description,
            ]);
        }
    });

    return $this->getUpdatedData('consigned');
}

    // ==================== HELPER METHOD ====================

private function returnWithAllData($replacementItems)
{
    $currentUser = session('emp_data.emp_name', null);

    // Fetch all data again - ADD 'remarks' to all queries
    $consumablesRaw = ConsumableCart::where('approver_status', 'approved')
        ->where(function($query) use ($currentUser) {
            $query->where('mrs_status', 'Pending')
                ->orWhere(function($q) use ($currentUser) {
                    $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered'])
                      ->where('issued_by', $currentUser);
                })
                ->orWhere('mrs_status', 'Return');
        })
        ->orderBy('order_date', 'desc')
        ->get(['id', 'mrs_no', 'order_date', 'emp_name', 'mrs_status', 'itemCode', 
               'material_description', 'detailed_description', 'serial', 'quantity', 
               'request_quantity', 'issued_quantity', 'remarks']); // ✅ ADDED 'remarks'

    $consumables = $consumablesRaw->groupBy('mrs_no')->map(function ($group) {
        $first = $group->first();
        $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;
        return [
            'id' => $first->id,
            'mrs_no' => $first->mrs_no,
            'order_date' => Carbon::parse($first->order_date)->format('Y-m-d'),
            'emp_name' => $first->emp_name,
            'mrs_status' => $displayStatus,
            'items' => $group->map(fn($item) => [
                'id' => $item->id,
                'itemCode' => $item->itemCode,
                'material_description' => $item->material_description,
                'detailed_description' => $item->detailed_description,
                'serial' => $item->serial,
                'quantity' => $item->quantity,
                'request_quantity' => $item->request_quantity,
                'issued_quantity' => $item->issued_quantity,
                'mrs_status' => $item->mrs_status,
                'remarks' => $item->remarks, // ✅ ADDED
            ])->values()->toArray(),
        ];
    })->values();

    $suppliesRaw = SuppliesCart::where('approver_status', 'approved')
        ->where(function($query) use ($currentUser) {
            $query->where('mrs_status', 'Pending')
                ->orWhere(function($q) use ($currentUser) {
                    $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered'])
                      ->where('issued_by', $currentUser);
                })
                ->orWhere('mrs_status', 'Return');
        })
        ->orderBy('order_date', 'desc')
        ->get(['id', 'mrs_no', 'order_date', 'emp_name', 'mrs_status', 'itemCode', 
               'material_description', 'detailed_description', 'quantity', 
               'request_qty', 'issued_qty', 'remarks']); // ✅ ADDED 'remarks'

    $supplies = $suppliesRaw->groupBy('mrs_no')->map(function ($group) {
        $first = $group->first();
        $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;
        return [
            'id' => $first->id,
            'mrs_no' => $first->mrs_no,
            'order_date' => Carbon::parse($first->order_date)->format('Y-m-d'),
            'emp_name' => $first->emp_name,
            'mrs_status' => $displayStatus,
            'items' => $group->map(fn($item) => [
                'id' => $item->id,
                'itemCode' => $item->itemCode,
                'material_description' => $item->material_description,
                'detailed_description' => $item->detailed_description,
                'quantity' => $item->quantity,
                'request_qty' => $item->request_qty,
                'issued_qty' => $item->issued_qty,
                'mrs_status' => $item->mrs_status,
                'remarks' => $item->remarks, // ✅ ADDED
            ])->values()->toArray(),
        ];
    })->values();

    // UPDATED: Use station instead of employee_no
    $consignedRaw = ConsignedCart::whereNotNull('mrs_status')
        ->where(function($query) use ($currentUser) {
            $query->where('mrs_status', 'Pending')
                ->orWhere(function($q) use ($currentUser) {
                    $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered'])
                      ->where('issued_by', $currentUser);
                })
                ->orWhere('mrs_status', 'Return');
        })
        ->orderBy('order_date', 'desc')
        ->get(['id', 'mrs_no', 'order_date', 'station', 'mrs_status', 'item_code', 
               'material_description', 'supplier', 'expiration', 'bin_location', 
               'quantity', 'uom', 'qty_per_box', 'request_qty', 'issued_qty', 'remarks']); // ✅ ADDED 'remarks'

    $consigned = $consignedRaw->groupBy('mrs_no')->map(function ($group) {
        $first = $group->first();
        $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;
        return [
            'id' => $first->id,
            'mrs_no' => $first->mrs_no,
            'order_date' => Carbon::parse($first->order_date)->format('Y-m-d'),
            'emp_name' => $first->station, // Using station
            'mrs_status' => $displayStatus,
            'items' => $group->map(fn($item) => [
                'id' => $item->id,
                'itemCode' => $item->item_code,
                'material_description' => $item->material_description,
                'detailed_description' => $item->material_description,
                'supplier' => $item->supplier,
                'expiration' => $item->expiration,
                'bin_location' => $item->bin_location,
                'quantity' => $item->quantity,
                'uom' => $item->uom,
                'qty_per_box' => $item->qty_per_box,
                'request_qty' => $item->request_qty,
                'issued_qty' => $item->issued_qty,
                'mrs_status' => $item->mrs_status,
                'remarks' => $item->remarks, // ✅ ADDED
            ])->values()->toArray(),
        ];
    })->values();

    return Inertia::render('MaterialIssuance', [
        'consumables' => $consumables,
        'supplies' => $supplies,
        'consigned' => $consigned,
        'replacementItems' => $replacementItems,
    ]);
}
    // ==================== REMARKS UPDATE METHODS ====================

public function updateConsumableRemarks(Request $request)
{
    $request->validate([
        'item_id' => 'required|integer',
        'remarks' => 'nullable|string|max:500',
    ]);

    $cartItem = ConsumableCart::findOrFail($request->item_id);
    $cartItem->update(['remarks' => $request->remarks]);

    return back()->with('success', 'Remarks updated successfully');
}

public function updateSuppliesRemarks(Request $request)
{
    $request->validate([
        'item_id' => 'required|integer',
        'remarks' => 'nullable|string|max:500',
    ]);

    $cartItem = SuppliesCart::findOrFail($request->item_id);
    $cartItem->update(['remarks' => $request->remarks]);

    return back()->with('success', 'Remarks updated successfully');
}

public function updateConsignedRemarks(Request $request)
{
    $request->validate([
        'item_id' => 'required|integer',
        'remarks' => 'nullable|string|max:500',
    ]);

    $cartItem = ConsignedCart::findOrFail($request->item_id);
    $cartItem->update(['remarks' => $request->remarks]);

    return back()->with('success', 'Remarks updated successfully');
}

/**
 * Get updated data for a specific type (consumable, supplies, or consigned)
 */
private function getUpdatedData($type)
{
    $currentUser = session('emp_data.emp_name', null);

    if ($type === 'consumable') {
        $consumablesRaw = ConsumableCart::where('approver_status', 'approved')
            ->where(function($query) use ($currentUser) {
                $query->where('mrs_status', 'Pending')
                    ->orWhere(function($q) use ($currentUser) {
                        $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered'])
                          ->where('issued_by', $currentUser);
                    })
                    ->orWhere('mrs_status', 'Return');
            })
            ->orderBy('order_date', 'desc')
            ->get(['id', 'mrs_no', 'order_date', 'emp_name', 'mrs_status', 'itemCode', 
                   'material_description', 'detailed_description', 'serial', 'quantity', 
                   'request_quantity', 'issued_quantity', 'remarks']);

        $consumables = $consumablesRaw->groupBy('mrs_no')->map(function ($group) {
            $first = $group->first();
            $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;
            return [
                'id' => $first->id,
                'mrs_no' => $first->mrs_no,
                'order_date' => Carbon::parse($first->order_date)->format('Y-m-d'),
                'emp_name' => $first->emp_name,
                'mrs_status' => $displayStatus,
                'items' => $group->map(fn($item) => [
                    'id' => $item->id,
                    'itemCode' => $item->itemCode,
                    'material_description' => $item->material_description,
                    'detailed_description' => $item->detailed_description,
                    'serial' => $item->serial,
                    'quantity' => $item->quantity,
                    'request_quantity' => $item->request_quantity,
                    'issued_quantity' => $item->issued_quantity,
                    'mrs_status' => $item->mrs_status,
                    'remarks' => $item->remarks,
                ])->values()->toArray(),
            ];
        })->values();

        return back()->with(['consumables' => $consumables, 'success' => 'Item replaced successfully']);
    }

    if ($type === 'supplies') {
        $suppliesRaw = SuppliesCart::where('approver_status', 'approved')
            ->where(function($query) use ($currentUser) {
                $query->where('mrs_status', 'Pending')
                    ->orWhere(function($q) use ($currentUser) {
                        $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered'])
                          ->where('issued_by', $currentUser);
                    })
                    ->orWhere('mrs_status', 'Return');
            })
            ->orderBy('order_date', 'desc')
            ->get(['id', 'mrs_no', 'order_date', 'emp_name', 'mrs_status', 'itemCode', 
                   'material_description', 'detailed_description', 'quantity', 
                   'request_qty', 'issued_qty', 'remarks']);

        $supplies = $suppliesRaw->groupBy('mrs_no')->map(function ($group) {
            $first = $group->first();
            $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;
            return [
                'id' => $first->id,
                'mrs_no' => $first->mrs_no,
                'order_date' => Carbon::parse($first->order_date)->format('Y-m-d'),
                'emp_name' => $first->emp_name,
                'mrs_status' => $displayStatus,
                'items' => $group->map(fn($item) => [
                    'id' => $item->id,
                    'itemCode' => $item->itemCode,
                    'material_description' => $item->material_description,
                    'detailed_description' => $item->detailed_description,
                    'quantity' => $item->quantity,
                    'request_qty' => $item->request_qty,
                    'issued_qty' => $item->issued_qty,
                    'mrs_status' => $item->mrs_status,
                    'remarks' => $item->remarks,
                ])->values()->toArray(),
            ];
        })->values();

        return back()->with(['supplies' => $supplies, 'success' => 'Item replaced successfully']);
    }

    if ($type === 'consigned') {
        $consignedRaw = ConsignedCart::whereNotNull('mrs_status')
            ->where(function($query) use ($currentUser) {
                $query->where('mrs_status', 'Pending')
                    ->orWhere(function($q) use ($currentUser) {
                        $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered'])
                          ->where('issued_by', $currentUser);
                    })
                    ->orWhere('mrs_status', 'Return');
            })
            ->orderBy('order_date', 'desc')
            ->get(['id', 'mrs_no', 'order_date', 'station', 'mrs_status', 'item_code', 
                   'material_description', 'supplier', 'expiration', 'bin_location', 
                   'quantity', 'uom', 'qty_per_box', 'request_qty', 'issued_qty', 'remarks']);

        $consigned = $consignedRaw->groupBy('mrs_no')->map(function ($group) {
            $first = $group->first();
            $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;
            return [
                'id' => $first->id,
                'mrs_no' => $first->mrs_no,
                'order_date' => Carbon::parse($first->order_date)->format('Y-m-d'),
                'emp_name' => $first->station,
                'mrs_status' => $displayStatus,
                'items' => $group->map(fn($item) => [
                    'id' => $item->id,
                    'itemCode' => $item->item_code,
                    'material_description' => $item->material_description,
                    'detailed_description' => $item->material_description,
                    'supplier' => $item->supplier,
                    'expiration' => $item->expiration,
                    'bin_location' => $item->bin_location,
                    'quantity' => $item->quantity,
                    'uom' => $item->uom,
                    'qty_per_box' => $item->qty_per_box,
                    'request_qty' => $item->request_qty,
                    'issued_qty' => $item->issued_qty,
                    'mrs_status' => $item->mrs_status,
                    'remarks' => $item->remarks,
                ])->values()->toArray(),
            ];
        })->values();

        return back()->with(['consigned' => $consigned, 'success' => 'Item replaced successfully']);
    }
}
}