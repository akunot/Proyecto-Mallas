<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateWithToken
{
    public function handle(Request $request, Closure $next): Response
        {
            \Log::info('=== AUTH TOKEN MIDDLEWARE ===');
            \Log::info('Session ID: ' . session()->getId());
            \Log::info('auth web check: ' . (auth('web')->check() ? 'true' : 'false'));
            \Log::info('Session started: ' . (session()->isStarted() ? 'true' : 'false'));
            \Log::info('All session data: ' . json_encode(session()->all()));
            
            if (!auth('web')->check()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            return $next($request);
        }
}