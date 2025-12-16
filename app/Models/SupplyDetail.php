<?php

// ============================================
// 2. SUPPLY DETAILS MODEL
// File: app/Models/SupplyDetail.php
// ============================================

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplyDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'supplies_details';

    protected $fillable = [
        'supplies_no',
        'item_code',
        'detailed_description',
        'qty',
        'min',
        'max',
        'price',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'qty' => 'integer',
        'min' => 'integer',
        'max' => 'integer',
        'price' => 'decimal:2',
        'is_deleted' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    const DELETED_AT = 'deleted_at';

    public function supply()
    {
        return $this->belongsTo(Supply::class, 'supplies_no', 'supplies_no');
    }

    public function history()
    {
        return $this->hasMany(SupplyDetailHistory::class, 'supplies_no', 'supplies_no')
                    ->where('item_code', $this->item_code)
                    ->orderBy('created_at', 'desc');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_deleted', false);
    }

    public function scopeLowStock($query)
    {
        return $query->whereColumn('qty', '<', 'min');
    }

    public function scopeOutOfStock($query)
    {
        return $query->where('qty', '<=', 0);
    }

    public function getIsLowStockAttribute()
    {
        return $this->qty < $this->min;
    }

    public function getIsOutOfStockAttribute()
    {
        return $this->qty <= 0;
    }

    public function getStockStatusAttribute()
    {
        if ($this->qty <= 0) {
            return 'out_of_stock';
        } elseif ($this->qty < $this->min) {
            return 'low_stock';
        } elseif ($this->qty > $this->max) {
            return 'overstock';
        } else {
            return 'normal';
        }
    }

    public static function boot()
    {
        parent::boot();

        static::created(function ($detail) {
            SupplyDetailHistory::create([
                'supplies_no' => $detail->supplies_no,
                'item_code' => $detail->item_code,
                'detailed_description' => $detail->detailed_description,
                'material_description' => $detail->supply->material_description ?? '',
                'uom' => $detail->supply->uom ?? '',
                'action' => 'created',
                'user_id' => $detail->created_by,
                'user_name' => $detail->creator->name ?? 'System',
            ]);
        });

        static::updated(function ($detail) {
            if ($detail->isDirty() && !$detail->is_deleted) {
                $changes = [];
                $oldValues = [];
                $newValues = [];

                foreach ($detail->getDirty() as $key => $value) {
                    if (!in_array($key, ['updated_at', 'updated_by'])) {
                        $changes[] = $key;
                        $oldValues[$key] = $detail->getOriginal($key);
                        $newValues[$key] = $value;
                    }
                }

                if (!empty($changes)) {
                    SupplyDetailHistory::create([
                        'supplies_no' => $detail->supplies_no,
                        'item_code' => $detail->item_code,
                        'detailed_description' => $detail->detailed_description,
                        'material_description' => $detail->supply->material_description ?? '',
                        'uom' => $detail->supply->uom ?? '',
                        'action' => 'updated',
                        'changes' => $changes, // Pass as array, not JSON string
                        'old_values' => $oldValues, // Pass as array, not JSON string
                        'new_values' => $newValues, // Pass as array, not JSON string
                        'user_id' => $detail->updated_by,
                        'user_name' => $detail->updater->name ?? 'System',
                    ]);
                }
            }
        });

        static::deleting(function ($detail) {
            SupplyDetailHistory::create([
                'supplies_no' => $detail->supplies_no,
                'item_code' => $detail->item_code,
                'detailed_description' => $detail->detailed_description,
                'material_description' => $detail->supply->material_description ?? '',
                'uom' => $detail->supply->uom ?? '',
                'action' => 'deleted',
                'user_id' => $detail->deleted_by ?? auth()->id(),
                'user_name' => $detail->deleter->name ?? auth()->user()->name ?? 'System',
            ]);
        });
    }
}