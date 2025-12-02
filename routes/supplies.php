<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SuppliesController;
use App\Http\Middleware\AuthMiddleware;


$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

        // Supplies Routes
        Route::get('/supplies', [SuppliesController::class, 'index'])->name('supplies');
        Route::post('/supplies', [SuppliesController::class, 'store'])->name('supplies.store');
        Route::put('/supplies/{id}', [SuppliesController::class, 'update'])->name('supplies.update');
        Route::delete('/supplies/{id}', [SuppliesController::class, 'destroy'])->name('supplies.destroy');
        Route::post('/supplies/add-quantity', [SuppliesController::class, 'addQuantity'])->name('supplies.addQuantity');
        Route::get('/supplies/{id}/history', [SuppliesController::class, 'getHistory'])->name('supplies.history');
        Route::get('/supplies-history', [SuppliesController::class, 'getAllHistory'])->name('supplies.allHistory');
        
    });