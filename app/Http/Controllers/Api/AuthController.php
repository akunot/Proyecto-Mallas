<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpCodeMail;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Paso 1: Solicitar OTP
     * Recibe el correo, verifica que exista y envía el código de 6 dígitos.
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $usuario = Usuario::where('Email_Usuario', $request->email)
            ->where('Activo_Usuario', 1)
            ->first();

        if (!$usuario) {
            return response()->json([
                'message' => 'Usuario no encontrado o inactivo.',
                'errors' => ['email' => ['El correo electrónico no está registrado o el usuario está inactivo.']]
            ], 422);
        }

        // Generar código OTP de 6 dígitos
        $otpCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Guardar código hasheado con bcrypt (cost factor 12 definido en .env)
        $usuario->update([
            'Otp_Code' => Hash::make($otpCode),
            'Otp_Expires_At' => now()->addMinutes(10),
        ]);

        // Siempre mostrar el código en desarrollo para pruebas
        if (app()->environment('local')) {
            \Log::info('Código OTP (desarrollo): ' . $otpCode);
            
            return response()->json([
                'message' => 'Código OTP enviado exitosamente (modo desarrollo).',
                'debug' => [
                    'code' => $otpCode,
                    'email' => $usuario->Email_Usuario,
                    'expires_at' => $usuario->Otp_Expires_At,
                ]
            ]);
        }

        // En producción, enviar correo con el código
        try {
            Mail::to($usuario->Email_Usuario)->send(new OtpCodeMail($otpCode, $usuario->Nombre_Usuario));
        } catch (\Exception $e) {
            \Log::error('Error enviando correo OTP: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Error al enviar el código OTP.',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'message' => 'Código OTP enviado exitosamente.',
            'data' => [
                'email' => $usuario->Email_Usuario,
                'expires_at' => $usuario->Otp_Expires_At,
            ]
        ]);
    }

    /**
     * Paso 2: Verificar OTP
     * Valida el código y genera el token de Sanctum.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|digits:6',
        ]);

        $usuario = Usuario::where('Email_Usuario', $request->email)
            ->where('Activo_Usuario', 1)
            ->first();

        if (!$usuario) {
            return response()->json([
                'message' => 'Usuario no encontrado o inactivo.',
                'errors' => ['email' => ['El correo electrónico no está registrado o el usuario está inactivo.']]
            ], 422);
        }

        // Verificar si hay código OTP activo
        if (!$usuario->Otp_Code || !$usuario->Otp_Expires_At) {
            return response()->json([
                'message' => 'No hay código OTP activo. Solicite uno nuevo.',
                'errors' => ['code' => ['Debe solicitar un código OTP primero.']]
            ], 422);
        }

        // Verificar si expiró
        if (now()->greaterThan($usuario->Otp_Expires_At)) {
            // Invalidar código expirado
            $usuario->update([
                'Otp_Code' => null,
                'Otp_Expires_At' => null,
            ]);
            
            return response()->json([
                'message' => 'El código OTP ha expirado. Solicite uno nuevo.',
                'errors' => ['code' => ['El código ha expirado. Por favor, solicite un nuevo código.']]
            ], 422);
        }

        // Verificar código
        if (!Hash::check($request->code, $usuario->Otp_Code)) {
            return response()->json([
                'message' => 'Código OTP inválido.',
                'errors' => ['code' => ['El código proporcionado no es válido.']]
            ], 422);
        }

        // Código válido: invalidar código OTP
        $usuario->update([
            'Otp_Code' => null,
            'Otp_Expires_At' => null,
        ]);

        // Hacer login para establecer sesión de cookie (para auth middleware)
        auth()->login($usuario);

        // Crear respuesta JSON
        $response = response()->json([
            'message' => 'Autenticación exitosa.',
            'data' => [
                'user' => [
                    'id' => $usuario->ID_Usuario,
                    'nombre' => $usuario->Nombre_Usuario,
                    'email' => $usuario->Email_Usuario,
                ]
            ]
        ]);

        return $response;
    }

    /**
     * Cerrar sesión
     * Invalida la sesión del usuario.
     */
    public function logout(Request $request): JsonResponse
    {
        // Cerrar sesión y invalidar tokens de sesión
        auth()->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Sesión cerrada exitosamente.',
            'data' => null
        ]);
    }

    /**
     * Obtener datos del usuario autenticado
     */
    public function me(Request $request): JsonResponse
    {
        $usuario = $request->user();

        return response()->json([
            'message' => 'Datos del usuario.',
            'data' => [
                'id' => $usuario->ID_Usuario,
                'nombre' => $usuario->Nombre_Usuario,
                'email' => $usuario->Email_Usuario,
                'activo' => $usuario->Activo_Usuario,
                'creado_en' => $usuario->Creacion_Usuario,
            ]
        ]);
    }
}
