<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNormativaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ID_Programa' => 'required|integer|exists:programa,ID_Programa',
            'Tipo_Normativa' => 'required|string|in:Acuerdo,Resolución,Decreto,Circular',
            'Numero_Normativa' => 'required|string|max:50',
            'Anio_Normativa' => 'required|integer|min:1900|max:' . date('Y'),
            'Instancia' => 'required|string|max:150',
            'Descripcion_Normativa' => 'nullable|string',
            'Url_Normativa' => 'nullable|string|max:500',
            'Esta_Activo' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'ID_Programa.required' => 'El programa es obligatorio.',
            'ID_Programa.exists' => 'El programa seleccionado no existe.',
            'Tipo_Normativa.required' => 'El tipo de normativa es obligatorio.',
            'Tipo_Normativa.in' => 'El tipo debe ser: Acuerdo, Resolución, Decreto o Circular.',
            'Numero_Normativa.required' => 'El número de normativa es obligatorio.',
            'Anio_Normativa.required' => 'El año es obligatorio.',
            'Instancia.required' => 'La instancia es obligatoria.',
        ];
    }
}
