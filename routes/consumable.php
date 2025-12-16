<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ConsumableController;
use App\Http\Middleware\AuthMiddleware;

$app_name = config('app.name', env('APP_NAME', 'app'));

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {
        
        // Main consumable index
        Route::get('/consumable', [ConsumableController::class, 'index'])->name('consumable');
        
        // IMPORTANT: Specific routes MUST come BEFORE parameterized routes
        
        // Search routes
        Route::get('/consumable/search/details', [ConsumableController::class, 'searchDetails'])->name('consumable.searchDetails');
        
        // Create and store (specific paths)
        Route::post('/consumable', [ConsumableController::class, 'store'])->name('consumable.store');
        Route::post('/consumable/add-detail', [ConsumableController::class, 'addDetail'])->name('consumable.addDetail');
        
        // Update operations (specific paths) - MOVE THESE BEFORE {id} ROUTES
        Route::put('/consumable/bulk-update-details', [ConsumableController::class, 'bulkUpdateDetails'])->name('consumable.bulkUpdateDetails');
        
        // Quantity operations (specific paths)
        Route::post('/consumable/add-quantity', [ConsumableController::class, 'addQuantity'])->name('consumable.addQuantity');
        Route::post('/consumable/add-quantity-bulk', [ConsumableController::class, 'addQuantityBulk'])->name('consumable.addQuantityBulk');
        
        // History routes (specific paths with detail/{id})
        Route::get('/consumable/detail/{id}/history', [ConsumableController::class, 'getDetailHistory'])->name('consumable.detailHistory');
        
        // Delete operations (specific paths)
        Route::delete('/consumable/detail/{id}', [ConsumableController::class, 'destroyDetail'])->name('consumable.destroyDetail');
        
        // NOW the parameterized routes come LAST
        // Show specific consumable
        Route::get('/consumable/{id}', [ConsumableController::class, 'show'])->name('consumable.show');
        
        // History for main consumable
        Route::get('/consumable/{id}/history', [ConsumableController::class, 'getHistory'])->name('consumable.history');
        
        // Update consumable (this was catching bulk-update-details!)
        Route::put('/consumable/{id}', [ConsumableController::class, 'update'])->name('consumable.update');
        
        // Delete consumable
        Route::delete('/consumable/{id}', [ConsumableController::class, 'destroy'])->name('consumable.destroy');
    });