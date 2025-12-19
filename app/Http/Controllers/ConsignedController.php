<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Consigned;
use App\Models\ConsignedDetail;
use App\Models\ConsignedHistory;
use App\Models\ConsignedDetailHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ConsignedController extends Controller
{
    /**
     * Log quantity addition manually (not covered by model events)
     */
    private function logQuantityAddition($detail, $quantityAdded, $oldQty, $newQty)
    {
        $userName = session('emp_data.emp_name', 'Unknown User');
        
        ConsignedDetailHistory::create([
            'consigned_detail_id' => $detail->id,
            'consigned_no' => $detail->consigned_no,
            'item_code' => $detail->item_code,
            'action' => 'quantity_added',
            'user_name' => $userName,
            'changes' => ["Added quantity: {$quantityAdded} (from {$oldQty} to {$newQty})"],
            'old_values' => ['qty' => $oldQty],
            'new_values' => ['qty' => $newQty],
            'created_at' => now(),
        ]);
    }

    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search  = $request->input('search');

        $query = Consigned::query()
            ->orderBy('created_at', 'desc');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('consigned_no', 'like', "%{$search}%")
                  ->orWhere('selected_itemcode', 'like', "%{$search}%")
                  ->orWhere('selected_supplier', 'like', "%{$search}%");
            });
        }

        $consigned = $query->paginate($perPage)->withQueryString();

        $consigned->getCollection()->transform(function ($row) {
            $details = ConsignedDetail::where('consigned_no', $row->consigned_no)->get();

            $row->item_codes = $details
                ->pluck('item_code')
                ->unique()
                ->values();

            $row->suppliers = $details
                ->pluck('supplier')
                ->unique()
                ->values();

            $row->details = $details->map(function ($d) {
                return [
                    'id' => $d->id,
                    'item_code' => $d->item_code,
                    'supplier' => $d->supplier,
                    'expiration' => $d->expiration,
                    'uom' => $d->uom,
                    'qty' => $d->qty,
                    'qty_per_box' => $d->qty_per_box,
                    'minimum' => $d->minimum,
                    'maximum' => $d->maximum,
                    'price' => $d->price,
                    'bin_location' => $d->bin_location,
                ];
            });

            return $row;
        });

        $nextConsignedNo = $this->generateConsignedNumber();

        return Inertia::render('Consigned', [
            'tableData' => [
                'data' => $consigned->items(),
                'pagination' => [
                    'from'          => $consigned->firstItem() ?? 0,
                    'to'            => $consigned->lastItem() ?? 0,
                    'total'         => $consigned->total(),
                    'current_page' => $consigned->currentPage(),
                    'last_page'    => $consigned->lastPage(),
                    'per_page'     => $consigned->perPage(),
                ],
            ],
            'tableFilters' => [
                'search' => $search,
            ],
            'nextConsignedNo' => $nextConsignedNo,
        ]);
    }

    public function updateItem(Request $request, $id)
    {
        $request->validate([
            'selected_itemcode' => 'required|string',
            'selected_supplier' => 'required|string',
        ]);

        $consigned = Consigned::findOrFail($id);
        $consigned->selected_itemcode = $request->selected_itemcode;
        $consigned->selected_supplier = $request->selected_supplier;
        $consigned->save(); // Model event will log this automatically

        return redirect()->back()->with('success', 'Consigned item updated successfully');
    }

    /**
     * Update consigned item's description and category
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'mat_description' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
        ]);

        $consigned = Consigned::findOrFail($id);
        $consigned->mat_description = $request->mat_description;
        $consigned->category = $request->category;
        $consigned->save(); // Model event will log this automatically

        return redirect()->back()->with('success', 'Item updated successfully');
    }

    /**
     * Generate the next consigned number in format CON-00001
     */
    private function generateConsignedNumber()
    {
        $lastConsigned = Consigned::orderBy('consigned_no', 'desc')->first();

        if (!$lastConsigned || !$lastConsigned->consigned_no) {
            return 'CON-00001';
        }

        $lastNumber = intval(substr($lastConsigned->consigned_no, 4));
        $newNumber = $lastNumber + 1;
        return 'CON-' . str_pad($newNumber, 5, '0', STR_PAD_LEFT);
    }

    public function store(Request $request)
    {
        $request->validate([
            'mat_description' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'required|string',
            'items.*.supplier' => 'required|string',
            'items.*.qty' => 'required|numeric',
            'items.*.expiration' => 'nullable|date',
            'items.*.uom' => 'nullable|string',
            'items.*.qty_per_box' => 'nullable|numeric',
            'items.*.minimum' => 'nullable|numeric',
            'items.*.maximum' => 'nullable|numeric',
            'items.*.price' => 'nullable|numeric',
            'items.*.bin_location' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $consignedNo = $this->generateConsignedNumber();
            $firstItem = $request->items[0];

            // Create main consigned record - model event will log automatically
            $consigned = Consigned::create([
                'consigned_no' => $consignedNo,
                'mat_description' => $request->mat_description,
                'category' => $request->category,
                'selected_itemcode' => $firstItem['item_code'],
                'selected_supplier' => $firstItem['supplier'],
            ]);

            // Create details - model events will log automatically
            foreach ($request->items as $item) {
                ConsignedDetail::create([
                    'consigned_no' => $consignedNo,
                    'item_code' => $item['item_code'],
                    'supplier' => $item['supplier'],
                    'expiration' => $item['expiration'] ?? null,
                    'uom' => $item['uom'] ?? null,
                    'qty' => $item['qty'],
                    'qty_per_box' => $item['qty_per_box'] ?? null,
                    'minimum' => $item['minimum'] ?? null,
                    'maximum' => $item['maximum'] ?? null,
                    'price' => $item['price'] ?? null,
                    'bin_location' => $item['bin_location'] ?? null,
                ]);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Item added successfully with ' . count($request->items) . ' detail(s)');
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update multiple consigned details (bulk update)
     */
    public function updateDetails(Request $request, $id)
    {
        $request->validate([
            'details' => 'required|array',
            'details.*.item_code' => 'required|string',
            'details.*.supplier' => 'required|string',
            'details.*.uom' => 'required|string',
            'details.*.qty' => 'required|numeric',
            'details.*.expiration' => 'nullable|date',
            'details.*.bin_location' => 'nullable|string',
            'details.*.qty_per_box' => 'nullable|numeric',
            'details.*.minimum' => 'nullable|numeric',
            'details.*.maximum' => 'nullable|numeric',
            'details.*.price' => 'nullable|numeric',
        ]);

        $consigned = Consigned::findOrFail($id);

        DB::beginTransaction();
        try {
            foreach ($request->details as $detailData) {
                if (isset($detailData['id']) && $detailData['id']) {
                    // Update existing detail - model event will log automatically
                    $detail = ConsignedDetail::where('id', $detailData['id'])
                        ->where('consigned_no', $consigned->consigned_no)
                        ->first();
                    
                    if ($detail) {
                        $detail->update([
                            'item_code' => $detailData['item_code'],
                            'supplier' => $detailData['supplier'],
                            'uom' => $detailData['uom'] ?? '',
                            'expiration' => $detailData['expiration'] ?? null,
                            'bin_location' => $detailData['bin_location'] ?? null,
                            'qty' => $detailData['qty'],
                            'qty_per_box' => $detailData['qty_per_box'] ?? null,
                            'minimum' => $detailData['minimum'] ?? null,
                            'maximum' => $detailData['maximum'] ?? null,
                            'price' => $detailData['price'] ?? null,
                        ]);
                    }
                } else {
                    // Create new detail - model event will log automatically
                    ConsignedDetail::create([
                        'consigned_no' => $consigned->consigned_no,
                        'item_code' => $detailData['item_code'],
                        'supplier' => $detailData['supplier'],
                        'uom' => $detailData['uom'] ?? '',
                        'expiration' => $detailData['expiration'] ?? null,
                        'bin_location' => $detailData['bin_location'] ?? null,
                        'qty' => $detailData['qty'],
                        'qty_per_box' => $detailData['qty_per_box'] ?? null,
                        'minimum' => $detailData['minimum'] ?? null,
                        'maximum' => $detailData['maximum'] ?? null,
                        'price' => $detailData['price'] ?? null,
                    ]);
                }
            }

            DB::commit();
            return response()->json(['success' => true]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete a consigned detail
     */
    public function deleteDetail($id)
    {
        DB::beginTransaction();
        try {
            $detail = ConsignedDetail::findOrFail($id);
            $detail->delete(); // Model event will log automatically

            DB::commit();
            return redirect()->back()->with('success', 'Detail deleted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to delete detail: ' . $e->getMessage());
        }
    }

    /**
     * Add quantity to consigned details
     */
    public function addQuantity(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.detail_id' => 'required|integer',
            'items.*.quantity_to_add' => 'required|numeric|min:0'
        ]);
        
        DB::beginTransaction();
        try {
            foreach ($request->items as $itemData) {
                $detail = ConsignedDetail::findOrFail($itemData['detail_id']);
                
                // Store old quantity for custom logging
                $oldQty = $detail->qty;
                $quantityToAdd = $itemData['quantity_to_add'];
                $newQty = $oldQty + $quantityToAdd;
                
                // Update quantity
                $detail->qty = $newQty;
                $detail->save();
                
                // Manual log for quantity addition (special case)
                // We log this separately because it's a specific action type
                $this->logQuantityAddition($detail, $quantityToAdd, $oldQty, $newQty);
            }
            
            DB::commit();
            return redirect()->back()->with('success', 'Quantities updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete consigned item and all related details
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $consigned = Consigned::findOrFail($id);
            $consignedNo = $consigned->consigned_no;
            
            // Delete all related details first - model events will log each deletion
            $details = ConsignedDetail::where('consigned_no', $consignedNo)->get();
            foreach ($details as $detail) {
                $detail->delete(); // Model event will log automatically
            }
            
            // Delete the main consigned record - model event will log automatically
            $consigned->delete();
            
            DB::commit();
            return redirect()->back()->with('success', 'Consigned item and all related details deleted successfully');
            
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to delete consigned item: ' . $e->getMessage());
        }
    }

    /**
     * Get history for a consigned item
     */
    public function history($id)
    {
        $consigned = Consigned::findOrFail($id);
        
        $history = ConsignedHistory::where('consigned_no', $consigned->consigned_no)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($history);
    }

    public function getDetailHistory($id)
    {
        $detail = ConsignedDetail::findOrFail($id);
        
        $history = ConsignedDetailHistory::where('consigned_detail_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json([
            'detail' => $detail,
            'history' => $history
        ]);
    }

    /**
     * Search consigned items
     */
    public function search(Request $request)
    {
        $search = $request->input('search');
        $type = $request->input('type', 'all');
        
        $query = Consigned::query();
        
        if ($search) {
            $query->where(function ($q) use ($search, $type) {
                if ($type === 'all' || $type === 'item_code') {
                    $q->orWhere('selected_itemcode', 'like', "%{$search}%");
                }
                if ($type === 'all' || $type === 'description') {
                    $q->orWhere('mat_description', 'like', "%{$search}%");
                }
            });
        }
        
        $items = $query->limit(20)->get();
        
        return response()->json($items);
    }
}