<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SuppliesController;
use App\Http\Middleware\AuthMiddleware;

$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {
    // Main supplies page
    Route::get('/supplies', [SuppliesController::class, 'index'])->name('supplies');
    
    // Supply (Material) CRUD
    Route::post('/supplies', [SuppliesController::class, 'store'])->name('supplies.store');
    Route::put('/supplies/{supply}', [SuppliesController::class, 'update'])->name('supplies.update');
    Route::delete('/supplies/{supply}', [SuppliesController::class, 'destroy'])->name('supplies.destroy');
    
    // Supply Details CRUD - UPDATED ROUTES
    Route::post('/supplies/details', [SuppliesController::class, 'storeDetail'])->name('supplies.details.store');
    Route::delete('/supplies/details/{suppliesNo}/{itemCode}', [SuppliesController::class, 'destroyDetail'])->name('supplies.details.destroy');
    Route::put('/supplies/details/{suppliesNo}/{itemCode}', [SuppliesController::class, 'updateDetail'])->name('supplies.details.update');
    
    // Bulk operations
    Route::post('/supplies/details/bulk-update', [SuppliesController::class, 'bulkUpdateDetails'])->name('supplies.details.bulk-update');
    Route::post('/supplies/add-quantity', [SuppliesController::class, 'addQuantity'])->name('supplies.add-quantity');
    
    // History
    Route::post('/supplies/history/material', [SuppliesController::class, 'getMaterialHistory'])->name('supplies.history.material');
    Route::post('/supplies/history/detail', [SuppliesController::class, 'getDetailHistory'])->name('supplies.history.detail');
    
    // Utilities
    Route::get('/supplies/search', [SuppliesController::class, 'search'])->name('supplies.search');
    Route::get('/supplies/low-stock', [SuppliesController::class, 'getLowStock'])->name('supplies.low-stock');
    Route::get('/supplies/out-of-stock', [SuppliesController::class, 'getOutOfStock'])->name('supplies.out-of-stock');
    Route::get('/supplies/stats', [SuppliesController::class, 'getSuppliesWithStats'])->name('supplies.stats');
    Route::get('/supplies/{suppliesNo}/details', [SuppliesController::class, 'getSupplyDetails'])->name('supplies.get-details');
    
    // Import/Export
    Route::post('/supplies/import', [SuppliesController::class, 'import'])->name('supplies.import');
    Route::get('/supplies/export', [SuppliesController::class, 'export'])->name('supplies.export');
});