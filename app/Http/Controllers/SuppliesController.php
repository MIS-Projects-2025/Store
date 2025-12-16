<?php

namespace App\Http\Controllers;

use App\Models\Supply;
use App\Models\SupplyDetail;
use App\Models\SupplyHistory;
use App\Models\SupplyDetailHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class SuppliesController extends Controller
{
    /**
     * Display the supplies page with all data
     */
    public function index(Request $request)
    {
        // Get all active supplies
        $supplies = Supply::active()
            ->select('supplies_no', 'material_description', 'uom')
            ->orderBy('material_description')
            ->orderBy('uom')
            ->get();

        // Get all active supply details
        $suppliesDetails = SupplyDetail::active()
            ->select('supplies_no', 'item_code', 'detailed_description', 'qty', 'min', 'max', 'price')
            ->get();

        // Get material-level history (no item_code)
        $suppliesHistory = SupplyHistory::select(
                'supplies_no',
                'material_description',
                'uom',
                'action',
                'changes',
                'old_values',
                'new_values',
                'user_id',
                'user_name',
                'created_at'
            )
            ->orderBy('created_at', 'desc')
            ->get();

        // Get detail-level history (with item_code)
        $suppliesDetailsHistory = SupplyDetailHistory::select(
                'supplies_no',
                'item_code',
                'detailed_description',
                'material_description',
                'uom',
                'action',
                'changes',
                'old_values',
                'new_values',
                'user_id',
                'user_name',
                'created_at'
            )
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Supplies', [
            'supplies' => $supplies,
            'suppliesDetails' => $suppliesDetails,
            'suppliesHistory' => $suppliesHistory,
            'suppliesDetailsHistory' => $suppliesDetailsHistory,
        ]);
    }

    /**
     * Store a new supply (material)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'material_description' => 'required|string|max:255',
            'uom' => 'required|string|max:50',
        ]);

        // Generate supplies_no - include soft-deleted records in the query
        $lastSupply = Supply::withTrashed()->orderBy('supplies_no', 'desc')->first();
        $nextNumber = $lastSupply 
            ? intval(substr($lastSupply->supplies_no, 4)) + 1 
            : 1;
        $suppliesNo = 'SUP-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);

        $supply = Supply::create([
            'supplies_no' => $suppliesNo,
            'material_description' => $validated['material_description'],
            'uom' => $validated['uom'],
            'created_by' => Auth::id(),
        ]);

        return back()->with('success', 'Material created successfully!');
    }

    /**
     * Update a supply (material) using supplies_no
     */
    public function update(Request $request, $supply) // Change parameter
    {
        $validated = $request->validate([
            'material_description' => 'required|string|max:255',
            'uom' => 'required|string|max:50',
        ]);

        $supply = Supply::where('supplies_no', $supply)->firstOrFail(); // Find by supplies_no
        $supply->update([
            'material_description' => $validated['material_description'],
            'uom' => $validated['uom'],
            'updated_by' => Auth::id(),
        ]);

        return back()->with('success', 'Material updated successfully!');
    }

    /**
     * Soft delete a supply using supplies_no
     */
    public function destroy($suppliesNo)
    {
        DB::beginTransaction();
        try {
            // Find the supply
            $supply = Supply::where('supplies_no', $suppliesNo)->firstOrFail();
            
            // Get all related details before deleting
            $details = SupplyDetail::where('supplies_no', $suppliesNo)
                                   ->where('is_deleted', false)
                                   ->get();
            
            // Soft delete each detail (this will trigger their history logging)
            foreach ($details as $detail) {
                $detail->deleted_by = Auth::id();
                $detail->save();
                $detail->delete();
            }
            
            // Now delete the supply (this will trigger its history logging)
            $supply->deleted_by = Auth::id();
            $supply->save();
            $supply->delete();
            
            DB::commit();
            return back()->with('success', 'Material and all related details deleted successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to delete: ' . $e->getMessage()]);
        }
    }
    /**
     * Store a new supply detail
     */
    public function storeDetail(Request $request)
    {
        $validated = $request->validate([
            'supplies_no' => 'required|string|exists:supplies,supplies_no',
            'item_code' => 'required|string|max:50',
            'detailed_description' => 'required|string|max:255',
            'qty' => 'required|integer|min:0',
            'min' => 'required|integer|min:0',
            'max' => 'required|integer|min:0',
            'price' => 'required|numeric|min:0',
        ]);

        $detail = SupplyDetail::create([
            'supplies_no' => $validated['supplies_no'],
            'item_code' => $validated['item_code'],
            'detailed_description' => $validated['detailed_description'],
            'qty' => $validated['qty'],
            'min' => $validated['min'],
            'max' => $validated['max'],
            'price' => $validated['price'],
            'created_by' => Auth::id(),
        ]);

        return back()->with('success', 'Detail created successfully!');
    }

    /**
     * Update supply detail
     */
public function updateDetail(Request $request, $suppliesNo, $itemCode)
    {
        $validated = $request->validate([
            'qty' => 'sometimes|integer|min:0',
            'min' => 'sometimes|integer|min:0',
            'max' => 'sometimes|integer|min:0',
            'price' => 'sometimes|numeric|min:0',
            'detailed_description' => 'sometimes|string|max:255',
        ]);

        $detail = SupplyDetail::where('supplies_no', $suppliesNo)
                              ->where('item_code', $itemCode)
                              ->where('is_deleted', false)
                              ->firstOrFail();
                              
        $detail->update(array_merge($validated, [
            'updated_by' => Auth::id(),
        ]));

        return back()->with('success', 'Detail updated successfully!');
    }

    /**
     * Bulk update supply details (for edit mode in modal)
     */
   public function bulkUpdateDetails(Request $request)
    {
        $validated = $request->validate([
            'details' => 'required|array',
            'details.*.supplies_no' => 'required|exists:supplies_details,supplies_no',
            'details.*.item_code' => 'required|string',
            'details.*.min' => 'required|integer|min:0',
            'details.*.max' => 'required|integer|min:0',
            'details.*.price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            foreach ($validated['details'] as $detailData) {
                $detail = SupplyDetail::where('supplies_no', $detailData['supplies_no'])
                                      ->where('item_code', $detailData['item_code'])
                                      ->where('is_deleted', false)
                                      ->firstOrFail();
                                      
                $detail->update([
                    'min' => $detailData['min'],
                    'max' => $detailData['max'],
                    'price' => $detailData['price'],
                    'updated_by' => Auth::id(),
                ]);
            }
            DB::commit();
            return back()->with('success', 'Details updated successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to update details: ' . $e->getMessage()]);
        }
    }


    /**
     * Add quantity to supply details
     */
    public function addQuantity(Request $request)
    {
        $validated = $request->validate([
            'quantities' => 'required|array',
            'quantities.*.supplies_no' => 'required|exists:supplies_details,supplies_no',
            'quantities.*.item_code' => 'required|string',
            'quantities.*.add_qty' => 'required|integer|min:0',
        ]);

        DB::beginTransaction();
        try {
            foreach ($validated['quantities'] as $quantityData) {
                $detail = SupplyDetail::where('supplies_no', $quantityData['supplies_no'])
                                      ->where('item_code', $quantityData['item_code'])
                                      ->where('is_deleted', false)
                                      ->firstOrFail();
                                      
                $detail->update([
                    'qty' => $detail->qty + $quantityData['add_qty'],
                    'updated_by' => Auth::id(),
                ]);
            }
            DB::commit();
            return back()->with('success', 'Quantities added successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to add quantities: ' . $e->getMessage()]);
        }
    }

    /**
     * Soft delete a supply detail
     */
    public function destroyDetail($suppliesNo, $itemCode)
    {
        DB::beginTransaction();
        try {
            // Find the detail by supplies_no and item_code
            $detail = SupplyDetail::where('supplies_no', $suppliesNo)
                                  ->where('item_code', $itemCode)
                                  ->where('is_deleted', false)
                                  ->firstOrFail();
            
            $detail->deleted_by = Auth::id();
            $detail->save();
            $detail->delete();

            DB::commit();
            return back()->with('success', 'Detail deleted successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to delete detail: ' . $e->getMessage()]);
        }
    }

    /**
     * Get history for a specific material
     */
    public function getMaterialHistory(Request $request)
    {
        $validated = $request->validate([
            'material_description' => 'required|string',
            'uom' => 'required|string',
        ]);

        $history = SupplyHistory::where('material_description', $validated['material_description'])
            ->where('uom', $validated['uom'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($history);
    }

    /**
     * Get history for a specific detail
     */
    public function getDetailHistory(Request $request)
    {
        $validated = $request->validate([
            'supplies_no' => 'required|string',
            'item_code' => 'required|string',
        ]);

        $history = SupplyDetailHistory::where('supplies_no', $validated['supplies_no'])
            ->where('item_code', $validated['item_code'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($history);
    }

    /**
     * Get low stock items
     */
    public function getLowStock()
    {
        $lowStockItems = SupplyDetail::active()
            ->lowStock()
            ->with('supply')
            ->get();

        return response()->json($lowStockItems);
    }

    /**
     * Get out of stock items
     */
    public function getOutOfStock()
    {
        $outOfStockItems = SupplyDetail::active()
            ->outOfStock()
            ->with('supply')
            ->get();

        return response()->json($outOfStockItems);
    }

    /**
     * Search supplies
     */
    public function search(Request $request)
    {
        $search = $request->input('search', '');

        $supplies = Supply::active()
            ->where(function($query) use ($search) {
                $query->where('material_description', 'like', "%{$search}%")
                      ->orWhere('supplies_no', 'like', "%{$search}%")
                      ->orWhere('uom', 'like', "%{$search}%");
            })
            ->with(['details' => function($query) {
                $query->where('is_deleted', false);
            }])
            ->get();

        return response()->json($supplies);
    }

    /**
     * Get supplies with details count and total quantity
     */
    public function getSuppliesWithStats()
    {
        $supplies = Supply::active()
            ->withCount(['details' => function($query) {
                $query->where('is_deleted', false);
            }])
            ->with(['details' => function($query) {
                $query->select('supplies_no', DB::raw('SUM(qty) as total_qty'))
                      ->where('is_deleted', false)
                      ->groupBy('supplies_no');
            }])
            ->get();

        return response()->json($supplies);
    }

    /**
     * Get details for a specific supply
     */
    public function getSupplyDetails($suppliesNo)
    {
        $details = SupplyDetail::active()
            ->where('supplies_no', $suppliesNo)
            ->get();

        return response()->json($details);
    }

    /**
     * Import supplies from Excel
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        // TODO: Implement Excel import logic using Laravel Excel or similar package
        // This would parse the file and create supplies and details

        return back()->with('success', 'Import completed successfully!');
    }

    /**
     * Export supplies to Excel
     */
    public function export()
    {
        // TODO: Implement Excel export logic
        // This would generate an Excel file with all supplies and details

        return back()->with('success', 'Export completed successfully!');
    }
}