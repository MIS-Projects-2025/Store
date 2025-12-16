<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class OrderMaterialController extends Controller
{
    public function index(Request $request)
    {
        // Get emp_data from session
        $emp_data = session('emp_data');
        
        return Inertia::render('OrderMaterial', [
            'emp_data' => $emp_data
        ]);
    }
}