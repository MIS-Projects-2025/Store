<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApprovalController;
use App\Http\Middleware\AuthMiddleware;

$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {
        // Details route
        Route::get('approval.details', [ApprovalController::class, 'getRequestDetails'])
            ->name('approval.details');
        
        // Approve items
        Route::post('approval.approve', [ApprovalController::class, 'approveItems'])
            ->name('approval.approve');
        
        // Reject items
        Route::post('approval.reject', [ApprovalController::class, 'rejectItems'])
            ->name('approval.reject');
        
        // Main approval route
        Route::get('/approval', [ApprovalController::class, 'index'])
            ->name('approval');
    });