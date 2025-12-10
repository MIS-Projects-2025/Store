<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\ConsumableCart;
use App\Models\SuppliesCart;
use App\Models\EmployeeMasterlist;
use App\Models\Consumable;
use App\Models\Supplies;

class MaterialIssuanceController extends Controller
{
public function index(Request $request)
{
    // Fetch only approved consumable cart data
    $consumableData = ConsumableCart::where('approval_status', 'approved')
        ->orderBy('order_date', 'desc')
        ->get();
    
    // Fetch only approved supplies cart data
    $suppliesData = SuppliesCart::where('approval_status', 'approved')
        ->orderBy('order_date', 'desc')
        ->get();

    // Get all unique employee numbers
    $employeeNos = $consumableData->pluck('employee_no')
        ->merge($suppliesData->pluck('employee_no'))
        ->unique()
        ->filter();

    // Fetch employee names from masterlist
    $employees = EmployeeMasterlist::whereIn('EMPLOYID', $employeeNos)
        ->get()
        ->keyBy('EMPLOYID');

    // Add requestor_name to consumable data
    $consumableData->transform(function ($item) use ($employees) {
        $item->requestor_name = $employees->get($item->employee_no)->EMPNAME ?? 'N/A';
        return $item;
    });

    // Add requestor_name to supplies data
    $suppliesData->transform(function ($item) use ($employees) {
        $item->requestor_name = $employees->get($item->employee_no)->EMPNAME ?? 'N/A';
        return $item;
    });

    // Fetch all available consumables (they have qty directly)
 $availableConsumables = Consumable::where('qty', '>', 0)
        ->orderBy('mat_description')
        ->get()
        ->map(function ($consumable) {
            return (object)[
                'id' => $consumable->id,
                'itemcode' => $consumable->Itemcode,
                'mat_description' => $consumable->mat_description,
                'Long_description' => $consumable->Long_description,
                'bin_location' => $consumable->Bin_location,
                'supplier' => $consumable->supplier,
                'category' => $consumable->category,
                'qty' => $consumable->qty,
                'uom' => $consumable->uom,
                'minimum' => $consumable->minimum,
                'maximum' => $consumable->maximum,
                'is_consumable' => true, // Add flag to identify consumable
            ];
        })
        ->values();
        
    // Fetch all available supplies with ALL their details
    $availableSupplies = Supplies::with(['details' => function($query) {
            $query->where('qty', '>', 0);
        }])
        ->whereHas('details', function($query) {
            $query->where('qty', '>', 0);
        })
        ->get()
        ->flatMap(function ($supply) {
            return $supply->details->where('qty', '>', 0)->map(function ($detail) use ($supply) {
                return (object)[
                    'id' => $supply->id,
                    'detail_id' => $detail->id,
                    'itemcode' => $detail->itemcode ?? $supply->itemcode,
                    'material_description' => $supply->material_description,
                    'detailed_description' => $detail->detailed_description,
                    'bin_location' => $detail->bin_location,
                    'supplier' => $detail->supplier ?? 'N/A',
                    'category' => $supply->category ?? 'N/A',
                    'qty' => $detail->qty,
                    'uom' => $detail->uom,
                    'minimum' => $detail->minimum,
                    'maximum' => $detail->maximum,
                    'price' => $detail->price,
                    'is_supply' => true, // Add flag to identify supply
                    'is_detail' => true, // Add flag to identify detail
                ];
            });
        })
        ->filter()
        ->values();

    return Inertia::render('MaterialIssuance', [
        'consumableData' => $consumableData,
        'suppliesData' => $suppliesData,
        'availableConsumables' => $availableConsumables,
        'availableSupplies' => $availableSupplies,
    ]);
}

    public function updateStatus(Request $request)
    {
        $request->validate([
            'mrs_no' => 'required|string',
            'type' => 'required|in:consumable,supplies',
            'issued_by' => 'required|string'
        ]);

        $mrsNo = $request->mrs_no;
        $type = $request->type;
        $issuedBy = $request->issued_by;

        try {
            if ($type === 'consumable') {
                ConsumableCart::where('mrs_no', $mrsNo)
                    ->where('mrs_status', 0) // Only update if status is Pending
                    ->update([
                        'mrs_status' => 1,      // Update to Preparing
                        'issued_by' => $issuedBy // Update issued_by field
                    ]);
            } else {
                SuppliesCart::where('mrs_no', $mrsNo)
                    ->where('mrs_status', 0) // Only update if status is Pending
                    ->update([
                        'mrs_status' => 1,      // Update to Preparing
                        'issued_by' => $issuedBy // Update issued_by field
                    ]);
            }

            // Reload the page to get fresh data
            return redirect()->back()->with('success', 'Status updated to Preparing');
            
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to update status: ' . $e->getMessage());
        }
    }

public function issueRequest(Request $request)
{
    $request->validate([
        'mrs_no' => 'required|string',
        'type' => 'required|in:consumable,supplies',
        'items' => 'required|array',
        'items.*.id' => 'required|integer',
        'items.*.issued_qty' => 'required|numeric|min:0'
    ]);

    $mrsNo = $request->mrs_no;
    $type = $request->type;
    $items = $request->items;

    try {
        DB::connection('newstore')->beginTransaction();

        foreach ($items as $itemData) {
            $itemId = $itemData['id'];
            $issuedQty = floatval($itemData['issued_qty']);

            if ($type === 'consumable') {
                $cartItem = ConsumableCart::where('ID', $itemId)
                    ->where('mrs_no', $mrsNo)
                    ->where('mrs_status', 1) // Only update if status is Preparing
                    ->first();

                if ($cartItem) {
                    $requestQty = floatval($cartItem->request_qty);
                    
                    // Calculate the difference
                    $difference = $requestQty - $issuedQty;
                    
                    // Save issued quantity
                    $cartItem->Issued_qty = $issuedQty;
                    $cartItem->mrs_status = 2; // Update to For Pick Up
                    $cartItem->save();
                    
                    // If issued quantity is less than requested, return difference to stock
                    if ($difference > 0) {
                        $stockItem = Consumable::where('Itemcode', $cartItem->Itemcode)->first();
                        if ($stockItem) {
                            $stockItem->qty += $difference;
                            $stockItem->save();
                            
                            \Log::info("Returned {$difference} to consumable stock for item {$cartItem->Itemcode}. Issued: {$issuedQty}, Requested: {$requestQty}");
                        }
                    }
                }
            } else {
                $cartItem = SuppliesCart::where('ID', $itemId)
                    ->where('mrs_no', $mrsNo)
                    ->where('mrs_status', 1) // Only update if status is Preparing
                    ->first();

                if ($cartItem) {
                    $requestQty = floatval($cartItem->request_qty);
                    
                    // Calculate the difference
                    $difference = $requestQty - $issuedQty;
                    
                    // Save issued quantity
                    $cartItem->Issued_qty = $issuedQty;
                    $cartItem->mrs_status = 2; // Update to For Pick Up
                    $cartItem->save();
                    
                    // If issued quantity is less than requested, return difference to stock (supplies detail)
                    if ($difference > 0) {
                        $stockItem = Supplies::where('itemcode', $cartItem->Itemcode)->first();
                        if ($stockItem) {
                            $stockDetail = $stockItem->details()->first();
                            if ($stockDetail) {
                                $stockDetail->qty += $difference;
                                $stockDetail->save();
                                
                                \Log::info("Returned {$difference} to supplies detail stock for item {$cartItem->Itemcode}. Issued: {$issuedQty}, Requested: {$requestQty}");
                            }
                        }
                    }
                }
            }
        }

        DB::connection('newstore')->commit();

        return redirect()->back()->with('success', 'Items issued successfully and moved to For Pick Up');
        
    } catch (\Exception $e) {
        DB::connection('newstore')->rollBack();
        return redirect()->back()->with('error', 'Failed to issue items: ' . $e->getMessage());
    }
}
public function replaceItem(Request $request)
{
    $request->validate([
        'cart_item_id' => 'required|integer',
        'replacement_item_id' => 'required|integer',
        'type' => 'required|in:consumable,supplies',
        'mrs_no' => 'required|string',
        'is_supply_detail' => 'nullable|boolean' // Add optional flag
    ]);

    $cartItemId = $request->cart_item_id;
    $replacementItemId = $request->replacement_item_id;
    $type = $request->type;
    $mrsNo = $request->mrs_no;
    $isSupplyDetail = $request->is_supply_detail ?? false;

    try {
        DB::connection('newstore')->beginTransaction();

        if ($type === 'consumable') {
            // Get the cart item
            $cartItem = ConsumableCart::where('ID', $cartItemId)
                ->where('mrs_no', $mrsNo)
                ->first();

            if (!$cartItem) {
                throw new \Exception('Cart item not found');
            }

            // Get the replacement item from Consumable table
            $replacementItem = Consumable::find($replacementItemId);

            if (!$replacementItem) {
                throw new \Exception('Replacement consumable not found');
            }

            // Use Issued_qty if it exists, otherwise use request_qty
            $quantityToReplace = $cartItem->Issued_qty > 0 ? floatval($cartItem->Issued_qty) : floatval($cartItem->request_qty);
            
            // Check if replacement item has sufficient quantity
            if ($replacementItem->qty < $quantityToReplace) {
                throw new \Exception('Insufficient quantity for replacement item');
            }

            // Return the original item quantity back to stock
            $originalItem = Consumable::where('Itemcode', $cartItem->Itemcode)->first();
            if ($originalItem) {
                $originalItem->qty += $quantityToReplace;
                $originalItem->save();
            }

            // Deduct from replacement item
            $replacementItem->qty -= $quantityToReplace;
            $replacementItem->save();

            // Update the cart item with replacement item details
            $cartItem->Itemcode = $replacementItem->Itemcode;
            $cartItem->mat_description = $replacementItem->mat_description;
            $cartItem->Long_description = $replacementItem->Long_description;
            $cartItem->Bin_location = $replacementItem->Bin_location;
            $cartItem->supplier = $replacementItem->supplier;
            $cartItem->category = $replacementItem->category;
            $cartItem->qty = $replacementItem->qty + $quantityToReplace;
            $cartItem->uom = $replacementItem->uom;
            
            // If replacing with different quantity, update request_qty
            if ($cartItem->Issued_qty > 0 && $cartItem->Issued_qty != $cartItem->request_qty) {
                $cartItem->request_qty = $cartItem->Issued_qty;
            }
            
            $cartItem->save();

        } else {
            // Get the cart item
            $cartItem = SuppliesCart::where('ID', $cartItemId)
                ->where('mrs_no', $mrsNo)
                ->first();

            if (!$cartItem) {
                throw new \Exception('Cart item not found');
            }

            if ($isSupplyDetail) {
                // Handle supply detail replacement
                $replacementDetail = SuppliesDetails::find($replacementItemId);
                
                if (!$replacementDetail) {
                    throw new \Exception('Replacement supply detail not found');
                }

                $replacementSupply = Supplies::find($replacementDetail->supply_id);
                
                if (!$replacementSupply) {
                    throw new \Exception('Replacement supply not found');
                }

                // Use Issued_qty if it exists, otherwise use request_qty
                $quantityToReplace = $cartItem->Issued_qty > 0 ? floatval($cartItem->Issued_qty) : floatval($cartItem->request_qty);
                
                // Check if replacement detail has sufficient quantity
                if ($replacementDetail->qty < $quantityToReplace) {
                    throw new \Exception('Insufficient quantity for replacement item');
                }

                // Return the original item quantity back to stock
                $originalSupply = Supplies::where('itemcode', $cartItem->Itemcode)->first();
                if ($originalSupply) {
                    $originalDetail = $originalSupply->details()->first();
                    if ($originalDetail) {
                        $originalDetail->qty += $quantityToReplace;
                        $originalDetail->save();
                    }
                }

                // Deduct from replacement detail
                $replacementDetail->qty -= $quantityToReplace;
                $replacementDetail->save();

                // Update the cart item with replacement item details
                $cartItem->Itemcode = $replacementDetail->itemcode ?? $replacementSupply->itemcode;
                $cartItem->mat_description = $replacementSupply->material_description;
                $cartItem->detailed_description = $replacementDetail->detailed_description;
                $cartItem->Bin_location = $replacementDetail->bin_location;
                $cartItem->qty = $replacementDetail->qty;
                $cartItem->uom = $replacementDetail->uom;
                $cartItem->price = $replacementDetail->price;
                
                // If replacing with different quantity, update request_qty
                if ($cartItem->Issued_qty > 0 && $cartItem->Issued_qty != $cartItem->request_qty) {
                    $cartItem->request_qty = $cartItem->Issued_qty;
                }
                
                $cartItem->save();
            } else {
                // Handle old way (supply without detail) - keep for backward compatibility
                $replacementSupply = Supplies::find($replacementItemId);
                
                if (!$replacementSupply) {
                    throw new \Exception('Replacement supply not found');
                }

                $replacementDetail = $replacementSupply->details()->first();
                
                if (!$replacementDetail) {
                    throw new \Exception('Replacement supply has no available stock');
                }

                // Use Issued_qty if it exists, otherwise use request_qty
                $quantityToReplace = $cartItem->Issued_qty > 0 ? floatval($cartItem->Issued_qty) : floatval($cartItem->request_qty);
                
                // Check if replacement detail has sufficient quantity
                if ($replacementDetail->qty < $quantityToReplace) {
                    throw new \Exception('Insufficient quantity for replacement item');
                }

                // Return the original item quantity back to stock
                $originalSupply = Supplies::where('itemcode', $cartItem->Itemcode)->first();
                if ($originalSupply) {
                    $originalDetail = $originalSupply->details()->first();
                    if ($originalDetail) {
                        $originalDetail->qty += $quantityToReplace;
                        $originalDetail->save();
                    }
                }

                // Deduct from replacement detail
                $replacementDetail->qty -= $quantityToReplace;
                $replacementDetail->save();

                // Update the cart item with replacement item details
                $cartItem->Itemcode = $replacementSupply->itemcode;
                $cartItem->mat_description = $replacementSupply->material_description;
                $cartItem->detailed_description = $replacementDetail->detailed_description;
                $cartItem->Bin_location = $replacementDetail->bin_location;
                $cartItem->qty = $replacementDetail->qty;
                $cartItem->uom = $replacementDetail->uom;
                $cartItem->price = $replacementDetail->price;
                
                // If replacing with different quantity, update request_qty
                if ($cartItem->Issued_qty > 0 && $cartItem->Issued_qty != $cartItem->request_qty) {
                    $cartItem->request_qty = $cartItem->Issued_qty;
                }
                
                $cartItem->save();
            }
        }

        DB::connection('newstore')->commit();

        return redirect()->back()->with('success', 'Item replaced successfully');
        
    } catch (\Exception $e) {
        DB::connection('newstore')->rollBack();
        return redirect()->back()->with('error', 'Failed to replace item: ' . $e->getMessage());
    }
}

public function pickedUp(Request $request)
{
    $request->validate([
        'mrs_no' => 'required|string',
        'type' => 'required|in:consumable,supplies'
    ]);

    $mrsNo = $request->mrs_no;
    $type = $request->type;

    try {
        DB::connection('newstore')->beginTransaction();

        if ($type === 'consumable') {
            ConsumableCart::where('mrs_no', $mrsNo)
                ->where('mrs_status', 2) // Only update if status is For Pick Up
                ->update([
                    'mrs_status' => 3  // Update to Served
                ]);
        } else {
            SuppliesCart::where('mrs_no', $mrsNo)
                ->where('mrs_status', 2) // Only update if status is For Pick Up
                ->update([
                    'mrs_status' => 3  // Update to Served
                ]);
        }

        DB::connection('newstore')->commit();

        return redirect()->back()->with('success', 'Items marked as Picked Up and moved to Served');
        
    } catch (\Exception $e) {
        DB::connection('newstore')->rollBack();
        return redirect()->back()->with('error', 'Failed to update status: ' . $e->getMessage());
    }
}

public function returnItem(Request $request)
{
    $request->validate([
        'cart_item_id' => 'required|integer',
        'type' => 'required|in:consumable,supplies',
        'mrs_no' => 'required|string'
    ]);

    $cartItemId = $request->cart_item_id;
    $type = $request->type;
    $mrsNo = $request->mrs_no;

    try {
        DB::connection('newstore')->beginTransaction();

        if ($type === 'consumable') {
            $cartItem = ConsumableCart::where('ID', $cartItemId)
                ->where('mrs_no', $mrsNo)
                ->where('mrs_status', 3) // Only update if status is Served
                ->first();

            if (!$cartItem) {
                throw new \Exception('Cart item not found or not in Served status');
            }

            // Return the Issued_qty back to stock qty field
            $stockItem = Consumable::where('Itemcode', $cartItem->Itemcode)->first();
            if ($stockItem) {
                $stockItem->qty += floatval($cartItem->Issued_qty);
                $stockItem->save();
            }

            // Update cart item status to Return Item
            $cartItem->mrs_status = 4;
            $cartItem->save();

} else {
    $cartItem = SuppliesCart::where('ID', $cartItemId)
        ->where('mrs_no', $mrsNo)
        ->where('mrs_status', 3)
        ->first();

    if (!$cartItem) {
        throw new \Exception('Cart item not found or not in Served status');
    }

    // Return the Issued_qty back to stock detail
    $stockItem = Supplies::where('itemcode', $cartItem->Itemcode)->first();
    if ($stockItem) {
        $stockDetail = $stockItem->details()->first();
        if ($stockDetail) {
            $stockDetail->qty += floatval($cartItem->Issued_qty);
            $stockDetail->save();
        }
    }

    // Update cart item status to Return Item
    $cartItem->mrs_status = 4;
    $cartItem->save();
}

        DB::connection('newstore')->commit();

        return redirect()->back()->with('success', 'Item marked for return successfully and quantity added back to stock');
        
    } catch (\Exception $e) {
        DB::connection('newstore')->rollBack();
        return redirect()->back()->with('error', 'Failed to mark item for return: ' . $e->getMessage());
    }
}

public function bulkReturnItems(Request $request)
{
    $request->validate([
        'cart_item_ids' => 'required|array',
        'cart_item_ids.*' => 'required|integer',
        'type' => 'required|in:consumable,supplies',
        'mrs_no' => 'required|string'
    ]);

    $cartItemIds = $request->cart_item_ids;
    $type = $request->type;
    $mrsNo = $request->mrs_no;

    try {
        DB::connection('newstore')->beginTransaction();

        if ($type === 'consumable') {
            $cartItems = ConsumableCart::where('mrs_no', $mrsNo)
                ->whereIn('ID', $cartItemIds)
                ->where('mrs_status', 3) // Only update if status is Served
                ->get();

            if ($cartItems->isEmpty()) {
                throw new \Exception('No valid cart items found or not in Served status');
            }

            foreach ($cartItems as $cartItem) {
                // Return the Issued_qty back to stock qty field
                $stockItem = Consumable::where('Itemcode', $cartItem->Itemcode)->first();
                if ($stockItem) {
                    $stockItem->qty += floatval($cartItem->Issued_qty);
                    $stockItem->save();
                }

                // Update cart item status to Return Item
                $cartItem->mrs_status = 4;
                $cartItem->save();
            }

} else {
    $cartItems = SuppliesCart::where('mrs_no', $mrsNo)
        ->whereIn('ID', $cartItemIds)
        ->where('mrs_status', 3) // Only update if status is Served
        ->get();

    if ($cartItems->isEmpty()) {
        throw new \Exception('No valid cart items found or not in Served status');
    }

    foreach ($cartItems as $cartItem) {
        // Return the Issued_qty back to stock detail (not the Supplies model directly)
        $stockItem = Supplies::where('itemcode', $cartItem->Itemcode)->first();
        if ($stockItem) {
            $stockDetail = $stockItem->details()->first(); // Get the first detail
            if ($stockDetail) {
                $stockDetail->qty += floatval($cartItem->Issued_qty);
                $stockDetail->save();
            }
        }

        // Update cart item status to Return Item
        $cartItem->mrs_status = 4;
        $cartItem->save();
    }
}

        DB::connection('newstore')->commit();

        return redirect()->back()->with('success', 'Items marked for return successfully and quantities added back to stock');
        
    } catch (\Exception $e) {
        DB::connection('newstore')->rollBack();
        return redirect()->back()->with('error', 'Failed to mark items for return: ' . $e->getMessage());
    }
}

}