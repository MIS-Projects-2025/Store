<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Consigned extends Model
{
    use HasFactory;

    /**
     * Database connection name
     */
    protected $connection = 'newstore';

    /**
     * Table name
     */
    protected $table = 'consigned';

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
        'category',
        'selected_itemcode',
        'selected_supplier',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function details()
{
    return $this->hasMany(ConsignedDetail::class, 'consigned_no', 'consigned_no');
}
}
