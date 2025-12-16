<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsumableDetailHistory extends Model
{
    protected $table = 'consumable_detail_history';
    public $timestamps = false;
    
    protected $fillable = [
        'consumable_detail_id',
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
        'created_at' => 'datetime',
    ];

    // Make relationships nullable
    public function detail()
    {
        return $this->belongsTo(ConsumableDetail::class, 'consumable_detail_id', 'id')
                    ->withDefault(); // Returns null model if not found
    }

    public function consumable()
    {
        return $this->belongsTo(Consumable::class, 'consumable_id', 'consumable_id')
                    ->withDefault(); // Returns null model if not found
    }

    protected static function booted()
    {
        static::creating(function ($history) {
            if (!$history->created_at) {
                $history->created_at = now();
            }
        });
    }
}