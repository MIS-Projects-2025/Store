<?php

namespace App\Http\Controllers;

use App\Models\Consumable;
use App\Models\ConsumableHistory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ConsumableController extends Controller
{
    /**
     * Display a listing of consumables.
     */
    public function index(Request $request)
    {
        $consumables = Consumable::orderBy('created_at', 'desc')->get();
        
        return Inertia::render('Consumable', [
            'consumables' => $consumables
        ]);
    }

    /**
     * Store a newly created consumable.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'Itemcode' => 'required|string|max:255|unique:consumable,Itemcode',
            'mat_description' => 'required|string|max:255',
            'Long_description' => 'required|string',
            'Bin_location' => 'required|string|max:255',
            'supplier' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'qty' => 'required|numeric|min:0',
            'uom' => 'required|string|max:50',
            'maximum' => 'required|numeric|min:0',
            'minimum' => 'required|numeric|min:0',
        ]);

        // Get current user info from session
        $user_id = session('emp_data.emp_id', 'unknown');
        $user_name = session('emp_data.emp_name', 'Unknown User');

        // Create the consumable item
        $consumable = Consumable::create($validated);

        // Log the creation in history
        ConsumableHistory::create([
            'consumable_id' => $consumable->id,
            'action' => 'created',
            'user_id' => $user_id,
            'user_name' => $user_name,
            'item_code' => $consumable->Itemcode,
            'changes' => ['New item created'],
            'old_values' => null,
            'new_values' => $validated,
            'created_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Consumable item added successfully.');
    }

    /**
     * Update the specified consumable.
     */
    public function update(Request $request, $id)
    {
        $consumable = Consumable::findOrFail($id);

        // Get current values before update
        $oldValues = $consumable->toArray();

        $validated = $request->validate([
            'Itemcode' => 'required|string|max:255|unique:consumable,Itemcode,' . $id,
            'mat_description' => 'required|string|max:255',
            'Long_description' => 'required|string',
            'Bin_location' => 'required|string|max:255',
            'supplier' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'qty' => 'required|numeric|min:0',
            'uom' => 'required|string|max:50',
            'maximum' => 'required|numeric|min:0',
            'minimum' => 'required|numeric|min:0',
        ]);

        // Get current user info from session
        $user_id = session('emp_data.emp_id', 'unknown');
        $user_name = session('emp_data.emp_name', 'Unknown User');

        // Update the consumable item
        $consumable->update($validated);

        // Get updated values
        $newValues = $consumable->fresh()->toArray();

        // Find what changed
        $changes = [];
        $changedFields = [];
        
        foreach ($validated as $field => $newValue) {
            if (isset($oldValues[$field]) && $oldValues[$field] != $newValue) {
                $oldValue = is_numeric($oldValues[$field]) ? 
                    number_format($oldValues[$field], 2) : 
                    $oldValues[$field];
                $newValueFormatted = is_numeric($newValue) ? 
                    number_format($newValue, 2) : 
                    $newValue;
                
                $changes[] = "{$field}: {$oldValue} → {$newValueFormatted}";
                $changedFields[$field] = [
                    'old' => $oldValues[$field],
                    'new' => $newValue
                ];
            }
        }

        // Only log if there were changes
        if (!empty($changes)) {
            ConsumableHistory::create([
                'consumable_id' => $consumable->id,
                'action' => 'updated',
                'user_id' => $user_id,
                'user_name' => $user_name,
                'item_code' => $consumable->Itemcode,
                'changes' => $changes,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'created_at' => now(),
            ]);
        }

        return redirect()->back()->with('success', 'Consumable item updated successfully.');
    }

    /**
     * Remove the specified consumable.
     */
    public function destroy($id)
    {
        $consumable = Consumable::findOrFail($id);

        // Get current user info from session
        $user_id = session('emp_data.emp_id', 'unknown');
        $user_name = session('emp_data.emp_name', 'Unknown User');

        // Store the values before deletion
        $oldValues = $consumable->toArray();

        // Log the deletion in history
        ConsumableHistory::create([
            'consumable_id' => $consumable->id,
            'action' => 'deleted',
            'user_id' => $user_id,
            'user_name' => $user_name,
            'item_code' => $consumable->Itemcode,
            'changes' => ['Item deleted from system'],
            'old_values' => $oldValues,
            'new_values' => null,
            'created_at' => now(),
        ]);

        // Delete the item
        $consumable->delete();

        return redirect()->back()->with('success', 'Consumable item deleted successfully.');
    }

    /**
     * Add quantity to an existing consumable.
     */
    public function addQuantity(Request $request)
    {
        $validated = $request->validate([
            'itemId' => 'required|exists:consumable,id',
            'addAmount' => 'required|numeric|min:0.01'
        ]);

        $consumable = Consumable::findOrFail($validated['itemId']);
        
        // Get current user info from session
        $user_id = session('emp_data.emp_id', 'unknown');
        $user_name = session('emp_data.emp_name', 'Unknown User');

        // Store old quantity
        $oldQty = $consumable->qty;
        
        // Add the quantity
        $consumable->qty = $consumable->qty + $validated['addAmount'];
        $consumable->save();

        // Log the quantity addition in history
        ConsumableHistory::create([
            'consumable_id' => $consumable->id,
            'action' => 'quantity_added',
            'user_id' => $user_id,
            'user_name' => $user_name,
            'item_code' => $consumable->Itemcode,
            'changes' => [
                "quantity: " . number_format($oldQty, 2) . " → " . number_format($consumable->qty, 2),
                "added_amount: " . number_format($validated['addAmount'], 2)
            ],
            'old_values' => ['qty' => $oldQty],
            'new_values' => ['qty' => $consumable->qty, 'added_amount' => $validated['addAmount']],
            'created_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Quantity added successfully.');
    }

    /**
     * Get consumable history for a specific item.
     */
    public function getHistory($id)
    {
        $history = ConsumableHistory::where('consumable_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($history);
    }

    /**
     * Get all consumable history.
     */
    public function getAllHistory(Request $request)
    {
        $history = ConsumableHistory::with('consumable')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('ConsumableHistory', [
            'history' => $history
        ]);
    }
}