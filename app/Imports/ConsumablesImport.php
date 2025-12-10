<?php

namespace App\Imports;

use App\Models\Consumable;
use App\Models\ConsumableHistory;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Throwable;

class ConsumablesImport implements 
    ToModel, 
    WithHeadingRow, 
    WithValidation, 
    SkipsOnError,
    SkipsOnFailure,
    WithBatchInserts,
    WithChunkReading
{
    protected $importedCount = 0;
    protected $skippedCount = 0;
    protected $errors = [];
    protected $userId;
    protected $userName;

    public function __construct()
    {
        $this->userId = session('emp_data.emp_id', 'unknown');
        $this->userName = session('emp_data.emp_name', 'Unknown User');
    }

    /**
     * @param array $row
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        // Check if item already exists
        $existing = Consumable::where('Itemcode', $row['itemcode'])->first();
        
        if ($existing) {
            $this->skippedCount++;
            $this->errors[] = "Item {$row['itemcode']} already exists - skipped";
            return null;
        }

        $consumable = new Consumable([
            'Itemcode' => $row['itemcode'],
            'mat_description' => $row['mat_description'],
            'Long_description' => $row['long_description'],
            'Bin_location' => $row['bin_location'],
            'supplier' => $row['supplier'],
            'category' => $row['category'],
            'qty' => $row['qty'] ?? 0,
            'uom' => $row['uom'],
            'minimum' => $row['minimum'] ?? 0,
            'maximum' => $row['maximum'] ?? 0,
        ]);

        $this->importedCount++;

        // Log the import in history after the model is saved
        $consumable->saved(function ($consumable) use ($row) {
            ConsumableHistory::create([
                'consumable_id' => $consumable->id,
                'action' => 'imported',
                'user_id' => $this->userId,
                'user_name' => $this->userName,
                'item_code' => $consumable->Itemcode,
                'changes' => ['Item imported from Excel'],
                'old_values' => null,
                'new_values' => $consumable->toArray(),
                'created_at' => now(),
            ]);
        });

        return $consumable;
    }

    /**
     * Validation rules for each row
     */
    public function rules(): array
    {
        return [
            'itemcode' => 'required|string|max:255',
            'mat_description' => 'required|string|max:255',
            'long_description' => 'required|string',
            'bin_location' => 'required|string|max:255',
            'supplier' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'qty' => 'nullable|numeric|min:0',
            'uom' => 'required|string|max:50',
            'minimum' => 'nullable|numeric|min:0',
            'maximum' => 'nullable|numeric|min:0',
        ];
    }

    /**
     * Handle errors during import
     */
    public function onError(Throwable $e)
    {
        $this->errors[] = $e->getMessage();
    }

    /**
     * Handle validation failures
     */
    public function onFailure(\Maatwebsite\Excel\Validators\Failure ...$failures)
    {
        foreach ($failures as $failure) {
            $this->errors[] = "Row {$failure->row()}: " . implode(', ', $failure->errors());
            $this->skippedCount++;
        }
    }

    /**
     * Batch size for processing
     */
    public function batchSize(): int
    {
        return 100;
    }

    /**
     * Chunk size for reading
     */
    public function chunkSize(): int
    {
        return 100;
    }

    /**
     * Get import statistics
     */
    public function getStats(): array
    {
        return [
            'imported' => $this->importedCount,
            'skipped' => $this->skippedCount,
            'errors' => $this->errors,
        ];
    }
}