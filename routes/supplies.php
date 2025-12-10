<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SuppliesController;
use App\Http\Middleware\AuthMiddleware;

$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {
        // Display all supplies
        Route::get('/supplies', [SuppliesController::class, 'index'])->name('supplies');
        
        // Store new supply
        Route::post('/supplies', [SuppliesController::class, 'store'])->name('supplies.store');
        
        Route::get('/supplies/{id}/details', [SuppliesController::class, 'getDetails'])->name('supplies.details');
        
        // Add quantity to multiple items
        Route::post('/supplies/add-quantity', [SuppliesController::class, 'addQuantity'])->name('supplies.add-quantity');
        
        // Add detail to a supply
        Route::post('/supplies/{id}/add-detail', [SuppliesController::class, 'addDetail'])->name('supplies.add-detail');
        
        // Get history for a supply
        Route::get('/supplies/{id}/history', [SuppliesController::class, 'history'])->name('supplies.history');
        
        // Update supply
        Route::put('/supplies/{id}', [SuppliesController::class, 'update'])->name('supplies.update');
        
        // Delete supply (if needed in the future)
        Route::delete('/supplies/{id}', [SuppliesController::class, 'destroy'])->name('supplies.destroy');

        Route::post('/supplies/import-excel', [SuppliesController::class, 'importExcel'])->name('supplies.import-excel');

        Route::get('/supplies/download-template', [SuppliesController::class, 'downloadTemplate'])->name('supplies.download-template');
    });