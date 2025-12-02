<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SuppliesHistory extends Model
{
    protected $connection = 'newstore';
    protected $table = 'supplies_history';

    protected $fillable = [
        'supply_id',
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
     * Relationship with the supply item.
     */
    public function supply(): BelongsTo
    {
        return $this->belongsTo(Supplies::class, 'supply_id', 'id');
    }
}