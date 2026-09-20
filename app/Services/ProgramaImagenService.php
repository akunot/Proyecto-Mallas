<?php

namespace App\Services;

use App\Models\Programa;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Gestión de la imagen/logo asociada a un programa académico.
 *
 * - Los archivos se almacenan en el disco "public" (storage/app/public/programas).
 *   En producción (Docker) ese directorio se persiste con el volumen
 *   storage_data y se publica mediante el symlink /storage creado por
 *   docker-entrypoint.sh, por lo que sobrevive a la recreación de contenedores.
 * - En la base de datos únicamente se guarda la ruta relativa (Ruta_Imagen).
 * - El contenido se valida por MIME real (finfo) y por decodificación con GD,
 *   y se RE-CODIFICA: el archivo final es una imagen limpia, sin metadatos ni
 *   payloads adjuntos (un ejecutable disfrazado nunca sobrevive a este paso).
 * - Solo se aceptan JPEG y PNG: SVG queda excluido por ser vectorial con
 *   riesgo de XSS y WebP no cuenta con soporte GD garantizado en la imagen
 *   Docker.
 */
class ProgramaImagenService
{
    public const DISCO = 'public';

    public const DIRECTORIO = 'programas';

    public const TAMANO_MAX_KB = 4096;

    public const ANCHO_MIN = 200;

    public const ALTO_MIN = 200;

    public const ANCHO_MAX = 4000;

    public const ALTO_MAX = 4000;

    /** MIME reales aceptados (verificados por finfo, no por extensión) => extensión normalizada del archivo final. */
    private const MIMES_PERMITIDOS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
    ];

    /**
     * Guarda (o reemplaza) la imagen del programa y devuelve la ruta relativa.
     */
    public function guardar(Programa $programa, UploadedFile $archivo): string
    {
        $rutaTemporal = $archivo->getRealPath();
        $mime = '';
        $bytes = false;
        $dimensiones = false;

        if ($rutaTemporal !== false) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = (string) ($finfo->file($rutaTemporal) ?: '');
            $bytes = file_get_contents($rutaTemporal);
            $dimensiones = @getimagesize($rutaTemporal);
        }

        $imagen = $bytes !== false ? @imagecreatefromstring($bytes) : false;

        if ($rutaTemporal === false || ! isset(self::MIMES_PERMITIDOS[$mime]) || $imagen === false || $dimensiones === false) {
            throw ValidationException::withMessages([
                'imagen' => 'El archivo no es una imagen JPG o PNG válida.',
            ]);
        }

        [$ancho, $alto] = $dimensiones;

        if ($ancho < self::ANCHO_MIN || $alto < self::ALTO_MIN || $ancho > self::ANCHO_MAX || $alto > self::ALTO_MAX) {
            imagedestroy($imagen);

            throw ValidationException::withMessages([
                'imagen' => sprintf(
                    'La imagen debe medir entre %dx%d y %dx%d píxeles.',
                    self::ANCHO_MIN,
                    self::ALTO_MIN,
                    self::ANCHO_MAX,
                    self::ALTO_MAX
                ),
            ]);
        }

        $extension = self::MIMES_PERMITIDOS[$mime];

        // Captura en buffer: imagepng()/imagejpeg() con $file = null escriben
        // directamente al búfer de salida y devuelven true (no el contenido).
        // Sin ob_start() el binario se filtraba a la respuesta HTTP y la base
        // de datos/almacenamiento recibía el booleano como "1" (1 byte).
        ob_start();

        if ($extension === 'png') {
            imagealphablending($imagen, false);
            imagesavealpha($imagen, true);
            $procesado = imagepng($imagen, null, 6);
        } else {
            $procesado = imagejpeg($imagen, null, 85);
        }

        $contenido = (string) ob_get_clean();

        imagedestroy($imagen);

        if ($procesado === false || $contenido === '') {
            throw ValidationException::withMessages([
                'imagen' => 'No fue posible procesar la imagen. Intenta con otro archivo.',
            ]);
        }

        // Nombre de archivo seguro: slug del nombre del programa + sufijo
        // aleatorio. Nunca se usa el nombre original entregado por el usuario.
        $base = Str::limit(Str::slug((string) $programa->Nombre_Programa, '-') ?: 'programa', 60, '');
        $ruta = self::DIRECTORIO.'/'.$base.'-'.Str::lower(Str::random(8)).'.'.$extension;

        Storage::disk(self::DISCO)->put($ruta, $contenido);

        // Reemplazo seguro: elimina el archivo anterior SOLO si fue gestionado
        // por este servicio (nunca toca assets legacy ni de otros módulos).
        $this->eliminarArchivoGestionado($programa->Ruta_Imagen);

        $programa->update(['Ruta_Imagen' => $ruta]);

        return $ruta;
    }

    /**
     * Elimina la imagen del programa y limpia el campo en la base de datos.
     */
    public function eliminar(Programa $programa): bool
    {
        $eliminado = $this->eliminarArchivoGestionado($programa->Ruta_Imagen);
        $programa->update(['Ruta_Imagen' => null]);

        return $eliminado;
    }

    private function eliminarArchivoGestionado(?string $ruta): bool
    {
        if (! $ruta || ! Str::startsWith($ruta, self::DIRECTORIO.'/') || str_contains($ruta, '..')) {
            return false;
        }

        $disco = Storage::disk(self::DISCO);

        if (! $disco->exists($ruta)) {
            return false;
        }

        return $disco->delete($ruta);
    }
}
