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
            'normativa_id' => ['required', 'integer', Rule::exists('normativa', 'ID_Normativa')],
            'malla_base_id' => ['nullable', 'integer', Rule::exists('malla_curricular', 'ID_Malla')],
        ];
    }

    public function messages(): array
    {
        return [
            'normativa_id.required' => 'La normativa es requerida.',
            'normativa_id.integer' => 'El ID de la normativa debe ser un número entero.',
            'normativa_id.exists' => 'La normativa seleccionada no existe.',
            'malla_base_id.integer' => 'El ID de la malla base debe ser un número entero.',
            'malla_base_id.exists' => 'La malla base seleccionada no existe.',
        ];
    }
}