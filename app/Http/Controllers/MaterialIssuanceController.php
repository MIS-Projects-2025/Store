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
    ]);

    DB::transaction(function () use ($request) {
        $cartItem = ConsumableCart::where('id', $request->old_item_id)
            ->where('mrs_no', $request->mrs_no)
            ->first();

        if ($cartItem) {
            $newItem = ConsumableDetail::with('consumable:consumable_id,material_description')
                ->where('item_code', $request->new_item_code)
                ->where('serial', $request->new_serial)
                ->first();

            if ($newItem) {
                $cartItem->update([
                    'itemCode' => $request->new_item_code,
                    'serial' => $request->new_serial,
                    'material_description' => $newItem->consumable->material_description ?? $cartItem->material_description,
                    'detailed_description' => $newItem->detailed_description,
                    'bin_location' => $newItem->bin_location,
                ]);
            }
        }
    });

    return back()->with('success', 'Item replaced successfully');
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
    ]);

    DB::transaction(function () use ($request) {
        $cartItem = SuppliesCart::where('id', $request->old_item_id)
            ->where('mrs_no', $request->mrs_no)
            ->first();

        if ($cartItem) {
            $newItem = SupplyDetail::with('supply:supplies_no,material_description')
                ->where('item_code', $request->new_item_code)
                ->first();

            if ($newItem) {
                $cartItem->update([
                    'itemCode' => $request->new_item_code,
                    'material_description' => $newItem->supply->material_description ?? $cartItem->material_description,
                    'detailed_description' => $newItem->detailed_description,
                ]);
            }
        }
    });

    return back()->with('success', 'Item replaced successfully');
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
        $request->validate(['material_description' => 'required|string']);

        $consigned = Consigned::where('mat_description', $request->material_description)->first();
        if (!$consigned) return $this->returnWithAllData([]);

        $replacementItems = ConsignedDetail::where('consigned_no', $consigned->consigned_no)
            ->where('qty', '>', 0)
            ->get(['id', 'item_code', 'supplier', 'expiration', 'bin_location', 'qty', 'uom', 'qty_per_box']);

        return $this->returnWithAllData($replacementItems);
    }

    public function replaceItemConsigned(Request $request)
    {
        $request->validate([
            'mrs_no' => 'required|string',
            'old_item_id' => 'required|integer',
            'new_item_code' => 'required|string',
            'new_supplier' => 'nullable|string',
        ]);

        DB::transaction(function () use ($request) {
            $cartItem = ConsignedCart::where('id', $request->old_item_id)
                ->where('mrs_no', $request->mrs_no)
                ->first();

            if ($cartItem) {
                $newItem = ConsignedDetail::where('item_code', $request->new_item_code)
                    ->where('supplier', $request->new_supplier)
                    ->first();

                if ($newItem) {
                    $cartItem->update([
                        'item_code' => $request->new_item_code,
                        'supplier' => $request->new_supplier,
                        'expiration' => $newItem->expiration,
                        'bin_location' => $newItem->bin_location,
                        'uom' => $newItem->uom,
                        'qty_per_box' => $newItem->qty_per_box,
                    ]);
                }
            }
        });

        return back()->with('success', 'Item replaced successfully');
    }

    // ==================== HELPER METHOD ====================

    private function returnWithAllData($replacementItems)
    {
        $currentUser = session('emp_data.emp_name', null);

        // Fetch all data again
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
            ->get(['id', 'mrs_no', 'order_date', 'emp_name', 'mrs_status', 'itemCode', 'material_description', 'detailed_description', 'serial', 'quantity', 'request_quantity', 'issued_quantity']);

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
            ->get(['id', 'mrs_no', 'order_date', 'emp_name', 'mrs_status', 'itemCode', 'material_description', 'detailed_description', 'quantity', 'request_qty', 'issued_qty']);

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
            ->get(['id', 'mrs_no', 'order_date', 'station', 'mrs_status', 'item_code', 'material_description', 'supplier', 'expiration', 'bin_location', 'quantity', 'uom', 'qty_per_box', 'request_qty', 'issued_qty']);

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
}