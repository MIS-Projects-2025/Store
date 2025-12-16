<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ConsignedController;
use App\Http\Middleware\AuthMiddleware;

$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {
        // Display all consigned
        Route::get('/consigned', [ConsignedController::class, 'index'])->name('consigned');
        
        // Search and operations (BEFORE {id} routes)
        Route::get('/consigned/search-details', [ConsignedController::class, 'searchDetails'])->name('consigned.searchDetails');
        Route::post('/consigned/add-quantity', [ConsignedController::class, 'addQuantity'])->name('consigned.addQuantity');
        Route::post('/consigned/add-quantity-bulk', [ConsignedController::class, 'addQuantityBulk'])->name('consigned.addQuantityBulk');
        Route::post('/consigned/add-detail', [ConsignedController::class, 'addDetail'])->name('consigned.addDetail');
        Route::put('/consigned/bulk-update-details', [ConsignedController::class, 'bulkUpdateDetails'])->name('consigned.bulkUpdateDetails');
        
        // History routes (BEFORE {id} routes)
        Route::get('/consigned/history/{id}', [ConsignedController::class, 'getHistory'])->name('consigned.history');
        Route::get('/consigned/detail-history/{id}', [ConsignedController::class, 'getDetailHistory'])->name('consigned.detailHistory');
        
        // Detail deletion
        Route::delete('/consigned/detail/{id}', [ConsignedController::class, 'destroyDetail'])->name('consigned.destroyDetail');
        
        // View single consigned item (MUST be AFTER specific routes)
        Route::get('/consigned/{id}', [ConsignedController::class, 'show'])->name('consigned.show');

        // Add Item
        Route::post('/consigned', [ConsignedController::class, 'store'])->name('consigned.store');

        // Update Item (main table inline edit)
        Route::put('/consigned/{id}', [ConsignedController::class, 'update'])->name('consigned.update');
        
        // Delete Item
        Route::delete('/consigned/{id}', [ConsignedController::class, 'destroy'])->name('consigned.destroy');
    });