<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    protected $connection = 'newstore';

    public function up(): void
    {
        // Set default for new rows
        Schema::connection('newstore')->table('consigned_details', function (Blueprint $table) {
            $table->string('type')->nullable()->default('Non-TSPI')->change();
        });

        // Update all existing rows that have null type
        DB::connection('newstore')->table('consigned_details')->whereNull('type')->update(['type' => 'Non-TSPI']);
    }

    public function down(): void
    {
        Schema::connection('newstore')->table('consigned_details', function (Blueprint $table) {
            $table->string('type')->nullable()->default(null)->change();
        });
    }
};