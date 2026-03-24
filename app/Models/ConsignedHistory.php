<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsignedHistory extends Model
{
    protected $connection = 'newstore';
    protected $table = 'consigned_history';

    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';

    public $timestamps = false;

    protected $fillable = [
        'consigned_id',
        'consigned_no',
        'commonality',
        'action',
        'user_id',
        'user_name',
        'changes',
        'old_values',
        'new_values',
        'created_at',
    ];

    protected $casts = [
        'changes'     => 'array',
        'old_values'  => 'array',
        'new_values'  => 'array',
        'created_at'  => 'datetime',
    ];
}
