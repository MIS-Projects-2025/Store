<?php

namespace App\Http\Controllers;

use App\Models\Supplies;
use App\Models\SuppliesDetails;
use App\Models\SuppliesHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;


class SuppliesController extends Controller
{
    /**
     * Get authenticated user name from session
     */
    private function getAuthUserName()
    {
        return session('emp_data.emp_name', 'System');
    }

    /**
     * Get authenticated user ID from session
     */
    private function getAuthUserId()
    {
        return session('emp_data.emp_id', null);
    }

    /**
     * Display a listing of Supplies with details.
     */
public function getDetails($id)
{
    $supply = Supplies::with('details')->findOrFail($id);
    
    $details = $supply->details->map(function ($detail) {
        return [
            'detail_id' => $detail->id,
            'detailed_description' => $detail->detailed_description,
            'bin_location' => $detail->bin_location,
            'quantity' => $detail->qty ?? 0,
            'uom' => $detail->uom,
            'minimum' => $detail->minimum ?? 0,
            'maximum' => $detail->maximum ?? 0,
            'price' => $detail->price ?? 0,
            'created_at' => $detail->created_at,
            'updated_at' => $detail->updated_at,
        ];
    });
    
    return response()->json([
        'supply' => [
            'id' => $supply->id,
            'itemcode' => $supply->itemcode,
            'material_description' => $supply->material_description,
        ],
        'details' => $details
    ]);
}

/**
 * Keep the original index method showing only first detail in main table.
 */
public function index(Request $request)
{
    $perPage = $request->get('per_page', 10);
    $page = $request->get('page', 1);
    $search = $request->get('search', '');
    
    $suppliesQuery = Supplies::with('details');
    
    // Apply search if provided
    if ($search) {
        $suppliesQuery->where(function($query) use ($search) {
            $query->where('itemcode', 'like', '%' . $search . '%')
                  ->orWhere('material_description', 'like', '%' . $search . '%')
                  ->orWhereHas('details', function($q) use ($search) {
                      $q->where('detailed_description', 'like', '%' . $search . '%')
                        ->orWhere('bin_location', 'like', '%' . $search . '%');
                  });
        });
    }
    
    // Get paginated results
    $paginatedSupplies = $suppliesQuery->orderBy('id', 'desc')->paginate($perPage, ['*'], 'page', $page);
    
    // Transform the data
    $supplies = $paginatedSupplies->getCollection()->map(function ($supply) {
        $firstDetail = $supply->details->first();
        
        return [
            'id' => $supply->id,
            'itemcode' => $supply->itemcode,
            'material_description' => $supply->material_description,
            'detailed_description' => $firstDetail->detailed_description ?? null,
            'bin_location' => $firstDetail->bin_location ?? null,
            'quantity' => $firstDetail->qty ?? 0,
            'uom' => $firstDetail->uom ?? null,
            'minimum' => $firstDetail->minimum ?? 0,
            'maximum' => $firstDetail->maximum ?? 0,
            'price' => $firstDetail->price ?? 0,
            'created_at' => $supply->created_at,
            'updated_at' => $supply->updated_at,
        ];
    });
    
    return Inertia::render('Supplies', [
        'Supplies' => [
            'data' => $supplies,
            'current_page' => $paginatedSupplies->currentPage(),
            'last_page' => $paginatedSupplies->lastPage(),
            'per_page' => $paginatedSupplies->perPage(),
            'total' => $paginatedSupplies->total(),
            'from' => $paginatedSupplies->firstItem(),
            'to' => $paginatedSupplies->lastItem(),
            'links' => $paginatedSupplies->links(),
        ],
        'filters' => [
            'search' => $search,
            'per_page' => $perPage,
        ]
    ]);
}

    /**
     * Store a new Supplies item.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'itemcode' => 'required|string|max:255|unique:newstore.supplies,itemcode',
            'material_description' => 'required|string',
            'detailed_description' => 'nullable|string',
            'bin_location' => 'nullable|string|max:255',
            'quantity' => 'required|integer|min:0',
            'uom' => 'required|string|max:50',
            'minimum' => 'nullable|integer|min:0',
            'maximum' => 'nullable|integer|min:0',
            'price' => 'required|numeric|min:0',
        ]);

        DB::connection('newstore')->beginTransaction();
        
        try {
            // Create the Supply
            $supply = Supplies::create([
                'itemcode' => $validated['itemcode'],
                'material_description' => $validated['material_description'],
            ]);

            // Create the Supply detail
            $detail = SuppliesDetails::create([
                'supply_id' => $supply->id,
                'itemcode' => $validated['itemcode'],
                'detailed_description' => $validated['detailed_description'],
                'uom' => $validated['uom'],
                'minimum' => $validated['minimum'] ?? 0,
                'maximum' => $validated['maximum'] ?? 0,
                'price' => $validated['price'],
                'qty' => $validated['quantity'],
                'bin_location' => $validated['bin_location'],
            ]);

            // Log history
            SuppliesHistory::create([
                'supply_id' => $supply->id,
                'action' => 'created',
                'user_id' => $this->getAuthUserId(),
                'user_name' => $this->getAuthUserName(),
                'item_code' => $supply->itemcode,
                'changes' => ['Item created with initial details'],
                'old_values' => [],
                'new_values' => [
                    'itemcode' => $supply->itemcode,
                    'material_description' => $supply->material_description,
                    'quantity' => $validated['quantity'],
                    'price' => $validated['price'],
                ],
            ]);

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Supply item created successfully.');
        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            return redirect()->back()->with('error', 'Failed to create supply item: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing Supplies item.
     */
public function update(Request $request, $id)
{
    $supply = Supplies::with('details')->findOrFail($id);
    $detailId = $request->input('detail_id');
    
    // Find the specific detail to update
    $detailToUpdate = $supply->details->firstWhere('id', $detailId);

    $validated = $request->validate([
        'material_description' => 'required|string',
        'detailed_description' => 'nullable|string',
        'bin_location' => 'nullable|string|max:255',
        'uom' => 'required|string|max:50',
        'minimum' => 'nullable|integer|min:0',
        'maximum' => 'nullable|integer|min:0',
        'price' => 'required|numeric|min:0',
    ]);

    DB::connection('newstore')->beginTransaction();
    
    try {
        // Track changes
        $changes = [];
        $oldValues = [];
        $newValues = [];

        // Update Supply
        if ($supply->material_description !== $validated['material_description']) {
            $changes[] = 'Material Description updated';
            $oldValues['material_description'] = $supply->material_description;
            $newValues['material_description'] = $validated['material_description'];
        }

        $supply->update([
            'material_description' => $validated['material_description'],
        ]);

        // Update specific detail if exists
        if ($detailToUpdate) {
            if ($detailToUpdate->detailed_description !== $validated['detailed_description']) {
                $changes[] = 'Detailed Description updated';
                $oldValues['detailed_description'] = $detailToUpdate->detailed_description;
                $newValues['detailed_description'] = $validated['detailed_description'];
            }

            if ($detailToUpdate->bin_location !== $validated['bin_location']) {
                $changes[] = 'Bin Location updated';
                $oldValues['bin_location'] = $detailToUpdate->bin_location;
                $newValues['bin_location'] = $validated['bin_location'];
            }

            if ($detailToUpdate->uom !== $validated['uom']) {
                $changes[] = 'UOM updated';
                $oldValues['uom'] = $detailToUpdate->uom;
                $newValues['uom'] = $validated['uom'];
            }

            if ($detailToUpdate->minimum != $validated['minimum']) {
                $changes[] = 'Minimum updated';
                $oldValues['minimum'] = $detailToUpdate->minimum;
                $newValues['minimum'] = $validated['minimum'];
            }

            if ($detailToUpdate->maximum != $validated['maximum']) {
                $changes[] = 'Maximum updated';
                $oldValues['maximum'] = $detailToUpdate->maximum;
                $newValues['maximum'] = $validated['maximum'];
            }

            if ($detailToUpdate->price != $validated['price']) {
                $changes[] = 'Price updated';
                $oldValues['price'] = $detailToUpdate->price;
                $newValues['price'] = $validated['price'];
            }

            $detailToUpdate->update([
                'detailed_description' => $validated['detailed_description'],
                'bin_location' => $validated['bin_location'],
                'uom' => $validated['uom'],
                'minimum' => $validated['minimum'] ?? 0,
                'maximum' => $validated['maximum'] ?? 0,
                'price' => $validated['price'],
            ]);
        }

        // Log history only if there were changes
        if (!empty($changes)) {
            SuppliesHistory::create([
                'supply_id' => $supply->id,
                'action' => 'updated',
                'user_id' => $this->getAuthUserId(),
                'user_name' => $this->getAuthUserName(),
                'item_code' => $supply->itemcode,
                'changes' => $changes,
                'old_values' => $oldValues,
                'new_values' => $newValues,
            ]);
        }

        DB::connection('newstore')->commit();

        return redirect()->back()->with('success', 'Supply item updated successfully.');
    } catch (\Exception $e) {
        DB::connection('newstore')->rollBack();
        return redirect()->back()->with('error', 'Failed to update supply item: ' . $e->getMessage());
    }
}

    /**
     * Add a new detail to an existing Supply.
     */
    public function addDetail(Request $request, $id)
    {
        $supply = Supplies::findOrFail($id);

        $validated = $request->validate([
            'detailed_description' => 'nullable|string',
            'bin_location' => 'nullable|string|max:255',
            'quantity' => 'required|integer|min:0',
            'uom' => 'required|string|max:50',
            'minimum' => 'nullable|integer|min:0',
            'maximum' => 'nullable|integer|min:0',
            'price' => 'required|numeric|min:0',
        ]);

        DB::connection('newstore')->beginTransaction();
        
        try {
            $detail = SuppliesDetails::create([
                'supply_id' => $supply->id,
                'itemcode' => $supply->itemcode,
                'detailed_description' => $validated['detailed_description'],
                'uom' => $validated['uom'],
                'minimum' => $validated['minimum'] ?? 0,
                'maximum' => $validated['maximum'] ?? 0,
                'price' => $validated['price'],
                'qty' => $validated['quantity'],
                'bin_location' => $validated['bin_location'],
            ]);

            // Log history
            SuppliesHistory::create([
                'supply_id' => $supply->id,
                'action' => 'detail_added',
                'user_id' => $this->getAuthUserId(),
                'user_name' => $this->getAuthUserName(),
                'item_code' => $supply->itemcode,
                'changes' => ['New detail added'],
                'old_values' => [],
                'new_values' => [
                    'detailed_description' => $validated['detailed_description'],
                    'quantity' => $validated['quantity'],
                    'price' => $validated['price'],
                    'bin_location' => $validated['bin_location'],
                ],
            ]);

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Detail added successfully.');
        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            return redirect()->back()->with('error', 'Failed to add detail: ' . $e->getMessage());
        }
    }

    /**
     * Add quantity to multiple items.
     */
    public function addQuantity(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:newstore.supplies,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        DB::connection('newstore')->beginTransaction();
        
        try {
            foreach ($validated['items'] as $item) {
                $supply = Supplies::with('details')->findOrFail($item['id']);
                $firstDetail = $supply->details->first();

                if ($firstDetail) {
                    $oldQty = $firstDetail->qty;
                    $newQty = $oldQty + $item['quantity'];

                    $firstDetail->update([
                        'qty' => $newQty,
                    ]);

                    // Log history
                    SuppliesHistory::create([
                        'supply_id' => $supply->id,
                        'action' => 'quantity_added',
                        'user_id' => $this->getAuthUserId(),
                        'user_name' => $this->getAuthUserName(),
                        'item_code' => $supply->itemcode,
                        'changes' => ['Quantity added'],
                        'old_values' => ['quantity' => $oldQty],
                        'new_values' => ['quantity' => $newQty],
                    ]);
                }
            }

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Quantities updated successfully.');
        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            return redirect()->back()->with('error', 'Failed to update quantities: ' . $e->getMessage());
        }
    }

    /**
     * Get history for a specific Supply item.
     */
    public function history($id)
    {
        $supply = Supplies::findOrFail($id);
        
        $history = SuppliesHistory::where('supply_id', $id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($record) {
                return [
                    'id' => $record->id,
                    'date' => $record->created_at->format('Y-m-d H:i:s'),
                    'action' => ucfirst(str_replace('_', ' ', $record->action)),
                    'user' => $record->user_name,
                    'details' => implode(', ', $record->changes ?? []),
                    'previousValue' => $this->formatValues($record->old_values),
                    'newValue' => $this->formatValues($record->new_values),
                ];
            });

        return response()->json($history);
    }

    /**
     * Format values for display.
     */
    private function formatValues($values)
    {
        if (empty($values)) {
            return '-';
        }

        $formatted = [];
        foreach ($values as $key => $value) {
            if ($key === 'price') {
                $formatted[] = "$" . number_format($value, 2);
            } else {
                $formatted[] = $value;
            }
        }

        return implode(', ', $formatted);
    }
public function importExcel(Request $request)
{
    $request->validate([
        'excel_file' => 'required|file|mimes:xlsx,xls,csv,txt|max:2048',
    ]);
    
    DB::connection('newstore')->beginTransaction();
    
    try {
        $file = $request->file('excel_file');
        $importedCount = 0;
        $errors = [];
        
        // Check file extension
        $extension = $file->getClientOriginalExtension();
        
        if (in_array($extension, ['xlsx', 'xls'])) {
            // Handle Excel files
            $spreadsheet = IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
            
            // Skip header row
            array_shift($rows);
            
            foreach ($rows as $index => $row) {
                $result = $this->processImportRow($row, $index + 2, $errors);
                if ($result) $importedCount++;
            }
            
        } elseif (in_array($extension, ['csv', 'txt'])) {
            // Handle CSV files
            $filePath = $file->getRealPath();
            $handle = fopen($filePath, 'r');
            
            if ($handle !== false) {
                // Read header row
                $headers = fgetcsv($handle);
                
                $rowNumber = 1;
                while (($row = fgetcsv($handle)) !== false) {
                    $rowNumber++;
                    $result = $this->processImportRow($row, $rowNumber, $errors);
                    if ($result) $importedCount++;
                }
                
                fclose($handle);
            }
        } else {
            throw new \Exception('Unsupported file format');
        }
        
        DB::connection('newstore')->commit();
        
        $message = "Imported {$importedCount} items successfully.";
        if (!empty($errors)) {
            $message .= " Errors: " . implode('; ', array_slice($errors, 0, 5));
            if (count($errors) > 5) {
                $message .= " and " . (count($errors) - 5) . " more errors.";
            }
        }
        
        return redirect()->back()->with(
            $importedCount > 0 ? 'success' : 'error',
            $message
        );
        
    } catch (\Exception $e) {
        DB::connection('newstore')->rollBack();
        return redirect()->back()->with('error', 'Failed to import file: ' . $e->getMessage());
    }
}

/**
 * Process a single row from import file
 */
private function processImportRow($row, $rowNumber, &$errors)
{
    // Skip empty rows
    if (empty(array_filter($row))) {
        return false;
    }
    
    $data = [
        'itemcode' => $row[0] ?? '',
        'material_description' => $row[1] ?? '',
        'detailed_description' => $row[2] ?? '',
        'bin_location' => $row[3] ?? '',
        'quantity' => $row[4] ?? 0,
        'uom' => $row[5] ?? '',
        'minimum' => $row[6] ?? 0,
        'maximum' => $row[7] ?? 0,
        'price' => $row[8] ?? 0,
    ];
    
    // Clean up the data
    $data = array_map('trim', $data);
    $data['quantity'] = (int) $data['quantity'];
    $data['minimum'] = (int) $data['minimum'];
    $data['maximum'] = (int) $data['maximum'];
    $data['price'] = (float) $data['price'];
    
    // Validate row data
    $validator = Validator::make($data, [
        'itemcode' => 'required|string|max:255|unique:newstore.supplies,itemcode',
        'material_description' => 'required|string',
        'detailed_description' => 'nullable|string',
        'bin_location' => 'nullable|string|max:255',
        'quantity' => 'required|integer|min:0',
        'uom' => 'required|string|max:50',
        'minimum' => 'nullable|integer|min:0',
        'maximum' => 'nullable|integer|min:0',
        'price' => 'required|numeric|min:0',
    ]);
    
    if ($validator->fails()) {
        $errors[] = "Row {$rowNumber}: " . implode(', ', $validator->errors()->all());
        return false;
    }
    
    try {
        // Create the Supply
        $supply = Supplies::create([
            'itemcode' => $data['itemcode'],
            'material_description' => $data['material_description'],
        ]);
        
        // Create the Supply detail
        SuppliesDetails::create([
            'supply_id' => $supply->id,
            'itemcode' => $data['itemcode'],
            'detailed_description' => $data['detailed_description'],
            'uom' => $data['uom'],
            'minimum' => $data['minimum'] ?? 0,
            'maximum' => $data['maximum'] ?? 0,
            'price' => $data['price'],
            'qty' => $data['quantity'],
            'bin_location' => $data['bin_location'],
        ]);
        
        // Log history
        SuppliesHistory::create([
            'supply_id' => $supply->id,
            'action' => 'imported',
            'user_id' => $this->getAuthUserId(),
            'user_name' => $this->getAuthUserName(),
            'item_code' => $supply->itemcode,
            'changes' => ['Item imported via Excel/CSV'],
            'old_values' => [],
            'new_values' => [
                'itemcode' => $supply->itemcode,
                'material_description' => $supply->material_description,
                'quantity' => $data['quantity'],
                'price' => $data['price'],
            ],
        ]);
        
        return true;
        
    } catch (\Exception $e) {
        $errors[] = "Row {$rowNumber}: Database error - " . $e->getMessage();
        return false;
    }
}

/**
 * Download import template
 */
public function downloadTemplate()
{
    $filePath = storage_path('templates/supplies_template.csv');
    
    // Create directory if it doesn't exist
    $directory = dirname($filePath);
    if (!file_exists($directory)) {
        mkdir($directory, 0755, true);
    }
    
    // Create CSV template
    $handle = fopen($filePath, 'w');
    
    // Add headers
    fputcsv($handle, [
        'itemcode',
        'material_description',
        'detailed_description',
        'bin_location',
        'quantity',
        'uom',
        'minimum',
        'maximum',
        'price'
    ]);
    
    // Add example row
    fputcsv($handle, [
        'ITM001',
        'Screw 5mm',
        'Phillips head screw',
        'A-01-01',
        '100',
        'pcs',
        '50',
        '200',
        '0.25'
    ]);
    
    fclose($handle);
    
    return response()->download($filePath, 'supplies_template.csv')->deleteFileAfterSend(true);
}

}