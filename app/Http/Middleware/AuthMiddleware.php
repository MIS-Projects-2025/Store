<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;



class AuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->query('key') ?? session('emp_data.token');

        // 1️⃣ Redirect if no token
        if (!$token) {
            $redirectUrl = urlencode($request->fullUrl());
            return redirect("http://192.168.2.221/authify/public/login?redirect={$redirectUrl}");
        }

        // 2️⃣ Fetch user if no session or new key is passed
        if (!session()->has('emp_data') || $request->query('key')) {
            $currentUser = DB::connection('authify')->table('authify.authify_sessions')
                ->where('token', $token)
                ->first();

            if (!$currentUser) {
                $redirectUrl = urlencode($request->fullUrl());
                return redirect("http://192.168.2.221/authify/public/login?redirect={$redirectUrl}");
            }

          
            // 3️⃣ Set session
            session(['emp_data' => [
                'token' => $currentUser->token,
                'emp_id' => $currentUser->emp_id,
                'emp_name' => $currentUser->emp_name,
                'emp_position' => $currentUser->emp_position,
                'emp_firstname' => $currentUser->emp_firstname,
                'emp_jobtitle' => $currentUser->emp_jobtitle,
                'emp_dept' => $currentUser->emp_dept,
                'emp_prodline' => $currentUser->emp_prodline,
                'emp_station' => $currentUser->emp_station,
                'generated_at' => $currentUser->generated_at,
                'emp_system_role' => $systemRole ?? 'N/A',
            ]]);

         
        }

        return $next($request);
    }
}
