<?php

namespace App\Imports;

use App\Models\Consumable;
use App\Models\ConsumableDetail;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ConsumableImport implements ToCollection, WithHeadingRow
{
    private $consumableCache = [];
    private $errors = [];

    public function collection(Collection $rows)
    {
        Log::info('=== IMPORT STARTED ===');
        Log::info('Total rows to process: ' . $rows->count());
        
        if ($rows->count() === 0) {
            Log::error('No rows found in file!');
            throw new \Exception('The file appears to be empty or headers are not recognized.');
        }
        
        if ($rows->count() > 0) {
            Log::info('First row keys: ' . json_encode($rows->first()->keys()->toArray()));
            Log::info('First row data: ' . json_encode($rows->first()->toArray()));
        }
        
        DB::beginTransaction();
        
        try {
            $processedCount = 0;
            $skippedCount = 0;
            
            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;
                
                Log::info("Processing row {$rowNumber}");
                
                // Extract and trim values
                $materialDescription = trim($row['material_description'] ?? '');
                $category = trim($row['category'] ?? '');
                $uom = trim($row['uom'] ?? '');
                $itemCode = trim($row['item_code'] ?? '');
                
                // SKIP COMPLETELY EMPTY ROWS
                if (empty($materialDescription) && empty($category) && empty($uom) && empty($itemCode)) {
                    Log::info("Skipping empty row {$rowNumber}");
                    $skippedCount++;
                    continue;
                }
                
                // Validate required fields for non-empty rows
                if (empty($materialDescription)) {
                    $this->errors[] = "Row {$rowNumber}: Material description is required";
                    continue;
                }
                
                if (empty($category)) {
                    $this->errors[] = "Row {$rowNumber}: Category is required";
                    continue;
                }
                
                if (empty($uom)) {
                    $this->errors[] = "Row {$rowNumber}: UOM is required";
                    continue;
                }
                
                if (empty($itemCode)) {
                    $this->errors[] = "Row {$rowNumber}: Item code is required";
                    continue;
                }
                
                $detailedDescription = trim($row['detailed_description'] ?? '');
                $serial = trim($row['serial'] ?? '');
                $binLocation = trim($row['bin_location'] ?? '');
                $quantity = $row['quantity'] ?? 0;
                $max = $row['max'] ?? 0;
                $min = $row['min'] ?? 0;
                
                // Validate quantity is numeric
                if (!is_numeric($quantity) || $quantity < 0) {
                    $this->errors[] = "Row {$rowNumber}: Invalid quantity '{$quantity}'";
                    continue;
                }
                
                // Get or create consumable
                $consumableKey = strtolower($materialDescription);
                
                if (!isset($this->consumableCache[$consumableKey])) {
                    $existingConsumable = Consumable::where('material_description', $materialDescription)->first();
                    
                    if ($existingConsumable) {
                        Log::info("Found existing consumable: {$materialDescription} (ID: {$existingConsumable->consumable_id})");
                        $this->consumableCache[$consumableKey] = [
                            'id' => $existingConsumable->consumable_id,
                            'details' => []
                        ];
                    } else {
                        Log::info("Creating new consumable: {$materialDescription}");
                        $consumable = Consumable::create([
                            'material_description' => $materialDescription,
                            'category' => $category,
                            'uom' => $uom,
                        ]);
                        
                        Log::info("Consumable created with ID: {$consumable->consumable_id}");
                        $this->consumableCache[$consumableKey] = [
                            'id' => $consumable->consumable_id,
                            'details' => []
                        ];
                    }
                }
                
                $consumableId = $this->consumableCache[$consumableKey]['id'];
                
                // Create unique key for merging duplicates
                // Based on: material_description, item_code, detailed_description, serial
                $detailUniqueKey = implode('|', [
                    strtolower($itemCode),
                    strtolower($detailedDescription),
                    strtolower($serial)
                ]);
                
                // Check if this detail combination already exists in buffer
                if (!isset($this->consumableCache[$consumableKey]['details'][$detailUniqueKey])) {
                    // First occurrence - create new detail entry
                    $this->consumableCache[$consumableKey]['details'][$detailUniqueKey] = [
                        'consumable_id' => $consumableId,
                        'item_code' => $itemCode,
                        'detailed_description' => $detailedDescription,
                        'serial' => $serial,
                        'bin_location' => $binLocation,
                        'quantity' => floatval($quantity),
                        'max' => floatval($max),
                        'min' => floatval($min),
                        'rows' => [$rowNumber]
                    ];
                    Log::info("Buffered new detail for row {$rowNumber}");
                } else {
                    // Duplicate found - sum the quantity
                    $this->consumableCache[$consumableKey]['details'][$detailUniqueKey]['quantity'] += floatval($quantity);
                    $this->consumableCache[$consumableKey]['details'][$detailUniqueKey]['rows'][] = $rowNumber;
                    
                    // Update max if current value is higher
                    if (floatval($max) > $this->consumableCache[$consumableKey]['details'][$detailUniqueKey]['max']) {
                        $this->consumableCache[$consumableKey]['details'][$detailUniqueKey]['max'] = floatval($max);
                    }
                    
                    // Update min (take lowest non-zero value)
                    if (floatval($min) > 0) {
                        $currentMin = $this->consumableCache[$consumableKey]['details'][$detailUniqueKey]['min'];
                        if ($currentMin == 0 || floatval($min) < $currentMin) {
                            $this->consumableCache[$consumableKey]['details'][$detailUniqueKey]['min'] = floatval($min);
                        }
                    }
                    
                    Log::info("Merged duplicate - row {$rowNumber} added to existing detail. New quantity: " . $this->consumableCache[$consumableKey]['details'][$detailUniqueKey]['quantity']);
                }
                
                $processedCount++;
            }
            
            if (!empty($this->errors)) {
                Log::error('Import errors found: ' . count($this->errors));
                Log::error('Errors: ' . implode("\n", $this->errors));
                DB::rollBack();
                throw new \Exception("Import failed with " . count($this->errors) . " errors:\n" . implode("\n", $this->errors));
            }
            
            // Now save all buffered details to database
            Log::info('Saving buffered details to database...');
            $totalDetailsCreated = 0;
            
            foreach ($this->consumableCache as $consumableKey => $consumableData) {
                foreach ($consumableData['details'] as $detailKey => $detailData) {
                    $rows = $detailData['rows'];
                    unset($detailData['rows']); // Remove the tracking array before saving
                    
                    $detail = ConsumableDetail::create($detailData);
                    $totalDetailsCreated++;
                    
                    if (count($rows) > 1) {
                        Log::info("Created detail ID {$detail->id} (merged from rows: " . implode(', ', $rows) . ") with total quantity: {$detail->quantity}");
                    } else {
                        Log::info("Created detail ID {$detail->id} from row {$rows[0]} with quantity: {$detail->quantity}");
                    }
                }
            }
            
            DB::commit();
            Log::info('=== IMPORT COMPLETED SUCCESSFULLY ===');
            Log::info("Created/Updated " . count($this->consumableCache) . " consumables");
            Log::info("Processed {$processedCount} data rows");
            Log::info("Skipped {$skippedCount} empty rows");
            Log::info("Created {$totalDetailsCreated} unique detail records");
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Import exception: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            throw $e;
        }
    }
}