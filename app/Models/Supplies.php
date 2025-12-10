<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplies extends Model
{
    use HasFactory;

    // Use the custom database connection
    protected $connection = 'newstore';

    // Table name
    protected $table = 'supplies';

    // Fillable fields
    protected $fillable = [
        'itemcode',
        'material_description',
    ];

    // Casts
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationship: One supply has many details
    public function details()
    {
        return $this->hasMany(SuppliesDetails::class, 'supply_id');
    }

    // Relationship: One supply has many history records
    public function history()
    {
        return $this->hasMany(SuppliesHistory::class, 'supply_id');
    }
}
