<?php

namespace App\Http\Controllers\Api;

use App\Models\PlantillaAgrupacion;
use Illuminate\Database\Eloquent\Model;

class AgrupacionController extends CatalogoController
{
    protected \Illuminate\Database\Eloquent\Model $model;
    protected string $routeName = 'agrupacion';
    protected string $routeBase = 'agrupaciones';

    public function __construct()
    {
        $this->model = new PlantillaAgrupacion();
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
        $rules = [
            'ID_Programa' => 'required|exists:programas,ID_Programa',
            'ID_Componente' => 'required|exists:componentes,ID_Componente',
            'Nombre_Agrupacion' => 'required|string|max:255',
            'Tipo_Agrupacion' => 'required|string|max:100',
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
            'programas' => \App\Models\Programa::select('ID_Programa', 'Nombre_Programa')->get(),
            'componentes' => \App\Models\Componente::select('ID_Componente', 'Nombre_Componente')->get(),
        ];
    }

    /**
     * Obtener nombre del componente de Inertia
     */
    protected function getInertiaComponent(): string
    {
        return 'Catalogos/AgrupacionesForm';
    }
}
