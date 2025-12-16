<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Consumable;
use App\Models\ConsumableDetail;
use App\Models\ConsumableHistory;
use App\Models\ConsumableDetailHistory;

class ConsumableController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $perPage = $request->input('per_page', 10);

        $query = Consumable::query()
            ->select(
                'consumable_id',
                'material_description',
                'category',
                'uom'
            );

        if (!empty($search)) {
            $query->where(function($q) use ($search) {
                $q->where('material_description', 'LIKE', "%{$search}%")
                  ->orWhere('category', 'LIKE', "%{$search}%")
                  ->orWhere('uom', 'LIKE', "%{$search}%");
            });
        }

        $consumableItems = $query->paginate($perPage);

        return Inertia::render('Consumable', [
            'tableData' => [
                'data' => $consumableItems->items(),
                'pagination' => [
                    'from' => $consumableItems->firstItem(),
                    'to' => $consumableItems->lastItem(),
                    'total' => $consumableItems->total(),
                    'current_page' => $consumableItems->currentPage(),
                    'last_page' => $consumableItems->lastPage(),
                    'per_page' => $consumableItems->perPage(),
                ]
            ],
            'tableFilters' => [
                'search' => $search,
                'per_page' => $perPage
            ]
        ]);
    }

    public function show($id)
    {
        $consumableItem = Consumable::with('details')->findOrFail($id);
        
        if (request()->wantsJson() || request()->ajax()) {
            return response()->json([
                'consumableItem' => $consumableItem
            ]);
        }
        
        return Inertia::render('ConsumableView', [
            'consumableItem' => $consumableItem
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'material_description' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'uom' => 'required|string|max:50',
            'item_code' => 'required|string|max:100',
            'detailed_description' => 'nullable|string',
            'serial' => 'nullable|string|max:100',
            'bin_location' => 'nullable|string|max:100',
            'quantity' => 'required|numeric|min:0',
            'max' => 'nullable|numeric|min:0',
            'min' => 'nullable|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            $consumable = Consumable::create([
                'material_description' => $validated['material_description'],
                'category' => $validated['category'],
                'uom' => $validated['uom'],
            ]);

            ConsumableDetail::create([
                'consumable_id' => $consumable->consumable_id,
                'item_code' => $validated['item_code'],
                'detailed_description' => $validated['detailed_description'],
                'serial' => $validated['serial'],
                'bin_location' => $validated['bin_location'],
                'quantity' => $validated['quantity'],
                'max' => $validated['max'],
                'min' => $validated['min'],
            ]);

            DB::commit();

            return redirect()->route('consumable')->with('success', 'Consumable item created successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to create consumable: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to create consumable item: ' . $e->getMessage()]);
        }
    }

    public function addDetail(Request $request)
    {
        $validated = $request->validate([
            'consumable_id' => 'required|integer|exists:consumables,consumable_id',
            'item_code' => 'required|string|max:100',
            'detailed_description' => 'nullable|string',
            'serial' => 'nullable|string|max:100',
            'bin_location' => 'nullable|string|max:100',
            'quantity' => 'required|numeric|min:0',
            'max' => 'nullable|numeric|min:0',
            'min' => 'nullable|numeric|min:0',
        ]);

        try {
            ConsumableDetail::create([
                'consumable_id' => $validated['consumable_id'],
                'item_code' => $validated['item_code'],
                'detailed_description' => $validated['detailed_description'],
                'serial' => $validated['serial'],
                'bin_location' => $validated['bin_location'],
                'quantity' => $validated['quantity'],
                'max' => $validated['max'],
                'min' => $validated['min'],
            ]);

            return back()->with('success', 'Detail added successfully');

        } catch (\Exception $e) {
            \Log::error('Failed to add detail: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to add detail: ' . $e->getMessage()]);
        }
    }

    public function bulkUpdateDetails(Request $request)
    {
        $validated = $request->validate([
            'details' => 'required|array',
            'details.*.id' => 'required|exists:consumable_details,id',
            'details.*.item_code' => 'required|string|max:100',
            'details.*.detailed_description' => 'nullable|string',
            'details.*.serial' => 'nullable|string|max:100',
            'details.*.bin_location' => 'nullable|string|max:100',
            'details.*.quantity' => 'required|numeric|min:0',
            'details.*.max' => 'nullable|numeric|min:0',
            'details.*.min' => 'nullable|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();
            
            foreach ($validated['details'] as $detailData) {
                $detail = ConsumableDetail::findOrFail($detailData['id']);
                
                $detail->item_code = $detailData['item_code'];
                $detail->detailed_description = $detailData['detailed_description'];
                $detail->serial = $detailData['serial'];
                $detail->bin_location = $detailData['bin_location'];
                $detail->quantity = $detailData['quantity'];
                $detail->max = $detailData['max'];
                $detail->min = $detailData['min'];
                
                $detail->save();
            }
            
            DB::commit();
            
            return back()->with('success', 'Details updated successfully');
            
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to bulk update details: ' . $e->getMessage());
            return back()->withErrors([
                'error' => 'Failed to update details: ' . $e->getMessage()
            ]);
        }
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'material_description' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'uom' => 'required|string|max:50',
        ]);

        try {
            $consumable = Consumable::findOrFail($id);
            $consumable->update([
                'material_description' => $validated['material_description'],
                'category' => $validated['category'],
                'uom' => $validated['uom'],
            ]);

            return back()->with('success', 'Item updated successfully');

        } catch (\Exception $e) {
            \Log::error('Failed to update consumable: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to update item: ' . $e->getMessage()]);
        }
    }

    public function searchDetails(Request $request)
    {
        $search = $request->input('search', '');
        
        if (empty($search)) {
            return response()->json([]);
        }

        $details = ConsumableDetail::with('consumable:consumable_id,material_description,category,uom')
            ->where(function($q) use ($search) {
                $q->where('item_code', 'LIKE', "%{$search}%")
                  ->orWhere('detailed_description', 'LIKE', "%{$search}%");
            })
            ->select('id', 'consumable_id', 'item_code', 'detailed_description', 'quantity', 'bin_location')
            ->limit(10)
            ->get();

        return response()->json($details);
    }

    public function addQuantity(Request $request)
    {
        $validated = $request->validate([
            'detail_id' => 'required|exists:consumable_details,id',
            'quantity' => 'required|numeric|min:0.01',
        ]);

        try {
            $detail = ConsumableDetail::findOrFail($validated['detail_id']);
            $detail->quantity = $detail->quantity + $validated['quantity'];
            $detail->save();

            return back()->with('success', 'Quantity added successfully');

        } catch (\Exception $e) {
            \Log::error('Failed to add quantity: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to add quantity: ' . $e->getMessage()]);
        }
    }

    public function addQuantityBulk(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.detail_id' => 'required|exists:consumable_details,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        try {
            DB::beginTransaction();
            
            $updatedCount = 0;
            $userName = session('emp_data.emp_name', 'Unknown User');
            $userId = session('emp_data.id', null);
            
            foreach ($validated['items'] as $item) {
                $detail = ConsumableDetail::findOrFail($item['detail_id']);
                $oldQty = $detail->quantity;
                $newQty = $oldQty + $item['quantity'];
                
                // Update quantity
                $detail->quantity = $newQty;
                $detail->save();
                
                // Manually create history record for quantity_added action
                // We need to temporarily disable auto-logging by creating a separate history entry
                ConsumableDetailHistory::create([
                    'consumable_detail_id' => $detail->id,
                    'consumable_id' => $detail->consumable_id,
                    'action' => 'updated',
                    'user_id' => $userId,
                    'user_name' => $userName,
                    'item_code' => $detail->item_code,
                    'changes' => ['quantity'],
                    'old_values' => ['quantity' => (string)$oldQty],
                    'new_values' => ['quantity' => (string)$newQty],
                ]);
                
                $updatedCount++;
            }
            
            DB::commit();
            
            return redirect()->back()->with('success', "Successfully updated {$updatedCount} item(s)");
            
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Bulk quantity update failed: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to add quantities: ' . $e->getMessage()]);
        }
    }

    public function destroy($id)
    {
        try {
            DB::beginTransaction();
            
            $consumable = Consumable::findOrFail($id);
            
            ConsumableDetail::where('consumable_id', $id)->delete();
            $consumable->delete();
            
            DB::commit();
            
            return back()->with('success', "Successfully deleted consumable item and all related details");
            
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to delete consumable: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to delete item: ' . $e->getMessage()]);
        }
    }

public function destroyDetail($id)
{
    try {
        $detail = ConsumableDetail::findOrFail($id);
        $itemCode = $detail->item_code;
        $detail->delete();
        
        return back()->with('success', "Successfully deleted detail {$itemCode}");
        
    } catch (\Exception $e) {
        \Log::error('Failed to delete detail: ' . $e->getMessage());
        return back()->withErrors(['error' => 'Failed to delete detail: ' . $e->getMessage()]);
    }
}

    public function getHistory($id)
    {
        $consumable = Consumable::findOrFail($id);
        
        $history = ConsumableHistory::where('consumable_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        if (request()->wantsJson() || request()->ajax()) {
            return response()->json([
                'history' => $history
            ]);
        }

        return Inertia::render('ConsumableHistory', [
            'consumable' => $consumable,
            'history' => $history
        ]);
    }

    public function getDetailHistory($id)
    {
        $detail = ConsumableDetail::with('consumable')->findOrFail($id);
        
        $history = ConsumableDetailHistory::where('consumable_detail_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        if (request()->wantsJson() || request()->ajax()) {
            return response()->json([
                'detail' => $detail,
                'history' => $history
            ]);
        }

        return Inertia::render('ConsumableDetailHistory', [
            'detail' => $detail,
            'history' => $history
        ]);
    }
}