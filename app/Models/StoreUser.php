<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreUser extends Model
{
    /**
     * Database connection name
     */
    protected $connection = 'newstore';

    /**
     * Table name
     */
    protected $table = 'store_user';

    /**
     * Primary key
     */
    protected $primaryKey = 'id';

    /**
     * Indicates if the IDs are auto-incrementing
     */
    public $incrementing = true;

    /**
     * Primary key type
     */
    protected $keyType = 'int';

    /**
     * Disable default timestamps
     * (because your columns are date_created / date_updated)
     */
    public $timestamps = false;

    /**
     * Mass assignable fields
     */
    protected $fillable = [
        'log_user',
        'log_username',
        'log_password',
        'log_category',
        'date_created',
        'date_updated',
    ];

    /**
     * Hidden fields (important for React APIs)
     */
    protected $hidden = [
        'log_password',
    ];

    /**
     * Casts
     */
    protected $casts = [
        'log_category' => 'integer',
        'date_created' => 'datetime',
        'date_updated' => 'datetime',
    ];
}
