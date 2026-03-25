<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAsignaturaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Codigo_Asignatura' => 'sometimes|string|max:20|unique:asignatura,Codigo_Asignatura,' . $this->route('id') . ',ID_Asignatura',
            'Nombre_Asignatura' => 'sometimes|string|max:200',
            'Creditos_Asignatura' => 'sometimes|integer|min:1',
            'Horas_Presencial' => 'nullable|integer|min:0',
            'Horas_Estudiante' => 'nullable|integer|min:0',
            'Descripcion_Asignatura' => 'nullable|string',
        ];
    }
}
