<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCargaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tipo_carga' => ['required', 'string', Rule::in(['asignaturas', 'electivas', 'malla'])],
            'normativa_id' => ['required_if:tipo_carga,malla', 'nullable', 'integer', Rule::exists('normativas', 'ID_Normativa')],
            'malla_base_id' => ['nullable', 'integer', Rule::exists('mallas_curriculares', 'ID_Malla')],
        ];
    }

    public function messages(): array
    {
        return [
            'tipo_carga.required' => 'El tipo de carga es requerido.',
            'tipo_carga.in' => 'El tipo de carga debe ser asignaturas, electivas o malla.',
            'normativa_id.required_if' => 'La normativa es requerida para cargas de malla.',
            'normativa_id.integer' => 'El ID de la normativa debe ser un número entero.',
            'normativa_id.exists' => 'La normativa seleccionada no existe.',
            'malla_base_id.integer' => 'El ID de la malla base debe ser un número entero.',
            'malla_base_id.exists' => 'La malla base seleccionada no existe.',
        ];
    }
}