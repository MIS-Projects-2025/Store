<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ConsumableController;
use App\Http\Controllers\OrderMaterialController;
use App\Http\Controllers\MaterialIssuanceController;
use App\Http\Middleware\AuthMiddleware;



$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

        // Consumable Routes
        Route::get('/consumable', [ConsumableController::class, 'index'])->name('consumable');
        Route::post('/consumable', [ConsumableController::class, 'store'])->name('consumable.store');
        Route::get('/consumable/template', [ConsumableController::class, 'downloadTemplate'])->name('consumable.template'); // MOVED UP
        Route::post('/consumable/import-excel', [ConsumableController::class, 'import'])->name('consumable.import.process'); // CHANGED PATH
        Route::get('/consumable-history', [ConsumableController::class, 'getAllHistory'])->name('consumable.allHistory');
        Route::post('/consumable/batch-add-quantity', [ConsumableController::class, 'batchAddQuantity'])->name('consumable.batchAddQuantity');
        Route::post('/consumable/add-quantity', [ConsumableController::class, 'addQuantity'])->name('consumable.addQuantity');
        Route::get('/consumable/{id}/history', [ConsumableController::class, 'getHistory'])->name('consumable.history');
        Route::put('/consumable/{id}', [ConsumableController::class, 'update'])->name('consumable.update');
        Route::delete('/consumable/{id}', [ConsumableController::class, 'destroy'])->name('consumable.destroy');
        Route::post('/supplies/batch-add-quantity', [SuppliesController::class, 'batchAddQuantity'])->name('supplies.batchAddQuantity');



        // order material
        Route::get('/order-material', [OrderMaterialController::class, 'index'])->name('order-material.index');
        Route::post('/order-material/submit', [OrderMaterialController::class, 'submitRequest'])->name('order-material.submit');

        // Issuance Consumable
        Route::get('/materialissuance', [MaterialIssuanceController::class, 'index'])
            ->name('materialissuance');
        Route::post('/material-issuance/update-status', [MaterialIssuanceController::class, 'updateStatus'])
            ->name('material-issuance.update-status');
        Route::post('/material-issuance/issue-request', [MaterialIssuanceController::class, 'issueRequest'])
            ->name('material-issuance.issue-request');
        Route::post('/material-issuance/replace-item', [MaterialIssuanceController::class, 'replaceItem'])
            ->name('material-issuance.replace-item');
        Route::post('/material-issuance/picked-up', [MaterialIssuanceController::class, 'pickedUp'])
            ->name('material-issuance.picked-up');
        Route::post('/material-issuance/return-item', [MaterialIssuanceController::class, 'returnItem'])
            ->name('material-issuance.return-item');
        Route::post('/material-issuance/bulk-return-items', [MaterialIssuanceController::class, 'bulkReturnItems'])
            ->name('material-issuance.bulk-return-items');

            Route::get('/consumable/all-for-dropdown', [ConsumableController::class, 'getAllForDropdown'])->name('consumable.getAllForDropdown');
        
    });