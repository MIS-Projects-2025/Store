<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsumableCart extends Model
{
    // Use a non-default DB connection
    protected $connection = 'newstore';

    // Table name
    protected $table = 'consumable_cart';

    // Primary key
    protected $primaryKey = 'ID';

    // If your primary key is NOT auto-incrementing using Laravel naming conventions:
    public $incrementing = true;

    // If primary key is not "id" or not bigint
    protected $keyType = 'int';

    // Mass assignable fields
    protected $fillable = [
        'Itemcode',
        'mat_description',
        'Long_description',
        'Bin_location',
        'supplier',
        'category',
        'qty',
        'request_qty',
        'uom',
        'minimum',
        'maximum',
        'order_date',
        'employee_no',
        'approver1',
        'approver2',
        'department',
        'prodline',
        'material_type',
        'mrs_no',
        'Issued_by',
        'mrs_status',
        'approval_status',
        'Issued_qty',
        'remarks',
    ];

    // Laravel timestamps
    public $timestamps = true;
}
