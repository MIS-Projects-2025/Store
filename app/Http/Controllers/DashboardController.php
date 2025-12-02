<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Consumable;
use App\Models\Supplies;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // Fetch consumables where quantity is below minimum (low stock)
        $lowConsumables = Consumable::whereColumn('qty', '<', 'minimum')
            ->select('id', 'Itemcode', 'mat_description', 'qty', 'minimum')
            ->orderBy('qty', 'asc')
            ->get();

        // Fetch supplies where quantity is below minimum (low stock)
        $lowSupplies = Supplies::whereColumn('qty', '<', 'minimum')
            ->select('id', 'itemcode', 'material_description', 'qty', 'minimum')
            ->orderBy('qty', 'asc')
            ->get();

        return Inertia::render('Dashboard', [
            'lowConsumables' => $lowConsumables,
            'lowSupplies' => $lowSupplies
        ]);
    }
}