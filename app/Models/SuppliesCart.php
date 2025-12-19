<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuppliesCart extends Model
{
    use HasFactory;

    /**
     * Database connection
     */
    protected $connection = 'newstore';

    /**
     * Table name
     */
    protected $table = 'supplies_cart';

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
        'quantity',
        'uom',
        'request_qty',
        'issued_qty',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [
        'order_date'   => 'date',
        'quantity'     => 'decimal:2',
        'request_qty'  => 'decimal:2',
        'issued_qty'   => 'decimal:2',
    ];
}
