<?php

// ============================================
// COMPLETE SUPPLY HISTORY MODEL
// File: app/Models/SupplyHistory.php
// ============================================

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupplyHistory extends Model
{
    use HasFactory;

    protected $table = 'supplies_history';

    public $timestamps = false;

    protected $fillable = [
        'supplies_no',
        'material_description',
        'uom',
        'action',
        'changes',
        'old_values',
        'new_values',
        'user_id',
        'user_name',
    ];

    protected $casts = [
        'changes' => 'array',
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Get the changes attribute, ensuring it's always an array
     */
    public function getChangesAttribute($value)
    {
        if (is_null($value)) {
            return [];
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($value) ? $value : [];
    }

    /**
     * Get the old_values attribute, ensuring it's always an array
     */
    public function getOldValuesAttribute($value)
    {
        if (is_null($value)) {
            return [];
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($value) ? $value : [];
    }

    /**
     * Get the new_values attribute, ensuring it's always an array
     */
    public function getNewValuesAttribute($value)
    {
        if (is_null($value)) {
            return [];
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($value) ? $value : [];
    }

    public function supply()
    {
        return $this->belongsTo(Supply::class, 'supplies_no', 'supplies_no');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeCreated($query)
    {
        return $query->where('action', 'created');
    }

    public function scopeUpdated($query)
    {
        return $query->where('action', 'updated');
    }

    public function scopeDeleted($query)
    {
        return $query->where('action', 'deleted');
    }
}