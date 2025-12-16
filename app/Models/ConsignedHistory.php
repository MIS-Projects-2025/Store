<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConsignedHistory extends Model
{
    use HasFactory;

    /**
     * The connection name for the model.
     *
     * @var string
     */
    protected $connection = 'newstore';

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'consigned_history';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'consigned_id',
        'consigned_no',
        'action',
        'user_name',
        'changes',
        'old_values',
        'new_values',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'consigned_id' => 'integer',
        'changes' => 'array',
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Get the consigned record this history belongs to.
     */
    public function consigned()
    {
        return $this->belongsTo(Consigned::class, 'consigned_id');
    }

    /**
     * Scope a query to only include specific actions.
     */
    public function scopeAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope a query to filter by consigned number.
     */
    public function scopeByConsignedNo($query, string $consignedNo)
    {
        return $query->where('consigned_no', $consignedNo);
    }
}