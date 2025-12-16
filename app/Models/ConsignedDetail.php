<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConsignedDetail extends Model
{
    use HasFactory;

    protected $connection = 'newstore';
    protected $table = 'consigned_details';

    protected $fillable = [
        'consigned_no',
        'item_code',
        'supplier',
        'expiration',
        'uom',
        'qty',
        'qty_per_box',
        'minimum',
        'maximum',
        'price',
        'bin_location',
    ];

    public function consigned()
    {
        return $this->belongsTo(Consigned::class, 'consigned_no', 'consigned_no');
    }

    public function history()
    {
        return $this->hasMany(ConsignedDetailHistory::class, 'consigned_detail_id');
    }

    /**
     * Log history when creating, updating, or deleting detail
     */
    public static function boot()
    {
        parent::boot();

        static::created(function ($detail) {
            $user_name = session('emp_data.emp_name', 'Unknown User');
            
            ConsignedDetailHistory::create([
                'consigned_detail_id' => $detail->id,
                'consigned_no' => $detail->consigned_no,
                'item_code' => $detail->item_code,
                'action' => 'created',
                'user_name' => $user_name,
                'new_values' => $detail->toArray(),
                'created_at' => now(),
            ]);
        });

        static::updated(function ($detail) {
            $user_name = session('emp_data.emp_name', 'Unknown User');
            
            $changes = [];
            $oldValues = [];
            $newValues = [];

            foreach ($detail->getDirty() as $key => $newValue) {
                $oldValue = $detail->getOriginal($key);
                if ($oldValue != $newValue) {
                    $changes[] = $key;
                    $oldValues[$key] = $oldValue;
                    $newValues[$key] = $newValue;
                }
            }

            if (!empty($changes)) {
                ConsignedDetailHistory::create([
                    'consigned_detail_id' => $detail->id,
                    'consigned_no' => $detail->consigned_no,
                    'item_code' => $detail->item_code,
                    'action' => 'updated',
                    'user_name' => $user_name,
                    'changes' => $changes,
                    'old_values' => $oldValues,
                    'new_values' => $newValues,
                    'created_at' => now(),
                ]);
            }
        });

        static::deleted(function ($detail) {
            $user_name = session('emp_data.emp_name', 'Unknown User');
            
            ConsignedDetailHistory::create([
                'consigned_detail_id' => $detail->id,
                'consigned_no' => $detail->consigned_no,
                'item_code' => $detail->item_code,
                'action' => 'deleted',
                'user_name' => $user_name,
                'old_values' => $detail->toArray(),
                'created_at' => now(),
            ]);
        });
    }
}