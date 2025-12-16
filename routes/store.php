<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderMaterialController;
use App\Http\Middleware\AuthMiddleware;


$app_name = $app_name ?? env('APP_NAME', 'app');
// dd($app_name);
Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

        // store Routes
        Route::get('/dashboard', [OrderMaterialController::class, 'index'])->name('dashboard');

        // ordering routes
        Route::get('/order-material', [OrderMaterialController::class, 'index'])->name('order-material');
        
    });