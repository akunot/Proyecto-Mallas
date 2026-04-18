<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadCargaArchivoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'archivo' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
            'tipo_archivo' => ['required', 'string', Rule::in(['asignaturas', 'electivas', 'malla'])],
        ];
    }

    public function messages(): array
    {
        return [
            'archivo.required' => 'El archivo es requerido.',
            'archivo.file' => 'El archivo debe ser un archivo válido.',
            'archivo.mimes' => 'El archivo debe ser un archivo Excel (.xlsx o .xls).',
            'archivo.max' => 'El archivo no puede exceder 10MB.',
            'tipo_archivo.required' => 'El tipo de archivo es requerido.',
            'tipo_archivo.in' => 'El tipo de archivo debe ser asignaturas, electivas o malla.',
        ];
    }
}
