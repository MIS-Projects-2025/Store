<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConsignedCart extends Model
{
    use HasFactory;

    /**
     * Database connection
     */
    protected $connection = 'newstore';

    /**
     * Table name
     */
    protected $table = 'consigned_cart';

    /**
     * Primary key
     */
    protected $primaryKey = 'id';

    /**
     * Key type
     */
    protected $keyType = 'int';

    /**
     * Auto-incrementing
     */
    public $incrementing = true;

    /**
     * Mass assignable attributes
     */
    protected $fillable = [
        'mrs_no',
        'order_date',
        'employee_no',
        'factory',
        'station',
        'issued_by',
        'mrs_status',
        'item_code',
        'material_description',
        'supplier',
        'expiration',
        'bin_location',
        'quantity',
        'uom',
        'qty_per_box',
        'request_qty',
        'issued_qty',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [
        'order_date'   => 'date',
        'expiration'   => 'date',
        'quantity'     => 'decimal:2',
        'qty_per_box'  => 'decimal:2',
        'request_qty'  => 'decimal:2',
        'issued_qty'   => 'decimal:2',
    ];
}