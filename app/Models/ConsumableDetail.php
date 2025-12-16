<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class ConsumableDetail extends Model
{
    use HasFactory;

    protected $table = 'consumable_details';
    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'consumable_id',
        'item_code',
        'detailed_description',
        'serial',
        'bin_location',
        'quantity',
        'max',
        'min',
        'created_at',
        'updated_at'
    ];

    public function consumable()
    {
        return $this->belongsTo(Consumable::class, 'consumable_id', 'consumable_id');
    }

    public function history()
    {
        return $this->hasMany(ConsumableDetailHistory::class, 'consumable_detail_id', 'id');
    }

    protected static function booted()
    {
        static::created(function ($detail) {
            $userName = session('emp_data.emp_name', 'Unknown User');
            $userId = session('emp_data.id', null);
            
            ConsumableDetailHistory::create([
                'consumable_detail_id' => $detail->id,
                'consumable_id' => $detail->consumable_id,
                'action' => 'created',
                'user_id' => $userId,
                'user_name' => $userName,
                'item_code' => $detail->item_code,
                'changes' => ['item_code', 'detailed_description', 'serial', 'bin_location', 'quantity', 'max', 'min'],
                'old_values' => [],
                'new_values' => [
                    'item_code' => $detail->item_code,
                    'detailed_description' => $detail->detailed_description,
                    'serial' => $detail->serial,
                    'bin_location' => $detail->bin_location,
                    'quantity' => $detail->quantity,
                    'max' => $detail->max,
                    'min' => $detail->min,
                ],
                'created_at' => now()
            ]);
        });

        static::updated(function ($detail) {
            // Skip history logging if timestamps are disabled (used in bulk operations)
            if (!$detail->timestamps) {
                return;
            }
            
            $userName = session('emp_data.emp_name', 'Unknown User');
            $userId = session('emp_data.id', null);
            $changes = [];
            $oldValues = [];
            $newValues = [];
            
            $trackedFields = ['item_code', 'detailed_description', 'serial', 'bin_location', 'quantity', 'max', 'min'];
            
            foreach ($trackedFields as $field) {
                if ($detail->wasChanged($field)) {
                    $changes[] = $field;
                    $oldValues[$field] = $detail->getOriginal($field);
                    $newValues[$field] = $detail->$field;
                }
            }
            
            if (!empty($changes)) {
                ConsumableDetailHistory::create([
                    'consumable_detail_id' => $detail->id,
                    'consumable_id' => $detail->consumable_id,
                    'action' => 'updated',
                    'user_id' => $userId,
                    'user_name' => $userName,
                    'item_code' => $detail->item_code,
                    'changes' => $changes,
                    'old_values' => $oldValues,
                    'new_values' => $newValues,
                    'created_at' => now()
                ]);
            }
        });

        // FIX: Use 'deleting' instead of 'deleted' to create history BEFORE the record is deleted
        static::deleting(function ($detail) {
            $userName = session('emp_data.emp_name', 'Unknown User');
            $userId = session('emp_data.id', null);
            
            // Create history record BEFORE the detail is deleted
            ConsumableDetailHistory::create([
                'consumable_detail_id' => $detail->id,
                'consumable_id' => $detail->consumable_id,
                'action' => 'deleted',
                'user_id' => $userId,
                'user_name' => $userName,
                'item_code' => $detail->item_code,
                'changes' => [],
                'old_values' => [
                    'item_code' => $detail->item_code,
                    'detailed_description' => $detail->detailed_description,
                    'serial' => $detail->serial,
                    'bin_location' => $detail->bin_location,
                    'quantity' => $detail->quantity,
                    'max' => $detail->max,
                    'min' => $detail->min,
                ],
                'new_values' => [],
                'created_at' => now()
            ]);
        });
    }
}