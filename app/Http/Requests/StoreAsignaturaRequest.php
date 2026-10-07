<?php

namespace App\Http\Requests;

use App\Rules\CodigoAsignatura;
use App\Rules\CodigoBaseUnico;
use Illuminate\Foundation\Http\FormRequest;

class StoreAsignaturaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Codigo_Asignatura' => ['required', new CodigoAsignatura, new CodigoBaseUnico],
            'Nombre_Asignatura' => 'required|string|max:200',
            'Creditos_Asignatura' => 'required|integer|min:1',
            'Horas_Presencial' => 'nullable|integer|min:0',
            'Horas_Estudiante' => 'nullable|integer|min:0',
            'Descripcion_Asignatura' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'Codigo_Asignatura.required' => 'El código de la asignatura es obligatorio.',
            'Nombre_Asignatura.required' => 'El nombre de la asignatura es obligatorio.',
            'Creditos_Asignatura.required' => 'Los créditos son obligatorios.',
            'Creditos_Asignatura.min' => 'Los créditos deben ser al menos 1.',
        ];
    }
}
