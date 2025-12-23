<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsignedUser extends Model
{
    // Use custom database connection
    protected $connection = 'newstore';

    // Explicit table name
    protected $table = 'consigned_user';

    // Primary key
    protected $primaryKey = 'id';

    // Enable timestamps with custom column names
    public $timestamps = true;

    const CREATED_AT = 'date_created';
    const UPDATED_AT = 'date_updated';

    // Mass assignable fields
    protected $fillable = [
        'department',
        'prodline',
        'username',
        'password',
        'remarks',
        'req_category',
    ];

    // Hide sensitive fields when returning JSON (React API safety)
    protected $hidden = [
        'password',
    ];

    // Cast fields to proper types
    protected $casts = [
        'id' => 'integer',
        'req_category' => 'integer',
        'date_created' => 'datetime',
        'date_updated' => 'datetime',
    ];
}