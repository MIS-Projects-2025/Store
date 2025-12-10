<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuppliesCart extends Model
{
    // Use the specific DB connection
    protected $connection = 'newstore';

    // Table name
    protected $table = 'supplies_cart';

    // Primary key
    protected $primaryKey = 'ID';

    public $incrementing = true;

    protected $keyType = 'int';

    // MRS Status Constants (as integers)
    const MRS_STATUS_PENDING = 0;
    const MRS_STATUS_APPROVED = 1;
    const MRS_STATUS_REJECTED = 2;
    const MRS_STATUS_COMPLETED = 3;
    const MRS_STATUS_CANCELLED = 4;

    // Mass assignable columns
    protected $fillable = [
        'Itemcode',
        'mat_description',
        'detailed_description',
        'Bin_location',
        'qty',
        'request_qty',
        'uom',
        'minimum',
        'maximum',
        'price',
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

    // Cast mrs_status to integer
    protected $casts = [
        'mrs_status' => 'integer',
        'qty' => 'integer',
        'request_qty' => 'integer',
        'minimum' => 'integer',
        'maximum' => 'integer',
        'Issued_qty' => 'integer',
    ];

    public $timestamps = true;
}