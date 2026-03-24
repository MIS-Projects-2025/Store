<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Consigned;
use App\Models\ConsignedDetail;
use App\Models\ConsignedCart;
use App\Models\Supply;
use App\Models\SupplyDetail;
use App\Models\SuppliesCart;
use App\Models\Consumable;
use App\Models\ConsumableDetail;
use App\Models\ConsumableCart;
use App\Models\EmployeeMasterlist;
use App\Events\MaterialIssuanceUpdated;

class OrderMaterialController extends Controller
{
    private function getApproversForEmployee($empName, $empPosition, $empDept, $empProdline)
    {
        $approvers = [];
        
        if (!$empName) {
            return $approvers;
        }

        try {
            $employee = EmployeeMasterlist::where('EMPNAME', $empName)
                ->where('ACCSTATUS', 1)
                ->first();

            if (!$employee) {
                return $approvers;
            }

            $empPosition = $employee->EMPPOSITION;
            $approver1Id = $employee->APPROVER1;
            $approver2Id = $employee->APPROVER2;

            if (!in_array($empPosition, [2, 3, 4])) {
                $deptApprovers = EmployeeMasterlist::where('ACCSTATUS', 1)
                    ->whereNotIn('EMPPOSITION', [1, 4])
                    ->where('DEPARTMENT', $empDept)
                    ->where('EMPNAME', '!=', $empName)
                    ->where(function($query) {
                        $query->where('APPROVER1', '!=', 'na')
                              ->orWhere('APPROVER2', '!=', 'na');
                    })
                    ->select('EMPNAME', 'EMPLOYID')
                    ->get();

                foreach ($deptApprovers as $approver) {
                    $approvers[] = [
                        'id'   => $approver->EMPLOYID,
                        'name' => $approver->EMPNAME
                    ];
                }

                if ($approver1Id && $approver1Id != 'na') {
                    $designatedApprover = EmployeeMasterlist::where('EMPLOYID', $approver1Id)
                        ->where('ACCSTATUS', 1)
                        ->first();
                    
                    if ($designatedApprover) {
                        $exists = collect($approvers)->contains('id', $designatedApprover->EMPLOYID);
                        if (!$exists) {
                            $approvers[] = [
                                'id'   => $designatedApprover->EMPLOYID,
                                'name' => $designatedApprover->EMPNAME
                            ];
                        }
                    }
                }
            } elseif ($empPosition == 2) {
                $approverIds = array_filter([$approver1Id, $approver2Id], function($id) {
                    return $id && $id != 'na';
                });

                if (!empty($approverIds)) {
                    $supervisorApprovers = EmployeeMasterlist::whereIn('EMPLOYID', $approverIds)
                        ->where('ACCSTATUS', 1)
                        ->select('EMPNAME', 'EMPLOYID')
                        ->get();

                    foreach ($supervisorApprovers as $approver) {
                        $approvers[] = [
                            'id'   => $approver->EMPLOYID,
                            'name' => $approver->EMPNAME
                        ];
                    }
                }
            } else {
                if ($approver2Id && $approver2Id != 'na') {
                    $designatedApprover = EmployeeMasterlist::where('EMPLOYID', $approver2Id)
                        ->where('ACCSTATUS', 1)
                        ->first();
                    
                    if ($designatedApprover) {
                        $approvers[] = [
                            'id'   => $designatedApprover->EMPLOYID,
                            'name' => $designatedApprover->EMPNAME
                        ];
                    }
                }
            }

        } catch (\Exception $e) {
            \Log::error('Error fetching approvers: ' . $e->getMessage());
        }

        return $approvers;
    }

    public function index(Request $request)
    {
        $station     = session('emp_data.emp_station', 'Unknown Station');
        $empDept     = session('emp_data.emp_dept', 'Unknown Department');
        $empProdline = session('emp_data.emp_prodline', 'Unknown Prodline');
        $empName     = session('emp_data.emp_name', 'Unknown Employee');
        $empId       = session('emp_data.emp_id', null);
        $empPosition = session('emp_data.emp_position', null);
        $empJobTitle = session('emp_data.emp_jobtitle', null);

        $isConsignedUser = $empJobTitle === "Consigned User";
        $isStoreUser     = $empJobTitle === "Store User";

        // Approvers only needed for regular employees (not Store/Consigned users)
        $approvers = [];
        if ($empId && !$isConsignedUser && !$isStoreUser) {
            $approvers = $this->getApproversForEmployee($empName, $empPosition, $empDept, $empProdline);
        }

        // Consigned items — shown to Consigned User AND Store User
        $consignedItems = collect();
        if ($isConsignedUser || $isStoreUser) {
$consignedItems = Consigned::with(['details' => function($query) {
        $query->where('qty', '>', 0);
    }])
    ->get()
    ->flatMap(function($consigned) {
        // Determine effective selected itemcode/supplier
        $selectedItemCode = $consigned->selected_itemcode;
        $selectedSupplier = $consigned->selected_supplier;

        // Try matching the current selection first
        $matchingDetails = $consigned->details
            ->where('item_code', $selectedItemCode)
            ->where('supplier', $selectedSupplier);

        // ── FIX: if selection is stale/null, fall back to first available detail ──
        if ($matchingDetails->isEmpty()) {
            if ($consigned->details->isEmpty()) {
                return collect(); // truly no stock at all
            }

            // Pick the best fallback: nearest expiry first, then lowest qty
            $fallback = $consigned->details
                ->filter(fn($d) => !empty($d->expiration))
                ->sortBy(fn($d) => Carbon::parse($d->expiration))
                ->first()
                ?? $consigned->details->sortBy('qty')->first();

            // Update DB so the selection stays in sync
            $consigned->update([
                'selected_itemcode' => $fallback->item_code,
                'selected_supplier' => $fallback->supplier,
            ]);

            $selectedItemCode = $fallback->item_code;
            $selectedSupplier = $fallback->supplier;

            $matchingDetails = $consigned->details
                ->where('item_code', $selectedItemCode)
                ->where('supplier', $selectedSupplier);
        }

        // Group by item_code + supplier + mat_description (same as before)
        $grouped = $matchingDetails->groupBy(function($detail) {
            return $detail->item_code . '|' . $detail->supplier . '|' . $detail->mat_description;
        });

        return $grouped->map(function($group) use ($consigned) {
            $nearestDetail = $group->sortBy(function($detail) {
                if (!$detail->expiration) return PHP_INT_MAX;
                $expirationDate = Carbon::parse($detail->expiration);
                $now = Carbon::now();
                return $expirationDate->isFuture()
                    ? $expirationDate->diffInDays($now, false)
                    : 1000000 + $expirationDate->diffInDays($now);
            })->first();

            $totalQty = $group->sum('qty');

            return [
                'id'                => $nearestDetail->id,
                'consigned_no'      => $consigned->consigned_no,
                'commonality'       => $consigned->commonality,
                'category'          => $consigned->category,
                'selected_itemcode' => $consigned->selected_itemcode,
                'selected_supplier' => $consigned->selected_supplier,
                'item_code'         => $nearestDetail->item_code,
                'mat_description'   => $nearestDetail->mat_description,
                'supplier'          => $nearestDetail->supplier,
                'qty'               => $totalQty,
                'uom'               => $nearestDetail->uom,
                'qty_per_box'       => $nearestDetail->qty_per_box,
                'price'             => $nearestDetail->price,
                'expiration'        => $nearestDetail->expiration,
                'minimum'           => $nearestDetail->minimum,
                'maximum'           => $nearestDetail->maximum,
                'bin_location'      => $nearestDetail->bin_location,
            ];
        });
    })
    ->filter()
    ->values();
        }

        // Supplies items — shown to regular employees AND Store User (NOT Consigned User)
        // bin_location added to the mapped array
        $suppliesItems = collect();
        if (!$isConsignedUser) {
            $suppliesItems = Supply::with(['details' => function($query) {
                        $query->where('is_deleted', false);
                    }])
                ->where('is_deleted', false)
                ->get()
                ->flatMap(function($supply) {
                    return $supply->details->map(function($detail) use ($supply) {
                        return [
                            'id'                   => $detail->id,
                            'supplies_no'          => $supply->supplies_no,
                            'material_description' => $supply->material_description,
                            'uom'                  => $supply->uom,
                            'item_code'            => $detail->item_code,
                            'detailed_description' => $detail->detailed_description,
                            'bin_location'         => $detail->bin_location, // ← added
                            'qty'                  => $detail->qty,
                            'min'                  => $detail->min,
                            'max'                  => $detail->max,
                            'price'                => $detail->price,
                        ];
                    });
                })
                ->filter()
                ->values();
        }

        // Consumable items — shown to regular employees AND Store User (NOT Consigned User)
        $consumableItems = collect();
        if (!$isConsignedUser) {
            $consumableItems = Consumable::with(['details' => function($query) {
                    // show all items including zero quantity
                }])
                ->get()
                ->flatMap(function($consumable) {
                    return $consumable->details->map(function($detail) use ($consumable) {
                        return [
                            'id'                   => $detail->id,
                            'consumable_id'        => $consumable->consumable_id,
                            'material_description' => $consumable->material_description,
                            'category'             => $consumable->category,
                            'uom'                  => $consumable->uom,
                            'item_code'            => $detail->item_code,
                            'detailed_description' => $detail->detailed_description,
                            'serial'               => $detail->serial,
                            'bin_location'         => $detail->bin_location,
                            'qty'                  => $detail->quantity,
                            'min'                  => $detail->min,
                            'max'                  => $detail->max,
                        ];
                    });
                })
                ->filter()
                ->values();
        }

        return Inertia::render('OrderMaterial', [
            'tableData'       => $consignedItems,
            'suppliesData'    => $suppliesItems,
            'consumableData'  => $consumableItems,
            'approvers'       => $approvers,
            'station'         => $station,
            'empDept'         => $empDept,
            'empProdline'     => $empProdline,
            'empName'         => $empName,
            'isConsignedUser' => $isConsignedUser,
            'isStoreUser'     => $isStoreUser,
        ]);
    }

    public function submitOrder(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'type'                                  => 'required|string|in:consigned,supplies,consumable',
                'orders'                                => 'required|array',
                'orders.*.employee_id'                  => 'required_if:type,consigned|string|nullable',
                'orders.*.factory'                      => 'required_if:type,consigned|string|nullable',
                'orders.*.station'                      => 'required|string',
                'orders.*.department'                   => 'required_if:type,supplies,consumable|string|nullable',
                'orders.*.approver'                     => 'required_if:type,supplies,consumable|string|nullable',
                'orders.*.machine_no'                   => 'nullable|string',
                'orders.*.items'                        => 'required|array',
                'orders.*.items.*.item_code'            => 'required|string',
                'orders.*.items.*.mat_description'      => 'nullable|string',
                'orders.*.items.*.material_description' => 'nullable|string',
                'orders.*.items.*.detailed_description' => 'nullable|string',
                'orders.*.items.*.supplier'             => 'nullable|string',
                'orders.*.items.*.serial'               => 'nullable|string',
                'orders.*.items.*.bin_location'         => 'nullable|string', // already present
                'orders.*.items.*.expiration'           => 'nullable|date',
                'orders.*.items.*.qty'                  => 'required|numeric',
                'orders.*.items.*.uom'                  => 'required|string',
                'orders.*.items.*.qty_per_box'          => 'nullable|numeric',
                'orders.*.items.*.request_quantity'     => 'required|numeric',
                'orders.*.items.*.remarks'              => 'nullable|string',
            ]);

            DB::beginTransaction();

            $orderDate   = Carbon::now()->format('Y-m-d');
            $savedOrders = [];
            $orderType   = $validatedData['type'];

            $empId       = session('emp_data.emp_id', null);
            $empName     = session('emp_data.emp_name', 'Unknown Employee');
            $empProdline = session('emp_data.emp_prodline', 'Unknown Prodline');

            // ================================================================
            // SUPPLIES
            // ================================================================
            if ($orderType === 'supplies') {
                $latestMrs = SuppliesCart::orderBy('mrs_no', 'desc')->first();
                if ($latestMrs && preg_match('/mrs-(\d+)/', $latestMrs->mrs_no, $matches)) {
                    $nextNumber = intval($matches[1]) + 1;
                } else {
                    $nextNumber = 1;
                }

                foreach ($validatedData['orders'] as $order) {
                    $mrsNo = 'mrs-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

                    $approverName = null;
                    if (!empty($order['approver'])) {
                        $approverEmployee = \App\Models\EmployeeMasterlist::where('EMPLOYID', $order['approver'])
                            ->where('ACCSTATUS', 1)->first();
                        $approverName = $approverEmployee ? $approverEmployee->EMPNAME : null;
                    }

                    if (!$approverName) {
                        \Log::error('Approver not found for ID: ' . $order['approver']);
                        continue;
                    }

                    foreach ($order['items'] as $item) {
                        $materialDescription = '';
                        $detailedDescription = $item['detailed_description'] ?? '';

                        if (!empty($item['item_code'])) {
                            $supplyDetail = \App\Models\SupplyDetail::where('item_code', $item['item_code'])
                                ->with('supply')->first();
                            if ($supplyDetail && $supplyDetail->supply) {
                                $materialDescription = $supplyDetail->supply->material_description;
                            }
                        }

                        SuppliesCart::create([
                            'mrs_no'               => $mrsNo,
                            'order_date'           => $orderDate,
                            'emp_id'               => $empId,
                            'emp_name'             => $empName,
                            'approver'             => $approverName,
                            'department'           => $order['department'],
                            'prodline'             => $empProdline,
                            'machine_no'           => $order['machine_no'] ?? null,
                            'mrs_status'           => 'pending',
                            'approver_status'      => 'pending',
                            'issued_by'            => null,
                            'itemCode'             => $item['item_code'],
                            'material_description' => $materialDescription,
                            'detailed_description' => $detailedDescription,
                            'bin_location'         => $item['bin_location'] ?? null, // ← added
                            'quantity'             => $item['qty'],
                            'uom'                  => $item['uom'],
                            'request_qty'          => $item['request_quantity'],
                            'issued_qty'           => null,
                            'remarks'              => $item['remarks'] ?? null,
                        ]);
                    }

                    $savedOrders[] = ['mrs_no' => $mrsNo, 'type' => $orderType, 'item_count' => count($order['items'])];
                    $nextNumber++;
                }

            // ================================================================
            // CONSUMABLE
            // ================================================================
            } elseif ($orderType === 'consumable') {
                $latestMrs = ConsumableCart::orderBy('mrs_no', 'desc')->first();
                if ($latestMrs && preg_match('/mrs-(\d+)/', $latestMrs->mrs_no, $matches)) {
                    $nextNumber = intval($matches[1]) + 1;
                } else {
                    $nextNumber = 1;
                }

                foreach ($validatedData['orders'] as $order) {
                    $mrsNo = 'mrs-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

                    $approverName = null;
                    if (!empty($order['approver'])) {
                        $approverEmployee = \App\Models\EmployeeMasterlist::where('EMPLOYID', $order['approver'])
                            ->where('ACCSTATUS', 1)->first();
                        $approverName = $approverEmployee ? $approverEmployee->EMPNAME : null;
                    }

                    if (!$approverName) {
                        \Log::error('Approver not found for ID: ' . $order['approver']);
                        continue;
                    }

                    foreach ($order['items'] as $item) {
                        $materialDescription = $item['material_description'] ?? '';
                        $detailedDescription = $item['detailed_description'] ?? '';

                        if (empty($materialDescription) && !empty($item['item_code'])) {
                            $consumableDetail = \App\Models\ConsumableDetail::where('item_code', $item['item_code'])
                                ->with('consumable')->first();
                            if ($consumableDetail && $consumableDetail->consumable) {
                                $materialDescription = $consumableDetail->consumable->material_description;
                            }
                        }

                        ConsumableCart::create([
                            'mrs_no'               => $mrsNo,
                            'order_date'           => $orderDate,
                            'emp_id'               => $empId,
                            'emp_name'             => $empName,
                            'approver'             => $approverName,
                            'department'           => $order['department'],
                            'prodline'             => $empProdline,
                            'machine_no'           => $order['machine_no'] ?? null,
                            'mrs_status'           => 'pending',
                            'approver_status'      => 'pending',
                            'issued_by'            => null,
                            'itemCode'             => $item['item_code'],
                            'material_description' => $materialDescription,
                            'detailed_description' => $detailedDescription,
                            'serial'               => $item['serial'] ?? null,
                            'bin_location'         => $item['bin_location'] ?? null,
                            'quantity'             => $item['qty'],
                            'uom'                  => $item['uom'],
                            'request_quantity'     => $item['request_quantity'],
                            'issued_quantity'      => null,
                            'remarks'              => $item['remarks'] ?? null,
                        ]);
                    }

                    $savedOrders[] = ['mrs_no' => $mrsNo, 'type' => $orderType, 'item_count' => count($order['items'])];
                    $nextNumber++;
                }

            // ================================================================
            // CONSIGNED
            // ================================================================
            } else {
                $latestMrs = ConsignedCart::orderBy('mrs_no', 'desc')->first();
                if ($latestMrs && preg_match('/mrs-(\d+)/', $latestMrs->mrs_no, $matches)) {
                    $nextNumber = intval($matches[1]) + 1;
                } else {
                    $nextNumber = 1;
                }

                foreach ($validatedData['orders'] as $order) {
                    $mrsNo = 'mrs-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

                    foreach ($order['items'] as $item) {
                        $materialDescription = $item['mat_description'] ?? $item['detailed_description'] ?? '';

                        ConsignedCart::create([
                            'mrs_no'               => $mrsNo,
                            'order_date'           => $orderDate,
                            'employee_no'          => $order['employee_id'],
                            'factory'              => $order['factory'],
                            'station'              => $order['station'],
                            'issued_by'            => null,
                            'mrs_status'           => 'pending',
                            'item_code'            => $item['item_code'],
                            'material_description' => $materialDescription,
                            'supplier'             => $item['supplier'] ?? null,
                            'expiration'           => $item['expiration'] ?? null,
                            'bin_location'         => $item['bin_location'] ?? null,
                            'quantity'             => $item['qty'],
                            'uom'                  => $item['uom'],
                            'qty_per_box'          => $item['qty_per_box'] ?? 0,
                            'request_qty'          => $item['request_quantity'],
                            'issued_qty'           => null,
                            'remarks'              => $item['remarks'] ?? null,
                        ]);
                    }

                    $savedOrders[] = ['mrs_no' => $mrsNo, 'type' => $orderType, 'item_count' => count($order['items'])];
                    $nextNumber++;
                }
            }

            DB::commit();

            broadcast(new MaterialIssuanceUpdated(
                $orderType,
                'created',
                $savedOrders[0]['mrs_no'] ?? null,
                'pending',
                ['order_count' => count($savedOrders), 'emp_name' => $empName]
            ));

            return back()->with([
                'success' => true,
                'message' => 'Order(s) submitted successfully!',
                'orders'  => $savedOrders
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return back()->withErrors($e->errors())->with([
                'success' => false,
                'message' => 'Validation failed'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with([
                'success' => false,
                'message' => 'Failed to submit order: ' . $e->getMessage()
            ]);
        }
    }
}