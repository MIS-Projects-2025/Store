<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Consigned;
use App\Models\ConsignedDetail;
use App\Models\ConsignedHistory;
use App\Models\ConsignedDetailHistory;

class ConsignedController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $perPage = $request->input('per_page', 10);

        $query = Consigned::query()
            ->select(
                'id',
                'consigned_no',
                'mat_description',
                'category'
            );

        if (!empty($search)) {
            $query->where(function($q) use ($search) {
                $q->where('consigned_no', 'LIKE', "%{$search}%")
                  ->orWhere('mat_description', 'LIKE', "%{$search}%")
                  ->orWhere('category', 'LIKE', "%{$search}%");
            });
        }

        $consignedItems = $query->paginate($perPage);

        return Inertia::render('Consigned', [
            'tableData' => [
                'data' => $consignedItems->items(),
                'pagination' => [
                    'from' => $consignedItems->firstItem(),
                    'to' => $consignedItems->lastItem(),
                    'total' => $consignedItems->total(),
                    'current_page' => $consignedItems->currentPage(),
                    'last_page' => $consignedItems->lastPage(),
                    'per_page' => $consignedItems->perPage(),
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
        $consignedItem = Consigned::with('details')->findOrFail($id);
        
        if (request()->wantsJson() || request()->ajax()) {
            return response()->json([
                'consignedItem' => $consignedItem
            ]);
        }
        
        return Inertia::render('ConsignedView', [
            'consignedItem' => $consignedItem
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'mat_description' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'item_code' => 'required|string|max:100',
            'supplier' => 'required|string|max:255',
            'bin_location' => 'nullable|string|max:100',
            'expiration' => 'nullable|date',
            'qty' => 'required|numeric|min:0',
            'uom' => 'required|string|max:50',
            'qty_per_box' => 'nullable|numeric|min:0',
            'minimum' => 'nullable|numeric|min:0',
            'maximum' => 'nullable|numeric|min:0',
            'price' => 'required|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            $lastConsigned = Consigned::orderBy('id', 'desc')->first();
            $newNumber = $lastConsigned ? (intval(substr($lastConsigned->consigned_no, -4)) + 1) : 1;
            $consignedNo = 'CON-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);

            Consigned::create([
                'consigned_no' => $consignedNo,
                'mat_description' => $validated['mat_description'],
                'category' => $validated['category'],
            ]);

            ConsignedDetail::create([
                'consigned_no' => $consignedNo,
                'item_code' => $validated['item_code'],
                'supplier' => $validated['supplier'],
                'bin_location' => $validated['bin_location'],
                'expiration' => $validated['expiration'],
                'uom' => $validated['uom'],
                'qty' => $validated['qty'],
                'qty_per_box' => $validated['qty_per_box'],
                'minimum' => $validated['minimum'],
                'maximum' => $validated['maximum'],
                'price' => $validated['price'],
            ]);

            DB::commit();

            return redirect()->route('consigned')->with('success', 'Consigned item created successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create consigned item: ' . $e->getMessage()]);
        }
    }

    public function addDetail(Request $request)
    {
        $validated = $request->validate([
            'consigned_no' => 'required|string|exists:consigned,consigned_no',
            'item_code' => 'required|string|max:100',
            'supplier' => 'required|string|max:255',
            'bin_location' => 'nullable|string|max:100',
            'expiration' => 'nullable|date',
            'qty' => 'required|numeric|min:0',
            'uom' => 'required|string|max:50',
            'qty_per_box' => 'nullable|numeric|min:0',
            'minimum' => 'nullable|numeric|min:0',
            'maximum' => 'nullable|numeric|min:0',
            'price' => 'required|numeric|min:0',
        ]);

        try {
            ConsignedDetail::create([
                'consigned_no' => $validated['consigned_no'],
                'item_code' => $validated['item_code'],
                'supplier' => $validated['supplier'],
                'bin_location' => $validated['bin_location'],
                'expiration' => $validated['expiration'],
                'uom' => $validated['uom'],
                'qty' => $validated['qty'],
                'qty_per_box' => $validated['qty_per_box'],
                'minimum' => $validated['minimum'],
                'maximum' => $validated['maximum'],
                'price' => $validated['price'],
            ]);

            return back()->with('success', 'Detail added successfully');

        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to add detail: ' . $e->getMessage()]);
        }
    }

public function bulkUpdateDetails(Request $request)
{
    $validated = $request->validate([
        'details' => 'required|array',
        'details.*.id' => 'required|exists:consigned_details,id',
        'details.*.item_code' => 'required|string|max:100',
        'details.*.supplier' => 'required|string|max:255',
        'details.*.bin_location' => 'nullable|string|max:100',
        'details.*.expiration' => 'nullable|date',
        'details.*.qty' => 'required|numeric|min:0',
        'details.*.uom' => 'required|string|max:50',
        'details.*.qty_per_box' => 'nullable|numeric|min:0',
        'details.*.minimum' => 'nullable|numeric|min:0',
        'details.*.maximum' => 'nullable|numeric|min:0',
        'details.*.price' => 'required|numeric|min:0',
    ]);

    try {
        DB::beginTransaction();
        
        foreach ($validated['details'] as $detailData) {
            // Find the detail instance
            $detail = ConsignedDetail::findOrFail($detailData['id']);
            
            // Update attributes (this will mark them as dirty)
            $detail->item_code = $detailData['item_code'];
            $detail->supplier = $detailData['supplier'];
            $detail->bin_location = $detailData['bin_location'];
            $detail->expiration = $detailData['expiration'];
            $detail->qty = $detailData['qty'];
            $detail->uom = $detailData['uom'];
            $detail->qty_per_box = $detailData['qty_per_box'];
            $detail->minimum = $detailData['minimum'];
            $detail->maximum = $detailData['maximum'];
            $detail->price = $detailData['price'];
            
            // Save will trigger the updated event in boot method
            $detail->save();
        }
        
        DB::commit();
        
        return back()->with('success', 'Details updated successfully');
        
    } catch (\Exception $e) {
        DB::rollBack();
        return back()->withErrors([
            'error' => 'Failed to update details: ' . $e->getMessage()
        ]);
    }
}

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'mat_description' => 'required|string|max:255',
            'category' => 'required|string|max:255',
        ]);

        try {
            $consigned = Consigned::findOrFail($id);
            $consigned->update([
                'mat_description' => $validated['mat_description'],
                'category' => $validated['category'],
            ]);

            return back()->with('success', 'Item updated successfully');

        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update item: ' . $e->getMessage()]);
        }
    }

    public function searchDetails(Request $request)
    {
        $search = $request->input('search', '');
        
        if (empty($search)) {
            return response()->json([]);
        }

        $details = ConsignedDetail::with('consigned:consigned_no,mat_description,category')
            ->where(function($q) use ($search) {
                $q->where('item_code', 'LIKE', "%{$search}%")
                  ->orWhere('supplier', 'LIKE', "%{$search}%");
            })
            ->select('id', 'consigned_no', 'item_code', 'supplier', 'qty', 'uom', 'bin_location')
            ->limit(10)
            ->get();

        return response()->json($details);
    }

    public function addQuantity(Request $request)
    {
        $validated = $request->validate([
            'detail_id' => 'required|exists:consigned_details,id',
            'quantity' => 'required|numeric|min:0.01',
        ]);

        try {
            $detail = ConsignedDetail::findOrFail($validated['detail_id']);
            $detail->qty = $detail->qty + $validated['quantity'];
            $detail->save();

            return back()->with('success', 'Quantity added successfully');

        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to add quantity: ' . $e->getMessage()]);
        }
    }

    public function addQuantityBulk(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.detail_id' => 'required|exists:consigned_details,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        try {
            DB::beginTransaction();
            
            $updatedCount = 0;
            
            foreach ($validated['items'] as $item) {
                $detail = ConsignedDetail::findOrFail($item['detail_id']);
                $detail->qty = $detail->qty + $item['quantity'];
                $detail->save();
                $updatedCount++;
            }
            
            DB::commit();
            
            return back()->with('success', "Successfully updated {$updatedCount} item(s)");
            
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to add quantities: ' . $e->getMessage()]);
        }
    }

    public function destroy($id)
    {
        try {
            DB::beginTransaction();
            
            $consigned = Consigned::findOrFail($id);
            $consignedNo = $consigned->consigned_no;
            
            ConsignedDetail::where('consigned_no', $consignedNo)->delete();
            $consigned->delete();
            
            DB::commit();
            
            return back()->with('success', "Successfully deleted consigned item {$consignedNo} and all related details");
            
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to delete item: ' . $e->getMessage()]);
        }
    }

    /**
     * Delete a single consigned detail
     */
    public function destroyDetail($id)
    {
        try {
            $detail = ConsignedDetail::findOrFail($id);
            $itemCode = $detail->item_code;
            $detail->delete();
            
            return back()->with('success', "Successfully deleted detail {$itemCode}");
            
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to delete detail: ' . $e->getMessage()]);
        }
    }

    /**
     * Get history for a consigned item
     */
    public function getHistory($id)
    {
        $consigned = Consigned::findOrFail($id);
        
        $history = ConsignedHistory::where('consigned_id', $id)
            ->orWhere('consigned_no', $consigned->consigned_no)
            ->orderBy('created_at', 'desc')
            ->get();

        if (request()->wantsJson() || request()->ajax()) {
            return response()->json([
                'history' => $history
            ]);
        }

        return Inertia::render('ConsignedHistory', [
            'consigned' => $consigned,
            'history' => $history
        ]);
    }

    /**
     * Get history for a consigned detail
     */
    public function getDetailHistory($id)
    {
        $detail = ConsignedDetail::with('consigned')->findOrFail($id);
        
        $history = ConsignedDetailHistory::where('consigned_detail_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        if (request()->wantsJson() || request()->ajax()) {
            return response()->json([
                'detail' => $detail,
                'history' => $history
            ]);
        }

        return Inertia::render('ConsignedDetailHistory', [
            'detail' => $detail,
            'history' => $history
        ]);
    }
}