<?php

namespace App\Http\Controllers;

use App\Models\Supplies;
use App\Models\SuppliesHistory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SuppliesController extends Controller
{
    /**
     * Display a listing of Supplies.
     */
    public function index(Request $request)
    {
        $Supplies = Supplies::orderBy('created_at', 'desc')->get();
        
        return Inertia::render('Supplies', [
            'Supplies' => $Supplies
        ]);
    }

    /**
     * Store a newly created Supplies.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'itemcode' => 'required|string|max:255|unique:supplies,itemcode',
            'material_description' => 'required|string|max:255',
            'bin_location' => 'required|string|max:255',
            'qty' => 'required|integer|min:0',
            'uom' => 'required|string|max:50',
            'maximum' => 'required|integer|min:0',
            'minimum' => 'required|integer|min:0',
            'price' => 'nullable|numeric|min:0',
        ]);

        // Get current user info from session
        $user_id = session('emp_data.emp_id', 'unknown');
        $user_name = session('emp_data.emp_name', 'Unknown User');

        // Create the supply item
        $supply = Supplies::create($validated);

        // Log the creation in history
        SuppliesHistory::create([
            'supply_id' => $supply->id,
            'action' => 'created',
            'user_id' => $user_id,
            'user_name' => $user_name,
            'item_code' => $supply->itemcode,
            'changes' => ['New item created'],
            'old_values' => null,
            'new_values' => $validated,
            'created_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Supplies item added successfully.');
    }

    /**
     * Update the specified Supplies.
     */
    public function update(Request $request, $id)
    {
        $supply = Supplies::findOrFail($id);

        // Get current values before update
        $oldValues = $supply->toArray();

        $validated = $request->validate([
            'itemcode' => 'required|string|max:255|unique:supplies,itemcode,' . $id,
            'material_description' => 'required|string|max:255',
            'bin_location' => 'required|string|max:255',
            'qty' => 'required|integer|min:0',
            'uom' => 'required|string|max:50',
            'maximum' => 'required|integer|min:0',
            'minimum' => 'required|integer|min:0',
            'price' => 'nullable|numeric|min:0',
        ]);

        // Get current user info from session
        $user_id = session('emp_data.emp_id', 'unknown');
        $user_name = session('emp_data.emp_name', 'Unknown User');

        // Update the supply item
        $supply->update($validated);

        // Get updated values
        $newValues = $supply->fresh()->toArray();

        // Find what changed
        $changes = [];
        $changedFields = [];
        
        foreach ($validated as $field => $newValue) {
            if (isset($oldValues[$field]) && $oldValues[$field] != $newValue) {
                $changes[] = "{$field}: {$oldValues[$field]} → {$newValue}";
                $changedFields[$field] = [
                    'old' => $oldValues[$field],
                    'new' => $newValue
                ];
            }
        }

        // Only log if there were changes
        if (!empty($changes)) {
            SuppliesHistory::create([
                'supply_id' => $supply->id,
                'action' => 'updated',
                'user_id' => $user_id,
                'user_name' => $user_name,
                'item_code' => $supply->itemcode,
                'changes' => $changes,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'created_at' => now(),
            ]);
        }

        return redirect()->back()->with('success', 'Supplies item updated successfully.');
    }

    /**
     * Remove the specified Supplies.
     */
    public function destroy($id)
    {
        $supply = Supplies::findOrFail($id);

        // Get current user info from session
        $user_id = session('emp_data.emp_id', 'unknown');
        $user_name = session('emp_data.emp_name', 'Unknown User');

        // Store the values before deletion
        $oldValues = $supply->toArray();

        // Log the deletion in history
        SuppliesHistory::create([
            'supply_id' => $supply->id,
            'action' => 'deleted',
            'user_id' => $user_id,
            'user_name' => $user_name,
            'item_code' => $supply->itemcode,
            'changes' => ['Item deleted from system'],
            'old_values' => $oldValues,
            'new_values' => null,
            'created_at' => now(),
        ]);

        // Delete the item
        $supply->delete();

        return redirect()->back()->with('success', 'Supplies item deleted successfully.');
    }

    /**
     * Add quantity to an existing Supplies.
     */
    public function addQuantity(Request $request)
    {
        $validated = $request->validate([
            'itemId' => 'required|exists:supplies,id',
            'addAmount' => 'required|integer|min:1'
        ]);

        $supply = Supplies::findOrFail($validated['itemId']);
        
        // Get current user info from session
        $user_id = session('emp_data.emp_id', 'unknown');
        $user_name = session('emp_data.emp_name', 'Unknown User');

        // Store old quantity
        $oldQty = $supply->qty;
        
        // Add the quantity
        $supply->qty = $supply->qty + $validated['addAmount'];
        $supply->save();

        // Log the quantity addition in history
        SuppliesHistory::create([
            'supply_id' => $supply->id,
            'action' => 'quantity_added',
            'user_id' => $user_id,
            'user_name' => $user_name,
            'item_code' => $supply->itemcode,
            'changes' => [
                "quantity: {$oldQty} → {$supply->qty}",
                "added_amount: {$validated['addAmount']}"
            ],
            'old_values' => ['qty' => $oldQty],
            'new_values' => ['qty' => $supply->qty, 'added_amount' => $validated['addAmount']],
            'created_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Quantity added successfully.');
    }

    /**
     * Get supplies history for a specific item.
     */
    public function getHistory($id)
    {
        $history = SuppliesHistory::where('supply_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($history);
    }

    /**
     * Get all supplies history.
     */
    public function getAllHistory(Request $request)
    {
        $history = SuppliesHistory::with('supply')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('SuppliesHistory', [
            'history' => $history
        ]);
    }
}