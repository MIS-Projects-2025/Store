<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\ConsumableDetail;
use App\Models\SupplyDetail;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // Fetch consumable details where quantity is below minimum (low stock)
        // Join with consumables table to get material_description
        $lowConsumables = ConsumableDetail::whereColumn('quantity', '<', 'min')
            ->with('consumable') // Eager load the consumable relationship
            ->select(
                'consumable_details.id',
                'consumable_details.item_code as Itemcode',
                'consumable_details.detailed_description as mat_description',
                'consumable_details.quantity as qty',
                'consumable_details.min as minimum',
                'consumable_details.consumable_id'
            )
            ->orderBy('consumable_details.quantity', 'asc')
            ->get()
            ->map(function ($detail) {
                return [
                    'id' => $detail->id,
                    'Itemcode' => $detail->Itemcode,
                    'mat_description' => $detail->mat_description,
                    'qty' => $detail->qty,
                    'minimum' => $detail->minimum,
                    'uom' => $detail->consumable->uom ?? '', // Get UOM from parent consumable
                ];
            });

        // Fetch supply details where quantity is below minimum (low stock)
        $lowSupplies = SupplyDetail::whereColumn('qty', '<', 'min')
            ->whereHas('supply', function ($query) {
                $query->where('is_deleted', false);
            })
            ->with('supply')
            ->select(
                'id',
                'item_code',
                'detailed_description as material_description',
                'qty',
                'min as minimum',
                'supplies_no'
            )
            ->orderBy('qty', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'itemcode' => $item->item_code,
                    'material_description' => $item->material_description,
                    'qty' => $item->qty,
                    'minimum' => $item->minimum,
                    'uom' => $item->supply->uom ?? '',
                ];
            });

        return Inertia::render('Dashboard', [
            'lowConsumables' => $lowConsumables,
            'lowSupplies' => $lowSupplies,
        ]);
    }
}