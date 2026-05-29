<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\ExportSelectedController;
use App\Http\Middleware\AuthMiddleware;

$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

        // Ordering routes
        Route::get('/export', [ExportController::class, 'index'])->name('export');
        Route::get('/export-selected-items', [ExportSelectedController::class, 'index'])->name('export-selected-items.index');
        Route::post('/export-selected-items', [ExportSelectedController::class, 'store'])->name('export-selected-items.store');
    });