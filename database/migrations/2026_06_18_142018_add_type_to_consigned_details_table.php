<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'newstore';

    public function up(): void
    {
        Schema::connection('newstore')->table('consigned_details', function (Blueprint $table) {
            $table->string('type')->nullable()->after('bin_location');
        });
    }

    public function down(): void
    {
        Schema::connection('newstore')->table('consigned_details', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};