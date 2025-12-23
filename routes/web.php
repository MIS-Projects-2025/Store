<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

$app_name = env('APP_NAME', '');

// Authentication routes
require __DIR__ . '/auth.php';

// General routes
require __DIR__ . '/general.php';
require __DIR__ . '/store.php';
require __DIR__ . '/consumable.php';
require __DIR__ . '/supplies.php';
require __DIR__ . '/consigned.php';
require __DIR__ . '/approval.php';
require __DIR__ . '/export.php';
require __DIR__ . '/User.php';


Route::fallback(function () {
    return Inertia::render('404');
})->name('404');
