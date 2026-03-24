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
use App\Events\MaterialIssuanceUpdated;
use App\Models\ConsignedDetailHistory;
use App\Models\ConsumableDetailHistory;
use App\Models\SupplyDetailHistory;

class MaterialIssuanceController extends Controller
{
public function index(Request $request)
{
    $user        = $this->getCurrentUserData();
    $currentUser = $user['currentUser'];
    $isAdmin     = $user['isAdmin'];

        $pendingConsumables = ConsumableCart::where('approver_status', 'approved')
            ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');

        $pendingSupplies = SuppliesCart::where('approver_status', 'approved')
            ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');

        $pendingConsigned = ConsignedCart::whereNotNull('mrs_status')
            ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');

        return Inertia::render('MaterialIssuance', [
            'consumables'        => $this->getConsumablesData($currentUser, $isAdmin),
            'supplies'           => $this->getSuppliesData($currentUser, $isAdmin),
            'consigned'          => $this->getConsignedData($currentUser, $isAdmin),
            'pendingCount'       => $pendingConsumables + $pendingSupplies + $pendingConsigned,
            'pendingConsumables' => $pendingConsumables,
            'pendingSupplies'    => $pendingSupplies,
            'pendingConsigned'   => $pendingConsigned,
        ]);
    }

    // ==================== SHARED DATA BUILDERS ====================

    private function getConsumablesData($currentUser, $isAdmin)
    {
        $raw = ConsumableCart::where('approver_status', 'approved')
            ->where(function ($query) use ($currentUser, $isAdmin) {
                $query->where('mrs_status', 'Pending')
                    ->orWhere(function ($q) use ($currentUser, $isAdmin) {
                        $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered']);
                        if (!$isAdmin) $q->where('issued_by', $currentUser);
                    })
                    ->orWhere(function ($q) {
                        $q->whereIn('mrs_status', ['Return', 'Cancelled']);
                    });
            })
            ->orderBy('updated_at', 'desc')
            ->get([
                'id', 'mrs_no', 'order_date', 'emp_name', 'mrs_status', 'itemCode',
                'material_description', 'detailed_description', 'serial', 'quantity',
                'request_quantity', 'issued_quantity', 'remarks', 'issued_by', 'created_at',
                'machine_no', 'prodline', 'bin_location',
            ]);

        return $raw->groupBy('mrs_no')->map(function ($group) {
            $first         = $group->first();
            $displayStatus = $group->firstWhere(fn($i) => !in_array($i->mrs_status, ['Return', 'Cancelled']))?->mrs_status ?? $first->mrs_status;
            $issuedBy      = $group->firstWhere(fn($i) => !is_null($i->issued_by))?->issued_by ?? null;

            return [
                'id'         => $first->id,
                'mrs_no'     => $first->mrs_no,
                'order_date' => Carbon::parse($first->updated_at)->format('Y-m-d'),
                'emp_name'   => $first->emp_name,
                'mrs_status' => $displayStatus,
                'issued_by'  => $issuedBy,
                'machine_no' => $first->machine_no,
                'prodline'   => $first->prodline,
                'created_at' => $first->created_at
                    ? Carbon::parse($first->created_at)->format('Y-m-d H:i:s') : null,
                'items' => $group->map(fn($item) => [
                    'id'                   => $item->id,
                    'itemCode'             => $item->itemCode,
                    'material_description' => $item->material_description,
                    'detailed_description' => $item->detailed_description,
                    'serial'               => $item->serial,
                    'bin_location'         => $item->bin_location,
                    'quantity'             => $item->quantity,
                    'request_quantity'     => $item->request_quantity,
                    'issued_quantity'      => $item->issued_quantity,
                    'mrs_status'           => $item->mrs_status,
                    'remarks'              => $item->remarks,
                ])->values()->toArray(),
            ];
        })->values();
    }

    private function getSuppliesData($currentUser, $isAdmin)
    {
        $raw = SuppliesCart::where('approver_status', 'approved')
            ->where(function ($query) use ($currentUser, $isAdmin) {
                $query->where('mrs_status', 'Pending')
                    ->orWhere(function ($q) use ($currentUser, $isAdmin) {
                        $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered']);
                        if (!$isAdmin) $q->where('issued_by', $currentUser);
                    })
                    ->orWhere(function ($q) {
                        $q->whereIn('mrs_status', ['Return', 'Cancelled']);
                    });
            })
            ->orderBy('updated_at', 'desc')
            ->get([
                'id', 'mrs_no', 'order_date', 'emp_name', 'mrs_status', 'itemCode',
                'material_description', 'detailed_description', 'bin_location', 'quantity',
                'request_qty', 'issued_qty', 'remarks', 'issued_by', 'created_at',
                'machine_no', 'prodline',
            ]);

        return $raw->groupBy('mrs_no')->map(function ($group) {
            $first         = $group->first();
            $displayStatus = $group->firstWhere(fn($i) => !in_array($i->mrs_status, ['Return', 'Cancelled']))?->mrs_status ?? $first->mrs_status;
            $issuedBy      = $group->firstWhere(fn($i) => !is_null($i->issued_by))?->issued_by ?? null;

            return [
                'id'         => $first->id,
                'mrs_no'     => $first->mrs_no,
                'order_date' => Carbon::parse($first->updated_at)->format('Y-m-d'),
                'emp_name'   => $first->emp_name,
                'mrs_status' => $displayStatus,
                'issued_by'  => $issuedBy,
                'machine_no' => $first->machine_no,
                'prodline'   => $first->prodline,
                'created_at' => $first->created_at
                    ? Carbon::parse($first->created_at)->format('Y-m-d H:i:s') : null,
                'items' => $group->map(fn($item) => [
                    'id'                   => $item->id,
                    'itemCode'             => $item->itemCode,
                    'material_description' => $item->material_description,
                    'detailed_description' => $item->detailed_description,
                    'bin_location'         => $item->bin_location,
                    'quantity'             => $item->quantity,
                    'request_qty'          => $item->request_qty,
                    'issued_qty'           => $item->issued_qty,
                    'mrs_status'           => $item->mrs_status,
                    'remarks'              => $item->remarks,
                ])->values()->toArray(),
            ];
        })->values();
    }

    private function getConsignedData($currentUser, $isAdmin)
    {
        $raw = ConsignedCart::whereNotNull('mrs_status')
            ->where(function ($query) use ($currentUser, $isAdmin) {
                $query->where('mrs_status', 'Pending')
                    ->orWhere(function ($q) use ($currentUser, $isAdmin) {
                        $q->whereIn('mrs_status', ['Preparing', 'For Pick Up', 'Delivered']);
                        if (!$isAdmin) $q->where('issued_by', $currentUser);
                    })
                    ->orWhere(function ($q) {
                        $q->whereIn('mrs_status', ['Return', 'Cancelled']);
                    });
            })
            ->orderBy('updated_at', 'desc')
            ->get([
                'id', 'mrs_no', 'order_date', 'station', 'employee_no', 'mrs_status', 'item_code',
                'material_description', 'supplier', 'expiration', 'bin_location',
                'quantity', 'uom', 'qty_per_box', 'request_qty', 'issued_qty',
                'remarks', 'issued_by', 'created_at',
            ]);

        return $raw->groupBy('mrs_no')->map(function ($group) {
            $first         = $group->first();
            $displayStatus = $group->firstWhere(fn($i) => !in_array($i->mrs_status, ['Return', 'Cancelled']))?->mrs_status ?? $first->mrs_status;
            $issuedBy      = $group->firstWhere(fn($i) => !is_null($i->issued_by))?->issued_by ?? null;

            return [
                'id'          => $first->id,
                'mrs_no'      => $first->mrs_no,
                'order_date'  => Carbon::parse($first->order_date)->format('Y-m-d'),
                'emp_name'    => $first->station,
                'employee_no' => $first->employee_no,
                'mrs_status'  => $displayStatus,
                'issued_by'   => $issuedBy,
                'created_at'  => $first->created_at
                    ? Carbon::parse($first->created_at)->format('Y-m-d H:i:s') : null,
                'items' => $group->map(fn($item) => [
                    'id'                   => $item->id,
                    'itemCode'             => $item->item_code,
                    'material_description' => $item->material_description,
                    'detailed_description' => $item->material_description,
                    'supplier'             => $item->supplier,
                    'expiration'           => $item->expiration,
                    'bin_location'         => $item->bin_location,
                    'quantity'             => $item->quantity,
                    'uom'                  => $item->uom,
                    'qty_per_box'          => $item->qty_per_box,
                    'request_qty'          => $item->request_qty,
                    'issued_qty'           => $item->issued_qty,
                    'mrs_status'           => $item->mrs_status,
                    'remarks'              => $item->remarks,
                ])->values()->toArray(),
            ];
        })->values();
    }

    // ==================== CONSUMABLE METHODS ====================

public function updateConsumableStatus(Request $request)
{
    try {
        $request->validate(['mrs_no' => 'required|string', 'status' => 'required|string']);
        $user = $this->getCurrentUserData();

        ConsumableCart::where('mrs_no', $request->mrs_no)
            ->where('approver_status', 'approved')
            ->update(['mrs_status' => $request->status, 'issued_by' => $user['userName']]);

        broadcast(new MaterialIssuanceUpdated('consumable', 'status_update', $request->mrs_no));
        return back()->with('success', 'Status updated successfully');
    } catch (\Exception $e) {
        \Log::error('updateConsumableStatus error: ' . $e->getMessage());
        return back()->withErrors(['error' => $e->getMessage()]);
    }
}

/**
 * Update issued quantities and per-item remarks for consumables.
 * Each item in the payload may carry an optional `remarks` field.
 */
public function updateIssuedQtyConsumable(Request $request)
{
    try {
        $request->validate([
            'mrs_no'               => 'required|string',
            'items'                => 'required|array',
            'items.*.id'           => 'required|integer',
            'items.*.issued_qty'   => 'required|numeric|min:1',
            'items.*.remarks'      => 'nullable|string|max:500',
        ]);

        $user     = $this->getCurrentUserData();
        $userId   = $user['userId'];
        $userName = $user['userName'];

        DB::transaction(function () use ($request, $userId, $userName) {
            foreach ($request->items as $item) {
                $cartItem = ConsumableCart::where('id', $item['id'])
                    ->where('mrs_no', $request->mrs_no)
                    ->where('approver_status', 'approved')
                    ->first();
                if (!$cartItem) continue;

                // Build update payload — preserve existing remarks that were set by
                // cancel/return actions; only overwrite if the user typed something.
                $remarksValue = isset($item['remarks']) && trim($item['remarks']) !== ''
                    ? trim($item['remarks'])
                    : $cartItem->remarks; // keep existing value

                $cartItem->update([
                    'issued_quantity' => $item['issued_qty'],
                    'mrs_status'      => 'For Pick Up',
                    'remarks'         => $remarksValue,
                ]);

                $detail = ConsumableDetail::where('item_code', $cartItem->itemCode)->first();
                if ($detail) {
                    $oldQty = $detail->quantity;
                    $newQty = $oldQty - $item['issued_qty'];
                    if ($newQty < 0) throw new \Exception("Insufficient stock for item: {$cartItem->itemCode}");
                    $detail->update(['quantity' => $newQty]);
                    ConsumableDetailHistory::create([
                        'consumable_detail_id' => $detail->id,
                        'consumable_id'        => $detail->consumable_id,
                        'action'               => 'updated',
                        'user_id'              => $userId,
                        'user_name'            => $userName,
                        'item_code'            => $detail->item_code,
                        'changes'              => ['quantity'],
                        'old_values'           => ['quantity' => (string)$oldQty, 'mrs_no' => $request->mrs_no, 'action_type' => 'issued'],
                        'new_values'           => ['quantity' => (string)$newQty],
                    ]);
                }
            }
        });

        broadcast(new MaterialIssuanceUpdated('consumable', 'qty_updated', $request->mrs_no));
        return back()->with('success', 'Items ready for pick up and inventory updated');
    } catch (\Exception $e) {
        \Log::error('updateIssuedQtyConsumable error: ' . $e->getMessage());
        return back()->withErrors(['error' => $e->getMessage()]);
    }
}

    public function markDeliveredConsumable(Request $request)
    {
        $request->validate(['mrs_no' => 'required|string']);
        ConsumableCart::where('mrs_no', $request->mrs_no)->where('approver_status', 'approved')
            ->where('mrs_status', 'For Pick Up')->update(['mrs_status' => 'Delivered']);
        broadcast(new MaterialIssuanceUpdated('consumable', 'delivered', $request->mrs_no));
        return back()->with('success', 'Items marked as delivered');
    }

public function returnConsumableItem(Request $request)
{
    $request->validate([
        'item_id' => 'required|integer', 'mrs_no' => 'required|string',
        'remarks' => 'required|string|max:500',
    ]);

    $user     = $this->getCurrentUserData();
    $userId   = $user['userId'];
    $userName = $user['userName'];

    DB::transaction(function () use ($request, $userId, $userName) {
        $cartItem = ConsumableCart::where('id', $request->item_id)
            ->where('mrs_no', $request->mrs_no)->where('mrs_status', 'Delivered')->first();
        if (!$cartItem) throw new \Exception("Item not found or not in delivered status");
        $cartItem->update(['mrs_status' => 'Return', 'remarks' => $request->remarks]);
        $detail = ConsumableDetail::where('item_code', $cartItem->itemCode)
            ->where('serial', $cartItem->serial)->first();
        if ($detail) {
            $oldQty = $detail->quantity;
            $newQty = $oldQty + $cartItem->issued_quantity;
            $detail->update(['quantity' => $newQty]);
            ConsumableDetailHistory::create([
                'consumable_detail_id' => $detail->id,
                'consumable_id'        => $detail->consumable_id,
                'action'               => 'updated',
                'user_id'              => $userId,
                'user_name'            => $userName,
                'item_code'            => $detail->item_code,
                'changes'              => ['quantity'],
                'old_values'           => ['quantity' => (string)$oldQty, 'mrs_no' => $request->mrs_no, 'action_type' => 'returned'],
                'new_values'           => ['quantity' => (string)$newQty],
            ]);
        }
    });

    broadcast(new MaterialIssuanceUpdated('consumable', 'item_returned', $request->mrs_no));
    return back()->with('success', 'Item returned successfully and inventory updated');
}

    // ==================== CANCEL ITEM — CONSUMABLE ====================

    public function cancelItemConsumablePreparing(Request $request)
    {
        $request->validate([
            'item_id' => 'required|integer',
            'mrs_no'  => 'required|string',
            'remarks' => 'required|string|max:500',
        ]);

        DB::transaction(function () use ($request) {
            $cartItem = ConsumableCart::where('id', $request->item_id)
                ->where('mrs_no', $request->mrs_no)
                ->where('approver_status', 'approved')
                ->where('mrs_status', 'Preparing')
                ->firstOrFail();

            $cartItem->update([
                'mrs_status' => 'Cancelled',
                'remarks'    => 'Cancelled: ' . $request->remarks,
            ]);
        });

        broadcast(new MaterialIssuanceUpdated('consumable', 'item_cancelled', $request->mrs_no));
        return back()->with('success', 'Item cancelled successfully');
    }

public function cancelItemConsumableForPickUp(Request $request)
{
    $request->validate([
        'item_id' => 'required|integer',
        'mrs_no'  => 'required|string',
        'remarks' => 'required|string|max:500',
    ]);

    $user     = $this->getCurrentUserData();
    $userId   = $user['userId'];
    $userName = $user['userName'];

    DB::transaction(function () use ($request, $userId, $userName) {
        $cartItem = ConsumableCart::where('id', $request->item_id)
            ->where('mrs_no', $request->mrs_no)
            ->where('approver_status', 'approved')
            ->where('mrs_status', 'For Pick Up')
            ->firstOrFail();

        $issuedQty = $cartItem->issued_quantity ?? 0;
        if ($issuedQty > 0) {
            $detail = ConsumableDetail::where('item_code', $cartItem->itemCode)
                ->where('serial', $cartItem->serial)
                ->first();
            if ($detail) {
                $oldQty = $detail->quantity;
                $newQty = $oldQty + $issuedQty;
                $detail->update(['quantity' => $newQty]);
                ConsumableDetailHistory::create([
                    'consumable_detail_id' => $detail->id,
                    'consumable_id'        => $detail->consumable_id,
                    'action'               => 'updated',
                    'user_id'              => $userId,
                    'user_name'            => $userName,
                    'item_code'            => $detail->item_code,
                    'changes'              => ['quantity'],
                    'old_values'           => ['quantity' => (string)$oldQty, 'mrs_no' => $request->mrs_no, 'action_type' => 'cancelled'],
                    'new_values'           => ['quantity' => (string)$newQty],
                ]);
            }
        }

        $cartItem->update([
            'mrs_status' => 'Cancelled',
            'remarks'    => 'Cancelled: ' . $request->remarks,
        ]);
    });

    broadcast(new MaterialIssuanceUpdated('consumable', 'item_cancelled', $request->mrs_no));
    return back()->with('success', 'Item cancelled and inventory restored successfully');
}

    // ==================== CANCEL ITEM — SUPPLIES ====================

    public function cancelItemSuppliesPreparing(Request $request)
    {
        $request->validate([
            'item_id' => 'required|integer',
            'mrs_no'  => 'required|string',
            'remarks' => 'required|string|max:500',
        ]);

        DB::transaction(function () use ($request) {
            $cartItem = SuppliesCart::where('id', $request->item_id)
                ->where('mrs_no', $request->mrs_no)
                ->where('approver_status', 'approved')
                ->where('mrs_status', 'Preparing')
                ->firstOrFail();

            $cartItem->update([
                'mrs_status' => 'Cancelled',
                'remarks'    => 'Cancelled: ' . $request->remarks,
            ]);
        });

        broadcast(new MaterialIssuanceUpdated('supplies', 'item_cancelled', $request->mrs_no));
        return back()->with('success', 'Item cancelled successfully');
    }

public function cancelItemSuppliesForPickUp(Request $request)
{
    $request->validate([
        'item_id' => 'required|integer',
        'mrs_no'  => 'required|string',
        'remarks' => 'required|string|max:500',
    ]);

    $user     = $this->getCurrentUserData();
    $userId   = $user['userId'];
    $userName = $user['userName'];

    DB::transaction(function () use ($request, $userId, $userName) {
        $cartItem = SuppliesCart::where('id', $request->item_id)
            ->where('mrs_no', $request->mrs_no)
            ->where('approver_status', 'approved')
            ->where('mrs_status', 'For Pick Up')
            ->firstOrFail();

        $issuedQty = $cartItem->issued_qty ?? 0;
        if ($issuedQty > 0) {
            $detail = SupplyDetail::where('item_code', $cartItem->itemCode)
                ->where(function ($q) use ($cartItem) {
                    if (!empty($cartItem->detailed_description)) {
                        $q->where('detailed_description', $cartItem->detailed_description);
                    }
                })
                ->active()
                ->first();

            if (!$detail) {
                $detail = SupplyDetail::where('item_code', $cartItem->itemCode)->active()->first();
            }

            if ($detail) {
                $oldQty = $detail->qty;
                $newQty = $oldQty + $issuedQty;
                $detail->update(['qty' => $newQty]);
                SupplyDetailHistory::create([
                    'supplies_no'          => $detail->supplies_no,
                    'item_code'            => $detail->item_code,
                    'detailed_description' => $detail->detailed_description,
                    'material_description' => $detail->supply->material_description ?? null,
                    'uom'                  => $detail->supply->uom ?? null,
                    'action'               => 'updated',
                    'user_id'              => $userId,
                    'user_name'            => $userName,
                    'changes'              => ['qty'],
                    'old_values'           => ['qty' => (string)$oldQty, 'mrs_no' => $request->mrs_no, 'action_type' => 'cancelled'],
                    'new_values'           => ['qty' => (string)$newQty],
                ]);
            }
        }

        $cartItem->update([
            'mrs_status' => 'Cancelled',
            'remarks'    => 'Cancelled: ' . $request->remarks,
        ]);
    });

    broadcast(new MaterialIssuanceUpdated('supplies', 'item_cancelled', $request->mrs_no));
    return back()->with('success', 'Item cancelled and inventory restored successfully');
}

    // ==================== CANCEL ITEM — CONSIGNED ====================

    public function cancelItemConsignedPreparing(Request $request)
    {
        $request->validate([
            'item_id' => 'required|integer',
            'mrs_no'  => 'required|string',
            'remarks' => 'required|string|max:500',
        ]);

        DB::transaction(function () use ($request) {
            $cartItem = ConsignedCart::where('id', $request->item_id)
                ->where('mrs_no', $request->mrs_no)
                ->where('mrs_status', 'Preparing')
                ->firstOrFail();

            $cartItem->update([
                'mrs_status' => 'Cancelled',
                'remarks'    => 'Cancelled: ' . $request->remarks,
            ]);
        });

        broadcast(new MaterialIssuanceUpdated('consigned', 'item_cancelled', $request->mrs_no));
        return back()->with('success', 'Item cancelled successfully');
    }

    public function cancelItemConsignedForPickUp(Request $request)
    {
        $request->validate([
            'item_id' => 'required|integer',
            'mrs_no'  => 'required|string',
            'remarks' => 'required|string|max:500',
        ]);

        $user     = $this->getCurrentUserData();
        $userId   = $user['userId'];
        $userName = $user['userName'];

        DB::transaction(function () use ($request, $userId, $userName) {
            $cartItem = ConsignedCart::where('id', $request->item_id)
                ->where('mrs_no', $request->mrs_no)
                ->where('mrs_status', 'For Pick Up')
                ->firstOrFail();

            $issuedQty = $cartItem->issued_qty ?? 0;
            if ($issuedQty > 0) {
                $detail = ConsignedDetail::where('item_code', $cartItem->item_code)
                    ->where(function ($q) use ($cartItem) {
                        if (empty($cartItem->supplier) || $cartItem->supplier === 'N/A') {
                            $q->whereNull('supplier')
                                ->orWhere('supplier', '')
                                ->orWhere('supplier', 'N/A');
                        } else {
                            $q->where('supplier', $cartItem->supplier);
                        }
                    })->first();

                if ($detail) {
                    $oldQty = $detail->qty;
                    $newQty = $oldQty + $issuedQty;
                    $detail->update(['qty' => $newQty]);
                    $this->logConsignedDetailHistory(
                        $detail->id, $detail->consigned_no, $detail->commonality,
                        $detail->item_code, $detail->mat_description,
                        'item_cancelled_return', $userId, $userName, ['qty'],
                        ['qty' => $oldQty], ['qty' => $newQty],
                        ['mrs_no' => $request->mrs_no, 'returned_qty' => $issuedQty,
                         'supplier' => $cartItem->supplier, 'reason' => 'Item Cancelled']
                    );
                }
            }

            $cartItem->update([
                'mrs_status' => 'Cancelled',
                'remarks'    => 'Cancelled: ' . $request->remarks,
            ]);
        });

        broadcast(new MaterialIssuanceUpdated('consigned', 'item_cancelled', $request->mrs_no));
        return back()->with('success', 'Item cancelled and inventory restored successfully');
    }

    // ==================== REPLACEMENT ITEMS — CONSUMABLE ====================

    public function getReplacementItemsConsumable(Request $request)
    {
        $search = $request->input('search', '');
        if (strlen(trim($search)) < 2) return $this->returnWithAllData(collect([]));
        $searchTerm = '%' . strtolower($search) . '%';

        $items = ConsumableDetail::with('consumable:consumable_id,material_description')
            ->where('quantity', '>', 0)
            ->where(fn($q) => $q
                ->whereRaw('LOWER(item_code) LIKE ?', [$searchTerm])
                ->orWhereRaw('LOWER(detailed_description) LIKE ?', [$searchTerm])
                ->orWhereRaw('LOWER(serial) LIKE ?', [$searchTerm])
                ->orWhereRaw('LOWER(bin_location) LIKE ?', [$searchTerm]))
            ->limit(100)->get()
            ->map(fn($item) => [
                'id'                   => $item->id,
                'item_code'            => $item->item_code,
                'material_description' => $item->consumable->material_description ?? 'N/A',
                'detailed_description' => $item->detailed_description,
                'serial'               => $item->serial,
                'bin_location'         => $item->bin_location,
                'quantity'             => $item->quantity,
            ]);

        return $this->returnWithAllData($items);
    }

    public function replaceItemConsumable(Request $request)
    {
        $request->validate([
            'mrs_no'          => 'required|string',
            'old_item_id'     => 'required|integer',
            'new_item_code'   => 'required|string',
            'new_serial'      => 'nullable|string',
            'replacement_qty' => 'required|integer|min:1',
            'remarks'         => 'required|string|max:500',
        ]);

        DB::transaction(function () use ($request) {
            $cartItem = ConsumableCart::where('id', $request->old_item_id)
                ->where('mrs_no', $request->mrs_no)->firstOrFail();
            if ($request->replacement_qty > $cartItem->issued_quantity)
                throw new \Exception("Replacement quantity cannot exceed issued quantity");

            $oldItem = ConsumableDetail::where('item_code', $cartItem->itemCode)
                ->where('serial', $cartItem->serial)->first();
            if ($oldItem) $oldItem->update(['quantity' => $oldItem->quantity + $request->replacement_qty]);

            $newItem = ConsumableDetail::with('consumable:consumable_id,material_description')
                ->where('item_code', $request->new_item_code)
                ->when(
                    !empty($request->new_serial) && $request->new_serial !== 'N/A',
                    fn($q) => $q->where('serial', $request->new_serial),
                    fn($q) => $q->where(function ($q) {
                        $q->whereNull('serial')->orWhere('serial', '')->orWhere('serial', 'N/A');
                    })
                )
                ->first();
            if (!$newItem) throw new \Exception("Replacement item not found in inventory");
            if ($newItem->quantity < $request->replacement_qty)
                throw new \Exception("Insufficient stock. Available: {$newItem->quantity}");
            $newItem->update(['quantity' => $newItem->quantity - $request->replacement_qty]);

            if ($request->replacement_qty < $cartItem->issued_quantity) {
                $cartItem->update([
                    'issued_quantity'  => $cartItem->issued_quantity - $request->replacement_qty,
                    'request_quantity' => $cartItem->request_quantity - $request->replacement_qty,
                ]);
                ConsumableCart::create(array_merge($cartItem->only([
                    'mrs_no', 'order_date', 'emp_id', 'emp_name', 'approver', 'department',
                    'prodline', 'mrs_status', 'approver_status', 'issued_by', 'uom',
                ]), [
                    'itemCode'             => $request->new_item_code,
                    'serial'               => $request->new_serial,
                    'material_description' => $newItem->consumable->material_description ?? $cartItem->material_description,
                    'detailed_description' => $newItem->detailed_description,
                    'bin_location'         => $newItem->bin_location,
                    'quantity'             => $newItem->quantity,
                    'request_quantity'     => $request->replacement_qty,
                    'issued_quantity'      => $request->replacement_qty,
                    'remarks'              => $request->remarks,
                ]));
            } else {
                $cartItem->update([
                    'itemCode'             => $request->new_item_code,
                    'serial'               => $request->new_serial,
                    'material_description' => $newItem->consumable->material_description ?? $cartItem->material_description,
                    'detailed_description' => $newItem->detailed_description,
                    'bin_location'         => $newItem->bin_location,
                    'remarks'              => $request->remarks,
                ]);
            }
        });

        broadcast(new MaterialIssuanceUpdated('consumable', 'item_replaced', $request->mrs_no));
        return $this->getUpdatedData('consumable');
    }

    // ==================== SUPPLIES METHODS ====================

public function updateSuppliesStatus(Request $request)
{
    try {
        $request->validate(['mrs_no' => 'required|string', 'status' => 'required|string']);
        $user = $this->getCurrentUserData();

        SuppliesCart::where('mrs_no', $request->mrs_no)
            ->where('approver_status', 'approved')
            ->update(['mrs_status' => $request->status, 'issued_by' => $user['userName']]);

        broadcast(new MaterialIssuanceUpdated('supplies', 'status_update', $request->mrs_no));
        return back()->with('success', 'Status updated successfully');
    } catch (\Exception $e) {
        \Log::error('updateSuppliesStatus error: ' . $e->getMessage());
        return back()->withErrors(['error' => $e->getMessage()]);
    }
}

/**
 * Update issued quantities and per-item remarks for supplies.
 */
public function updateIssuedQtySupplies(Request $request)
{
    try {
        $request->validate([
            'mrs_no'             => 'required|string',
            'items'              => 'required|array',
            'items.*.id'         => 'required|integer',
            'items.*.issued_qty' => 'required|numeric|min:1',
            'items.*.remarks'    => 'nullable|string|max:500',
        ]);

        $user     = $this->getCurrentUserData();
        $userId   = $user['userId'];
        $userName = $user['userName'];

        DB::transaction(function () use ($request, $userId, $userName) {
            foreach ($request->items as $item) {
                $cartItem = SuppliesCart::where('id', $item['id'])
                    ->where('mrs_no', $request->mrs_no)->where('approver_status', 'approved')->first();
                if (!$cartItem) continue;

                $remarksValue = isset($item['remarks']) && trim($item['remarks']) !== ''
                    ? trim($item['remarks'])
                    : $cartItem->remarks;

                $cartItem->update([
                    'issued_qty' => $item['issued_qty'],
                    'mrs_status' => 'For Pick Up',
                    'remarks'    => $remarksValue,
                ]);

                $detail = SupplyDetail::where('item_code', $cartItem->itemCode)
                    ->where(function ($q) use ($cartItem) {
                        if (!empty($cartItem->detailed_description)) {
                            $q->where('detailed_description', $cartItem->detailed_description);
                        }
                    })
                    ->active()->first();

                if (!$detail) {
                    $detail = SupplyDetail::where('item_code', $cartItem->itemCode)->active()->first();
                }

                if ($detail) {
                    $oldQty = $detail->qty;
                    $newQty = $oldQty - $item['issued_qty'];
                    if ($newQty < 0) throw new \Exception("Insufficient stock for item: {$cartItem->itemCode} ({$cartItem->detailed_description})");
                    $detail->update(['qty' => $newQty]);
                    SupplyDetailHistory::create([
                        'supplies_no'          => $detail->supplies_no,
                        'item_code'            => $detail->item_code,
                        'detailed_description' => $detail->detailed_description,
                        'material_description' => $detail->supply->material_description ?? null,
                        'uom'                  => $detail->supply->uom ?? null,
                        'action'               => 'updated',
                        'user_id'              => $userId,
                        'user_name'            => $userName,
                        'changes'              => ['qty'],
                        'old_values'           => ['qty' => (string)$oldQty, 'mrs_no' => $request->mrs_no, 'action_type' => 'issued'],
                        'new_values'           => ['qty' => (string)$newQty],
                    ]);
                }
            }
        });

        broadcast(new MaterialIssuanceUpdated('supplies', 'qty_updated', $request->mrs_no));
        return back()->with('success', 'Items ready for pick up and inventory updated');
    } catch (\Exception $e) {
        \Log::error('updateIssuedQtySupplies error: ' . $e->getMessage());
        return back()->withErrors(['error' => $e->getMessage()]);
    }
}

    public function markDeliveredSupplies(Request $request)
    {
        $request->validate(['mrs_no' => 'required|string']);
        SuppliesCart::where('mrs_no', $request->mrs_no)->where('approver_status', 'approved')
            ->where('mrs_status', 'For Pick Up')->update(['mrs_status' => 'Delivered']);
        broadcast(new MaterialIssuanceUpdated('supplies', 'delivered', $request->mrs_no));
        return back()->with('success', 'Items marked as delivered');
    }

public function returnSuppliesItem(Request $request)
{
    $request->validate([
        'item_id' => 'required|integer', 'mrs_no' => 'required|string',
        'remarks' => 'required|string|max:500',
    ]);

    $user     = $this->getCurrentUserData();
    $userId   = $user['userId'];
    $userName = $user['userName'];

    DB::transaction(function () use ($request, $userId, $userName) {
        $cartItem = SuppliesCart::where('id', $request->item_id)
            ->where('mrs_no', $request->mrs_no)->where('mrs_status', 'Delivered')->first();
        if (!$cartItem) throw new \Exception("Item not found or not in delivered status");
        $cartItem->update(['mrs_status' => 'Return', 'remarks' => $request->remarks]);

        $detail = SupplyDetail::where('item_code', $cartItem->itemCode)
            ->where(function ($q) use ($cartItem) {
                if (!empty($cartItem->detailed_description)) {
                    $q->where('detailed_description', $cartItem->detailed_description);
                }
            })
            ->active()->first();

        if (!$detail) {
            $detail = SupplyDetail::where('item_code', $cartItem->itemCode)->active()->first();
        }

        if ($detail) {
            $oldQty = $detail->qty;
            $newQty = $oldQty + $cartItem->issued_qty;
            $detail->update(['qty' => $newQty]);
            SupplyDetailHistory::create([
                'supplies_no'          => $detail->supplies_no,
                'item_code'            => $detail->item_code,
                'detailed_description' => $detail->detailed_description,
                'material_description' => $detail->supply->material_description ?? null,
                'uom'                  => $detail->supply->uom ?? null,
                'action'               => 'updated',
                'user_id'              => $userId,
                'user_name'            => $userName,
                'changes'              => ['qty'],
                'old_values'           => ['qty' => (string)$oldQty, 'mrs_no' => $request->mrs_no, 'action_type' => 'returned'],
                'new_values'           => ['qty' => (string)$newQty],
            ]);
        }
    });

    broadcast(new MaterialIssuanceUpdated('supplies', 'item_returned', $request->mrs_no));
    return back()->with('success', 'Item returned successfully and inventory updated');
}

    public function getReplacementItemsSupplies(Request $request)
    {
        $search = $request->input('search', '');
        if (strlen(trim($search)) < 2) return $this->returnWithAllData(collect([]));
        $searchTerm = '%' . strtolower($search) . '%';

        $items = SupplyDetail::with('supply:supplies_no,material_description')
            ->where('qty', '>', 0)->active()
            ->where(fn($q) => $q
                ->whereRaw('LOWER(item_code) LIKE ?', [$searchTerm])
                ->orWhereRaw('LOWER(detailed_description) LIKE ?', [$searchTerm]))
            ->limit(100)->get()
            ->map(fn($item) => [
                'id'                   => $item->id,
                'item_code'            => $item->item_code,
                'material_description' => $item->supply->material_description ?? 'N/A',
                'detailed_description' => $item->detailed_description,
                'qty'                  => $item->qty,
            ]);

        return $this->returnWithAllData($items);
    }

    public function replaceItemSupplies(Request $request)
    {
        $request->validate([
            'mrs_no'                   => 'required|string',
            'old_item_id'              => 'required|integer',
            'new_item_code'            => 'required|string',
            'new_detailed_description' => 'nullable|string',
            'replacement_qty'          => 'required|integer|min:1',
            'remarks'                  => 'required|string|max:500',
        ]);

        DB::transaction(function () use ($request) {
            $cartItem = SuppliesCart::where('id', $request->old_item_id)
                ->where('mrs_no', $request->mrs_no)->firstOrFail();
            if ($request->replacement_qty > $cartItem->issued_qty)
                throw new \Exception("Replacement quantity cannot exceed issued quantity");

            $oldItem = SupplyDetail::where('item_code', $cartItem->itemCode)
                ->where(function ($q) use ($cartItem) {
                    if (!empty($cartItem->detailed_description)) {
                        $q->where('detailed_description', $cartItem->detailed_description);
                    }
                })
                ->active()->first();

            if (!$oldItem) {
                $oldItem = SupplyDetail::where('item_code', $cartItem->itemCode)->active()->first();
            }

            if ($oldItem) $oldItem->update(['qty' => $oldItem->qty + $request->replacement_qty]);

            $newItem = SupplyDetail::with('supply:supplies_no,material_description')
                ->where('item_code', $request->new_item_code)
                ->where(function ($q) use ($request) {
                    if (!empty($request->new_detailed_description)) {
                        $q->where('detailed_description', $request->new_detailed_description);
                    }
                })
                ->active()->first();
            if (!$newItem) throw new \Exception("Replacement item not found in inventory");
            if ($newItem->qty < $request->replacement_qty)
                throw new \Exception("Insufficient stock. Available: {$newItem->qty}");
            $newItem->update(['qty' => $newItem->qty - $request->replacement_qty]);

            if ($request->replacement_qty < $cartItem->issued_qty) {
                $cartItem->update([
                    'issued_qty'  => $cartItem->issued_qty - $request->replacement_qty,
                    'request_qty' => $cartItem->request_qty - $request->replacement_qty,
                ]);
                SuppliesCart::create(array_merge($cartItem->only([
                    'mrs_no', 'order_date', 'emp_id', 'emp_name', 'approver', 'department',
                    'prodline', 'mrs_status', 'approver_status', 'issued_by', 'uom',
                ]), [
                    'itemCode'             => $request->new_item_code,
                    'material_description' => $newItem->supply->material_description ?? $cartItem->material_description,
                    'detailed_description' => $newItem->detailed_description,
                    'bin_location'         => $newItem->bin_location,
                    'quantity'             => $newItem->qty,
                    'request_qty'          => $request->replacement_qty,
                    'issued_qty'           => $request->replacement_qty,
                    'remarks'              => $request->remarks,
                ]));
            } else {
                $cartItem->update([
                    'itemCode'             => $request->new_item_code,
                    'material_description' => $newItem->supply->material_description ?? $cartItem->material_description,
                    'detailed_description' => $newItem->detailed_description,
                    'remarks'              => $request->remarks,
                ]);
            }
        });

        broadcast(new MaterialIssuanceUpdated('supplies', 'item_replaced', $request->mrs_no));
        return $this->getUpdatedData('supplies');
    }

    // ==================== CONSIGNED METHODS ====================

public function updateConsignedStatus(Request $request)
{
    try {
        $request->validate(['mrs_no' => 'required|string', 'status' => 'required|string']);
        $user = $this->getCurrentUserData();

        ConsignedCart::where('mrs_no', $request->mrs_no)
            ->update(['mrs_status' => $request->status, 'issued_by' => $user['userName']]);

        broadcast(new MaterialIssuanceUpdated('consigned', 'status_update', $request->mrs_no));
        return back()->with('success', 'Status updated successfully');
    } catch (\Exception $e) {
        \Log::error('updateConsignedStatus error: ' . $e->getMessage());
        return back()->withErrors(['error' => $e->getMessage()]);
    }
}

/**
 * Update issued quantities and per-item remarks for consigned items.
 */
public function updateIssuedQtyConsigned(Request $request)
{
    try {
        $request->validate([
            'mrs_no'             => 'required|string',
            'items'              => 'required|array',
            'items.*.id'         => 'required|integer',
            'items.*.issued_qty' => 'required|numeric|min:1',
            'items.*.remarks'    => 'nullable|string|max:500',
        ]);

        $user     = $this->getCurrentUserData();
        $userId   = $user['userId'];
        $userName = $user['userName'];

        DB::transaction(function () use ($request, $userId, $userName) {
            foreach ($request->items as $item) {
                $cartItem = ConsignedCart::where('id', $item['id'])
                    ->where('mrs_no', $request->mrs_no)->first();
                if (!$cartItem) continue;

                $remarksValue = isset($item['remarks']) && trim($item['remarks']) !== ''
                    ? trim($item['remarks'])
                    : $cartItem->remarks;

                $cartItem->update([
                    'issued_qty' => $item['issued_qty'],
                    'mrs_status' => 'For Pick Up',
                    'remarks'    => $remarksValue,
                ]);

                $matchingDetails = ConsignedDetail::where('item_code', $cartItem->item_code)
                    ->where('mat_description', $cartItem->material_description)
                    ->where(function ($q) use ($cartItem) {
                        if (empty($cartItem->supplier) || $cartItem->supplier === 'N/A') {
                            $q->whereNull('supplier')->orWhere('supplier', '')->orWhere('supplier', 'N/A');
                        } else {
                            $q->where('supplier', $cartItem->supplier);
                        }
                    })
                    ->where('qty', '>', 0)->get();

                if ($matchingDetails->isEmpty()) {
                    $matchingDetails = ConsignedDetail::where('item_code', $cartItem->item_code)
                        ->where('mat_description', $cartItem->material_description)->where('qty', '>', 0)->get();
                    if ($matchingDetails->isEmpty()) {
                        $matchingDetails = ConsignedDetail::where('item_code', $cartItem->item_code)
                            ->where('qty', '>', 0)->get();
                    }
                }

                if ($matchingDetails->isEmpty())
                    throw new \Exception("No stock available for item: {$cartItem->item_code}");

                $consignedDetail = $matchingDetails->sortBy(function ($detail) {
                    if (!$detail->expiration) return PHP_INT_MAX;
                    $exp = Carbon::parse($detail->expiration);
                    return $exp->isFuture()
                        ? $exp->diffInDays(Carbon::now(), false)
                        : 1000000 + $exp->diffInDays(Carbon::now());
                })->first();

                if ($consignedDetail) {
                    $oldQty = $consignedDetail->qty;
                    $newQty = $oldQty - $item['issued_qty'];
                    if ($newQty < 0) throw new \Exception("Insufficient stock for item: {$cartItem->item_code}");
                    $consignedDetail->update(['qty' => $newQty]);
                    $cartItem->update([
                        'supplier'     => $consignedDetail->supplier,
                        'expiration'   => $consignedDetail->expiration,
                        'bin_location' => $consignedDetail->bin_location,
                    ]);
                    $this->logConsignedDetailHistory(
                        $consignedDetail->id, $consignedDetail->consigned_no, $consignedDetail->commonality,
                        $consignedDetail->item_code, $consignedDetail->mat_description,
                        'issued', $userId, $userName, ['qty'], ['qty' => $oldQty], ['qty' => $newQty],
                        ['mrs_no' => $request->mrs_no, 'issued_qty' => $item['issued_qty'],
                         'supplier' => $cartItem->supplier, 'expiration' => $consignedDetail->expiration,
                         'bin_location' => $consignedDetail->bin_location]
                    );
                }
            }
        });

        broadcast(new MaterialIssuanceUpdated('consigned', 'qty_updated', $request->mrs_no));
        return back()->with('success', 'Items ready for pick up and inventory updated');
    } catch (\Exception $e) {
        \Log::error('updateIssuedQtyConsigned error: ' . $e->getMessage());
        return back()->withErrors(['error' => $e->getMessage()]);
    }
}

    public function markDeliveredConsigned(Request $request)
    {
        $request->validate(['mrs_no' => 'required|string']);
        ConsignedCart::where('mrs_no', $request->mrs_no)->where('mrs_status', 'For Pick Up')
            ->update(['mrs_status' => 'Delivered']);
        broadcast(new MaterialIssuanceUpdated('consigned', 'delivered', $request->mrs_no));
        return back()->with('success', 'Items marked as delivered');
    }

    public function returnConsignedItem(Request $request)
    {
        $request->validate([
            'item_id' => 'required|integer', 'mrs_no' => 'required|string',
            'remarks' => 'required|string|max:500',
        ]);

        $userIdRaw = session('emp_data.emp_id', null);
        $userId    = is_numeric($userIdRaw) ? (int) $userIdRaw : null;
        $userName  = session('emp_data.emp_name', 'Unknown User');

        DB::transaction(function () use ($request, $userId, $userName) {
            $cartItem = ConsignedCart::where('id', $request->item_id)
                ->where('mrs_no', $request->mrs_no)->where('mrs_status', 'Delivered')->first();
            if (!$cartItem) throw new \Exception("Item not found or not in delivered status");

            $cartItem->update(['mrs_status' => 'Return', 'remarks' => $request->remarks]);

            $detail = ConsignedDetail::where('item_code', $cartItem->item_code)
                ->where(function ($q) use ($cartItem) {
                    if (empty($cartItem->supplier) || $cartItem->supplier === 'N/A') {
                        $q->whereNull('supplier')->orWhere('supplier', '')->orWhere('supplier', 'N/A');
                    } else {
                        $q->where('supplier', $cartItem->supplier);
                    }
                })->first();
            if ($detail) {
                $oldQty = $detail->qty;
                $newQty = $oldQty + $cartItem->issued_qty;
                $detail->update(['qty' => $newQty]);
                $this->logConsignedDetailHistory(
                    $detail->id, $detail->consigned_no, $detail->commonality,
                    $detail->item_code, $detail->mat_description,
                    'returned', $userId, $userName, ['qty'], ['qty' => $oldQty], ['qty' => $newQty],
                    ['mrs_no' => $request->mrs_no, 'returned_qty' => $cartItem->issued_qty, 'supplier' => $cartItem->supplier]
                );
            }
        });

        broadcast(new MaterialIssuanceUpdated('consigned', 'item_returned', $request->mrs_no));
        return back()->with('success', 'Item returned successfully and inventory updated');
    }

    public function getReplacementItemsConsigned(Request $request)
    {
        $search = $request->input('search', '');
        if (strlen(trim($search)) < 2) return $this->returnWithAllData(collect([]));
        $searchTerm = '%' . strtolower($search) . '%';

        $items = ConsignedDetail::where('qty', '>', 0)
            ->where(fn($q) => $q
                ->whereRaw('LOWER(item_code) LIKE ?', [$searchTerm])
                ->orWhereRaw('LOWER(mat_description) LIKE ?', [$searchTerm])
                ->orWhereRaw('LOWER(supplier) LIKE ?', [$searchTerm])
                ->orWhereRaw('LOWER(bin_location) LIKE ?', [$searchTerm]))
            ->limit(100)->get()
            ->map(fn($item) => [
                'id'                   => $item->id,
                'item_code'            => $item->item_code,
                'material_description' => $item->mat_description,
                'detailed_description' => $item->mat_description,
                'supplier'             => $item->supplier,
                'expiration'           => $item->expiration ? Carbon::parse($item->expiration)->format('Y-m-d') : null,
                'bin_location'         => $item->bin_location,
                'quantity'             => $item->qty,
                'qty'                  => $item->qty,
                'uom'                  => $item->uom,
                'qty_per_box'          => $item->qty_per_box,
                'commonality'          => $item->commonality,
                'category'             => $item->category ?? null,
            ]);

        return $this->returnWithAllData($items);
    }

    public function replaceItemConsigned(Request $request)
    {
        $request->validate([
            'mrs_no'          => 'required|string',
            'old_item_id'     => 'required|integer',
            'new_item_code'   => 'required|string',
            'new_supplier'    => 'nullable|string',
            'replacement_qty' => 'required|integer|min:1',
            'remarks'         => 'required|string|max:500',
        ]);

        $userIdRaw = session('emp_data.emp_id', null);
        $userId    = is_numeric($userIdRaw) ? (int) $userIdRaw : null;
        $userName  = session('emp_data.emp_name', 'Unknown User');

        DB::beginTransaction();
        try {
            $cartItem = ConsignedCart::where('id', $request->old_item_id)
                ->where('mrs_no', $request->mrs_no)->firstOrFail();
            if ($request->replacement_qty > $cartItem->issued_qty)
                throw new \Exception("Replacement quantity cannot exceed issued quantity");

            $oldItem = ConsignedDetail::where('item_code', $cartItem->item_code)
                ->where(function ($q) use ($cartItem) {
                    if (empty($cartItem->supplier) || $cartItem->supplier === 'N/A') {
                        $q->whereNull('supplier')->orWhere('supplier', '')->orWhere('supplier', 'N/A');
                    } else {
                        $q->where('supplier', $cartItem->supplier);
                    }
                })->first();
            if ($oldItem) {
                $oldOld = $oldItem->qty;
                $oldNew = $oldOld + $request->replacement_qty;
                $oldItem->update(['qty' => $oldNew]);
                $this->logConsignedDetailHistory(
                    $oldItem->id, $oldItem->consigned_no, $oldItem->commonality,
                    $oldItem->item_code, $oldItem->mat_description,
                    'replacement_return', $userId, $userName,
                    ['qty'], ['qty' => $oldOld], ['qty' => $oldNew],
                    ['mrs_no' => $request->mrs_no, 'returned_qty' => $request->replacement_qty,
                     'supplier' => $cartItem->supplier, 'reason' => 'Replaced with new item']
                );
            }

            $newItem = ConsignedDetail::where('item_code', $request->new_item_code)
                ->where('supplier', $request->new_supplier)->first();
            if (!$newItem) throw new \Exception("Replacement item not found in inventory");
            if ($newItem->qty < $request->replacement_qty)
                throw new \Exception("Insufficient stock. Available: {$newItem->qty}");

            $newOld = $newItem->qty;
            $newNew = $newOld - $request->replacement_qty;
            $newItem->update(['qty' => $newNew]);
            $this->logConsignedDetailHistory(
                $newItem->id, $newItem->consigned_no, $newItem->commonality,
                $newItem->item_code, $newItem->mat_description,
                'replacement_issue', $userId, $userName,
                ['qty'], ['qty' => $newOld], ['qty' => $newNew],
                ['mrs_no' => $request->mrs_no, 'issued_qty' => $request->replacement_qty,
                 'supplier' => $request->new_supplier, 'reason' => 'Replacement for ' . $cartItem->item_code]
            );

            if ($request->replacement_qty < $cartItem->issued_qty) {
                $cartItem->update([
                    'issued_qty'  => $cartItem->issued_qty - $request->replacement_qty,
                    'request_qty' => $cartItem->request_qty - $request->replacement_qty,
                ]);
                ConsignedCart::create(array_merge($cartItem->only([
                    'mrs_no', 'order_date', 'employee_no', 'station', 'factory', 'mrs_status', 'issued_by',
                ]), [
                    'item_code'           => $request->new_item_code,
                    'material_description' => $newItem->mat_description,
                    'supplier'            => $request->new_supplier,
                    'expiration'          => $newItem->expiration,
                    'bin_location'        => $newItem->bin_location,
                    'quantity'            => $newItem->qty,
                    'uom'                 => $newItem->uom,
                    'qty_per_box'         => $newItem->qty_per_box,
                    'request_qty'         => $request->replacement_qty,
                    'issued_qty'          => $request->replacement_qty,
                    'remarks'             => $request->remarks,
                ]));
            } else {
                $cartItem->update([
                    'item_code'            => $request->new_item_code,
                    'material_description' => $newItem->mat_description,
                    'supplier'             => $request->new_supplier,
                    'expiration'           => $newItem->expiration,
                    'bin_location'         => $newItem->bin_location,
                    'quantity'             => $newItem->qty,
                    'uom'                  => $newItem->uom,
                    'qty_per_box'          => $newItem->qty_per_box,
                    'remarks'              => $request->remarks,
                ]);
            }

            DB::commit();
            broadcast(new MaterialIssuanceUpdated('consigned', 'item_replaced', $request->mrs_no));
            return $this->getUpdatedData('consigned');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // ==================== HELPER METHODS ====================

private function returnWithAllData($replacementItems)
{
    $user        = $this->getCurrentUserData();
    $currentUser = $user['currentUser'];
    $isAdmin     = $user['isAdmin'];

    $pendingConsumables = ConsumableCart::where('approver_status', 'approved')
        ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');
    $pendingSupplies = SuppliesCart::where('approver_status', 'approved')
        ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');
    $pendingConsigned = ConsignedCart::whereNotNull('mrs_status')
        ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');

    return Inertia::render('MaterialIssuance', [
        'consumables'        => Inertia::lazy(fn() => $this->getConsumablesData($currentUser, $isAdmin)),
        'supplies'           => Inertia::lazy(fn() => $this->getSuppliesData($currentUser, $isAdmin)),
        'consigned'          => Inertia::lazy(fn() => $this->getConsignedData($currentUser, $isAdmin)),
        'replacementItems'   => $replacementItems,
        'pendingCount'       => $pendingConsumables + $pendingSupplies + $pendingConsigned,
        'pendingConsumables' => $pendingConsumables,
        'pendingSupplies'    => $pendingSupplies,
        'pendingConsigned'   => $pendingConsigned,
    ]);
}

private function getUpdatedData($type)
{
    $user        = $this->getCurrentUserData();
    $currentUser = $user['currentUser'];
    $isAdmin     = $user['isAdmin'];

    $pendingConsumables = ConsumableCart::where('approver_status', 'approved')
        ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');
    $pendingSupplies = SuppliesCart::where('approver_status', 'approved')
        ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');
    $pendingConsigned = ConsignedCart::whereNotNull('mrs_status')
        ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');

    return Inertia::render('MaterialIssuance', [
        'consumables'        => $this->getConsumablesData($currentUser, $isAdmin),
        'supplies'           => $this->getSuppliesData($currentUser, $isAdmin),
        'consigned'          => $this->getConsignedData($currentUser, $isAdmin),
        'pendingCount'       => $pendingConsumables + $pendingSupplies + $pendingConsigned,
        'pendingConsumables' => $pendingConsumables,
        'pendingSupplies'    => $pendingSupplies,
        'pendingConsigned'   => $pendingConsigned,
    ]);
}

    public function getPendingCount()
    {
        $pendingConsumables = ConsumableCart::where('approver_status', 'approved')
            ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');
        $pendingSupplies = SuppliesCart::where('approver_status', 'approved')
            ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');
        $pendingConsigned = ConsignedCart::whereNotNull('mrs_status')
            ->where('mrs_status', 'Pending')->distinct('mrs_no')->count('mrs_no');

        return response()->json([
            'total'              => $pendingConsumables + $pendingSupplies + $pendingConsigned,
            'pendingConsumables' => $pendingConsumables,
            'pendingSupplies'    => $pendingSupplies,
            'pendingConsigned'   => $pendingConsigned,
        ]);
    }

    private function logConsignedDetailHistory(
        $detailId, $consignedNo, $commonality, $itemCode, $matDesc,
        $action, $userId, $userName, $changes, $oldValues, $newValues, $additionalData = []
    ) {
        ConsignedDetailHistory::create([
            'consigned_detail_id' => $detailId,
            'consigned_no'        => $consignedNo,
            'commonality'         => $commonality,
            'item_code'           => $itemCode,
            'mat_description'     => $matDesc,
            'action'              => $action,
            'user_id'             => $userId,
            'user_name'           => $userName,
            'changes'             => $changes,
            'old_values'          => array_merge($oldValues, $additionalData),
            'new_values'          => $newValues,
            'created_at'          => now(),
        ]);
    }

    private function getCurrentUserData(): array
        {
            $empData     = session('emp_data', []);
            $logCategory = $empData['log_category'] ?? 0;
            $empStation  = $empData['emp_station'] ?? 0;

            return [
                'currentUser' => $empData['emp_name'] ?? null,
                'userId'      => is_numeric($empData['emp_id'] ?? null) ? (int) $empData['emp_id'] : null,
                'userName'    => $empData['emp_name'] ?? 'Unknown User',
                'isAdmin'     => ($logCategory == 1 || $empStation == 1),
            ];
        }

}