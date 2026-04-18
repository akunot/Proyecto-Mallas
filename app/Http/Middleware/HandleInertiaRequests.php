<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $sanitizedUser = null;
        
        if ($user) {
            $sanitizedUser = $this->sanitizeForJson($user);
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $sanitizedUser,
            ],
        ];
    }

    private function sanitizeForJson($data)
    {
        if (is_array($data)) {
            return array_map([$this, 'sanitizeForJson'], $data);
        }

        if (is_object($data)) {
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
