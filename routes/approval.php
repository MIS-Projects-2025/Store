<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApprovalController;
use App\Http\Middleware\AuthMiddleware;

$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {
        // Approval Routes
        Route::get('/approval', [ApprovalController::class, 'index'])->name('approval');
        Route::get('/approval/{type}/{mrsNo}', [ApprovalController::class, 'show'])->name('approval.show');
        Route::post('/approval/{type}/{mrsNo}/approve', [ApprovalController::class, 'approve'])->name('approval.approve');
        Route::post('/approval/{type}/{mrsNo}/reject', [ApprovalController::class, 'reject'])->name('approval.reject');
    });