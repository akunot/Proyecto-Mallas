<?php

namespace App\Concerns;

use Illuminate\Database\Eloquent\Collection;

trait SanitizesJson
{
    protected function sanitizeForJson($data)
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = $this->sanitizeForJson($value);
            }

            return $data;
        }

        if (is_object($data)) {
            if ($data instanceof Collection) {
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
            return $this->sanitizeUtf8($data);
        }

        return $data;
    }

    protected function sanitizeUtf8(string $value): string
    {
        $converted = iconv('UTF-8', 'UTF-8//IGNORE', $value);
        if ($converted === false) {
            return '';
        }
        $converted = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $converted);

        return $converted;
    }
}
