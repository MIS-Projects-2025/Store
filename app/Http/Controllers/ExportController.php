<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Supply;
use App\Models\SupplyDetail;
use App\Models\SuppliesCart;
use App\Models\Consumable;
use App\Models\ConsumableDetail;
use App\Models\ConsumableCart;
use App\Models\Consigned;
use App\Models\ConsignedDetail;
use App\Models\ConsignedCart;
use App\Models\ConsumableDetailHistory;
use App\Models\SupplyDetailHistory;
use App\Models\ConsignedDetailHistory;

class ExportController extends Controller
{
    public function index(Request $request)
    {
        // Get Consumable Inventory data
        $consumableInventory = Consumable::with('details')
            ->get()
            ->flatMap(function ($consumable) {
                return $consumable->details->map(function ($detail) use ($consumable) {
                    return [
                        'itemCode' => $detail->item_code,
                        'materialDescription' => $consumable->material_description,
                        'detailedDescription' => $detail->detailed_description,
                        'serial' => $detail->serial,
                        'category' => $consumable->category,
                        'binLocation' => $detail->bin_location,
                        'quantity' => $detail->quantity,
                        'uom' => $consumable->uom,
                        'maximum' => $detail->max,
                        'minimum' => $detail->min,
                    ];
                });
            });

        // Get Consumable Issuance data (mrs_status = 'delivered')
// Get Consumable Issuance data (mrs_status = 'delivered')
        $consumableIssuanceItems = ConsumableCart::where('mrs_status', 'delivered')
            ->orderBy('order_date', 'desc')
            ->get();

        // Pre-load consumable history keyed by item_code + mrs_no for SOH lookup
        $consumableHistoryMap = ConsumableDetailHistory::where('action', 'updated')
            ->get()
            ->filter(fn($h) => ($h->old_values['action_type'] ?? '') === 'issued')
            ->keyBy(fn($h) => $h->item_code . '|' . ($h->old_values['mrs_no'] ?? ''));

        $consumableIssuance = $consumableIssuanceItems->map(function ($item) use ($consumableHistoryMap) {
            $historyKey = $item->itemCode . '|' . $item->mrs_no;
            $history    = $consumableHistoryMap->get($historyKey);
            $soh        = $history ? ($history->new_values['quantity'] ?? null) : null;
            return [
                'orderDate'           => $item->order_date->format('Y-m-d') . ' ' . $item->created_at->format('H:i:s'),
                'employeeId'          => $item->emp_id,
                'employeeName'        => $item->emp_name,
                'department'          => $item->department,
                'prodline'            => $item->prodline,
                'machineNo'           => $item->machine_no,
                'mrsNo'               => $item->mrs_no,
                'issuedBy'            => $item->issued_by,
                'itemCode'            => $item->itemCode,
                'materialDescription' => $item->material_description,
                'detailedDescription' => $item->detailed_description,
                'serial'              => $item->serial,
                'quantity'            => $item->quantity,
                'requestQuantity'     => $item->request_quantity,
                'issuedQuantity'      => $item->issued_quantity,
                'soh'                 => $soh,
                'remarks'             => $item->remarks,
                'deliveredAt'         => $item->updated_at->format('Y-m-d H:i:s'),
            ];
        });

        // Get Consumable Return data (mrs_status = 'return')
        $consumableReturn = ConsumableCart::where('mrs_status', 'return')
            ->orderBy('order_date', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'orderDate' => $item->order_date->format('Y-m-d') . ' ' . $item->created_at->format('H:i:s'),
                    'employeeId' => $item->emp_id,
                    'employeeName' => $item->emp_name,
                    'department' => $item->department,
                    'prodline' => $item->prodline,
                    'machineNo' => $item->machine_no,
                    'mrsNo' => $item->mrs_no,
                    'issuedBy' => $item->issued_by,
                    'itemCode' => $item->itemCode,
                    'materialDescription' => $item->material_description,
                    'detailedDescription' => $item->detailed_description,
                    'serial' => $item->serial,
                    'quantity' => $item->quantity,
                    'requestQuantity' => $item->request_quantity,
                    'issuedQuantity' => $item->issued_quantity,
                    'remarks' => $item->remarks,
                ];
            });

        // Get Supplies Inventory data
        $suppliesInventory = Supply::with('details')
            ->get()
            ->flatMap(function ($supply) {
                return $supply->details->map(function ($detail) use ($supply) {
                    return [
                        'itemCode' => $detail->item_code,
                        'materialDescription' => $supply->material_description,
                        'detailedDescription' => $detail->detailed_description,
                        'quantity' => $detail->qty,
                        'uom' => $supply->uom,
                        'minimum' => $detail->min,
                        'maximum' => $detail->max,
                        'price' => $detail->price,
                    ];
                });
            });

        // Get Supplies Issuance data (mrs_status = 'delivered')
// Get Supplies Issuance data (mrs_status = 'delivered')
        $suppliesIssuanceItems = SuppliesCart::where('mrs_status', 'delivered')
            ->orderBy('order_date', 'desc')
            ->get();

        // Pre-load supplies history keyed by item_code + mrs_no for SOH lookup
        $suppliesHistoryMap = SupplyDetailHistory::where('action', 'updated')
            ->get()
            ->filter(fn($h) => ($h->old_values['action_type'] ?? '') === 'issued')
            ->keyBy(fn($h) => $h->item_code . '|' . ($h->old_values['mrs_no'] ?? ''));

        $suppliesIssuance = $suppliesIssuanceItems->map(function ($item) use ($suppliesHistoryMap) {
            $historyKey = $item->itemCode . '|' . $item->mrs_no;
            $history    = $suppliesHistoryMap->get($historyKey);
            $soh        = $history ? ($history->new_values['qty'] ?? null) : null;
            return [
                'orderDate'           => $item->order_date->format('Y-m-d') . ' ' . $item->created_at->format('H:i:s'),
                'employeeId'          => $item->emp_id,
                'employeeName'        => $item->emp_name,
                'department'          => $item->department,
                'prodline'            => $item->prodline,
                'machineNo'           => $item->machine_no,
                'mrsNo'               => $item->mrs_no,
                'issuedBy'            => $item->issued_by,
                'itemCode'            => $item->itemCode,
                'materialDescription' => $item->material_description,
                'detailedDescription' => $item->detailed_description,
                'quantity'            => $item->quantity,
                'requestQuantity'     => $item->request_qty,
                'issuedQuantity'      => $item->issued_qty,
                'soh'                 => $soh,
                'remarks'             => $item->remarks,
                'deliveredAt'         => $item->updated_at->format('Y-m-d H:i:s'),
            ];
        });

        // Get Supplies Return data (mrs_status = 'return')
        $suppliesReturn = SuppliesCart::where('mrs_status', 'return')
            ->orderBy('order_date', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'orderDate' => $item->order_date->format('Y-m-d') . ' ' . $item->created_at->format('H:i:s'),
                    'employeeId' => $item->emp_id,
                    'employeeName' => $item->emp_name,
                    'department' => $item->department,
                    'prodline' => $item->prodline,
                    'machineNo' => $item->machine_no,
                    'mrsNo' => $item->mrs_no,
                    'issuedBy' => $item->issued_by,
                    'itemCode' => $item->itemCode,
                    'materialDescription' => $item->material_description,
                    'detailedDescription' => $item->detailed_description,
                    'quantity' => $item->quantity,
                    'requestQuantity' => $item->request_qty,
                    'issuedQuantity' => $item->issued_qty,
                    'remarks' => $item->remarks,
                ];
            });

        // Get Consigned Inventory data
        $consignedInventory = Consigned::with('details')
            ->get()
            ->flatMap(function ($consigned) {
                return $consigned->details->map(function ($detail) use ($consigned) {
                    return [
                        'itemCode' => $detail->item_code,
                        'materialDescription' => $detail->mat_description,
                        'category' => $consigned->category,
                        'supplier' => $detail->supplier,
                        'quantity' => $detail->qty,
                        'qtyPerBox' => $detail->qty_per_box,
                        'uom' => $detail->uom,
                        'binLocation' => $detail->bin_location,
                        'minimum' => $detail->minimum,
                        'maximum' => $detail->maximum,
                        'price' => $detail->price,
                        'expiration' => $detail->expiration ? $detail->expiration->format('Y-m-d') : null,
                    ];
                });
            });

        // Get Consigned Issuance data (mrs_status = 'delivered')
        $consignedIssuanceItems = ConsignedCart::where('mrs_status', 'delivered')
            ->orderBy('order_date', 'desc')
            ->get();

        // Pre-load consigned history keyed by item_code + mrs_no for SOH lookup
        $consignedHistoryMap = ConsignedDetailHistory::where('action', 'issued')
            ->get()
            ->keyBy(fn($h) => $h->item_code . '|' . ($h->old_values['mrs_no'] ?? ''));

        $consignedIssuance = $consignedIssuanceItems->map(function ($item) use ($consignedHistoryMap) {
            $historyKey = $item->item_code . '|' . $item->mrs_no;
            $history    = $consignedHistoryMap->get($historyKey);
            $soh        = $history ? ($history->new_values['qty'] ?? null) : null;
            return [
                'orderDate'           => $item->order_date ? $item->order_date->format('Y-m-d') . ' ' . $item->created_at->format('H:i:s') : '',
                'employeeNo'          => $item->employee_no,
                'factory'             => $item->factory,
                'station'             => $item->station,
                'mrsNo'               => $item->mrs_no,
                'issuedBy'            => $item->issued_by,
                'itemCode'            => $item->item_code,
                'materialDescription' => $item->material_description,
                'supplier'            => $item->supplier,
                'expiration'          => $item->expiration ? $item->expiration->format('Y-m-d') : '',
                'binLocation'         => $item->bin_location,
                'uom'                 => $item->uom,
                'qtyPerBox'           => $item->qty_per_box,
                'quantity'            => $item->quantity,
                'requestQuantity'     => $item->request_qty,
                'issuedQuantity'      => $item->issued_qty,
                'soh'                 => $soh,
                'remarks'             => $item->remarks,
                'deliveredAt'         => $item->updated_at->format('Y-m-d H:i:s'),
            ];
        });

        // Get Consigned Return data (mrs_status = 'return')
        $consignedReturn = ConsignedCart::where('mrs_status', 'return')
            ->orderBy('order_date', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'orderDate' => $item->order_date ? $item->order_date->format('Y-m-d') . ' ' . $item->created_at->format('H:i:s') : '',
                    'employeeNo' => $item->employee_no,
                    'factory' => $item->factory,
                    'station' => $item->station,
                    'mrsNo' => $item->mrs_no,
                    'issuedBy' => $item->issued_by,
                    'itemCode' => $item->item_code,
                    'materialDescription' => $item->material_description,
                    'supplier' => $item->supplier,
                    'expiration' => $item->expiration ? $item->expiration->format('Y-m-d') : '',
                    'binLocation' => $item->bin_location,
                    'uom' => $item->uom,
                    'qtyPerBox' => $item->qty_per_box,
                    'quantity' => $item->quantity,
                    'requestQuantity' => $item->request_qty,
                    'issuedQuantity' => $item->issued_qty,
                    'remarks' => $item->remarks,
                ];
            });

        return Inertia::render('Export', [
            'tableData' => [
                'consumable' => [
                    'inventory' => $consumableInventory,
                    'issuance' => $consumableIssuance,
                    'return' => $consumableReturn,
                ],
                'supplies' => [
                    'inventory' => $suppliesInventory,
                    'issuance' => $suppliesIssuance,
                    'return' => $suppliesReturn,
                ],
                'consigned' => [
                    'inventory' => $consignedInventory,
                    'issuance' => $consignedIssuance,
                    'return' => $consignedReturn,
                ],
            ]
        ]);
    }
}