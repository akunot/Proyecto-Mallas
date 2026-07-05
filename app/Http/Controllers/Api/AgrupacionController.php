<?php

namespace App\Http\Controllers\Api;

use App\Models\Agrupacion;
use App\Models\Componente;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use App\Services\MallaVisualizerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AgrupacionController extends CatalogoController
{
    protected string $routeName = 'agrupacion';

    protected string $routeBase = 'agrupaciones';

    public function __construct()
    {
        $this->model = new PlantillaAgrupacion;
        $this->fillable = [
            'ID_Programa',
            'ID_Componente',
            'Nombre_Agrupacion',
            'Tipo_Agrupacion',
            'Creditos_Requeridos',
            'Creditos_Maximos',
            'Es_Obligatoria',
        ];
    }

    protected function getActiveField(string $model): ?string
    {
        // Las plantillas de agrupación no tienen campo activo
        return null;
    }

    /**
     * Reglas de validación específicas para agrupaciones
     */
    protected function getValidationRules(string $operation): array
    {
        $required = $operation === 'update' ? 'sometimes' : 'required';

        $rules = [
            'ID_Programa' => "{$required}|exists:programas,ID_Programa",
            'ID_Componente' => "{$required}|exists:componentes,ID_Componente",
            'Nombre_Agrupacion' => "{$required}|string|max:255",
            'Tipo_Agrupacion' => "{$required}|string|max:100",
            'Creditos_Requeridos' => 'nullable|integer|min:0',
            'Creditos_Maximos' => 'nullable|integer|min:0',
            'Es_Obligatoria' => 'sometimes|boolean',
        ];

        // Validación adicional: si es obligatoria, debe tener créditos requeridos
        if ($operation === 'create' || $operation === 'update') {
            $rules['Creditos_Requeridos'] .= '|required_if:Es_Obligatoria,true';
        }

        return $rules;
    }

    /**
     * Mensajes de validación personalizados
     */
    protected function getValidationMessages(): array
    {
        return [
            'ID_Programa.required' => 'El programa es obligatorio.',
            'ID_Programa.exists' => 'El programa seleccionado no existe.',
            'ID_Componente.required' => 'El componente es obligatorio.',
            'ID_Componente.exists' => 'El componente seleccionado no existe.',
            'Nombre_Agrupacion.required' => 'El nombre de la agrupación es obligatorio.',
            'Nombre_Agrupacion.max' => 'El nombre de la agrupación no puede exceder 255 caracteres.',
            'Tipo_Agrupacion.required' => 'El tipo de agrupación es obligatorio.',
            'Tipo_Agrupacion.max' => 'El tipo de agrupación no puede exceder 100 caracteres.',
            'Creditos_Requeridos.integer' => 'Los créditos requeridos deben ser un número entero.',
            'Creditos_Requeridos.min' => 'Los créditos requeridos deben ser mayores o iguales a 0.',
            'Creditos_Requeridos.required_if' => 'Los créditos requeridos son obligatorios cuando la agrupación es obligatoria.',
            'Creditos_Maximos.integer' => 'Los créditos máximos deben ser un número entero.',
            'Creditos_Maximos.min' => 'Los créditos máximos deben ser mayores o iguales a 0.',
            'Es_Obligatoria.boolean' => 'El campo Es_Obligatoria debe ser verdadero o falso.',
        ];
    }

    /**
     * Obtener datos relacionados para el formulario
     */
    protected function getRelatedData(): array
    {
        return [
            'programas' => Programa::select('ID_Programa', 'Nombre_Programa')->get(),
            'componentes' => Componente::select('ID_Componente', 'Nombre_Componente')->get(),
        ];
    }

    /**
     * Obtener nombre del componente de Inertia
     */
    protected function getInertiaComponent(): string
    {
        return 'Catalogos/AgrupacionesForm';
    }

    public function update(Request $request, int $id)
    {
        $plantilla = PlantillaAgrupacion::findOrFail($id);
        $oldName = $plantilla->Nombre_Agrupacion;
        $oldComponente = $plantilla->ID_Componente;
        $oldPrograma = $plantilla->ID_Programa;

        $result = parent::update($request, $id);

        // Si cambió el nombre, sincronizar en todas las agrupaciones existentes
        $plantilla->refresh();
        if ($plantilla->Nombre_Agrupacion !== $oldName) {
            DB::table('agrupaciones')
                ->where('ID_Programa', $oldPrograma)
                ->where('ID_Componente', $oldComponente)
                ->where('Nombre_Agrupacion', $oldName)
                ->update(['Nombre_Agrupacion' => $plantilla->Nombre_Agrupacion]);

            // Limpiar cache del visualizador
            app(MallaVisualizerService::class)->forgetProgramaCache($oldPrograma);
        }

        return $result;
    }

    public function store(Request $request)
    {
        $result = parent::store($request);

        // Limpiar cache del visualizador para el programa afectado
        if ($programaId = $request->input('ID_Programa')) {
            app(MallaVisualizerService::class)->forgetProgramaCache($programaId);
        }

        return $result;
    }

    public function destroy(int $id)
    {
        $plantilla = PlantillaAgrupacion::findOrFail($id);
        $programaId = $plantilla->ID_Programa;

        $result = parent::destroy($id);

        app(MallaVisualizerService::class)->forgetProgramaCache($programaId);

        return $result;
    }

    /**
     * Activar/desactivar un registro (override para limpiar cache)
     */
    public function toggle(int $id)
    {
        $plantilla = PlantillaAgrupacion::findOrFail($id);
        $programaId = $plantilla->ID_Programa;

        $result = parent::toggle($id);

        app(MallaVisualizerService::class)->forgetProgramaCache($programaId);

        return $result;
    }
}
