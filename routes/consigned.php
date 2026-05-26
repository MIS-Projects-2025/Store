<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ConsignedController;
use App\Http\Controllers\OrderMaterialController;
use App\Http\Middleware\AuthMiddleware;

$app_name = config('app.name', env('APP_NAME', 'app'));

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

    // Consigned Inventory Routes
    Route::get('/consigned', [ConsignedController::class, 'index'])->name('consigned');
    Route::post('/consigned', [ConsignedController::class, 'store'])->name('consigned.store');
    Route::post('/consigned/import-excel', [ConsignedController::class, 'importExcel'])->name('consigned.import-excel');
    Route::get('/consigned/description', [ConsignedController::class, 'getDescription'])
        ->name('consigned.description');
    Route::get('/consigned/category', [ConsignedController::class, 'getCategoryByCommonality'])
        ->name('consigned.category');
    Route::post('/consigned/{id}/update-selection', [ConsignedController::class, 'updateSelection'])
        ->name('consigned.update-selection');
    Route::put('/consigned/update-detail/{id}', [ConsignedController::class, 'updateDetail'])
        ->name('consigned.update-detail');
    Route::delete('/consigned/delete-detail/{id}', [ConsignedController::class, 'deleteDetail'])
        ->name('consigned.delete-detail');
    Route::put('/consigned/update-main/{id}', [ConsignedController::class, 'updateMain'])
        ->name('consigned.update-main');
    Route::delete('/consigned/delete-main/{id}', [ConsignedController::class, 'deleteMain'])
        ->name('consigned.delete-main');
    Route::post('/consigned/update-quantities', [ConsignedController::class, 'updateQuantities'])
        ->name('consigned.update-quantities');
    Route::get('/consigned/{id}/history-main', [ConsignedController::class, 'getConsignedHistory'])
        ->name('consigned.history.main');
    Route::get('/consigned/{id}/history-detail', [ConsignedController::class, 'getConsignedDetailHistory'])
        ->name('consigned.history.detail');
        Route::post('/consigned/recalibrate-minimum', [ConsignedController::class, 'recalibrateMinimum'])
    ->name('consigned.recalibrate-minimum');

    

    // Consigned Order Routes
    Route::get("/order-material", [OrderMaterialController::class, 'index'])->name('order-material');
    Route::post('/order-material/submit', [OrderMaterialController::class, 'submitOrder'])
    ->name('order-material.submit');
    Route::get('/consigned/{id}/all-details', [ConsignedController::class, 'getAllDetails'])
    ->name('consigned.get-all-details');
});