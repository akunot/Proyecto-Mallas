<?php

namespace App\Http\Middleware;

use App\Concerns\SanitizesJson;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    use SanitizesJson;

    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

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
}
