<?php

namespace App\Http\Controllers\Api;

use App\Models\Facultad;
use App\Models\Programa;
use App\Services\LogActividadService;
use App\Services\ProgramaImagenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProgramaController extends CatalogoController
{
    protected string $routeName = 'programa';

    public function __construct()
    {
        $this->model = new Programa;
        $this->fillable = [
            'Codigo_Facultad',
            'Codigo_Programa',
            'Nombre_Programa',
            'Titulo_Otorgado',
            'Nivel_Formacion',
            'Creditos_Totales',
            'Duracion_Semestres',
            'Codigo_SNIES',
            'Url_Programa',
            'Campus_Programa',
            'Conmutador',
            'Extension',
            'Correo',
            'Area_Curricular',
            'Esta_Activo',
        ];
    }

    protected function getActiveField(string $model): ?string
    {
        return 'Esta_Activo';
    }

    protected function getRelatedData(): array
    {
        return [
            'facultades' => Facultad::select('Codigo_Facultad', 'Nombre_Facultad')->get()->toArray(),
        ];
    }

    public function electivas(int $id): JsonResponse
    {
        $programa = Programa::findOrFail($id);
        $electivas = $programa->electivas()
            ->select('asignaturas.ID_Asignatura', 'Codigo_Asignatura', 'Nombre_Asignatura', 'Creditos_Asignatura')
            ->with(['requisitos.asignaturaRequerida'])
            ->orderBy('Nombre_Asignatura')
            ->paginate(200);

        return response()->json([
            'data' => $electivas->items(),
            'meta' => [
                'total' => $electivas->total(),
                'current_page' => $electivas->currentPage(),
                'last_page' => $electivas->lastPage(),
            ],
        ]);
    }

    /**
     * Cargar/reemplazar la imagen de un programa (multipart/form-data).
     * La autorización reutiliza el esquema existente: middleware de sesión web
     * o auth.token en API (mismo esquema que el resto de catálogos).
     */
    public function storeImagen(Request $request, int $id)
    {
        $programa = Programa::findOrFail($id);

        $request->validate([
            'imagen' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png',
                'max:'.ProgramaImagenService::TAMANO_MAX_KB,
                'dimensions:min_width='.ProgramaImagenService::ANCHO_MIN.',min_height='.ProgramaImagenService::ALTO_MIN.',max_width='.ProgramaImagenService::ANCHO_MAX.',max_height='.ProgramaImagenService::ALTO_MAX,
            ],
        ], [
            'imagen.required' => 'Debes seleccionar una imagen.',
            'imagen.file' => 'El archivo enviado no es válido.',
            'imagen.image' => 'El archivo debe ser una imagen válida.',
            'imagen.mimes' => 'Solo se permiten imágenes JPG o PNG.',
            'imagen.max' => 'La imagen no debe superar los 4 MB.',
            'imagen.dimensions' => 'La imagen debe medir entre 200x200 y 4000x4000 píxeles.',
        ]);

        $ruta = app(ProgramaImagenService::class)->guardar($programa, $request->file('imagen'));
        $programa->refresh();
        Cache::increment('programa:version');

        $this->registrarLog('UPDATE', $programa, ['campo' => 'Ruta_Imagen', 'archivo' => $ruta]);

        if ($request->expectsJson()) {
            return response()->json([
                'data' => [
                    'Ruta_Imagen' => $programa->Ruta_Imagen,
                    'Url_Imagen' => $programa->Url_Imagen,
                ],
                'message' => 'Imagen del programa actualizada exitosamente.',
            ]);
        }

        // Para Inertia/web: redirige a la página previa; el formulario refresca
        // el programa y muestra la nueva imagen.
        return redirect()->back()->with('success', 'Imagen del programa actualizada exitosamente.');
    }

    /**
     * Eliminar la imagen de un programa.
     */
    public function destroyImagen(Request $request, int $id)
    {
        $programa = Programa::findOrFail($id);

        app(ProgramaImagenService::class)->eliminar($programa);
        Cache::increment('programa:version');

        $this->registrarLog('DELETE', $programa, ['campo' => 'Ruta_Imagen']);

        if ($request->expectsJson()) {
            return response()->json([
                'data' => [
                    'Ruta_Imagen' => null,
                    'Url_Imagen' => null,
                ],
                'message' => 'Imagen del programa eliminada exitosamente.',
            ]);
        }

        return redirect()->back()->with('success', 'Imagen del programa eliminada exitosamente.');
    }

    private function registrarLog(string $accion, Programa $programa, array $detalle): void
    {
        if (auth()->check()) {
            LogActividadService::registrar(
                auth()->user(),
                $accion,
                'programa',
                $programa->getKey(),
                $detalle
            );
        }
    }
}
