<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ConsignedController;
use App\Http\Middleware\AuthMiddleware;

$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

    Route::get('/consigned', [ConsignedController::class, 'index'])->name('consigned');
    Route::post('/consigned', [ConsignedController::class, 'store'])->name('consigned.store');
    Route::put('/consigned/{id}', [ConsignedController::class, 'updateItem'])->name('consigned.updateItem');
    Route::put('/consigned/{id}/details', [ConsignedController::class, 'updateDetails'])->name('consigned.updateDetails');
    Route::post('/consigned/add-quantity', [ConsignedController::class, 'addQuantity'])->name('consigned.addQuantity');
    Route::delete('/consigned/detail/{id}', [ConsignedController::class, 'deleteDetail'])->name('consigned.deleteDetail');
    Route::delete('/consigned/{id}', [ConsignedController::class, 'destroy'])->name('consigned.destroy');
    Route::put('/consigned/{id}/update', [ConsignedController::class, 'update'])->name('consigned.update');

    Route::get('/consigned/{id}/history', [ConsignedController::class, 'history'])->name('consigned.history');
    Route::get('/consigned/details/{id}/history', [ConsignedController::class, 'getDetailHistory'])->name('consigned.getDetailHistory');

    
    });