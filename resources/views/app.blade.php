<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">  {{-- ← agregar esta línea --}}

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        {{-- Iconos institucionales: se sirve siempre /favicon.ico (móvil y escritorio)
             para evitar que los navegadores recurran al icono por defecto de Laravel.
             El sufijo ?v= usa la fecha de modificación del archivo como cache-buster,
             de modo que al reemplazar el ícono no queden versiones antiguas en caché. --}}
        @php($faviconVersion = file_exists(public_path('favicon.ico')) ? filemtime(public_path('favicon.ico')) : null)
        <link rel="icon" type="image/x-icon" href="/favicon.ico{{ $faviconVersion ? '?v='.$faviconVersion : '' }}" sizes="16x16 32x32 48x48">
        <link rel="apple-touch-icon" href="/favicon.ico">

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>