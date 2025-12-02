<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplies extends Model
{
    // Use the same secondary database connection
    protected $connection = 'newstore';

    // Table name
    protected $table = 'supplies';

    // Primary key
    protected $primaryKey = 'id';

    // Enable timestamps (since created_at / updated_at exist)
    public $timestamps = true;

    // Mass assignable fields
    protected $fillable = [
        'itemcode',
        'material_description',
        'uom',
        'bin_location',
        'qty',
        'minimum',
        'maximum',
        'price'
    ];

    // Cast numeric fields
    protected $casts = [
        'qty' => 'integer',
        'minimum' => 'integer',
        'maximum' => 'integer',
        'price' => 'decimal:2',
    ];

     /**
     * Relationship with supplies history.
     */
    public function history(): HasMany
    {
        return $this->hasMany(SuppliesHistory::class, 'supply_id', 'id');
    }
}
