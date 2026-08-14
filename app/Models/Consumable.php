<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Consumable extends Model
{
    use HasFactory;

    protected $table = 'consumables';
    protected $primaryKey = 'consumable_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'material_description',
        'category',
        'uom',
    ];

    public function details()
    {
        return $this->hasMany(ConsumableDetail::class, 'consumable_id', 'consumable_id');
    }

    public function history()
    {
        return $this->hasMany(ConsumableHistory::class, 'consumable_id', 'consumable_id');
    }

    protected static function booted()
    {
        static::created(function ($consumable) {
            $userName = session('emp_data.emp_name', 'Unknown User');
            $userId = session('emp_data.id', null);
            
            ConsumableHistory::create([
                'consumable_id' => $consumable->consumable_id,
                'action' => 'created',
                'user_id' => $userId,
                'user_name' => $userName,
                'item_code' => null,
                'changes' => ['material_description', 'category', 'uom'],
                'old_values' => [],
                'new_values' => [
                    'material_description' => $consumable->material_description,
                    'category' => $consumable->category,
                    'uom' => $consumable->uom,
                ],
            ]);
        });

        static::updated(function ($consumable) {
            $userName = session('emp_data.emp_name', 'Unknown User');
            $userId = session('emp_data.id', null);
            $changes = [];
            $oldValues = [];
            $newValues = [];
            
            $trackedFields = ['material_description', 'category', 'uom'];
            
            foreach ($trackedFields as $field) {
                if ($consumable->wasChanged($field)) {
                    $changes[] = $field;
                    $oldValues[$field] = $consumable->getOriginal($field);
                    $newValues[$field] = $consumable->$field;
                }
            }
            
            if (!empty($changes)) {
                ConsumableHistory::create([
                    'consumable_id' => $consumable->consumable_id,
                    'action' => 'updated',
                    'user_id' => $userId,
                    'user_name' => $userName,
                    'item_code' => null,
                    'changes' => $changes,
                    'old_values' => $oldValues,
                    'new_values' => $newValues,
                ]);
            }
        });

        static::deleted(function ($consumable) {
            $userName = session('emp_data.emp_name', 'Unknown User');
            $userId = session('emp_data.id', null);
            
            ConsumableHistory::create([
                'consumable_id' => $consumable->consumable_id,
                'action' => 'deleted',
                'user_id' => $userId,
                'user_name' => $userName,
                'item_code' => null,
                'changes' => [],
                'old_values' => [
                    'material_description' => $consumable->material_description,
                    'category' => $consumable->category,
                    'uom' => $consumable->uom,
                ],
                'new_values' => [],
            ]);
        });
    }
}