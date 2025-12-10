<?php

namespace App\Http\Controllers;

use App\Models\Consumable;
use App\Models\ConsumableHistory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\ConsumablesImport;
use Illuminate\Support\Facades\Storage;

class ConsumableController extends Controller
{
    /**
     * Display a listing of consumables with pagination.
     */
public function index(Request $request)
{
    $perPage = $request->input('per_page', 10);
    $search = $request->input('search', '');
    
    $query = Consumable::query()->orderBy('created_at', 'desc');
    
    // Apply search filter if provided
    if ($search) {
        $query->where(function($q) use ($search) {
            $q->where('Itemcode', 'like', "%{$search}%")
              ->orWhere('mat_description', 'like', "%{$search}%")
              ->orWhere('Long_description', 'like', "%{$search}%")
              ->orWhere('Bin_location', 'like', "%{$search}%")
              ->orWhere('supplier', 'like', "%{$search}%")
              ->orWhere('category', 'like', "%{$search}%");
        });
    }
    
    $consumables = $query->paginate($perPage)->withQueryString();
    
    return Inertia::render('Consumable', [
        'consumables' => [
            'data' => $consumables->items(),
            'current_page' => $consumables->currentPage(),
            'last_page' => $consumables->lastPage(),
            'per_page' => $consumables->perPage(),
            'total' => $consumables->total(),
            'from' => $consumables->firstItem(),
            'to' => $consumables->lastItem(),
        ],
        'filters' => [
            'search' => $search,
            'per_page' => $perPage
        ]
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

    /**
     * Add quantities to multiple consumables at once.
     */
    public function batchAddQuantity(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.itemId' => 'required|exists:consumable,id',
            'items.*.addAmount' => 'required|numeric|min:0.01'
        ]);

        $user_id = session('emp_data.emp_id', 'unknown');
        $user_name = session('emp_data.emp_name', 'Unknown User');

        foreach ($validated['items'] as $item) {
            $consumable = Consumable::findOrFail($item['itemId']);
            $oldQty = $consumable->qty;
            
            $consumable->qty = $consumable->qty + $item['addAmount'];
            $consumable->save();

            ConsumableHistory::create([
                'consumable_id' => $consumable->id,
                'action' => 'quantity_added',
                'user_id' => $user_id,
                'user_name' => $user_name,
                'item_code' => $consumable->Itemcode,
                'changes' => [
                    "quantity: " . number_format($oldQty, 2) . " → " . number_format($consumable->qty, 2),
                    "added_amount: " . number_format($item['addAmount'], 2)
                ],
                'old_values' => ['qty' => $oldQty],
                'new_values' => ['qty' => $consumable->qty, 'added_amount' => $item['addAmount']],
                'created_at' => now(),
            ]);
        }

        return redirect()->back()->with('success', count($validated['items']) . ' items updated successfully.');
    }

    /**
     * Import consumables from Excel
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // 10MB max
        ]);

        try {
            $file = $request->file('file');
            $import = new ConsumablesImport();
            
            Excel::import($import, $file);
            
            $stats = $import->getStats();
            
            $message = "Import completed: {$stats['imported']} items imported";
            
            if ($stats['skipped'] > 0) {
                $message .= ", {$stats['skipped']} items skipped";
            }
            
            // Always redirect back to the consumable page
            if (!empty($stats['errors'])) {
                return redirect()->route('consumable')->with([
                    'warning' => $message,
                    'import_errors' => $stats['errors']
                ]);
            }
            
            return redirect()->route('consumable')->with('success', $message);
            
        } catch (\Exception $e) {
            return redirect()->route('consumable')->with('error', 'Import failed: ' . $e->getMessage());
        }
    }

    /**
     * Download import template
     */
    public function downloadTemplate()
    {
        $headers = [
            'Itemcode',
            'mat_description',
            'Long_description',
            'Bin_location',
            'supplier',
            'category',
            'qty',
            'uom',
            'minimum',
            'maximum'
        ];
        
        $sampleData = [
            [
                'ITEM001',
                'Sample Item',
                'This is a sample long description',
                'A-01-01',
                'Sample Supplier Inc.',
                'Electronics',
                100,
                'pcs',
                10,
                500
            ]
        ];
        
        $filename = 'consumable_import_template.csv';
        $handle = fopen('php://temp', 'r+');
        
        // Write headers
        fputcsv($handle, $headers);
        
        // Write sample data
        foreach ($sampleData as $row) {
            fputcsv($handle, $row);
        }
        
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);
        
        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function getAllForDropdown()
{
    $items = Consumable::select('id', 'Itemcode', 'mat_description', 'qty', 'uom', 'maximum', 'minimum', 'category')
        ->orderBy('Itemcode')
        ->get();
    
    return response()->json($items);
}
}