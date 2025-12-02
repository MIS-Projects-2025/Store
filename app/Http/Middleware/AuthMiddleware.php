<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        // Priority: query key → cookie → session token -> for deferent Server not 2.221
        //$token = $request->query('key') ?? session('emp_data.token');

        // Priority: query key → cookie → session token
        $token = $request->query('key') ?? $_COOKIE['sso_token'] ?? null;

        // Redirect if no token provided
        if (!$token) {
            $redirectUrl = urlencode($request->fullUrl());
            return redirect("http://192.168.2.221/authify/public/login?redirect={$redirectUrl}");
        }

        // Always fetch the user from DB
        $currentUser = DB::connection('authify')
            ->table('authify.authify_sessions')
            ->where('token', $token)
            ->first();

        if (!$currentUser) {
            // Invalid token: clear session and cookie
            session()->forget('emp_data');
            setcookie('sso_token', '', time() - 3600, '/');

            $redirectUrl = urlencode($request->fullUrl());
            return redirect("http://192.168.2.221/authify/public/login?redirect={$redirectUrl}");
        }

        // Always reset the session for the current user
        session()->forget('emp_data');
        session([
            'emp_data' => [
                'token' => $currentUser->token,
                'emp_id' => $currentUser->emp_id,
                'emp_name' => $currentUser->emp_name,
                'emp_position' => $currentUser->emp_position ?? null,
                'emp_firstname' => $currentUser->emp_firstname,
                'emp_jobtitle' => $currentUser->emp_jobtitle,
                'emp_dept' => $currentUser->emp_dept,
                'emp_prodline' => $currentUser->emp_prodline ?? null,
                'emp_station' => $currentUser->emp_station ?? null,
                'generated_at' => $currentUser->generated_at,
            ]
        ]);

        return $next($request);
    }
}
