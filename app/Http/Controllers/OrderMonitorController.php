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

        \Log::info('=== ORDER MONITOR DEBUG ===');
        \Log::info('Employee Data:', [
            'emp_id'       => $empId,
            'emp_name'     => $empName,
            'emp_jobtitle' => $empJobTitle,
        ]);

        $isConsignedUser = $empJobTitle === "Consigned User";
        $isStoreUser     = $empJobTitle === "Store User";
        $isRegularUser   = !$isConsignedUser && !$isStoreUser;

        \Log::info('User Roles:', [
            'isConsignedUser' => $isConsignedUser,
            'isStoreUser'     => $isStoreUser,
            'isRegularUser'   => $isRegularUser,
        ]);

        $consignedData  = [];
        $suppliesData   = [];
        $consumableData = [];

        if ($isConsignedUser) {
            $consignedData = $this->getConsignedOrders();

        } elseif ($isStoreUser) {
            $consignedData  = $this->getConsignedOrders();
            $suppliesData   = $this->getAllSuppliesOrders();
            $consumableData = $this->getAllConsumableOrders();

        } else {
            // Regular users: show orders where they are the requestor OR the approver
            $suppliesData   = $this->getSuppliesOrders($empName);
            $consumableData = $this->getConsumableOrders($empName);
        }

        return Inertia::render('OrderMonitor', [
            'consignedData'   => $consignedData,
            'suppliesData'    => $suppliesData,
            'consumableData'  => $consumableData,
            'isConsignedUser' => $isConsignedUser,
            'isStoreUser'     => $isStoreUser,
            'isRegularUser'   => $isRegularUser,
        ]);
    }

    // ==================== CONSIGNED ====================

    private function getConsignedOrders()
    {
        $ordersQuery = ConsignedCart::select(
                'mrs_no', 'order_date', 'employee_no', 'station', 'mrs_status', 'created_at'
            )
            ->whereNotNull('mrs_status')
            ->orderBy('created_at', 'desc')
            ->get();

        $uniqueOrders = $ordersQuery->groupBy('mrs_no')->map(function ($group) {
            $first         = $group->first();
            $displayStatus = $group->firstWhere('mrs_status', '!=', 'Return')?->mrs_status ?? $first->mrs_status;

            return [
                'mrs_no'      => $first->mrs_no,
                'order_date'  => $first->order_date,
                'created_at'  => $first->created_at,
                'employee_no' => $first->employee_no,
                'station'     => $first->station,
                'mrs_status'  => $displayStatus,
            ];
        })->values();

        $employeeNos = $uniqueOrders->pluck('employee_no')->unique()->filter();
        $employees   = EmployeeMasterlist::whereIn('EMPLOYID', $employeeNos)
            ->get(['EMPLOYID', 'EMPNAME'])
            ->keyBy('EMPLOYID');

        return $uniqueOrders->map(function ($item, $index) use ($employees) {
            $employee = $employees->get($item['employee_no']);

            return [
                'id'            => $index + 1,
                'date_order'    => $item['order_date']
                    ? Carbon::parse($item['order_date'])->format('Y-m-d') : null,
                'time'          => $item['created_at']
                    ? Carbon::parse($item['created_at'])->format('H:i:s') : null,
                'created_at'    => $item['created_at']
                    ? Carbon::parse($item['created_at'])->toDateTimeString() : null,
                'mrs_no'        => $item['mrs_no'],
                'employee_id'   => $item['employee_no'],
                'employee_name' => $employee ? $employee->EMPNAME : $item['employee_no'],
                'station'       => $item['station'],
                'status'        => $this->formatStatus($item['mrs_status']),
            ];
        })->toArray();
    }

    // ==================== SUPPLIES (own orders — regular user) ====================

    private function getSuppliesOrders($empName)
    {
        if (!$empName) return [];

        try {
            // Show MRS orders where the employee is the requestor OR the approver
            return $this->buildSuppliesResult(
                SuppliesCart::select(
                        'mrs_no', 'order_date', 'emp_name', 'department',
                        'mrs_status', 'approver_status', 'approver', 'created_at'
                    )
                    ->where(function ($q) use ($empName) {
                        $q->where('emp_name', $empName)
                          ->orWhere('approver', $empName);
                    })
                    ->orderBy('created_at', 'desc')
                    ->get()
            );
        } catch (\Exception $e) {
            \Log::error('Error getting supplies orders:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    // ==================== SUPPLIES (all orders — store user) ====================

    private function getAllSuppliesOrders()
    {
        try {
            return $this->buildSuppliesResult(
                SuppliesCart::select(
                        'mrs_no', 'order_date', 'emp_name', 'department',
                        'mrs_status', 'approver_status', 'approver', 'created_at'
                    )
                    ->orderBy('created_at', 'desc')
                    ->get()
            );
        } catch (\Exception $e) {
            \Log::error('Error getting all supplies orders:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    private function buildSuppliesResult($ordersQuery)
    {
        $uniqueOrders = $ordersQuery->groupBy('mrs_no')->map(function ($group) {
            $first = $group->first();
            return [
                'mrs_no'          => $first->mrs_no,
                'order_date'      => $first->order_date,
                'created_at'      => $first->created_at,
                'emp_name'        => $first->emp_name,
                'department'      => $first->department,
                'mrs_status'      => $first->mrs_status,
                'approver_status' => $first->approver_status,
                'approver'        => $first->approver,
            ];
        })->values();

        return $uniqueOrders->map(function ($item, $index) {
            return [
                'id'              => $index + 1,
                'date_order'      => $item['order_date']
                    ? Carbon::parse($item['order_date'])->format('Y-m-d') : null,
                'time'            => $item['created_at']
                    ? Carbon::parse($item['created_at'])->format('H:i:s') : null,
                'created_at'      => $item['created_at']
                    ? Carbon::parse($item['created_at'])->toDateTimeString() : null,
                'mrs_no'          => $item['mrs_no'],
                'requestor'       => $item['emp_name'],
                'department'      => $item['department'],
                'approver'        => $item['approver'],
                'approver_status' => $this->formatStatus($item['approver_status']),
                'status'          => $this->formatStatus($item['mrs_status']),
            ];
        })->toArray();
    }

    // ==================== CONSUMABLE (own orders — regular user) ====================

    private function getConsumableOrders($empName)
    {
        if (!$empName) return [];

        try {
            return $this->buildConsumableResult(
                ConsumableCart::select(
                        'mrs_no', 'order_date', 'emp_name', 'department',
                        'mrs_status', 'approver_status', 'approver', 'created_at'
                    )
                    ->where(function ($q) use ($empName) {
                        $q->where('emp_name', $empName)
                          ->orWhere('approver', $empName);
                    })
                    ->orderBy('created_at', 'desc')
                    ->get()
            );
        } catch (\Exception $e) {
            \Log::error('Error getting consumable orders:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    // ==================== CONSUMABLE (all orders — store user) ====================

    private function getAllConsumableOrders()
    {
        try {
            return $this->buildConsumableResult(
                ConsumableCart::select(
                        'mrs_no', 'order_date', 'emp_name', 'department',
                        'mrs_status', 'approver_status', 'approver', 'created_at'
                    )
                    ->orderBy('created_at', 'desc')
                    ->get()
            );
        } catch (\Exception $e) {
            \Log::error('Error getting all consumable orders:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    private function buildConsumableResult($ordersQuery)
    {
        $uniqueOrders = $ordersQuery->groupBy('mrs_no')->map(function ($group) {
            $first = $group->first();
            return [
                'mrs_no'          => $first->mrs_no,
                'order_date'      => $first->order_date,
                'created_at'      => $first->created_at,
                'emp_name'        => $first->emp_name,
                'department'      => $first->department,
                'mrs_status'      => $first->mrs_status,
                'approver_status' => $first->approver_status,
                'approver'        => $first->approver,
            ];
        })->values();

        return $uniqueOrders->map(function ($item, $index) {
            return [
                'id'              => $index + 1,
                'date_order'      => $item['order_date']
                    ? Carbon::parse($item['order_date'])->format('Y-m-d') : null,
                'time'            => $item['created_at']
                    ? Carbon::parse($item['created_at'])->format('H:i:s') : null,
                'created_at'      => $item['created_at']
                    ? Carbon::parse($item['created_at'])->toDateTimeString() : null,
                'mrs_no'          => $item['mrs_no'],
                'requestor'       => $item['emp_name'],
                'department'      => $item['department'],
                'approver'        => $item['approver'],
                'approver_status' => $this->formatStatus($item['approver_status']),
                'status'          => $this->formatStatus($item['mrs_status']),
            ];
        })->toArray();
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