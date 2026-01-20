<?php

namespace App\Imports;

use App\Models\Supply;
use App\Models\SupplyDetail;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class SuppliesImport implements ToCollection, WithHeadingRow
{
    private $suppliesCache = [];
    private $errors = [];

    public function collection(Collection $rows)
    {
        Log::info('=== SUPPLIES IMPORT STARTED ===');
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
                
                // Extract and trim values - handle different possible column names
                $materialDescription = trim($row['material_description'] ?? '');
                $uom = trim($row['uom'] ?? '');
                $itemCode = trim($row['item_code'] ?? '');
                $detailedDescription = trim($row['detailed_description'] ?? '');
                
                // Handle "Quantity" vs "qty"
                $qty = $row['quantity'] ?? $row['qty'] ?? 0;
                $min = $row['min'] ?? 0;
                $max = $row['max'] ?? 0;
                $price = $row['price'] ?? 0;
                
                // SKIP COMPLETELY EMPTY ROWS
                if (empty($materialDescription) && empty($uom) && empty($itemCode)) {
                    Log::info("Skipping empty row {$rowNumber}");
                    $skippedCount++;
                    continue;
                }
                
                // Validate required fields for non-empty rows
                if (empty($materialDescription)) {
                    $this->errors[] = "Row {$rowNumber}: Material description is required";
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
                
                // Validate quantity is numeric
                if (!is_numeric($qty) || $qty < 0) {
                    $this->errors[] = "Row {$rowNumber}: Invalid quantity '{$qty}'";
                    continue;
                }
                
                // Validate price is numeric
                if (!is_numeric($price) || $price < 0) {
                    $this->errors[] = "Row {$rowNumber}: Invalid price '{$price}'";
                    continue;
                }
                
                // Get or create supply - IMPORTANT: Case-insensitive matching
                $supplyKey = strtolower(trim($materialDescription)) . '|' . strtolower(trim($uom));
                
                if (!isset($this->suppliesCache[$supplyKey])) {
                    // Check if supply already exists in database (case-insensitive)
                    $existingSupply = Supply::whereRaw('LOWER(material_description) = ?', [strtolower($materialDescription)])
                                           ->whereRaw('LOWER(uom) = ?', [strtolower($uom)])
                                           ->where('is_deleted', false)
                                           ->first();
                    
                    if ($existingSupply) {
                        Log::info("Found existing supply: {$existingSupply->material_description} ({$existingSupply->uom}) - Supplies No: {$existingSupply->supplies_no}");
                        $this->suppliesCache[$supplyKey] = [
                            'supplies_no' => $existingSupply->supplies_no,
                            'material_description' => $existingSupply->material_description, // Use existing case
                            'uom' => $existingSupply->uom, // Use existing case
                            'details' => []
                        ];
                    } else {
                        // Generate new supplies_no
                        $lastSupply = Supply::withTrashed()->orderBy('supplies_no', 'desc')->first();
                        $nextNumber = $lastSupply 
                            ? intval(substr($lastSupply->supplies_no, 4)) + 1 
                            : 1;
                        $suppliesNo = 'SUP-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
                        
                        Log::info("Creating new supply: {$materialDescription} ({$uom}) - Supplies No: {$suppliesNo}");
                        
                        $supply = Supply::create([
                            'supplies_no' => $suppliesNo,
                            'material_description' => $materialDescription,
                            'uom' => $uom,
                            'created_by' => Auth::id(),
                        ]);
                        
                        Log::info("Supply created with Supplies No: {$supply->supplies_no}");
                        
                        $this->suppliesCache[$supplyKey] = [
                            'supplies_no' => $supply->supplies_no,
                            'material_description' => $materialDescription,
                            'uom' => $uom,
                            'details' => []
                        ];
                    }
                }
                
                $suppliesNo = $this->suppliesCache[$supplyKey]['supplies_no'];
                
                // Create unique key for merging duplicates
                // Based on: item_code AND detailed_description (both must match)
                $detailUniqueKey = strtolower(trim($itemCode)) . '|' . strtolower(trim($detailedDescription));
                
                // Check if this detail combination already exists in buffer
                if (!isset($this->suppliesCache[$supplyKey]['details'][$detailUniqueKey])) {
                    // First occurrence - create new detail entry
                    $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey] = [
                        'supplies_no' => $suppliesNo,
                        'item_code' => $itemCode,
                        'detailed_description' => $detailedDescription,
                        'qty' => intval($qty),
                        'min' => intval($min),
                        'max' => intval($max),
                        'price' => floatval($price),
                        'rows' => [$rowNumber]
                    ];
                    Log::info("Buffered new detail for row {$rowNumber}: {$itemCode} - {$detailedDescription}");
                } else {
                    // Duplicate found - sum the quantity
                    $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey]['qty'] += intval($qty);
                    $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey]['rows'][] = $rowNumber;
                    
                    // Update max if current value is higher
                    if (intval($max) > $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey]['max']) {
                        $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey]['max'] = intval($max);
                    }
                    
                    // Update min (take lowest non-zero value)
                    if (intval($min) > 0) {
                        $currentMin = $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey]['min'];
                        if ($currentMin == 0 || intval($min) < $currentMin) {
                            $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey]['min'] = intval($min);
                        }
                    }
                    
                    // Update price (take the latest/highest price)
                    if (floatval($price) > $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey]['price']) {
                        $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey]['price'] = floatval($price);
                    }
                    
                    Log::info("Merged duplicate - row {$rowNumber} added to existing detail. New quantity: " . $this->suppliesCache[$supplyKey]['details'][$detailUniqueKey]['qty']);
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
            
            foreach ($this->suppliesCache as $supplyKey => $supplyData) {
                foreach ($supplyData['details'] as $detailKey => $detailData) {
                    $rows = $detailData['rows'];
                    unset($detailData['rows']); // Remove the tracking array before saving
                    
                    $detail = SupplyDetail::create(array_merge($detailData, [
                        'created_by' => Auth::id()
                    ]));
                    $totalDetailsCreated++;
                    
                    if (count($rows) > 1) {
                        Log::info("Created detail ID {$detail->id} - {$detail->item_code} ({$detail->detailed_description}) - merged from rows: " . implode(', ', $rows) . " with total quantity: {$detail->qty}");
                    } else {
                        Log::info("Created detail ID {$detail->id} - {$detail->item_code} ({$detail->detailed_description}) - from row {$rows[0]} with quantity: {$detail->qty}");
                    }
                }
            }
            
            DB::commit();
            Log::info('=== SUPPLIES IMPORT COMPLETED SUCCESSFULLY ===');
            Log::info("Created/Updated " . count($this->suppliesCache) . " supplies");
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