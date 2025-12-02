<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsumableHistory extends Model
{
    protected $connection = 'newstore';
    protected $table = 'consumable_history';

    protected $fillable = [
        'consumable_id',
        'action',
        'user_id',
        'user_name',
        'item_code',
        'changes',
        'old_values',
        'new_values',
        'created_at',
    ];

    protected $casts = [
        'changes'    => 'array',
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    public $timestamps = false;

    /**
     * Relationship with the consumable item.
     */
    public function consumable(): BelongsTo
    {
        return $this->belongsTo(Consumable::class, 'consumable_id', 'id');
    }
}