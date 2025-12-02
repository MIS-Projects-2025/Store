<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Consumable extends Model
{
    // Use the secondary database connection
    protected $connection = 'newstore';

    // Table name
    protected $table = 'consumable';

    // Primary key
    protected $primaryKey = 'id';

    // Laravel timestamps are present in your table
    public $timestamps = true;

    // Mass assignable fields
    protected $fillable = [
        'Itemcode',
        'mat_description',
        'Long_description',
        'Bin_location',
        'supplier',
        'category',
        'qty',
        'uom',
        'minimum',
        'maximum'
    ];

    // Cast numeric fields to proper types
    protected $casts = [
        'qty' => 'decimal:2',
        'minimum' => 'decimal:2',
        'maximum' => 'decimal:2',
    ];

    /**
     * Relationship with consumable history.
     */
    public function history(): HasMany
    {
        return $this->hasMany(ConsumableHistory::class, 'consumable_id', 'id');
    }
}