<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderMaterialController;
use App\Http\Controllers\MaterialIssuanceController;
use App\Http\Middleware\AuthMiddleware;

$app_name = $app_name ?? env('APP_NAME', 'app');

Route::prefix($app_name)
    ->middleware(AuthMiddleware::class)
    ->group(function () {

        // Ordering routes
        Route::get('/order-material', [OrderMaterialController::class, 'index'])->name('order-material');
        Route::post('order-material.submit-consumable', [OrderMaterialController::class, 'submitConsumableOrder'])
            ->name('order-material.submit-consumable');
        Route::post('order-material.submit-supplies', [OrderMaterialController::class, 'submitSuppliesOrder'])
            ->name('order-material.submit-supplies');
        Route::post('order-material.submit-consigned', [OrderMaterialController::class, 'submitConsignedOrder'])
            ->name('order-material.submit-consigned');

        // Material Issuance
        Route::get('/material-issuance', [MaterialIssuanceController::class, 'index'])
            ->name('material-issuance');
    
        // ==================== CONSUMABLE ROUTES ====================
        // Update status (Pending -> Preparing)
        Route::post('/material-issuance.update-status.consumable', [MaterialIssuanceController::class, 'updateConsumableStatus'])
            ->name('material-issuance.update-consumable-status');

        // Update issued quantity (Preparing -> For Pick Up)
        Route::post('/material-issuance.update-issued-qty.consumable', [MaterialIssuanceController::class, 'updateIssuedQtyConsumable'])
            ->name('material-issuance.update-issued-qty-consumable');

        // Mark as Delivered (For Pick Up -> Delivered)
        Route::post('/material-issuance.mark-delivered.consumable', [MaterialIssuanceController::class, 'markDeliveredConsumable'])
            ->name('material-issuance.mark-delivered-consumable');

        // Return Items (Delivered -> Return)
        Route::post('/material-issuance.return-item.consumable', [MaterialIssuanceController::class, 'returnConsumableItem'])
            ->name('material-issuance.return-consumable-item');

        // Get Replacement Items
        Route::get('/material-issuance.get-replacement.consumable', [MaterialIssuanceController::class, 'getReplacementItemsConsumable'])
            ->name('material-issuance.get-replacement-items-consumable');

        // Replace Item
        Route::post('/material-issuance.replace-item.consumable', [MaterialIssuanceController::class, 'replaceItemConsumable'])
            ->name('material-issuance.replace-item-consumable');

        // ==================== SUPPLIES ROUTES ====================
        // Update status (Pending -> Preparing)
        Route::post('/material-issuance.update-status.supplies', [MaterialIssuanceController::class, 'updateSuppliesStatus'])
            ->name('material-issuance.update-supplies-status');

        // Update issued quantity (Preparing -> For Pick Up)
        Route::post('/material-issuance.update-issued-qty.supplies', [MaterialIssuanceController::class, 'updateIssuedQtySupplies'])
            ->name('material-issuance.update-issued-qty-supplies');

        // Mark as Delivered (For Pick Up -> Delivered)
        Route::post('/material-issuance.mark-delivered.supplies', [MaterialIssuanceController::class, 'markDeliveredSupplies'])
            ->name('material-issuance.mark-delivered-supplies');

        // Return Items (Delivered -> Return)
        Route::post('/material-issuance.return-item.supplies', [MaterialIssuanceController::class, 'returnSuppliesItem'])
            ->name('material-issuance.return-supplies-item');

        // Get Replacement Items
        Route::get('/material-issuance.get-replacement.supplies', [MaterialIssuanceController::class, 'getReplacementItemsSupplies'])
            ->name('material-issuance.get-replacement-items-supplies');

        // Replace Item
        Route::post('/material-issuance.replace-item.supplies', [MaterialIssuanceController::class, 'replaceItemSupplies'])
            ->name('material-issuance.replace-item-supplies');

        // ==================== CONSIGNED ROUTES ====================
        // Update status (Pending -> Preparing)
        Route::post('/material-issuance.update-status.consigned', [MaterialIssuanceController::class, 'updateConsignedStatus'])
            ->name('material-issuance.update-consigned-status');

        // Update issued quantity (Preparing -> For Pick Up)
        Route::post('/material-issuance.update-issued-qty.consigned', [MaterialIssuanceController::class, 'updateIssuedQtyConsigned'])
            ->name('material-issuance.update-issued-qty-consigned');

        // Mark as Delivered (For Pick Up -> Delivered)
        Route::post('/material-issuance.mark-delivered.consigned', [MaterialIssuanceController::class, 'markDeliveredConsigned'])
            ->name('material-issuance.mark-delivered-consigned');

        // Return Items (Delivered -> Return)
        Route::post('/material-issuance.return-item.consigned', [MaterialIssuanceController::class, 'returnConsignedItem'])
            ->name('material-issuance.return-consigned-item');

        // Get Replacement Items
        Route::get('/material-issuance.get-replacement.consigned', [MaterialIssuanceController::class, 'getReplacementItemsConsigned'])
            ->name('material-issuance.get-replacement-items-consigned');

        // Replace Item
        Route::post('/material-issuance.replace-item.consigned', [MaterialIssuanceController::class, 'replaceItemConsigned'])
            ->name('material-issuance.replace-item-consigned');
    });