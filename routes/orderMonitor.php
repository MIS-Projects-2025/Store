<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrderMonitorController;
use App\Http\Middleware\AuthMiddleware;

$app_name = config('app.name', env('APP_NAME', 'app'));

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

     Route::get("/order-monitor", [OrderMonitorController::class, 'index'])
        ->name('order-monitor');
    Route::get('/order-monitor/details', [OrderMonitorController::class, 'getOrderDetails'])
        ->name('order-monitor.details');
 
});