<?php

// ============================================
// 1. SUPPLIES MODEL
// File: app/Models/Supply.php
// ============================================

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supply extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'supplies';

    protected $fillable = [
        'supplies_no',
        'material_description',
        'uom',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'is_deleted' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    const DELETED_AT = 'deleted_at';

    public function details()
    {
        return $this->hasMany(SupplyDetail::class, 'supplies_no', 'supplies_no')
                    ->where('is_deleted', false);
    }

    public function allDetails()
    {
        return $this->hasMany(SupplyDetail::class, 'supplies_no', 'supplies_no');
    }

    public function history()
    {
        return $this->hasMany(SupplyHistory::class, 'supplies_no', 'supplies_no')
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

    public function getTotalQuantityAttribute()
    {
        return $this->details()->sum('qty');
    }

    public static function boot()
    {
        parent::boot();

        static::created(function ($supply) {
            SupplyHistory::create([
                'supplies_no' => $supply->supplies_no,
                'material_description' => $supply->material_description,
                'uom' => $supply->uom,
                'action' => 'created',
                'user_id' => $supply->created_by,
                'user_name' => $supply->creator->name ?? 'System',
            ]);
        });

        static::updated(function ($supply) {
            if ($supply->isDirty() && !$supply->is_deleted) {
                $changes = [];
                $oldValues = [];
                $newValues = [];

                foreach ($supply->getDirty() as $key => $value) {
                    if (!in_array($key, ['updated_at', 'updated_by'])) {
                        $changes[] = $key;
                        $oldValues[$key] = $supply->getOriginal($key);
                        $newValues[$key] = $value;
                    }
                }

                if (!empty($changes)) {
                    SupplyHistory::create([
                        'supplies_no' => $supply->supplies_no,
                        'material_description' => $supply->material_description,
                        'uom' => $supply->uom,
                        'action' => 'updated',
                        'changes' => $changes, // Pass as array, not JSON string
                        'old_values' => $oldValues, // Pass as array, not JSON string
                        'new_values' => $newValues, // Pass as array, not JSON string
                        'user_id' => $supply->updated_by,
                        'user_name' => $supply->updater->name ?? 'System',
                    ]);
                }
            }
        });

        static::deleting(function ($supply) {
            SupplyHistory::create([
                'supplies_no' => $supply->supplies_no,
                'material_description' => $supply->material_description,
                'uom' => $supply->uom,
                'action' => 'deleted',
                'user_id' => $supply->deleted_by ?? auth()->id(),
                'user_name' => $supply->deleter->name ?? auth()->user()->name ?? 'System',
            ]);
        });
    }
}