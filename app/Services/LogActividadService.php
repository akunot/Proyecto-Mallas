<?php

namespace App\Services;

use App\Models\LogActividad;
use App\Models\Usuario;
use Illuminate\Http\Request;

class LogActividadService
{
    /**
     * Registra una actividad en el log de auditoría.
     */
    public static function registrar(
        Usuario|int $usuario,
        string $accion,
        string $entidad,
        int $entidadId,
        array $detalle = []
    ): LogActividad {
        $userId = $usuario instanceof Usuario ? $usuario->ID_Usuario : $usuario;
        
        // Obtener IP y User-Agent si estamos en contexto HTTP
        $ip = null;
        $userAgent = null;
        
        if (app()->runningInConsole()) {
            // Si se ejecuta desde consola (jobs), usar valores por defecto
            $ip = '127.0.0.1';
            $userAgent = 'CLI';
        } else {
            $request = request();
            if ($request) {
                $ip = $request->ip();
                $userAgent = $request->userAgent();
            }
        }

        return LogActividad::create([
            'ID_Usuario' => $userId,
            'Accion_Log' => $accion,
            'Entidad_Log' => $entidad,
            'Entidad_ID_Log' => $entidadId,
            'Detalle_Log' => array_merge($detalle, [
                'ip' => $ip,
                'user_agent' => $userAgent,
            ]),
            'IP_Origen_Log' => $ip,
        ]);
    }
}