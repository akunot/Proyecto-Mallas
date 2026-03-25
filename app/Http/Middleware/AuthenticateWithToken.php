<?php

namespace App\Http\Middleware;

use App\Models\Usuario;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateWithToken
{
    /**
     * Handle an incoming request.
     * Verifica el token de Sanctum desde el header Authorization: Bearer {token}
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Token no proporcionado.'], 401);
            }
            return redirect('/login');
        }

        // Buscar el token en la base de datos
        $accessToken = PersonalAccessToken::findToken($token);

        if (!$accessToken) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Token inválido.'], 401);
            }
            return redirect('/login');
        }

        // Obtener el usuario associado al token
        $user = $accessToken->tokenable;

        if (!$user || !($user instanceof Usuario)) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Usuario no encontrado.'], 401);
            }
            return redirect('/login');
        }

        // Establecer el usuario en la request
        auth()->setUser($user);

        return $next($request);
    }
}