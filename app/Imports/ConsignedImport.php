<?php

namespace App\Imports;

use App\Models\Consigned;
use App\Models\ConsignedDetail;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ConsignedImport implements ToCollection, WithHeadingRow
{
    private $consignedItems = []; // Track all consigned items by description
    private $detailsBuffer = [];  // Buffer details for each consigned item
    private $errors = [];

    public function collection(Collection $rows)
    {
        Log::info('=== CONSIGNED IMPORT STARTED ===');
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
            
            // Process all rows and group by description
            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;
                
                Log::info("Processing row {$rowNumber}");
                
                $description = trim($row['material_description'] ?? '');
                $category = trim($row['category'] ?? '');
                $itemCode = trim($row['item_code'] ?? '');
                $supplier = trim($row['supplier'] ?? '');
                
                // SKIP COMPLETELY EMPTY ROWS
                if (empty($description) && empty($category) && empty($itemCode) && empty($supplier)) {
                    Log::info("Skipping empty row {$rowNumber}");
                    $skippedCount++;
                    continue;
                }
                
                if (empty($description)) {
                    $error = "Row {$rowNumber}: Material description is required";
                    $this->errors[] = $error;
                    Log::error($error);
                    continue;
                }
                
                // Create consigned item if it doesn't exist
                if (!isset($this->consignedItems[$description])) {
                    $consignedNo = $this->generateConsignedNumber();
                    $firstItemCode = trim($row['item_code'] ?? '');
                    $firstSupplier = trim($row['supplier'] ?? '');
                    
                    Log::info("Creating new consigned item: {$description} (No: {$consignedNo})");
                    
                    $consigned = Consigned::create([
                        'consigned_no' => $consignedNo,
                        'mat_description' => $description,
                        'category' => $category,
                        'selected_itemcode' => $firstItemCode,
                        'selected_supplier' => $firstSupplier,
                    ]);
                    
                    Log::info("Consigned item created with ID: {$consigned->id}");
                    
                    $this->consignedItems[$description] = [
                        'id' => $consigned->id,
                        'consigned_no' => $consignedNo,
                    ];
                    
                    $this->detailsBuffer[$description] = [];
                }
                
                // Buffer detail for this consigned item
                if (!empty($row['item_code']) && !empty($row['supplier'])) {
                    $consignedNo = $this->consignedItems[$description]['consigned_no'];
                    
                    Log::info("Raw expiration value from Excel: " . ($row['expiration_date'] ?? 'EMPTY'));
                    $parsedExpiration = $this->parseDate($row['expiration_date'] ?? null);
                    Log::info("Parsed expiration result: " . ($parsedExpiration ?? 'NULL'));
                    
                    // Create unique key to aggregate duplicates
                    $uniqueKey = implode('|', [
                        $consignedNo,
                        trim($row['item_code']),
                        trim($row['supplier']),
                        $parsedExpiration ?? 'null',
                        trim($row['bin_location'] ?? ''),
                    ]);
                    
                    if (!isset($this->detailsBuffer[$description][$uniqueKey])) {
                        $this->detailsBuffer[$description][$uniqueKey] = [
                            'consigned_no' => $consignedNo,
                            'item_code' => trim($row['item_code']),
                            'supplier' => trim($row['supplier']),
                            'expiration' => $parsedExpiration,
                            'uom' => trim($row['uom'] ?? ''),
                            'qty' => 0,
                            'qty_per_box' => !empty($row['qty_per_box']) ? floatval($row['qty_per_box']) : 0,
                            'minimum' => !empty($row['minimum']) ? floatval($row['minimum']) : 0,
                            'maximum' => !empty($row['maximum']) ? floatval($row['maximum']) : 0,
                            'price' => !empty($row['price']) ? floatval($row['price']) : 0,
                            'bin_location' => trim($row['bin_location'] ?? ''),
                            'rows' => [$rowNumber]
                        ];
                        Log::info("Buffered new detail for row {$rowNumber}");
                    } else {
                        // Duplicate found - aggregate quantity
                        $this->detailsBuffer[$description][$uniqueKey]['rows'][] = $rowNumber;
                        Log::info("Duplicate found - row {$rowNumber} will be merged");
                    }
                    
                    // Aggregate quantity
                    $qtyToAdd = floatval($row['quantity'] ?? 0);
                    $this->detailsBuffer[$description][$uniqueKey]['qty'] += $qtyToAdd;
                    
                    Log::info("Added quantity {$qtyToAdd}. Total quantity: " . $this->detailsBuffer[$description][$uniqueKey]['qty']);
                }
                
                $processedCount++;
            }
            
            if (!empty($this->errors)) {
                Log::error('Import errors found: ' . count($this->errors));
                Log::error('Errors: ' . implode("\n", $this->errors));
                DB::rollBack();
                throw new \Exception(implode("\n", $this->errors));
            }
            
            // Save all buffered details
            Log::info('Saving buffered details to database...');
            $totalDetailsCreated = 0;
            
            foreach ($this->detailsBuffer as $description => $details) {
                Log::info("Saving details for: {$description}");
                
                foreach ($details as $uniqueKey => $detail) {
                    $rows = $detail['rows'];
                    unset($detail['rows']); // Remove the tracking array before saving
                    
                    $detailRecord = ConsignedDetail::create($detail);
                    $totalDetailsCreated++;
                    
                    if (count($rows) > 1) {
                        Log::info("Created detail ID {$detailRecord->id} (merged from rows: " . implode(', ', $rows) . ") with total quantity: {$detailRecord->qty}");
                    } else {
                        Log::info("Created detail ID {$detailRecord->id} from row {$rows[0]} with quantity: {$detailRecord->qty}");
                    }
                }
            }
            
            DB::commit();
            
            Log::info('=== CONSIGNED IMPORT COMPLETED SUCCESSFULLY ===');
            Log::info("Created " . count($this->consignedItems) . " consigned items");
            Log::info("Processed {$processedCount} data rows");
            Log::info("Skipped {$skippedCount} empty rows");
            Log::info("Created {$totalDetailsCreated} unique detail records");
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('=== CONSIGNED IMPORT FAILED ===');
            Log::error('Import exception: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            throw $e;
        }
    }

    private function generateConsignedNumber()
    {
        $lastConsigned = Consigned::orderBy('consigned_no', 'desc')->first();
        
        if (!$lastConsigned || !$lastConsigned->consigned_no) {
            Log::info('No previous consigned number found, starting with CON-00001');
            return 'CON-00001';
        }
        
        $lastNumber = intval(substr($lastConsigned->consigned_no, 4));
        $newNumber = $lastNumber + 1;
        $newConsignedNo = 'CON-' . str_pad($newNumber, 5, '0', STR_PAD_LEFT);
        
        Log::info("Generated new consigned number: {$newConsignedNo}");
        
        return $newConsignedNo;
    }

    private function parseDate($value)
    {
        if (empty($value)) {
            Log::info("Date value is empty, returning null");
            return null;
        }
        
        // Handle N/A or similar text values
        $valueTrimmed = trim(strtoupper($value));
        if (in_array($valueTrimmed, ['N/A', 'NA', 'NONE', 'NULL', '-', 'NOT APPLICABLE'])) {
            Log::info("Expiration date is '{$value}', leaving blank");
            return null;
        }
        
        try {
            // Handle Excel date serial numbers (must be positive and reasonable)
            if (is_numeric($value) && $value > 0 && $value < 100000) {
                $date = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value);
                $formatted = $date->format('Y-m-d');
                Log::info("Parsed Excel serial date {$value} to {$formatted}");
                return $formatted;
            }
            
            // Handle MM/DD/YYYY format (slash)
            if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $value, $matches)) {
                $month = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
                $day = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
                $year = $matches[3];
                $formatted = "{$year}-{$month}-{$day}";
                Log::info("Parsed MM/DD/YYYY date {$value} to {$formatted}");
                return $formatted;
            }
            
            // Handle MM-DD-YYYY format (dash)
            if (preg_match('/^(\d{1,2})-(\d{1,2})-(\d{4})$/', $value, $matches)) {
                $month = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
                $day = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
                $year = $matches[3];
                $formatted = "{$year}-{$month}-{$day}";
                Log::info("Parsed MM-DD-YYYY date {$value} to {$formatted}");
                return $formatted;
            }
            
            // Handle DD/MM/YYYY format (European) - only if day > 12
            if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $value, $matches)) {
                if (intval($matches[1]) > 12) {
                    $day = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
                    $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
                    $year = $matches[3];
                    $formatted = "{$year}-{$month}-{$day}";
                    Log::info("Parsed DD/MM/YYYY date {$value} to {$formatted}");
                    return $formatted;
                }
            }
            
            // Try using DateTime::createFromFormat for more precise parsing
            $formats = ['m/d/Y', 'm-d-Y', 'd/m/Y', 'd-m-Y', 'Y-m-d', 'Y/m/d'];
            foreach ($formats as $format) {
                $date = \DateTime::createFromFormat($format, $value);
                if ($date !== false && $date->format($format) === $value) {
                    $formatted = $date->format('Y-m-d');
                    Log::info("Parsed date {$value} using format {$format} to {$formatted}");
                    return $formatted;
                }
            }
            
            Log::warning("Could not parse date: '{$value}', leaving blank");
            return null;
        } catch (\Exception $e) {
            Log::error("Failed to parse date: '{$value}' - " . $e->getMessage());
            return null;
        }
    }
}