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
    // No data on initial load — tabs fetch lazily via AJAX
    return Inertia::render('Export', [
    'dataUrl' => route('export.data'),
]);
}

public function data(Request $request)
{
    ini_set('memory_limit', '512M');

    $tab    = $request->query('tab', 'consumable');   // consumable | supplies | consigned
    $subTab = $request->query('subTab', 'inventory');

    try {
        $payload = match (true) {

            // ── CONSUMABLE ─────────────────────────────────────────────────
            $tab === 'consumable' && $subTab === 'inventory' => [
                'inventory' => Consumable::with('details')->get()
                    ->flatMap(fn($c) => $c->details->map(fn($d) => [
                        'itemCode'            => $d->item_code,
                        'materialDescription' => $c->material_description,
                        'detailedDescription' => $d->detailed_description,
                        'serial'              => $d->serial,
                        'category'            => $c->category,
                        'binLocation'         => $d->bin_location,
                        'quantity'            => $d->quantity,
                        'uom'                 => $c->uom,
                        'maximum'             => $d->max,
                        'minimum'             => $d->min,
                    ])),
            ],

            $tab === 'consumable' && $subTab === 'issuance' => (function () {
                $items = ConsumableCart::where('mrs_status', 'delivered')
                    ->orderBy('order_date', 'desc')->get();

                $historyMap = ConsumableDetailHistory::where('action', 'updated')
                    ->select(['item_code', 'old_values', 'new_values'])
                    ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(old_values, '$.action_type')) = 'issued'")
                    ->get()
                    ->keyBy(fn($h) => $h->item_code . '|' . ($h->old_values['mrs_no'] ?? ''));

                return ['issuance' => $items->map(function ($item) use ($historyMap) {
                    $history = $historyMap->get($item->itemCode . '|' . $item->mrs_no);
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
                        'soh'                 => $history ? ($history->new_values['quantity'] ?? null) : null,
                        'remarks'             => $item->remarks,
                        'deliveredAt'         => $item->updated_at->format('Y-m-d H:i:s'),
                    ];
                })];
            })(),

            $tab === 'consumable' && $subTab === 'return' => [
                'return' => ConsumableCart::where('mrs_status', 'return')
                    ->orderBy('order_date', 'desc')->get()
                    ->map(fn($item) => [
                        'orderDate'           => optional($item->order_date)->format('Y-m-d') . ' ' . optional($item->created_at)->format('H:i:s'),
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
                        'remarks'             => $item->remarks,
                    ]),
            ],

            // ── SUPPLIES ───────────────────────────────────────────────────
            $tab === 'supplies' && $subTab === 'inventory' => [
                'inventory' => Supply::with('details')->get()
                    ->flatMap(fn($s) => $s->details->map(fn($d) => [
                        'itemCode'            => $d->item_code,
                        'materialDescription' => $s->material_description,
                        'detailedDescription' => $d->detailed_description,
                        'quantity'            => $d->qty,
                        'uom'                 => $s->uom,
                        'minimum'             => $d->min,
                        'maximum'             => $d->max,
                        'price'               => $d->price,
                    ])),
            ],

            $tab === 'supplies' && $subTab === 'issuance' => (function () {
                $items = SuppliesCart::where('mrs_status', 'delivered')
                    ->orderBy('order_date', 'desc')->get();

                $historyMap = SupplyDetailHistory::where('action', 'updated')
                    ->select(['item_code', 'old_values', 'new_values'])
                    ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(old_values, '$.action_type')) = 'issued'")
                    ->get()
                    ->keyBy(fn($h) => $h->item_code . '|' . ($h->old_values['mrs_no'] ?? ''));

                return ['issuance' => $items->map(function ($item) use ($historyMap) {
                    $history = $historyMap->get($item->itemCode . '|' . $item->mrs_no);
                    return [
                        'orderDate'           => optional($item->order_date)->format('Y-m-d') . ' ' . optional($item->created_at)->format('H:i:s'),
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
                        'soh'                 => $history ? ($history->new_values['qty'] ?? null) : null,
                        'remarks'             => $item->remarks,
                        'deliveredAt'         => $item->updated_at->format('Y-m-d H:i:s'),
                    ];
                })];
            })(),

            $tab === 'supplies' && $subTab === 'return' => [
                'return' => SuppliesCart::where('mrs_status', 'return')
                    ->orderBy('order_date', 'desc')->get()
                    ->map(fn($item) => [
                        'orderDate'           => optional($item->order_date)->format('Y-m-d') . ' ' . optional($item->created_at)->format('H:i:s'),
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
                        'remarks'             => $item->remarks,
                    ]),
            ],

            // ── CONSIGNED ──────────────────────────────────────────────────
            $tab === 'consigned' && $subTab === 'inventory' => [
                'inventory' => Consigned::with('details')->get()
                    ->flatMap(fn($c) => $c->details->map(fn($d) => [
                        'itemCode'            => $d->item_code,
                        'materialDescription' => $d->mat_description,
                        'category'            => $c->category,
                        'supplier'            => $d->supplier,
                        'quantity'            => $d->qty,
                        'qtyPerBox'           => $d->qty_per_box,
                        'uom'                 => $d->uom,
                        'binLocation'         => $d->bin_location,
                        'minimum'             => $d->minimum,
                        'maximum'             => $d->maximum,
                        'price'               => $d->price,
                        'expiration'          => $d->expiration?->format('Y-m-d'),
                    ])),
            ],

            $tab === 'consigned' && $subTab === 'inventoryHistory' => (function () {
                $allItems = Consigned::with('details')->get()
                    ->flatMap(fn($c) => $c->details->map(fn($d) => [
                        'itemCode'            => $d->item_code,
                        'materialDescription' => $d->mat_description,
                        'currentQty'          => $d->qty,
                    ]));

                $historyByItem = ConsignedDetailHistory::whereIn('action', ['issued','returned','quantity_added','updated'])
                    ->whereNotNull('new_values')
                    ->get()
                    ->groupBy('item_code')
                    ->map(fn($group) => $group->map(function ($h) {
                        $nv = is_array($h->new_values) ? $h->new_values : json_decode($h->new_values, true);
                        $ov = is_array($h->old_values) ? $h->old_values : json_decode($h->old_values, true);
                        return [
                            'qty'          => $nv['qty'] ?? null,
                            'oldQty'       => $ov['qty'] ?? null,
                            'snapshotDate' => \Carbon\Carbon::parse($h->created_at)->toDateString(),
                            'snapshotTime' => \Carbon\Carbon::parse($h->created_at)->format('H:i:s'),
                            'action'       => $h->action,
                            'user'         => $h->user_name ?? $h->username ?? null,
                        ];
                    })->filter(fn($h) => $h['qty'] !== null)->values());

                return ['inventoryHistory' => $allItems->map(fn($item) => [
                    'itemCode'            => $item['itemCode'],
                    'materialDescription' => $item['materialDescription'],
                    'currentQty'          => $item['currentQty'],
                    'snapshots'           => $historyByItem->get($item['itemCode'], collect())->values()->toArray(),
                ])->values()];
            })(),

            $tab === 'consigned' && $subTab === 'issuance' => (function () {
                $items = ConsignedCart::where('mrs_status', 'delivered')
                    ->orderBy('order_date', 'desc')->get();

                $historyMap = ConsignedDetailHistory::where('action', 'issued')
                    ->select(['item_code', 'old_values', 'new_values'])
                    ->get()
                    ->keyBy(fn($h) => $h->item_code . '|' . ($h->old_values['mrs_no'] ?? ''));

                return ['issuance' => $items->map(function ($item) use ($historyMap) {
                    $history = $historyMap->get($item->item_code . '|' . $item->mrs_no);
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
                        'soh'                 => $history ? ($history->new_values['qty'] ?? null) : null,
                        'remarks'             => $item->remarks,
                        'deliveredAt'         => optional($item->updated_at)->format('Y-m-d H:i:s'),
                    ];
                })];
            })(),

            $tab === 'consigned' && $subTab === 'return' => [
                'return' => ConsignedCart::where('mrs_status', 'return')
                    ->orderBy('order_date', 'desc')->get()
                    ->map(fn($item) => [
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
                        'remarks'             => $item->remarks,
                    ]),
            ],

            // ── CONSIGNED exportSelected (Non-TSPI) ───────────────────────
            // Reuses inventory data — frontend handles the filtering
            $tab === 'consigned' && $subTab === 'exportSelected' => [
    'inventory' => Consigned::with(['details' => fn($q) => $q->where('type', '!=', 'TSPI')])
        ->get()
        ->flatMap(fn($c) => $c->details->map(fn($d) => [
            'itemCode'            => $d->item_code,
            'materialDescription' => $d->mat_description,
            'category'            => $c->category,
            'supplier'            => $d->supplier,
            'quantity'            => $d->qty,
            'qtyPerBox'           => $d->qty_per_box,
            'uom'                 => $d->uom,
            'binLocation'         => $d->bin_location,
            'minimum'             => $d->minimum,
            'maximum'             => $d->maximum,
            'price'               => $d->price,
            'expiration'          => $d->expiration?->format('Y-m-d'),
            'type'                => $c->type ?? null,
        ])),
],

            default => [],
        };

        return response()->json($payload);

    } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'file'  => $e->getFile(),
            'line'  => $e->getLine(),
        ], 500);
    }
}
}