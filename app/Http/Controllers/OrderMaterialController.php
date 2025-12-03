<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Consumable;
use App\Models\Supplies;
use App\Models\ConsumableCart;
use App\Models\SuppliesCart;
use App\Models\EmployeeMasterlist;

class OrderMaterialController extends Controller
{
    public function index(Request $request)
    {
        // Fetch all consumables from the database
        $consumables = Consumable::all();
        
        // Fetch all supplies from the database
        $supplies = Supplies::all();
        
        // Get current user's employee data from session
        $empData = session('emp_data', []);
        $empName = $empData['emp_name'] ?? null;
        $empPosition = $empData['emp_position'] ?? null;
        $empDept = $empData['emp_dept'] ?? null;
        $empProdline = $empData['emp_prodline'] ?? null;
        
        // Fetch approvers based on employee position
        $approvers = $this->getApproversForEmployee($empName, $empPosition, $empDept, $empProdline);
        
        return Inertia::render('OrderMaterial', [
            'consumables' => $consumables,
            'supplies' => $supplies,
            'approvers' => $approvers,
        ]);
    }

    /**
     * Get approvers based on employee position and department
     */
    private function getApproversForEmployee($empName, $empPosition, $empDept, $empProdline)
    {
        $approvers = [];
        
        if (!$empName) {
            return $approvers;
        }

        try {
            // Get employee data from masterlist
            $employee = EmployeeMasterlist::where('EMPNAME', $empName)
                ->where('ACCSTATUS', 1)
                ->first();

            if (!$employee) {
                return $approvers;
            }

            $empPosition = $employee->EMPPOSITION;
            $approver1Id = $employee->APPROVER1;
            $approver2Id = $employee->APPROVER2;

            // For regular employees (not position 2, 3, or 4)
            if (!in_array($empPosition, [2, 3, 4])) {
                // Get employees in same department who are not position 1 or 4
                // and have approvers assigned
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

                // Also add the designated APPROVER1 if exists
                if ($approver1Id && $approver1Id != 'na') {
                    $designatedApprover = EmployeeMasterlist::where('EMPLOYID', $approver1Id)
                        ->where('ACCSTATUS', 1)
                        ->first();
                    
                    if ($designatedApprover) {
                        // Check if not already in list
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
            // For position 2 (Supervisors/Leads)
            elseif ($empPosition == 2) {
                // Get APPROVER1 and APPROVER2
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
            // For position 3 or other positions
            else {
                // Get only APPROVER2
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

    /**
     * Generate MRS number in format: MIS24-0009
     */
    private function generateMrsNumber()
    {
        $year = date('y'); // Get last 2 digits of year (e.g., 24 for 2024)
        
        // Get the last MRS number from both tables
        $lastConsumable = ConsumableCart::whereNotNull('mrs_no')
            ->where('mrs_no', 'like', "MIS{$year}-%")
            ->orderBy('ID', 'desc')
            ->first();
            
        $lastSupplies = SuppliesCart::whereNotNull('mrs_no')
            ->where('mrs_no', 'like', "MIS{$year}-%")
            ->orderBy('ID', 'desc')
            ->first();
        
        // Extract sequence numbers
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
        
        // Get the highest sequence number
        $lastSeq = max($lastConsumableSeq, $lastSuppliesSeq);
        
        // Increment and format
        $newSeq = $lastSeq + 1;
        $mrsNo = "MIS{$year}-" . str_pad($newSeq, 4, '0', STR_PAD_LEFT);
        
        return $mrsNo;
    }

    public function submitRequest(Request $request)
    {
        $validated = $request->validate([
            'cartItems' => 'required|array',
            'cartItems.*.id' => 'required|integer',
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

            // Generate MRS number once for this submission
            $mrsNo = $this->generateMrsNumber();

            foreach ($cartItems as $cartItem) {
                $itemId = $cartItem['id'];
                $type = $cartItem['type'];
                $requestQty = $cartItem['requestQuantity'];
                $itemRemarks = $cartItem['remarks'] ?? null;

                if ($type === 'consumable') {
                    // Fetch original consumable data with lock for update
                    $consumable = Consumable::lockForUpdate()->find($itemId);
                    
                    if (!$consumable) {
                        throw new \Exception("Consumable item with ID {$itemId} not found");
                    }

                    // Check if sufficient quantity is available
                    if ($consumable->qty < $requestQty) {
                        throw new \Exception("Insufficient quantity for {$consumable->mat_description}. Available: {$consumable->qty}, Requested: {$requestQty}");
                    }

                    // Create consumable cart entry
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

                    // Deduct the requested quantity from the consumable table
                    $consumable->qty = $consumable->qty - $requestQty;
                    $consumable->save();

                    \Log::info("Deducted {$requestQty} from consumable ID {$itemId}. New quantity: {$consumable->qty}");

                } elseif ($type === 'supplies') {
                    // Fetch original supplies data with lock for update
                    $supply = Supplies::lockForUpdate()->find($itemId);
                    
                    if (!$supply) {
                        throw new \Exception("Supply item with ID {$itemId} not found");
                    }

                    // Check if sufficient quantity is available
                    if ($supply->qty < $requestQty) {
                        throw new \Exception("Insufficient quantity for {$supply->material_description}. Available: {$supply->qty}, Requested: {$requestQty}");
                    }

                    // Create supplies cart entry
                    SuppliesCart::create([
                        'Itemcode' => $supply->itemcode,
                        'mat_description' => $supply->material_description,
                        'Bin_location' => $supply->bin_location,
                        'qty' => $supply->qty,
                        'request_qty' => $requestQty,
                        'uom' => $supply->uom,
                        'minimum' => $supply->minimum,
                        'maximum' => $supply->maximum,
                        'price' => $supply->price,
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

                    // Deduct the requested quantity from the supplies table
                    $supply->qty = $supply->qty - $requestQty;
                    $supply->save();

                    \Log::info("Deducted {$requestQty} from supply ID {$itemId}. New quantity: {$supply->qty}");
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