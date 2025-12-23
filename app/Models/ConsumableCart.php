<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConsumableCart extends Model
{
    use HasFactory;

    /**
     * Database connection
     */
    protected $connection = 'newstore';

    /**
     * Table name
     */
    protected $table = 'consumable_cart';

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
     * Mass assignable fields
     */
    protected $fillable = [
        'mrs_no',
        'order_date',
        'emp_id',
        'emp_name',
        'approver',
        'department',
        'prodline',
        'mrs_status',
        'approver_status',
        'issued_by',
        'itemCode',
        'material_description',
        'detailed_description',
        'serial',
        'bin_location',
        'quantity',
        'uom',
        'request_quantity',
        'issued_quantity',
        'remarks',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [
        'order_date'        => 'date',
        'quantity'          => 'decimal:2',
        'request_quantity'  => 'decimal:2',
        'issued_quantity'   => 'decimal:2',
    ];
}