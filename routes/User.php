<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\adminUserController;
use App\Http\Controllers\ConsignedUserController;
use App\Http\Middleware\AuthMiddleware;

$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

        // Admin user routes
        Route::get('/admin-user', [adminUserController::class, 'index'])->name('adminUser');
        Route::get('/admin-user/search-employees', [adminUserController::class, 'searchEmployees'])->name('adminUser.searchEmployees');
        Route::post('/admin-user', [adminUserController::class, 'store'])->name('adminUser.store');
        Route::get('/admin-user/{id}/edit', [adminUserController::class, 'edit'])->name('adminUser.edit');
        Route::put('/admin-user/{id}', [adminUserController::class, 'update'])->name('adminUser.update');
        Route::delete('/admin-user/{id}', [adminUserController::class, 'destroy'])->name('adminUser.destroy');

        // Consigned user routes
        Route::get('/consigned-user', [ConsignedUserController::class, 'index'])->name('consignedUser');
        Route::get('/consigned-user/options', [ConsignedUserController::class, 'getOptions'])->name('consignedUser.options'); // Add this line
        Route::post('/consigned-user', [ConsignedUserController::class, 'store'])->name('consignedUser.store');
        Route::get('/consigned-user/{id}/edit', [ConsignedUserController::class, 'edit'])->name('consignedUser.edit');
        Route::put('/consigned-user/{id}', [ConsignedUserController::class, 'update'])->name('consignedUser.update');
        Route::delete('/consigned-user/{id}', [ConsignedUserController::class, 'destroy'])->name('consignedUser.destroy');
    });