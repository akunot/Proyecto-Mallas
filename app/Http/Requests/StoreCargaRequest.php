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
            'tipo_carga'   => ['required', 'string', Rule::in(['asignaturas', 'electivas', 'malla', 'optativa'])],
            'normativa_id' => ['nullable', 'integer', Rule::exists('normativas', 'ID_Normativa')],
            'malla_base_id'=> ['nullable', 'integer', Rule::exists('mallas_curriculares', 'ID_Malla')],
            'programa_id'  => ['required_if:tipo_carga,electivas', 'nullable', 'integer', Rule::exists('programas', 'ID_Programa')],
        ];
    }

    public function messages(): array
    {
        return [
            'tipo_carga.required'    => 'El tipo de carga es requerido.',
            'tipo_carga.in'          => 'El tipo de carga debe ser asignaturas, electivas, malla u optativa.',
            'normativa_id.integer'   => 'El ID de la normativa debe ser un número entero.',
            'normativa_id.exists'    => 'La normativa seleccionada no existe.',
            'malla_base_id.integer'  => 'El ID de la malla base debe ser un número entero.',
            'malla_base_id.exists'   => 'La malla base seleccionada no existe.',
            'programa_id.required_if'=> 'Se requiere seleccionar un programa para cargas de tipo electivas.',
            'programa_id.integer'    => 'El ID del programa debe ser un número entero.',
            'programa_id.exists'     => 'El programa seleccionado no existe.',
        ];
    }
}