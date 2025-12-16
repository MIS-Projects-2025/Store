<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConsumableHistory extends Model
{
    use HasFactory;

    protected $table = 'consumable_history';
    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = false; // Because created_at is default CURRENT_TIMESTAMP

    protected $fillable = [
        'consumable_id',
        'action',
        'user_id',
        'user_name',
        'item_code',
        'changes',
        'old_values',
        'new_values',
        'created_at'
    ];

    protected $casts = [
        'changes' => 'array',
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function consumable()
    {
        return $this->belongsTo(Consumable::class, 'consumable_id', 'consumable_id');
    }

    public function getActionBadgeAttribute()
    {
        $badgeClasses = [
            'created' => 'badge-success',
            'updated' => 'badge-warning',
            'deleted' => 'badge-error',
            'quantity_added' => 'badge-info',
        ];
        
        return $badgeClasses[$this->action] ?? 'badge-neutral';
    }

    public function getFormattedChangesAttribute()
    {
        if ($this->action === 'created') {
            return 'Item created';
        }
        
        if ($this->action === 'deleted') {
            return 'Item deleted';
        }
        
        if ($this->action === 'quantity_added') {
            return 'Quantity added';
        }
        
        $changes = [];
        foreach ($this->changes as $field) {
            $oldValue = $this->old_values[$field] ?? 'N/A';
            $newValue = $this->new_values[$field] ?? 'N/A';
            $changes[] = "{$field}: {$oldValue} → {$newValue}";
        }
        
        return implode(', ', $changes);
    }
}
