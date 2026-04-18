<?php

namespace App\Http\Controllers;

abstract class Controller
{
    /**
     * Sanitiza datos para JSON asegurando codificación UTF-8 válida
     */
    protected function sanitizeForJson($data)
    {
        if (is_array($data)) {
            return array_map([$this, 'sanitizeForJson'], $data);
        }

        if (is_object($data)) {
            if ($data instanceof \Illuminate\Database\Eloquent\Collection) {
                return $this->sanitizeForJson($data->toArray());
            }
            
            if (method_exists($data, 'toArray')) {
                return $this->sanitizeForJson($data->toArray());
            }

            $result = [];
            foreach ($data as $key => $value) {
                $result[$key] = $this->sanitizeForJson($value);
            }
            return $result;
        }

        if (is_string($data)) {
            return mb_convert_encoding($data, 'UTF-8', 'UTF-8');
        }

        return $data;
    }
}
