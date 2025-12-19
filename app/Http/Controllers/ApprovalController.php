<?php

namespace App\Http\Controllers;

use App\Models\ConsumableCart;
use App\Models\SuppliesCart;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ApprovalController extends Controller
{
    public function index(Request $request)
    {
        // Get unique supplies requests grouped by MRS number - ONLY PENDING
        $suppliesData = SuppliesCart::select('mrs_no', 'order_date', 'emp_name', 'approver_status')
            ->where(function($query) {
                $query->where('approver_status', 'pending')
                      ->orWhereNull('approver_status')
                      ->orWhere('approver_status', '');
            })
            ->distinct()
            ->orderBy('order_date', 'desc')
            ->get()
            ->unique('mrs_no')  
            ->map(function ($item) {
                return [
                    'date_order' => $item->order_date->format('Y-m-d'),
                    'mrs_no' => $item->mrs_no,
                    'requestor' => $item->emp_name,
                    'status' => $this->formatStatus($item->approver_status),
                ];
            })
            ->values();

        // Get unique consumable/spare parts requests grouped by MRS number - ONLY PENDING
        $sparePartsData = ConsumableCart::select('mrs_no', 'order_date', 'emp_name', 'approver_status')
            ->where(function($query) {
                $query->where('approver_status', 'pending')
                      ->orWhereNull('approver_status')
                      ->orWhere('approver_status', '');
            })
            ->distinct()
            ->orderBy('order_date', 'desc')
            ->get()
            ->unique('mrs_no')
            ->map(function ($item) {
                return [
                    'date_order' => $item->order_date->format('Y-m-d'),
                    'mrs_no' => $item->mrs_no,
                    'requestor' => $item->emp_name,
                    'status' => $this->formatStatus($item->approver_status),
                ];
            })
            ->values();

        return Inertia::render('Approval', [
            'suppliesData' => $suppliesData,
            'sparePartsData' => $sparePartsData,
        ]);
    }

    public function getRequestDetails(Request $request)
    {
        $mrsNo = $request->query('mrs_no');
        $type = $request->query('type');

        if (!$mrsNo || !$type) {
            return back()->withErrors(['error' => 'Missing required parameters']);
        }

        // Determine which model to use based on type - ONLY PENDING ITEMS
        if ($type === 'supplies') {
            $items = SuppliesCart::where('mrs_no', $mrsNo)
                ->where(function($query) {
                    $query->where('approver_status', 'pending')
                          ->orWhereNull('approver_status')
                          ->orWhere('approver_status', '');
                })
                ->get();
            $header = SuppliesCart::where('mrs_no', $mrsNo)->first();
        } else if ($type === 'spareParts') {
            $items = ConsumableCart::where('mrs_no', $mrsNo)
                ->where(function($query) {
                    $query->where('approver_status', 'pending')
                          ->orWhereNull('approver_status')
                          ->orWhere('approver_status', '');
                })
                ->get();
            $header = ConsumableCart::where('mrs_no', $mrsNo)->first();
        } else {
            return back()->withErrors(['error' => 'Invalid type']);
        }

        if (!$header) {
            return back()->withErrors(['error' => 'Request not found']);
        }

        // Format the response
        $modalData = [
            'type' => $type,
            'header' => [
                'date_order' => $header->order_date->format('Y-m-d'),
                'mrs_no' => $header->mrs_no,
                'requestor' => $header->emp_name,
                'status' => $this->formatStatus($header->approver_status),
            ],
            'items' => $items->map(function ($item) use ($type) {
                $data = [
                    'id' => $item->id,
                    'itemCode' => $item->itemCode,
                    'material_description' => $item->material_description,
                    'detailed_description' => $item->detailed_description,
                    'quantity' => $item->quantity,
                    'uom' => $item->uom,
                ];

                // Handle different column names between tables
                if ($type === 'supplies') {
                    $data['request_qty'] = $item->request_qty;
                } else {
                    $data['request_qty'] = $item->request_quantity;
                }

                return $data;
            })
        ];

        return Inertia::render('Approval', [
            'modalData' => $modalData,
            'suppliesData' => $request->session()->get('suppliesData', []),
            'sparePartsData' => $request->session()->get('sparePartsData', []),
        ]);
    }

    public function approveItems(Request $request)
    {
        $request->validate([
            'item_ids' => 'required|array',
            'item_ids.*' => 'required|integer',
            'mrs_no' => 'required|string',
            'type' => 'required|string|in:supplies,spareParts'
        ]);

        try {
            DB::beginTransaction();

            $itemIds = $request->item_ids;
            $type = $request->type;

            if ($type === 'supplies') {
                SuppliesCart::whereIn('id', $itemIds)
                    ->update(['approver_status' => 'approved']);
            } else {
                ConsumableCart::whereIn('id', $itemIds)
                    ->update(['approver_status' => 'approved']);
            }

            DB::commit();

            return redirect()->route('approval')
                ->with('success', 'Items approved successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error approving items: ' . $e->getMessage());
            
            return back()->withErrors([
                'message' => 'Failed to approve items: ' . $e->getMessage()
            ]);
        }
    }

    public function rejectItems(Request $request)
    {
        $request->validate([
            'item_ids' => 'required|array',
            'item_ids.*' => 'required|integer',
            'mrs_no' => 'required|string',
            'type' => 'required|string|in:supplies,spareParts',
            'reason' => 'required|string'
        ]);

        try {
            DB::beginTransaction();

            $itemIds = $request->item_ids;
            $type = $request->type;

            if ($type === 'supplies') {
                SuppliesCart::whereIn('id', $itemIds)
                    ->update([
                        'approver_status' => 'rejected',
                        // If you have a rejection_reason column, uncomment this:
                        // 'rejection_reason' => $request->reason
                    ]);
            } else {
                ConsumableCart::whereIn('id', $itemIds)
                    ->update([
                        'approver_status' => 'rejected',
                        // If you have a rejection_reason column, uncomment this:
                        // 'rejection_reason' => $request->reason
                    ]);
            }

            DB::commit();

            return redirect()->route('approval')
                ->with('success', 'Items rejected successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error rejecting items: ' . $e->getMessage());
            
            return back()->withErrors([
                'message' => 'Failed to reject items: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Format the status from database to display format
     */
    private function formatStatus($status)
    {
        if (empty($status)) {
            return 'Pending';
        }

        // Normalize the status
        $status = strtolower(trim($status));

        // Map common status values
        $statusMap = [
            'approved' => 'Approved',
            'pending' => 'Pending',
            'rejected' => 'Rejected',
            'deny' => 'Rejected',
            'denied' => 'Rejected',
        ];

        return $statusMap[$status] ?? ucfirst($status);
    }
}