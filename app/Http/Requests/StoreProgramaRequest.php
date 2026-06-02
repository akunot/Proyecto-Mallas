<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProgramaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Codigo_Facultad' => 'required|integer|exists:facultades,Codigo_Facultad',
            'Codigo_Programa' => 'required|integer|unique:programas,Codigo_Programa',
            'Nombre_Programa' => 'required|string|max:200',
            'Titulo_Otorgado' => 'nullable|string|max:200',
            'Nivel_Formacion' => 'nullable|string|max:50',
            'Creditos_Totales' => 'nullable|integer|min:0',
            'Duracion_Semestres' => 'nullable|integer|min:1',
            'Codigo_SNIES' => 'nullable|string|max:20',
            'Url_Programa' => 'nullable|string|max:300',
            'Campus_Programa' => 'nullable|string|max:100',
            'Conmutador' => 'nullable|string|max:30',
            'Extension' => 'nullable|string|max:10',
            'Correo' => 'nullable|email|max:200',
            'Area_Curricular' => 'nullable|string|max:100',
            'Esta_Activo' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'Codigo_Facultad.required' => 'La facultad es obligatoria.',
            'Codigo_Facultad.exists' => 'La facultad seleccionada no existe.',
            'Codigo_Programa.required' => 'El código del programa es obligatorio.',
            'Codigo_Programa.unique' => 'El código del programa ya existe.',
            'Nombre_Programa.required' => 'El nombre del programa es obligatorio.',
        ];
    }
}
