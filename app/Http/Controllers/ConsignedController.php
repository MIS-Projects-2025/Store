<?php

namespace App\Http\Controllers;

use App\Models\Consigned;
use App\Models\ConsignedDetail;
use App\Models\ConsignedHistory;
use App\Models\ConsignedDetailHistory;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class ConsignedController extends Controller
{
    /**
     * Log history for Consigned (main record)
     */
    private function logConsignedHistory($consignedId, $consignedNo, $commonality, $action, $oldValues = null, $newValues = null, $changes = null)
    {
        try {
            $userName = session('emp_data.emp_name', 'Unknown User');
            $userId = session('emp_data.id', null);
            
            ConsignedHistory::create([
                'consigned_id' => $consignedId,
                'consigned_no' => $consignedNo,
                'commonality' => $commonality,
                'action' => $action,
                'user_id' => $userId,
                'user_name' => $userName,
                'changes' => $changes,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'created_at' => now(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to log consigned history', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Log history for ConsignedDetail
     */
    private function logConsignedDetailHistory($detailId, $consignedNo, $commonality, $itemCode, $matDescription, $action, $oldValues = null, $newValues = null, $changes = null)
    {
        try {
            $userName = session('emp_data.emp_name', 'Unknown User');
            $userId = session('emp_data.id', null);
            
            ConsignedDetailHistory::create([
                'consigned_detail_id' => $detailId,
                'consigned_no' => $consignedNo,
                'commonality' => $commonality,
                'item_code' => $itemCode,
                'mat_description' => $matDescription,
                'action' => $action,
                'user_id' => $userId,
                'user_name' => $userName,
                'changes' => $changes,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'created_at' => now(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to log consigned detail history', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * NEW: Auto-select next item when current selection qty is 0
     */
    private function autoSelectNextItem($consignedId, $commonality)
    {
        try {
            // Get all details for this commonality with qty > 0
            $availableDetails = ConsignedDetail::on('newstore')
                ->where('commonality', $commonality)
                ->where('qty', '>', 0)
                ->get();

            if ($availableDetails->isEmpty()) {
                \Log::info('No available items with qty > 0', ['commonality' => $commonality]);
                return null;
            }

            // Separate items with and without expiration
            $withExpiration = $availableDetails->filter(function($detail) {
                return !empty($detail->expiration);
            });

            $withoutExpiration = $availableDetails->filter(function($detail) {
                return empty($detail->expiration);
            });

            $selectedDetail = null;

            // Priority 1: Items with expiration dates (select nearest to expire)
            if ($withExpiration->isNotEmpty()) {
                $selectedDetail = $withExpiration->sortBy(function($detail) {
                    return Carbon::parse($detail->expiration);
                })->first();
            }
            // Priority 2: Items without expiration (select lowest qty)
            elseif ($withoutExpiration->isNotEmpty()) {
                $selectedDetail = $withoutExpiration->sortBy('qty')->first();
            }

            if ($selectedDetail) {
                // Update the consigned record with new selection
                $consigned = Consigned::on('newstore')->find($consignedId);
                
                $oldItemCode = $consigned->selected_itemcode;
                $oldSupplier = $consigned->selected_supplier;
                
                $consigned->update([
                    'selected_itemcode' => $selectedDetail->item_code,
                    'selected_supplier' => $selectedDetail->supplier,
                ]);

                // Log the auto-selection
                $this->logConsignedHistory(
                    $consignedId,
                    $consigned->consigned_no,
                    $commonality,
                    'selection_updated',
                    [
                        'selected_itemcode' => $oldItemCode,
                        'selected_supplier' => $oldSupplier,
                        'reason' => 'Auto-selected due to zero quantity'
                    ],
                    [
                        'selected_itemcode' => $selectedDetail->item_code,
                        'selected_supplier' => $selectedDetail->supplier,
                        'reason' => 'Auto-selected due to zero quantity'
                    ],
                    [
                        'selected_itemcode' => [
                            'old' => $oldItemCode,
                            'new' => $selectedDetail->item_code
                        ],
                        'selected_supplier' => [
                            'old' => $oldSupplier,
                            'new' => $selectedDetail->supplier
                        ]
                    ]
                );

                \Log::info('Auto-selected new item', [
                    'commonality' => $commonality,
                    'new_item_code' => $selectedDetail->item_code,
                    'new_supplier' => $selectedDetail->supplier,
                    'selection_reason' => $withExpiration->isNotEmpty() ? 'nearest_expiration' : 'lowest_qty'
                ]);

                return $selectedDetail;
            }

            return null;

        } catch (\Exception $e) {
            \Log::error('Failed to auto-select next item', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    public function index()
    {
        // Get grouped consigned data with details
        $consignedData = Consigned::with('details')
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('commonality')
            ->map(function ($group) {
                $firstItem = $group->first();
                
                // Get all details for this commonality
                $details = ConsignedDetail::where('commonality', $firstItem->commonality)
                    ->get();

                // Group by item_code + supplier + mat_description, then select nearest expiration
                $uniqueCombinations = [];

                foreach ($details as $detail) {
                    $key = $detail->item_code . '|' . $detail->supplier . '|' . $detail->mat_description;
                    
                    if (!isset($uniqueCombinations[$key])) {
                        $uniqueCombinations[$key] = $detail;
                    } else {
                        // Compare expiration dates and keep the one with nearest expiration
                        $existing = $uniqueCombinations[$key];
                        
                        // Parse expiration dates (handle null)
                        $existingExp = $existing->expiration ? Carbon::parse($existing->expiration) : null;
                        $newExp = $detail->expiration ? Carbon::parse($detail->expiration) : null;
                        
                        // Logic: Select the nearest future expiration date
                        if ($newExp === null && $existingExp !== null) {
                            continue; // Keep existing (has date)
                        } elseif ($newExp !== null && $existingExp === null) {
                            $uniqueCombinations[$key] = $detail; // Use new
                        } elseif ($newExp !== null && $existingExp !== null) {
                            // Both have dates - select nearest to today (prefer future dates)
                            $existingIsFuture = $existingExp->isFuture();
                            $newIsFuture = $newExp->isFuture();
                            
                            if ($existingIsFuture && !$newIsFuture) {
                                continue; // Keep existing (future preferred)
                            } elseif (!$existingIsFuture && $newIsFuture) {
                                $uniqueCombinations[$key] = $detail; // Use new
                            } elseif ($existingIsFuture && $newIsFuture) {
                                // Both future - choose nearest (soonest)
                                if ($newExp->lt($existingExp)) {
                                    $uniqueCombinations[$key] = $detail;
                                }
                            } else {
                                // Both past - choose most recent (latest past date)
                                if ($newExp->gt($existingExp)) {
                                    $uniqueCombinations[$key] = $detail;
                                }
                            }
                        }
                    }
                }

                // Create a structured array of unique combinations
                $combinations = array_map(function($detail) {
                    return [
                        'id' => $detail->id,
                        'item_code' => $detail->item_code,
                        'supplier' => $detail->supplier,
                        'mat_description' => $detail->mat_description,
                        'expiration' => $detail->expiration ? Carbon::parse($detail->expiration)->format('Y-m-d') : null,
                        'uom' => $detail->uom,
                        'qty' => $detail->qty,
                        'qty_per_box' => $detail->qty_per_box,
                        'minimum' => $detail->minimum,
                        'maximum' => $detail->maximum,
                        'price' => $detail->price,
                        'bin_location' => $detail->bin_location,
                    ];
                }, array_values($uniqueCombinations));
                
                // Get current selection
                $selectedItemCode = $firstItem->selected_itemcode;
                $selectedSupplier = $firstItem->selected_supplier;
                
                // ✅ NEW: Check if selected item has qty = 0, auto-select next item
                if ($selectedItemCode && $selectedSupplier) {
                    $selectedDetail = ConsignedDetail::on('newstore')
                        ->where('commonality', $firstItem->commonality)
                        ->where('item_code', $selectedItemCode)
                        ->where('supplier', $selectedSupplier)
                        ->where('qty', '>', 0)
                        ->first();
                    
                    // If selected item has 0 qty, auto-select next available item
                    if ($selectedDetail && $selectedDetail->qty <= 0) {
                        $newSelection = $this->autoSelectNextItem($firstItem->id, $firstItem->commonality);
                        
                        if ($newSelection) {
                            $selectedItemCode = $newSelection->item_code;
                            $selectedSupplier = $newSelection->supplier;
                        }
                    }
                }
                
                // Auto-select first combination if no selection exists
                if (empty($selectedItemCode) && empty($selectedSupplier) && count($combinations) > 0) {
                    $selectedItemCode = $combinations[0]['item_code'];
                    $selectedSupplier = $combinations[0]['supplier'];
                    
                    // Update database with auto-selected values
                    $firstItem->update([
                        'selected_itemcode' => $selectedItemCode,
                        'selected_supplier' => $selectedSupplier,
                    ]);
                }
                
                // Check if commonality is same as any mat_description in details
                $isDescriptionUsedAsCommonality = $details->contains(function($detail) use ($firstItem) {
                    return $detail->mat_description === $firstItem->commonality;
                });
                
                return [
                    'id' => $firstItem->id,
                    'commonality' => $isDescriptionUsedAsCommonality ? '' : $firstItem->commonality,
                    'category' => $firstItem->category,
                    'selected_itemcode' => $selectedItemCode,
                    'selected_supplier' => $selectedSupplier,
                    'combinations' => $combinations,
                    'has_multiple' => count($combinations) > 1,
                    'created_at' => $firstItem->created_at,
                    'actual_commonality' => $firstItem->commonality,
                ];
            })
            ->values();

        return Inertia::render('Consigned', [
            'consignedItems' => $consignedData,
            'empStation' => session('emp_data.emp_station', 1), // ← ADD THIS
        ]);
    }

    public function store(Request $request)
    {
        \Log::info('Consigned store request', $request->all());

        $validated = $request->validate([
            'commonality' => 'nullable|string|max:255',
            'category' => 'required|string|max:255',
            'item_code' => 'required|string|max:255',
            'mat_description' => 'required|string|max:255',
            'supplier' => 'required|string|max:255',
            'expiration' => 'nullable|date',
            'uom' => 'nullable|string|max:255',
            'qty' => 'nullable|integer',
            'qty_per_box' => 'nullable|integer',
            'minimum' => 'nullable|integer',
            'maximum' => 'nullable|integer',
            'price' => 'nullable|numeric',
            'bin_location' => 'nullable|string|max:255',
        ]);

        try {
            DB::connection('newstore')->beginTransaction();

            // Apply fallback: if commonality is empty, use mat_description
            $commonality = !empty($validated['commonality']) 
                ? $validated['commonality'] 
                : $validated['mat_description'];

            \Log::info('Commonality value', [
                'original' => $validated['commonality'] ?? null,
                'final' => $commonality,
                'used_fallback' => empty($validated['commonality'])
            ]);

            // Check if a Consigned record with the same commonality and category exists
            $existingConsigned = Consigned::on('newstore')
                ->where('commonality', $commonality)
                ->where('category', $validated['category'])
                ->first();

            if ($existingConsigned) {
                // Use existing consigned_no
                $consignedNo = $existingConsigned->consigned_no;
                $consignedId = $existingConsigned->id;
                \Log::info('Using existing consigned record', ['consigned_no' => $consignedNo]);
            } else {
                // Generate new consigned_no
                $lastConsigned = Consigned::on('newstore')->orderBy('id', 'desc')->first();
                $consignedNo = 'CON-' . str_pad(($lastConsigned ? $lastConsigned->id + 1 : 1), 6, '0', STR_PAD_LEFT);

                // Create new consigned header
                $consigned = Consigned::create([
                    'consigned_no' => $consignedNo,
                    'commonality' => $commonality,
                    'category' => $validated['category'],
                    'selected_itemcode' => null,
                    'selected_supplier' => null,
                ]);

                $consignedId = $consigned->id;

                // Log history for new consigned record
                $this->logConsignedHistory(
                    $consignedId,
                    $consignedNo,
                    $commonality,
                    'created',
                    null,
                    [
                        'commonality' => $commonality,
                        'category' => $validated['category'],
                    ]
                );

                \Log::info('New consigned created', ['id' => $consigned->id]);
            }

            // Check if this exact combination exists (including expiration date)
            $existingDetail = ConsignedDetail::on('newstore')
                ->where('commonality', $commonality)
                ->where('item_code', $validated['item_code'])
                ->where('supplier', $validated['supplier'])
                ->where('mat_description', $validated['mat_description'])
                ->where(function($query) use ($validated) {
                    // Both null
                    if (empty($validated['expiration'])) {
                        $query->whereNull('expiration');
                    } else {
                        // Same expiration date
                        $query->where('expiration', $validated['expiration']);
                    }
                })
                ->first();

            if ($existingDetail) {
                DB::connection('newstore')->rollBack();
                return back()->withErrors([
                    'error' => 'This item code, supplier, description, and expiration date combination already exists. Please use a different expiration date or modify the existing record.'
                ]);
            }

            // Create consigned detail with the resolved commonality
            $detail = ConsignedDetail::create([
                'consigned_no' => $consignedNo,
                'commonality' => $commonality,
                'item_code' => $validated['item_code'],
                'mat_description' => $validated['mat_description'],
                'supplier' => $validated['supplier'],
                'expiration' => $validated['expiration'],
                'uom' => $validated['uom'],
                'qty' => $validated['qty'],
                'qty_per_box' => $validated['qty_per_box'],
                'minimum' => $validated['minimum'],
                'maximum' => $validated['maximum'],
                'price' => $validated['price'],
                'bin_location' => $validated['bin_location'],
            ]);

            // Log history for new detail
            $this->logConsignedDetailHistory(
                $detail->id,
                $consignedNo,
                $commonality,
                $validated['item_code'],
                $validated['mat_description'],
                'created',
                null,
                array_merge($validated, ['commonality' => $commonality])
            );

            \Log::info('ConsignedDetail created', ['id' => $detail->id]);

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Item added successfully!');

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            
            \Log::error('Failed to create consigned', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to add item: ' . $e->getMessage()]);
        }
    }

    /**
     * Delete a consigned detail
     */
    public function deleteDetail($id)
    {
        try {
            DB::connection('newstore')->beginTransaction();

            $detail = ConsignedDetail::on('newstore')->findOrFail($id);
            
            // Store old values before deletion
            $oldValues = [
                'item_code' => $detail->item_code,
                'mat_description' => $detail->mat_description,
                'supplier' => $detail->supplier,
                'expiration' => $detail->expiration,
                'uom' => $detail->uom,
                'qty' => $detail->qty,
                'qty_per_box' => $detail->qty_per_box,
                'minimum' => $detail->minimum,
                'maximum' => $detail->maximum,
                'price' => $detail->price,
                'bin_location' => $detail->bin_location,
            ];

            // Log history before deletion
            $this->logConsignedDetailHistory(
                $detail->id,
                $detail->consigned_no,
                $detail->commonality,
                $detail->item_code,
                $detail->mat_description,
                'deleted',
                $oldValues,
                null
            );

            $detail->delete();

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Item deleted successfully!');

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            
            \Log::error('Failed to delete consigned detail', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to delete item: ' . $e->getMessage()]);
        }
    }

    /**
     * Update a consigned detail
     */
    public function updateDetail(Request $request, $id)
    {
        $validated = $request->validate([
            'item_code' => 'required|string|max:255',
            'mat_description' => 'required|string|max:255',
            'supplier' => 'required|string|max:255',
            'expiration' => 'nullable|date',
            'uom' => 'nullable|string|max:255',
            'qty' => 'nullable|integer',
            'qty_per_box' => 'nullable|integer',
            'minimum' => 'nullable|integer',
            'maximum' => 'nullable|integer',
            'price' => 'nullable|numeric',
            'bin_location' => 'nullable|string|max:255',
        ]);

        try {
            DB::connection('newstore')->beginTransaction();

            $detail = ConsignedDetail::on('newstore')->findOrFail($id);
            
            // Store old values
            $oldValues = [
                'item_code' => $detail->item_code,
                'mat_description' => $detail->mat_description,
                'supplier' => $detail->supplier,
                'expiration' => $detail->expiration,
                'uom' => $detail->uom,
                'qty' => $detail->qty,
                'qty_per_box' => $detail->qty_per_box,
                'minimum' => $detail->minimum,
                'maximum' => $detail->maximum,
                'price' => $detail->price,
                'bin_location' => $detail->bin_location,
            ];

            // Detect changes
            $changes = [];
            foreach ($validated as $key => $value) {
                if ($detail->$key != $value) {
                    $changes[$key] = [
                        'old' => $detail->$key,
                        'new' => $value
                    ];
                }
            }

            $detail->update($validated);

            // Log history only if there are changes
            if (!empty($changes)) {
                $this->logConsignedDetailHistory(
                    $detail->id,
                    $detail->consigned_no,
                    $detail->commonality,
                    $detail->item_code,
                    $detail->mat_description,
                    'updated',
                    $oldValues,
                    $validated,
                    $changes
                );
            }

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Item updated successfully!');

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            
            \Log::error('Failed to update consigned detail', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to update item: ' . $e->getMessage()]);
        }
    }
    
    /**
     * Update quantities for multiple consigned details
     */
    public function updateQuantities(Request $request)
    {
        $validated = $request->validate([
            'updates' => 'required|array',
            'updates.*.id' => 'required|integer',
            'updates.*.quantity_to_add' => 'required|integer|min:1',
        ]);

        try {
            DB::connection('newstore')->beginTransaction();

            foreach ($validated['updates'] as $update) {
                $detail = ConsignedDetail::on('newstore')->findOrFail($update['id']);
                
                $oldQty = $detail->qty ?? 0;
                $newQuantity = $oldQty + $update['quantity_to_add'];
                
                $detail->update([
                    'qty' => $newQuantity
                ]);

                // Log history for quantity update
                $this->logConsignedDetailHistory(
                    $detail->id,
                    $detail->consigned_no,
                    $detail->commonality,
                    $detail->item_code,
                    $detail->mat_description,
                    'quantity_added',
                    ['qty' => $oldQty],
                    ['qty' => $newQuantity],
                    [
                        'qty' => [
                            'old' => $oldQty,
                            'new' => $newQuantity,
                            'added' => $update['quantity_to_add']
                        ]
                    ]
                );

                \Log::info('Updated quantity', [
                    'id' => $update['id'],
                    'old_qty' => $oldQty,
                    'added' => $update['quantity_to_add'],
                    'new_qty' => $newQuantity
                ]);
            }

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Quantities updated successfully!');

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            
            \Log::error('Failed to update quantities', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to update quantities: ' . $e->getMessage()]);
        }
    }

    /**
     * Update consigned main record (commonality and category)
     */
    public function updateMain(Request $request, $id)
    {
        $validated = $request->validate([
            'commonality' => 'nullable|string|max:255',
            'category' => 'required|string|max:255',
        ]);

        try {
            DB::connection('newstore')->beginTransaction();

            $consigned = Consigned::on('newstore')->findOrFail($id);
            $oldCommonality = $consigned->commonality;
            $oldCategory = $consigned->category;

            // Apply fallback: if new commonality is empty, keep the old one or use a default
            $newCommonality = !empty($validated['commonality']) 
                ? $validated['commonality'] 
                : $oldCommonality;

            // Store old values
            $oldValues = [
                'commonality' => $oldCommonality,
                'category' => $oldCategory,
            ];

            // Detect changes
            $changes = [];
            if ($oldCommonality != $newCommonality) {
                $changes['commonality'] = [
                    'old' => $oldCommonality,
                    'new' => $newCommonality
                ];
            }
            if ($oldCategory != $validated['category']) {
                $changes['category'] = [
                    'old' => $oldCategory,
                    'new' => $validated['category']
                ];
            }

            // Update the consigned record
            $consigned->update([
                'commonality' => $newCommonality,
                'category' => $validated['category'],
            ]);

            // If commonality changed, update all related ConsignedDetail records
            if ($oldCommonality !== $newCommonality) {
                ConsignedDetail::on('newstore')
                    ->where('commonality', $oldCommonality)
                    ->update(['commonality' => $newCommonality]);
                
                \Log::info('Updated commonality in details', [
                    'old' => $oldCommonality,
                    'new' => $newCommonality
                ]);
            }

            // Log history only if there are changes
            if (!empty($changes)) {
                $this->logConsignedHistory(
                    $consigned->id,
                    $consigned->consigned_no,
                    $newCommonality,
                    'updated',
                    $oldValues,
                    ['commonality' => $newCommonality, 'category' => $validated['category']],
                    $changes
                );
            }

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Item updated successfully!');

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            
            \Log::error('Failed to update consigned', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to update item: ' . $e->getMessage()]);
        }
    }

    /**
     * Delete a consigned record and all its related details
     */
    public function deleteMain($id)
    {
        try {
            DB::connection('newstore')->beginTransaction();

            $consigned = Consigned::on('newstore')->findOrFail($id);
            $commonality = $consigned->commonality;

            // Store old values before deletion
            $oldValues = [
                'commonality' => $consigned->commonality,
                'category' => $consigned->category,
                'selected_itemcode' => $consigned->selected_itemcode,
                'selected_supplier' => $consigned->selected_supplier,
            ];

            // Get all related details before deletion
            $relatedDetails = ConsignedDetail::on('newstore')
                ->where('commonality', $commonality)
                ->get();

            // Log history for each detail being deleted
            foreach ($relatedDetails as $detail) {
                $this->logConsignedDetailHistory(
                    $detail->id,
                    $detail->consigned_no,
                    $detail->commonality,
                    $detail->item_code,
                    $detail->mat_description,
                    'deleted_with_main',
                    [
                        'item_code' => $detail->item_code,
                        'mat_description' => $detail->mat_description,
                        'supplier' => $detail->supplier,
                        'qty' => $detail->qty,
                    ],
                    null
                );
            }

            // Delete all related ConsignedDetail records
            ConsignedDetail::on('newstore')
                ->where('commonality', $commonality)
                ->delete();

            \Log::info('Deleted consigned details', ['commonality' => $commonality]);

            // Log history for main record deletion
            $this->logConsignedHistory(
                $consigned->id,
                $consigned->consigned_no,
                $commonality,
                'deleted',
                $oldValues,
                null
            );

            // Delete the main consigned record
            $consigned->delete();

            \Log::info('Deleted consigned record', ['id' => $id]);

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Item and all related details deleted successfully!');

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            
            \Log::error('Failed to delete consigned', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to delete item: ' . $e->getMessage()]);
        }
    }

    /**
     * Update selected item code and supplier for a consigned record
     */
    public function updateSelection(Request $request, $id)
    {
        $validated = $request->validate([
            'selected_itemcode' => 'required|string|max:255',
            'selected_supplier' => 'required|string|max:255',
        ]);

        try {
            DB::connection('newstore')->beginTransaction();

            $consigned = Consigned::on('newstore')->findOrFail($id);
            
            // Store old values
            $oldValues = [
                'selected_itemcode' => $consigned->selected_itemcode,
                'selected_supplier' => $consigned->selected_supplier,
            ];

            // Detect changes
            $changes = [];
            if ($consigned->selected_itemcode != $validated['selected_itemcode']) {
                $changes['selected_itemcode'] = [
                    'old' => $consigned->selected_itemcode,
                    'new' => $validated['selected_itemcode']
                ];
            }
            if ($consigned->selected_supplier != $validated['selected_supplier']) {
                $changes['selected_supplier'] = [
                    'old' => $consigned->selected_supplier,
                    'new' => $validated['selected_supplier']
                ];
            }

            $consigned->update([
                'selected_itemcode' => $validated['selected_itemcode'],
                'selected_supplier' => $validated['selected_supplier'],
            ]);

            // Log history only if there are changes
            if (!empty($changes)) {
                $this->logConsignedHistory(
                    $consigned->id,
                    $consigned->consigned_no,
                    $consigned->commonality,
                    'selection_updated',
                    $oldValues,
                    $validated,
                    $changes
                );
            }

            DB::connection('newstore')->commit();

            return redirect()->back()->with('success', 'Selection updated successfully!');

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            
            \Log::error('Failed to update selection', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to update selection: ' . $e->getMessage()]);
        }
    }

    /**
     * Get category by commonality
     */
    public function getCategoryByCommonality(Request $request)
    {
        $commonality = $request->query('commonality');
        
        if (!$commonality) {
            return response()->json(['category' => null]);
        }

        $consigned = Consigned::on('newstore')
            ->where('commonality', $commonality)
            ->first();

        return response()->json([
            'category' => $consigned ? $consigned->category : null
        ]);
    }

    /**
     * Get consigned (main) history
     */
    public function getConsignedHistory($id)
    {
        try {
            // Get the consigned item
            $consigned = Consigned::on('newstore')->findOrFail($id);
            
            // Get only main record history
            $history = ConsignedHistory::on('newstore')
                ->where('consigned_id', $id)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($history) {
                    return [
                        'id' => $history->id,
                        'type' => 'main',
                        'action' => $history->action,
                        'user_name' => $history->user_name,
                        'changes' => $this->formatHistoryDates($history->changes),
                        'old_values' => $this->formatHistoryDates($history->old_values),
                        'new_values' => $this->formatHistoryDates($history->new_values),
                        'created_at' => $history->created_at->format('Y-m-d H:i:s'),
                    ];
                });

            return response()->json([
                'history' => $history
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to get consigned history', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json(['error' => 'Failed to get history'], 500);
        }
    }

    /**
     * Get consigned detail history
     */
    public function getConsignedDetailHistory($id)
    {
        try {
            // Get the consigned detail
            $detail = ConsignedDetail::on('newstore')->findOrFail($id);
            
            // Get only this detail's history
            $history = ConsignedDetailHistory::on('newstore')
                ->where('consigned_detail_id', $id)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($history) {
                    return [
                        'id' => $history->id,
                        'type' => 'detail',
                        'action' => $history->action,
                        'item_code' => $history->item_code,
                        'mat_description' => $history->mat_description,
                        'user_name' => $history->user_name,
                        'changes' => $this->formatHistoryDates($history->changes),
                        'old_values' => $this->formatHistoryDates($history->old_values),
                        'new_values' => $this->formatHistoryDates($history->new_values),
                        'created_at' => $history->created_at->format('Y-m-d H:i:s'),
                    ];
                });

            return response()->json([
                'history' => $history
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to get consigned detail history', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json(['error' => 'Failed to get history'], 500);
        }
    }

    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:10240',
        ]);

        try {
            $file = $request->file('file');
            
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Remove header row
            $header = array_shift($rows);

            DB::connection('newstore')->beginTransaction();

            $successCount = 0;
            $errorCount = 0;
            $errors = [];

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;

                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                try {
                    // Extract and trim data
                    $commonality = !empty($row[0]) ? trim($row[0]) : null;
                    $category = !empty($row[1]) ? trim($row[1]) : null;
                    $itemCode = !empty($row[2]) ? trim($row[2]) : null;
                    $matDescription = !empty($row[3]) ? trim($row[3]) : null;
                    $supplier = !empty($row[4]) ? trim($row[4]) : null;
                    $expiration = $this->parseExcelDate($row[5]);
                    $uom = !empty($row[6]) ? trim($row[6]) : null;
                    $qty = !empty($row[7]) ? (int)$row[7] : 0;
                    $qtyPerBox = !empty($row[8]) ? (int)$row[8] : null;
                    $minimum = !empty($row[9]) ? (int)$row[9] : null;
                    $maximum = !empty($row[10]) ? (int)$row[10] : null;
                    $price = !empty($row[11]) ? (float)$row[11] : null;
                    $binLocation = !empty($row[12]) ? trim($row[12]) : null;

                    // Validate required fields
                    if (!$category) {
                        $errors[] = "Row {$rowNumber}: Category is required";
                        $errorCount++;
                        continue;
                    }
                    if (!$itemCode) {
                        $errors[] = "Row {$rowNumber}: Item Code is required";
                        $errorCount++;
                        continue;
                    }
                    if (!$matDescription) {
                        $errors[] = "Row {$rowNumber}: Material Description is required";
                        $errorCount++;
                        continue;
                    }
                    if (!$supplier) {
                        $errors[] = "Row {$rowNumber}: Supplier is required";
                        $errorCount++;
                        continue;
                    }

                    // Apply fallback for commonality
                    $finalCommonality = !empty($commonality) ? $commonality : $matDescription;

                    // Check/create Consigned record
                    $existingConsigned = Consigned::on('newstore')
                        ->where('commonality', $finalCommonality)
                        ->where('category', $category)
                        ->first();

                    if ($existingConsigned) {
                        $consignedNo = $existingConsigned->consigned_no;
                        $consignedId = $existingConsigned->id;
                    } else {
                        $lastConsigned = Consigned::on('newstore')->orderBy('id', 'desc')->first();
                        $consignedNo = 'CON-' . str_pad(($lastConsigned ? $lastConsigned->id + 1 : 1), 6, '0', STR_PAD_LEFT);

                        $consigned = Consigned::create([
                            'consigned_no' => $consignedNo,
                            'commonality' => $finalCommonality,
                            'category' => $category,
                            'selected_itemcode' => null,
                            'selected_supplier' => null,
                        ]);

                        $consignedId = $consigned->id;

                        $this->logConsignedHistory(
                            $consignedId,
                            $consignedNo,
                            $finalCommonality,
                            'created',
                            null,
                            [
                                'commonality' => $finalCommonality,
                                'category' => $category,
                            ]
                        );
                    }

                    // Check for duplicate
                    $existingDetail = ConsignedDetail::on('newstore')
                        ->where('commonality', $finalCommonality)
                        ->where('item_code', $itemCode)
                        ->where('supplier', $supplier)
                        ->first();

                    if ($existingDetail) {
                        $errors[] = "Row {$rowNumber}: Item '{$itemCode}' with supplier '{$supplier}' already exists";
                        $errorCount++;
                        continue;
                    }

                    // Create detail record
                    $detail = ConsignedDetail::create([
                        'consigned_no' => $consignedNo,
                        'commonality' => $finalCommonality,
                        'item_code' => $itemCode,
                        'mat_description' => $matDescription,
                        'supplier' => $supplier,
                        'expiration' => $expiration,
                        'uom' => $uom,
                        'qty' => $qty,
                        'qty_per_box' => $qtyPerBox,
                        'minimum' => $minimum,
                        'maximum' => $maximum,
                        'price' => $price,
                        'bin_location' => $binLocation,
                    ]);

                    $this->logConsignedDetailHistory(
                        $detail->id,
                        $consignedNo,
                        $finalCommonality,
                        $itemCode,
                        $matDescription,
                        'created',
                        null,
                        [
                            'item_code' => $itemCode,
                            'mat_description' => $matDescription,
                            'supplier' => $supplier,
                            'qty' => $qty,
                        ]
                    );

                    $successCount++;

                } catch (\Exception $e) {
                    \Log::error("Row {$rowNumber} import error", [
                        'error' => $e->getMessage(),
                        'row' => $row
                    ]);
                    $errors[] = "Row {$rowNumber}: " . $e->getMessage();
                    $errorCount++;
                }
            }

            DB::connection('newstore')->commit();

            $message = "Import completed: {$successCount} items imported";
            if ($errorCount > 0) {
                $message .= ", {$errorCount} failed";
            }

            return back()->with([
                'success' => $message,
                'import_errors' => $errors
            ]);

        } catch (\Exception $e) {
            DB::connection('newstore')->rollBack();
            
            \Log::error('Excel import failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['file' => 'Import failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Enhanced date parsing to handle multiple formats
     */
    private function parseExcelDate($value)
    {
        if (empty($value)) {
            return null;
        }

        // If it's a numeric Excel date
        if (is_numeric($value)) {
            try {
                $date = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value);
                return $date->format('Y-m-d');
            } catch (\Exception $e) {
                \Log::warning('Failed to parse Excel numeric date', ['value' => $value]);
                return null;
            }
        }

        // If it's a string, try multiple formats
        if (is_string($value)) {
            $formats = [
                'Y-m-d',        // 2029-08-15
                'm-d-Y',        // 08-15-2029
                'd-m-Y',        // 15-08-2029
                'm/d/Y',        // 08/15/2029
                'd/m/Y',        // 15/08/2029
                'Y/m/d',        // 2029/08/15
            ];

            foreach ($formats as $format) {
                try {
                    $date = \DateTime::createFromFormat($format, trim($value));
                    if ($date !== false) {
                        return $date->format('Y-m-d');
                    }
                } catch (\Exception $e) {
                    continue;
                }
            }

            // Last resort: try Carbon parse
            try {
                return \Carbon\Carbon::parse($value)->format('Y-m-d');
            } catch (\Exception $e) {
                \Log::warning('Failed to parse date string', ['value' => $value]);
                return null;
            }
        }

        return null;
    }

    private function formatHistoryDates($data)
    {
        if (!$data) return $data;

        if (is_string($data)) {
            $data = json_decode($data, true);
        }

        if (!is_array($data)) return $data;

        $dateKeys = ['expiration', 'created_at', 'updated_at'];

        foreach ($data as $key => &$value) {
            if (is_array($value) && isset($value['old'])) {
                foreach (['old', 'new'] as $side) {
                    if (
                        isset($value[$side]) &&
                        is_string($value[$side]) &&
                        in_array($key, $dateKeys)
                    ) {
                        try {
                            $value[$side] = Carbon::parse($value[$side])->format('Y-m-d');
                        } catch (\Exception $e) {}
                    }
                }
            }

            if (is_string($value) && in_array($key, $dateKeys)) {
                try {
                    $value = Carbon::parse($value)->format('Y-m-d');
                } catch (\Exception $e) {}
            }
        }

        return $data;
    }
    /**
     * Get all details for a consigned item (including all expiration dates)
     */
    public function getAllDetails($id)
    {
        try {
            $consigned = Consigned::on('newstore')->findOrFail($id);
            
            // Get ALL details for this commonality (no deduplication)
            $allDetails = ConsignedDetail::on('newstore')
                ->where('commonality', $consigned->commonality)
                ->orderBy('item_code')
                ->orderBy('supplier')
                ->orderBy('expiration')
                ->get()
                ->map(function($detail) {
                    return [
                        'id' => $detail->id,
                        'item_code' => $detail->item_code,
                        'supplier' => $detail->supplier,
                        'mat_description' => $detail->mat_description,
                        'expiration' => $detail->expiration ? Carbon::parse($detail->expiration)->format('Y-m-d') : null,
                        'uom' => $detail->uom,
                        'qty' => $detail->qty,
                        'qty_per_box' => $detail->qty_per_box,
                        'minimum' => $detail->minimum,
                        'maximum' => $detail->maximum,
                        'price' => $detail->price,
                        'bin_location' => $detail->bin_location,
                    ];
                });

            return response()->json(['allDetails' => $allDetails]);

        } catch (\Exception $e) {
            \Log::error('Failed to get all details', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json(['error' => 'Failed to get details'], 500);
        }
    }
}