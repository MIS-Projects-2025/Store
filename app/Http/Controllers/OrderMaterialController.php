<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Consumable;
use App\Models\Supplies;
use App\Models\SuppliesDetails;
use App\Models\ConsumableCart;
use App\Models\SuppliesCart;
use App\Models\EmployeeMasterlist;

class OrderMaterialController extends Controller
{
    public function index(Request $request)
    {
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search', '');
        $type = $request->input('type', 'consumable');
        
        // Get current user's employee data from session
        $empData = session('emp_data', []);
        $empName = $empData['emp_name'] ?? null;
        $empPosition = $empData['emp_position'] ?? null;
        $empDept = $empData['emp_dept'] ?? null;
        $empProdline = $empData['emp_prodline'] ?? null;
        
        // Fetch approvers based on employee position
        $approvers = $this->getApproversForEmployee($empName, $empPosition, $empDept, $empProdline);
        
        if ($type === 'consumable') {
            $query = Consumable::query();
            
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('Itemcode', 'like', "%{$search}%")
                      ->orWhere('mat_description', 'like', "%{$search}%")
                      ->orWhere('Long_description', 'like', "%{$search}%")
                      ->orWhere('qty', 'like', "%{$search}%")
                      ->orWhere('uom', 'like', "%{$search}%");
                });
            }
            
            $total = $query->count();
            $items = $query->skip(($page - 1) * $perPage)
                          ->take($perPage)
                          ->get()
                          ->map(function($item) {
                              return [
                                  'id' => $item->id,
                                  'itemCode' => $item->Itemcode,
                                  'description' => $item->mat_description,
                                  'detailedDescription' => $item->Long_description,
                                  'quantity' => $item->qty,
                                  'uom' => $item->uom,
                                  'binLocation' => $item->Bin_location ?? '',
                              ];
                          });
            
            $paginationData = [
                'data' => $items,
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage)
            ];
        } else {
            // Supplies pagination - flatten supplies details
            $suppliesData = Supplies::with('details')->get();
            $allSupplies = [];
            
            foreach ($suppliesData as $supply) {
                foreach ($supply->details as $detail) {
                    $allSupplies[] = [
                        'id' => $supply->id,
                        'detail_id' => $detail->id,
                        'itemCode' => $supply->itemcode,
                        'description' => $supply->material_description,
                        'detailedDescription' => $detail->detailed_description,
                        'binLocation' => $detail->bin_location,
                        'quantity' => $detail->qty ?? 0,
                        'uom' => $detail->uom,
                        'minimum' => $detail->minimum ?? 0,
                        'maximum' => $detail->maximum ?? 0,
                        'price' => $detail->price ?? 0,
                    ];
                }
            }
            
            // Filter if search term exists
            if ($search) {
                $allSupplies = array_filter($allSupplies, function($item) use ($search) {
                    $searchLower = strtolower($search);
                    return str_contains(strtolower($item['itemCode'] ?? ''), $searchLower) ||
                           str_contains(strtolower($item['description'] ?? ''), $searchLower) ||
                           str_contains(strtolower($item['detailedDescription'] ?? ''), $searchLower) ||
                           str_contains(strtolower($item['binLocation'] ?? ''), $searchLower) ||
                           str_contains(strtolower((string)$item['quantity']), $searchLower) ||
                           str_contains(strtolower($item['uom'] ?? ''), $searchLower);
                });
                $allSupplies = array_values($allSupplies); // Re-index array
            }
            
            $total = count($allSupplies);
            $items = array_slice($allSupplies, ($page - 1) * $perPage, $perPage);
            
            $paginationData = [
                'data' => array_values($items), // Ensure numeric keys
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => $total > 0 ? ceil($total / $perPage) : 1
            ];
        }
        
        return Inertia::render('OrderMaterial', [
            'pagination' => $paginationData,
            'approvers' => $approvers,
            'currentType' => $type,
            'currentSearch' => $search,
        ]);
    }

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
                        'id' => $approver->EMPLOYID,
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
                                'id' => $designatedApprover->EMPLOYID,
                                'name' => $designatedApprover->EMPNAME
                            ];
                        }
                    }
                }
            }
            elseif ($empPosition == 2) {
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
                            'id' => $approver->EMPLOYID,
                            'name' => $approver->EMPNAME
                        ];
                    }
                }
            }
            else {
                if ($approver2Id && $approver2Id != 'na') {
                    $designatedApprover = EmployeeMasterlist::where('EMPLOYID', $approver2Id)
                        ->where('ACCSTATUS', 1)
                        ->first();
                    
                    if ($designatedApprover) {
                        $approvers[] = [
                            'id' => $designatedApprover->EMPLOYID,
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

    private function generateMrsNumber()
    {
        $year = date('y');
        
        $lastConsumable = ConsumableCart::whereNotNull('mrs_no')
            ->where('mrs_no', 'like', "MIS{$year}-%")
            ->orderBy('ID', 'desc')
            ->first();
            
        $lastSupplies = SuppliesCart::whereNotNull('mrs_no')
            ->where('mrs_no', 'like', "MIS{$year}-%")
            ->orderBy('ID', 'desc')
            ->first();
        
        $lastConsumableSeq = 0;
        $lastSuppliesSeq = 0;
        
        if ($lastConsumable && $lastConsumable->mrs_no) {
            $parts = explode('-', $lastConsumable->mrs_no);
            $lastConsumableSeq = isset($parts[1]) ? (int)$parts[1] : 0;
        }
        
        if ($lastSupplies && $lastSupplies->mrs_no) {
            $parts = explode('-', $lastSupplies->mrs_no);
            $lastSuppliesSeq = isset($parts[1]) ? (int)$parts[1] : 0;
        }
        
        $lastSeq = max($lastConsumableSeq, $lastSuppliesSeq);
        $newSeq = $lastSeq + 1;
        $mrsNo = "MIS{$year}-" . str_pad($newSeq, 4, '0', STR_PAD_LEFT);
        
        return $mrsNo;
    }

    public function submitRequest(Request $request)
    {
        $validated = $request->validate([
            'cartItems' => 'required|array',
            'cartItems.*.id' => 'required|integer',
            'cartItems.*.detail_id' => 'nullable|integer',
            'cartItems.*.type' => 'required|in:consumable,supplies',
            'cartItems.*.requestQuantity' => 'required|integer|min:1',
            'cartItems.*.remarks' => 'nullable|string',
            'employee_no' => 'required|string',
            'department' => 'required|string',
            'prodline' => 'required|string',
            'approver' => 'required|string',
        ]);

        $cartItems = $validated['cartItems'];
        $employeeNo = $validated['employee_no'];
        $department = $validated['department'];
        $prodline = $validated['prodline'];
        $approver1 = $validated['approver'];
        $orderDate = Carbon::now();

        try {
            DB::connection('newstore')->beginTransaction();

            $mrsNo = $this->generateMrsNumber();

            foreach ($cartItems as $cartItem) {
                $itemId = $cartItem['id'];
                $detailId = $cartItem['detail_id'] ?? null;
                $type = $cartItem['type'];
                $requestQty = $cartItem['requestQuantity'];
                $itemRemarks = $cartItem['remarks'] ?? null;

                if ($type === 'consumable') {
                    $consumable = Consumable::lockForUpdate()->find($itemId);
                    
                    if (!$consumable) {
                        throw new \Exception("Consumable item with ID {$itemId} not found");
                    }

                    if ($consumable->qty < $requestQty) {
                        throw new \Exception("Insufficient quantity for {$consumable->mat_description}. Available: {$consumable->qty}, Requested: {$requestQty}");
                    }

                    ConsumableCart::create([
                        'Itemcode' => $consumable->Itemcode,
                        'mat_description' => $consumable->mat_description,
                        'Long_description' => $consumable->Long_description,
                        'Bin_location' => $consumable->Bin_location,
                        'supplier' => $consumable->supplier,
                        'category' => $consumable->category,
                        'qty' => $consumable->qty,
                        'request_qty' => $requestQty,
                        'uom' => $consumable->uom,
                        'minimum' => $consumable->minimum,
                        'maximum' => $consumable->maximum,
                        'order_date' => $orderDate,
                        'employee_no' => $employeeNo,
                        'approver1' => $approver1,
                        'department' => $department,
                        'prodline' => $prodline,
                        'material_type' => 'consumable',
                        'mrs_no' => $mrsNo,
                        'mrs_status' => ConsumableCart::MRS_STATUS_PENDING,
                        'approval_status' => 'pending',
                        'remarks' => $itemRemarks,
                    ]);

                    $consumable->qty = $consumable->qty - $requestQty;
                    $consumable->save();

                    \Log::info("Deducted {$requestQty} from consumable ID {$itemId}. New quantity: {$consumable->qty}");

                } elseif ($type === 'supplies') {
                    $supply = Supplies::with('details')->lockForUpdate()->find($itemId);
                    
                    if (!$supply) {
                        throw new \Exception("Supply item with ID {$itemId} not found");
                    }

                    $selectedDetail = $supply->details->firstWhere('id', $detailId);
                    
                    if (!$selectedDetail) {
                        throw new \Exception("Supply detail with ID {$detailId} not found");
                    }

                    if ($selectedDetail->qty < $requestQty) {
                        throw new \Exception("Insufficient quantity for {$supply->material_description} (Bin: {$selectedDetail->bin_location}). Available: {$selectedDetail->qty}, Requested: {$requestQty}");
                    }

                    SuppliesCart::create([
                        'Itemcode' => $supply->itemcode,
                        'mat_description' => $supply->material_description,
                        'detailed_description' => $selectedDetail->detailed_description,
                        'Bin_location' => $selectedDetail->bin_location,
                        'qty' => $selectedDetail->qty,
                        'request_qty' => $requestQty,
                        'uom' => $selectedDetail->uom,
                        'minimum' => $selectedDetail->minimum,
                        'maximum' => $selectedDetail->maximum,
                        'price' => $selectedDetail->price,
                        'order_date' => $orderDate,
                        'employee_no' => $employeeNo,
                        'approver1' => $approver1,
                        'department' => $department,
                        'prodline' => $prodline,
                        'material_type' => 'supplies',
                        'mrs_no' => $mrsNo,
                        'mrs_status' => SuppliesCart::MRS_STATUS_PENDING,
                        'approval_status' => 'pending',
                        'remarks' => $itemRemarks,
                    ]);

                    $selectedDetail->qty = $selectedDetail->qty - $requestQty;
                    $selectedDetail->save();

                    \Log::info("Deducted {$requestQty} from supply detail ID {$selectedDetail->id}. New quantity: {$selectedDetail->qty}");
                }
            }

            DB::connection('newstore')->commit();

            return back()->with('success', "Request submitted successfully! MRS No: {$mrsNo}");

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            \Log::error('Order submission failed: ' . $e->getMessage());
            
            return back()->with('error', 'Failed to submit request: ' . $e->getMessage());
        }
    }
}