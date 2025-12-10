<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuppliesDetails extends Model
{
    use HasFactory;

    protected $connection = 'newstore';
    protected $table = 'supplies_details';

    protected $fillable = [
        'supply_id',
        'itemcode',
        'detailed_description',
        'uom',
        'minimum',
        'maximum',
        'price',
        'qty',
        'bin_location',
    ];

    protected $casts = [
        'minimum' => 'integer',
        'maximum' => 'integer',
        'price' => 'decimal:2',
        'qty' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationship: belongs to Supply
    public function supply()
    {
        return $this->belongsTo(Supply::class, 'supply_id');
    }
}
