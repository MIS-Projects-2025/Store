<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Consigned extends Model
{
    use HasFactory;

    protected $connection = 'newstore';
    protected $table = 'consigned';
    
    protected $fillable = [
        'consigned_no',
        'mat_description',
        'category',
    ];

    public function details()
    {
        return $this->hasMany(ConsignedDetail::class, 'consigned_no', 'consigned_no');
    }

    public function history()
    {
        return $this->hasMany(ConsignedHistory::class, 'consigned_id');
    }

    /**
     * Log history when creating a new consigned item
     */
    public static function boot()
    {
        parent::boot();

        static::created(function ($consigned) {
            $user_name = session('emp_data.emp_name', 'Unknown User');
            
            ConsignedHistory::create([
                'consigned_id' => $consigned->id,
                'consigned_no' => $consigned->consigned_no,
                'action' => 'created',
                'user_name' => $user_name,
                'new_values' => $consigned->toArray(),
                'created_at' => now(),
            ]);
        });

        static::updated(function ($consigned) {
            $user_name = session('emp_data.emp_name', 'Unknown User');
            
            $changes = [];
            $oldValues = [];
            $newValues = [];

            foreach ($consigned->getDirty() as $key => $newValue) {
                $oldValue = $consigned->getOriginal($key);
                if ($oldValue != $newValue) {
                    $changes[] = $key;
                    $oldValues[$key] = $oldValue;
                    $newValues[$key] = $newValue;
                }
            }

            if (!empty($changes)) {
                ConsignedHistory::create([
                    'consigned_id' => $consigned->id,
                    'consigned_no' => $consigned->consigned_no,
                    'action' => 'updated',
                    'user_name' => $user_name,
                    'changes' => $changes,
                    'old_values' => $oldValues,
                    'new_values' => $newValues,
                    'created_at' => now(),
                ]);
            }
        });

        static::deleted(function ($consigned) {
            $user_name = session('emp_data.emp_name', 'Unknown User');
            
            ConsignedHistory::create([
                'consigned_id' => $consigned->id,
                'consigned_no' => $consigned->consigned_no,
                'action' => 'deleted',
                'user_name' => $user_name,
                'old_values' => $consigned->toArray(),
                'created_at' => now(),
            ]);
        });
    }
}