<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ConsumableController;
use App\Http\Controllers\OrderMaterialController; // ✅ Updated import
use App\Http\Middleware\AuthMiddleware;


$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

        // Consumable Routes
        Route::get('/consumable', [ConsumableController::class, 'index'])->name('consumable');
        Route::post('/consumable', [ConsumableController::class, 'store'])->name('consumable.store');
        Route::put('/consumable/{id}', [ConsumableController::class, 'update'])->name('consumable.update');
        Route::delete('/consumable/{id}', [ConsumableController::class, 'destroy'])->name('consumable.destroy');
        Route::post('/consumable/add-quantity', [ConsumableController::class, 'addQuantity'])->name('consumable.addQuantity');
        Route::get('/consumable/{id}/history', [ConsumableController::class, 'getHistory'])->name('consumable.history');
        Route::get('/consumable-history', [ConsumableController::class, 'getAllHistory'])->name('consumable.allHistory');
        
        // Order Material Routes (previously Order Consumable)
        Route::get('/order-material', [OrderMaterialController::class, 'index'])->name('order-material.index'); // ✅ Updated
        Route::post('/order-material/submit', [OrderMaterialController::class, 'submitRequest'])->name('order-material.submit'); // ✅ Updated
        
    });