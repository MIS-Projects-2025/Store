<?php
//dont work!
namespace App\Http\Middleware;

use App\Services\UserRoleService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $cookieName = env('SSO_COOKIE_NAME', 'sso_token');
           
        $tokenFromQuery   = $request->query('key');
        $tokenFromCookie  = $request->cookie($cookieName);
        $tokenFromSession = session('emp_data.token');

        $token = $tokenFromQuery ?? $tokenFromCookie ?? $tokenFromSession;

        Log::info('AuthMiddleware token check', [
            'query'   => $tokenFromQuery,
            'cookie'  => $tokenFromCookie,
            'session' => $tokenFromSession,
            'used'    => $token,
        ]);

        // 2️⃣ No token at all → redirect
        if (!$token) {
            return $this->redirectToLogin($request);
        }

        // 3️⃣ Session already exists AND token matches → verify DB then trust it
        if (session()->has('emp_data') && session('emp_data.token') === $token) {
            $cookie = cookie('sso_token', $token, 60 * 24 * 7, '/', null, false, true);

            // Remove ?key from URL if present (only once)
            if ($tokenFromQuery) {
                $url = $request->url();
                $query = $request->query();
                unset($query['key']);
                if (!empty($query)) {
                    $url .= '?' . http_build_query($query);
                }
                return redirect($url)->withCookie($cookie);
            }

            return $next($request)->withCookie($cookie);
        }

        // 4️⃣ ONLY HERE we hit the DB (session missing or token mismatch)
        $currentUser = DB::connection('authify')
            ->table('authify_sessions')
            ->where('token', $token)
            ->first();

        if (!$currentUser) {
            session()->forget('emp_data');
            // Clear this system's own cookie only
            $expiredCookie = cookie()->forget($cookieName);
            return $this->redirectToLogin($request)->withCookie($expiredCookie);
        }

        $canAccess = $currentUser->emp_position >= 2
            || stripos($currentUser->emp_dept, 'Facilities') === true
            || $currentUser->emp_jobtitle === 'Store User'       // ✅
            || $currentUser->emp_jobtitle === 'Consigned User';  // ✅

        if (!$canAccess) {
            session()->forget('emp_data');
            session()->flush();
            $redirectUrl = urlencode(route('dashboard'));
            $authifyUrl  = "http://192.168.2.221:8200/logout?token={$token}&redirect={$redirectUrl}";
            return Inertia::render('Unauthorized', [
                'logoutUrl' => $authifyUrl,
                'message'   => 'Access Restricted: You do not have permission to access the JORF.',
            ])->toResponse($request)->setStatusCode(403);
        }

        $systemRoles = [];
        $userId      = $currentUser->emp_id;
        $department  = $currentUser->emp_dept ?? '';
        $jobTitle    = $currentUser->emp_jobtitle ?? '';

        if ($department === 'Facilities' && stripos($jobTitle, 'Facility Engineer') === 0) {
            $systemRoles[] = 'Facilities_Coordinator';
        } elseif (stripos($department, 'Facilities') !== false) {
            $systemRoles[] = 'Facilities';
        }

        // 5️⃣ Set session once
        session()->put('emp_data', [
            'token'         => $currentUser->token,
            'emp_id'        => $currentUser->emp_id,
            'emp_name'      => $currentUser->emp_name,
            'emp_firstname' => $currentUser->emp_firstname,
            'emp_jobtitle'  => $currentUser->emp_jobtitle,
            'emp_dept'      => $currentUser->emp_dept,
            'emp_prodline'  => $currentUser->emp_prodline,
            'emp_station'   => $currentUser->emp_station,
            'emp_position'  => $currentUser->emp_position,
            'generated_at'  => $currentUser->generated_at,
            'system_roles'  => $systemRoles,
        ]);

        session()->save();

        // 6️⃣ Set this system's own cookie
        $cookie = cookie($cookieName, $currentUser->token, 60 * 24 * 7);

        // 7️⃣ Remove ?key from URL after successful login
        if ($tokenFromQuery) {
            return redirect($request->url())->withCookie($cookie);
        }

        return $next($request)->withCookie($cookie);
    }

    private function redirectToLogin(Request $request)
    {
        $redirectUrl = urlencode($request->fullUrl());
        return redirect("http://192.168.2.221:8200/login?redirect={$redirectUrl}");
    }
}


// namespace App\Http\Middleware;

// use Closure;
// use Illuminate\Http\Request;
// use Illuminate\Support\Facades\DB;
// use Illuminate\Support\Facades\Log;

// class AuthMiddleware
// {
//     public function handle(Request $request, Closure $next)
//     {
//         // 🔹 Get token from query, session, or cookie
//         $tokenFromQuery   = $request->query('key');
//         $tokenFromSession = session('emp_data.token');
//         $tokenFromCookie  = $request->cookie('sso_token');
//         $token = $tokenFromQuery ?? $tokenFromSession ?? $tokenFromCookie;

//         Log::info('AuthMiddleware token check', [
//             'query'   => $tokenFromQuery,
//             'cookie'  => $tokenFromCookie,
//             'session' => $tokenFromSession,
//             'used'    => $token,
//         ]);

//         // 🔹 No token → redirect to login
//         if (!$token) {
//             return $this->redirectToLogin($request);
//         }

//         // 🔹 Session exists & token matches → continue
//         if (session()->has('emp_data') && session('emp_data.token') === $token) {
//             // Remove ?key if present
//             if ($tokenFromQuery) {
//                 $url = $request->url();
//                 return redirect($url)->withCookie(cookie('sso_token', $token, 60 * 24 * 7));
//             }
//             return $next($request);
//         }

//         // 🔹 Fetch user from authify if session missing or token mismatch
//         $currentUser = DB::connection('authify')
//             ->table('authify_sessions')
//             ->where('token', $token)
//             ->first();

//         if (!$currentUser) {
//             session()->forget('emp_data');
//             setcookie('sso_token', '', time() - 3600, '/');
//             return $this->redirectToLogin($request);
//         }

//         // 🔹 Set session
//         session(['emp_data' => [
//             'token'         => $currentUser->token,
//             'emp_id'        => $currentUser->emp_id,
//             'emp_name'      => $currentUser->emp_name,
//             'emp_firstname' => $currentUser->emp_firstname,
//             'emp_jobtitle'  => $currentUser->emp_jobtitle,
//             'emp_dept'      => $currentUser->emp_dept,
//             'emp_prodline'  => $currentUser->emp_prodline,
//             'emp_station'   => $currentUser->emp_station,
//             'emp_position'  => $currentUser->emp_position,
//             'generated_at'  => $currentUser->generated_at,
//         ]]);

//         session()->save();

//         // 🔹 Set cookie for 7 days
//         $cookie = cookie('sso_token', $currentUser->token, 60 * 24 * 7, '/', null, false, true);

//         // 🔹 Set user resolver
//         $request->setUserResolver(fn() => (object) session('emp_data'));

//         // 🔹 Redirect once if token came from query
//         if ($tokenFromQuery) {
//             $url   = $request->url();
//             $query = $request->query();
//             unset($query['key']);
//             if (!empty($query)) {
//                 $url .= '?' . http_build_query($query);
//             }
//             return redirect($url)->withCookie($cookie);
//         }

//         // 🔹 Continue request with cookie
//         return $next($request)->withCookie($cookie);
//     }

//     private function redirectToLogin(Request $request)
//     {
//         $loginUrl    = "http://192.168.2.221:8200/login";
//         $redirectUrl = urlencode($request->fullUrl());

//         // ── Inertia XHR partial reload ────────────────────────────────────────
//         // Inertia cannot follow an external redirect from an XHR request — it
//         // breaks and shows a 404 on the current URL instead.
//         //
//         // Returning a 409 with the X-Inertia-Location header tells Inertia to
//         // do a full window.location redirect itself, which CAN follow the
//         // external SSO login URL correctly.
//         if ($request->header('X-Inertia')) {
//             return response('', 409)
//                 ->header('X-Inertia-Location', "{$loginUrl}?redirect={$redirectUrl}");
//         }

//         // ── Normal browser request ────────────────────────────────────────────
//         return redirect("{$loginUrl}?redirect={$redirectUrl}");
//     }
// }