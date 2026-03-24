<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConsignedDetail extends Model
{
    use HasFactory;

    /**
     * Database connection name
     */
    protected $connection = 'newstore';

    /**
     * Table name
     */
    protected $table = 'consigned_details'; // keep exact DB spelling

    /**
     * Primary key
     */
    protected $primaryKey = 'id';

    /**
     * Auto-incrementing primary key
     */
    public $incrementing = true;

    /**
     * Primary key type
     */
    protected $keyType = 'int';

    /**
     * Timestamps enabled
     */
    public $timestamps = true;

    /**
     * Mass assignable fields
     */
    protected $fillable = [
        'consigned_no',
        'commonality',
        'item_code',
        'mat_description',
        'supplier',
        'expiration',
        'uom',
        'qty',
        'qty_per_box',
        'minimum',
        'maximum',
        'price',
        'bin_location',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [
        'expiration' => 'date',
        'price'      => 'decimal:2',
        'qty'        => 'integer',
        'qty_per_box'=> 'integer',
        'minimum'    => 'integer',
        'maximum'    => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: header (consigned)
     * consigned.consigned_no -> consigned_detials.consigned_no
     */
    public function consigned()
    {
        return $this->belongsTo(Consigned::class, 'consigned_no', 'consigned_no');
    }
}
