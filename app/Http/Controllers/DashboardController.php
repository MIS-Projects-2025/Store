<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Consumable;
use App\Models\Supplies;
use App\Models\SuppliesDetails;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // Get pagination parameters from request
        $consumablesPerPage = $request->input('consumables_per_page', 10);
        $suppliesPerPage = $request->input('supplies_per_page', 10);
        $consumablesPage = $request->input('consumables_page', 1);
        $suppliesPage = $request->input('supplies_page', 1);
        $activeTab = $request->input('tab', 'tab1');

        // Fetch consumables where quantity is below minimum (low stock) with pagination
        $lowConsumablesQuery = Consumable::whereColumn('qty', '<', 'minimum')
            ->select('id', 'Itemcode', 'mat_description', 'qty', 'minimum', 'uom')
            ->orderBy('qty', 'asc');

        // Apply pagination to consumables
        $lowConsumables = $lowConsumablesQuery->paginate(
            $consumablesPerPage, 
            ['*'], 
            'consumables_page', 
            $consumablesPage
        )->withQueryString();

        // Fetch supplies where quantity is below minimum (low stock) with pagination
        $lowSuppliesQuery = DB::connection('newstore')
            ->table('supplies')
            ->join('supplies_details', 'supplies.id', '=', 'supplies_details.supply_id')
            ->whereColumn('supplies_details.qty', '<', 'supplies_details.minimum')
            ->select(
                'supplies.id',
                'supplies.itemcode',
                'supplies.material_description',
                'supplies_details.qty',
                'supplies_details.minimum',
                'supplies_details.uom'
            )
            ->orderBy('supplies_details.qty', 'asc');

        // Get total count for manual pagination (since we're using DB facade)
        $suppliesTotal = $lowSuppliesQuery->count();
        $suppliesLastPage = ceil($suppliesTotal / $suppliesPerPage);
        
        // Apply manual pagination
        $lowSuppliesPaginated = $lowSuppliesQuery
            ->offset(($suppliesPage - 1) * $suppliesPerPage)
            ->limit($suppliesPerPage)
            ->get();

        // Format supplies data to match pagination structure
        $lowSupplies = [
            'current_page' => $suppliesPage,
            'data' => $lowSuppliesPaginated,
            'first_page_url' => null,
            'from' => ($suppliesPage - 1) * $suppliesPerPage + 1,
            'last_page' => $suppliesLastPage,
            'last_page_url' => null,
            'links' => [],
            'next_page_url' => $suppliesPage < $suppliesLastPage ? 
                route('dashboard', [
                    'tab' => $activeTab,
                    'supplies_page' => $suppliesPage + 1,
                    'consumables_page' => $consumablesPage
                ]) : null,
            'path' => route('dashboard'),
            'per_page' => $suppliesPerPage,
            'prev_page_url' => $suppliesPage > 1 ? 
                route('dashboard', [
                    'tab' => $activeTab,
                    'supplies_page' => $suppliesPage - 1,
                    'consumables_page' => $consumablesPage
                ]) : null,
            'to' => min($suppliesPage * $suppliesPerPage, $suppliesTotal),
            'total' => $suppliesTotal,
        ];

        return Inertia::render('Dashboard', [
            'lowConsumables' => $lowConsumables,
            'lowSupplies' => $lowSupplies,
            'filters' => [
                'tab' => $activeTab,
                'consumables_page' => $consumablesPage,
                'supplies_page' => $suppliesPage,
                'consumables_per_page' => $consumablesPerPage,
                'supplies_per_page' => $suppliesPerPage,
            ]
        ]);
    }
}