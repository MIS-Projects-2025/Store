<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExportSelectedController extends Controller
{
    // Single shared key for all users
    private string $key = 'consigned_export_selected_items';

    public function index()
    {
        $record = DB::table('settings')
            ->where('key', $this->key)
            ->first();

        $items = $record ? json_decode($record->value, true) : [];

        return response()->json(['items' => $items]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'items'   => 'present|array',
            'items.*' => 'string',
        ]);

        DB::table('settings')->updateOrInsert(
            ['key' => $this->key],
            [
                'value'      => json_encode($request->items),
                'updated_at' => now(),
                'updated_by' => auth()->id(),
            ]
        );

        return response()->json(['success' => true]);
    }
}