<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\ConsignedCart;
use App\Models\SuppliesCart;
use App\Models\ConsumableCart;
use App\Models\EmployeeMasterlist;

class OrderMonitorController extends Controller
{
    public function index(Request $request)
{
    $empData     = session('emp_data');
    $empId       = $empData['emp_id'] ?? null;
    $empName     = $empData['emp_name'] ?? null;
    $empJobTitle = $empData['emp_jobtitle'] ?? null;

    $isConsignedUser = $empJobTitle === "Consigned User";
    $isStoreUser     = $empJobTitle === "Store User";
    $isRegularUser   = !$isConsignedUser && !$isStoreUser;

    $searchConsigned  = $request->input('search_consigned', '');
    $searchSupplies   = $request->input('search_supplies', '');
    $searchConsumable = $request->input('search_consumable', '');

    $consignedData  = [];
    $suppliesData   = [];
    $consumableData = [];

    if ($isConsignedUser) {
        $consignedData = $this->getConsignedOrders($searchConsigned);

    } elseif ($isStoreUser) {
        $consignedData  = $this->getConsignedOrders($searchConsigned);
        $suppliesData   = $this->getAllSuppliesOrders($searchSupplies);
        $consumableData = $this->getAllConsumableOrders($searchConsumable);

    } else {
        $suppliesData   = $this->getSuppliesOrders($empName, $searchSupplies);
        $consumableData = $this->getConsumableOrders($empName, $searchConsumable);
    }

    return Inertia::render('OrderMonitor', [
        'consignedData'   => $consignedData,
        'suppliesData'    => $suppliesData,
        'consumableData'  => $consumableData,
        'isConsignedUser' => $isConsignedUser,
        'isStoreUser'     => $isStoreUser,
        'isRegularUser'   => $isRegularUser,
        'filters'         => [
            'search_consigned'  => $searchConsigned,
            'search_supplies'   => $searchSupplies,
            'search_consumable' => $searchConsumable,
        ],
    ]);
}

    // ==================== CONSIGNED ====================

private function getConsignedOrders($search = '', $perPage = 20)
{
    $paginator = DB::table('consigned_cart')
        ->select(
            'mrs_no',
            DB::raw('MIN(order_date) as order_date'),
            DB::raw('MIN(employee_no) as employee_no'),
            DB::raw('MIN(station) as station'),
            DB::raw('MIN(created_at) as created_at'),
            DB::raw('MAX(CASE WHEN mrs_status != "Return" THEN mrs_status ELSE NULL END) as mrs_status')
        )
        ->whereNotNull('mrs_status')
        ->when($search, function ($q) use ($search) {
            $q->where(function ($q2) use ($search) {
                $q2->where('mrs_no', 'like', "%{$search}%")
                   ->orWhere('employee_no', 'like', "%{$search}%")
                   ->orWhere('station', 'like', "%{$search}%");
            });
        })
        ->groupBy('mrs_no')
        ->orderBy(DB::raw('MIN(created_at)'), 'desc')
        ->paginate($perPage, ['*'], 'consigned_page');

    $employeeNos = collect($paginator->items())->pluck('employee_no')->unique()->filter();
    $employees   = EmployeeMasterlist::whereIn('EMPLOYID', $employeeNos)
        ->get(['EMPLOYID', 'EMPNAME'])
        ->keyBy('EMPLOYID');

    $items = collect($paginator->items())->map(function ($item, $index) use ($employees, $paginator) {
        $employee = $employees->get($item->employee_no);
        return [
            'id'            => ($paginator->currentPage() - 1) * $paginator->perPage() + $index + 1,
            'date_order'    => $item->order_date ? Carbon::parse($item->order_date)->format('Y-m-d') : null,
            'time'          => $item->created_at ? Carbon::parse($item->created_at)->format('H:i:s') : null,
            'created_at'    => $item->created_at ? Carbon::parse($item->created_at)->toDateTimeString() : null,
            'mrs_no'        => $item->mrs_no,
            'employee_id'   => $item->employee_no,
            'employee_name' => $employee ? $employee->EMPNAME : $item->employee_no,
            'station'       => $item->station,
            'status'        => $this->formatStatus($item->mrs_status),
        ];
    });

    return [
        'data'         => $items->toArray(),
        'current_page' => $paginator->currentPage(),
        'last_page'    => $paginator->lastPage(),
        'per_page'     => $paginator->perPage(),
        'total'        => $paginator->total(),
    ];
}

    // ==================== SUPPLIES (own orders — regular user) ====================

private function getSuppliesOrders($empName, $search = '')
{
    if (!$empName) return [];

    try {
        $query = SuppliesCart::where(function ($q) use ($empName) {
            $q->where('emp_name', $empName)
              ->orWhere('approver', $empName);
        });
        return $this->buildSuppliesResult($query, $search);
    } catch (\Exception $e) {
        \Log::error('Error getting supplies orders:', ['error' => $e->getMessage()]);
        return [];
    }
}

    // ==================== SUPPLIES (all orders — store user) ====================

private function getAllSuppliesOrders($search = '')
{
    try {
        return $this->buildSuppliesResult(SuppliesCart::query(), $search);
    } catch (\Exception $e) {
        \Log::error('Error getting all supplies orders:', ['error' => $e->getMessage()]);
        return [];
    }
}
private function buildSuppliesResult($query, $search = '', $perPage = 20)
{
    $paginator = $query
        ->when($search, function ($q) use ($search) {
            $q->where(function ($q2) use ($search) {
                $q2->where('mrs_no', 'like', "%{$search}%")
                   ->orWhere('emp_name', 'like', "%{$search}%")
                   ->orWhere('department', 'like', "%{$search}%")
                   ->orWhere('approver', 'like', "%{$search}%");
            });
        })
        ->select(
            'mrs_no',
            DB::raw('MIN(order_date) as order_date'),
            DB::raw('MIN(created_at) as created_at'),
            DB::raw('MIN(emp_name) as emp_name'),
            DB::raw('MIN(department) as department'),
            DB::raw('MIN(mrs_status) as mrs_status'),
            DB::raw('MIN(approver_status) as approver_status'),
            DB::raw('MIN(approver) as approver')
        )
        ->groupBy('mrs_no')
        ->orderBy(DB::raw('MIN(created_at)'), 'desc')
        ->paginate($perPage, ['*'], 'supplies_page');

    $items = collect($paginator->items())->map(function ($item, $index) use ($paginator) {
        return [
            'id'              => ($paginator->currentPage() - 1) * $paginator->perPage() + $index + 1,
            'date_order'      => $item->order_date ? Carbon::parse($item->order_date)->format('Y-m-d') : null,
            'time'            => $item->created_at ? Carbon::parse($item->created_at)->format('H:i:s') : null,
            'created_at'      => $item->created_at ? Carbon::parse($item->created_at)->toDateTimeString() : null,
            'mrs_no'          => $item->mrs_no,
            'requestor'       => $item->emp_name,
            'department'      => $item->department,
            'approver'        => $item->approver,
            'approver_status' => $this->formatStatus($item->approver_status),
            'status'          => $this->formatStatus($item->mrs_status),
        ];
    });

    return [
        'data'          => $items->toArray(),
        'current_page'  => $paginator->currentPage(),
        'last_page'     => $paginator->lastPage(),
        'per_page'      => $paginator->perPage(),
        'total'         => $paginator->total(),
    ];
}

    // ==================== CONSUMABLE (own orders — regular user) ====================

private function getConsumableOrders($empName, $search = '')
{
    if (!$empName) return [];

    try {
        $query = ConsumableCart::where(function ($q) use ($empName) {
            $q->where('emp_name', $empName)
              ->orWhere('approver', $empName);
        });
        return $this->buildConsumableResult($query, $search);
    } catch (\Exception $e) {
        \Log::error('Error getting consumable orders:', ['error' => $e->getMessage()]);
        return [];
    }
}

    // ==================== CONSUMABLE (all orders — store user) ====================

private function getAllConsumableOrders($search = '')
{
    try {
        return $this->buildConsumableResult(ConsumableCart::query(), $search);
    } catch (\Exception $e) {
        \Log::error('Error getting all consumable orders:', ['error' => $e->getMessage()]);
        return [];
    }
}

private function buildConsumableResult($query, $search = '', $perPage = 20)
{
    $paginator = $query
        ->when($search, function ($q) use ($search) {
            $q->where(function ($q2) use ($search) {
                $q2->where('mrs_no', 'like', "%{$search}%")
                   ->orWhere('emp_name', 'like', "%{$search}%")
                   ->orWhere('department', 'like', "%{$search}%")
                   ->orWhere('approver', 'like', "%{$search}%");
            });
        })
        ->select(
            'mrs_no',
            DB::raw('MIN(order_date) as order_date'),
            DB::raw('MIN(created_at) as created_at'),
            DB::raw('MIN(emp_name) as emp_name'),
            DB::raw('MIN(department) as department'),
            DB::raw('MIN(mrs_status) as mrs_status'),
            DB::raw('MIN(approver_status) as approver_status'),
            DB::raw('MIN(approver) as approver')
        )
        ->groupBy('mrs_no')
        ->orderBy(DB::raw('MIN(created_at)'), 'desc')
        ->paginate($perPage, ['*'], 'consumable_page');

    $items = collect($paginator->items())->map(function ($item, $index) use ($paginator) {
        return [
            'id'              => ($paginator->currentPage() - 1) * $paginator->perPage() + $index + 1,
            'date_order'      => $item->order_date ? Carbon::parse($item->order_date)->format('Y-m-d') : null,
            'time'            => $item->created_at ? Carbon::parse($item->created_at)->format('H:i:s') : null,
            'created_at'      => $item->created_at ? Carbon::parse($item->created_at)->toDateTimeString() : null,
            'mrs_no'          => $item->mrs_no,
            'requestor'       => $item->emp_name,
            'department'      => $item->department,
            'approver'        => $item->approver,
            'approver_status' => $this->formatStatus($item->approver_status),
            'status'          => $this->formatStatus($item->mrs_status),
        ];
    });

    return [
        'data'          => $items->toArray(),
        'current_page'  => $paginator->currentPage(),
        'last_page'     => $paginator->lastPage(),
        'per_page'      => $paginator->perPage(),
        'total'         => $paginator->total(),
    ];
}

    // ==================== ORDER DETAILS ====================

    public function getOrderDetails(Request $request)
    {
        $request->validate([
            'mrs_no' => 'required|string',
            'type'   => 'required|string|in:consigned,supplies,consumable',
        ]);

        $mrsNo   = $request->mrs_no;
        $type    = $request->type;
        $empData = session('emp_data');
        $empName = $empData['emp_name'] ?? null;
        $empJobTitle = $empData['emp_jobtitle'] ?? null;

        $isStoreUser     = $empJobTitle === "Store User";
        $isConsignedUser = $empJobTitle === "Consigned User";

        if ($type === 'consigned') {
            // Consigned has no approver concept — show all items for this MRS
            $orderItems = ConsignedCart::where('mrs_no', $mrsNo)
                ->orderBy('id', 'asc')->get()
                ->map(fn($item) => [
                    'id'                   => $item->id,
                    'item_code'            => $item->item_code,
                    'material_description' => $item->material_description,
                    'supplier'             => $item->supplier,
                    'bin_location'         => $item->bin_location,
                    'expiration'           => $item->expiration
                        ? Carbon::parse($item->expiration)->format('Y-m-d') : null,
                    'quantity'             => $item->quantity,
                    'uom'                  => $item->uom,
                    'request_qty'          => $item->request_qty,
                    'issued_qty'           => $item->issued_qty,
                    'mrs_status'           => $this->formatStatus($item->mrs_status),
                    'remarks'              => $item->remarks,
                ]);

        } elseif ($type === 'supplies') {
            $query = SuppliesCart::where('mrs_no', $mrsNo)->orderBy('id', 'asc');

            // Store users see ALL items for the MRS.
            // Regular users (requestor or approver) only see items assigned to them as approver,
            // OR all items if they are the requestor (emp_name).
            if (!$isStoreUser && $empName) {
                // Check if the logged-in user is the requestor of this MRS
                $isRequestor = SuppliesCart::where('mrs_no', $mrsNo)
                    ->where('emp_name', $empName)
                    ->exists();

                if (!$isRequestor) {
                    // They are an approver — only show items where they are the approver
                    $query->where('approver', $empName);
                }
                // If they are the requestor, show all items (no additional filter)
            }

            $orderItems = $query->get()->map(fn($item) => [
                'id'                   => $item->id,
                'item_code'            => $item->itemCode,
                'material_description' => $item->material_description,
                'detailed_description' => $item->detailed_description,
                'quantity'             => $item->quantity,
                'uom'                  => $item->uom,
                'request_qty'          => $item->request_qty,
                'issued_qty'           => $item->issued_qty,
                'mrs_status'           => $this->formatStatus($item->mrs_status),
                'approver_status'      => $this->formatStatus($item->approver_status),
                'approver'             => $item->approver,
                'remarks'              => $item->remarks,
            ]);

        } elseif ($type === 'consumable') {
            $query = ConsumableCart::where('mrs_no', $mrsNo)->orderBy('id', 'asc');

            if (!$isStoreUser && $empName) {
                $isRequestor = ConsumableCart::where('mrs_no', $mrsNo)
                    ->where('emp_name', $empName)
                    ->exists();

                if (!$isRequestor) {
                    $query->where('approver', $empName);
                }
            }

            $orderItems = $query->get()->map(fn($item) => [
                'id'                   => $item->id,
                'item_code'            => $item->itemCode,
                'material_description' => $item->material_description,
                'detailed_description' => $item->detailed_description,
                'quantity'             => $item->quantity,
                'uom'                  => $item->uom,
                'request_qty'          => $item->request_quantity ?? $item->request_qty,
                'issued_qty'           => $item->issued_qty,
                'mrs_status'           => $this->formatStatus($item->mrs_status),
                'approver_status'      => $this->formatStatus($item->approver_status),
                'approver'             => $item->approver,
                'remarks'              => $item->remarks,
            ]);

        } else {
            return response()->json(['error' => 'Invalid type'], 400);
        }

        return response()->json(['items' => $orderItems]);
    }

    // ==================== HELPERS ====================

    private function formatStatus($status)
    {
        if (!$status) return 'Pending';

        $statusMap = [
            'pending'     => 'Pending',
            'approved'    => 'Approved',
            'rejected'    => 'Rejected',
            'preparing'   => 'Preparing',
            'for pick up' => 'For Pick Up',
            'delivered'   => 'Delivered',
            'return'      => 'Returned',
            'cancelled'   => 'Cancelled',
        ];

        return $statusMap[strtolower($status)] ?? ucfirst($status);
    }
}