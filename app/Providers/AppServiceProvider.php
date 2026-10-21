<?php

namespace App\Providers;

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Asignatura;
use App\Models\Componente;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use App\Models\Requisito;
use App\Models\SlotAgrupacion;
use App\Services\MallaVisualizerService;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimiting();
        $this->invalidateMallaVisualizerCache();

        if (app()->environment('production')) {
            URL::forceScheme('https');
        }
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * La vista pública de mallas se cachea 24 h. Cualquier cambio en los
     * modelos que la alimentan (p. ej. créditos de una asignatura o de una
     * agrupación) debe verse de inmediato, así que se invalida en cada escritura.
     */
    protected function invalidateMallaVisualizerCache(): void
    {
        $models = [
            Agrupacion::class,
            AgrupacionAsignatura::class,
            Asignatura::class,
            Componente::class,
            MallaCurricular::class,
            Normativa::class,
            PlantillaAgrupacion::class,
            Programa::class,
            Requisito::class,
            SlotAgrupacion::class,
        ];

        foreach ($models as $model) {
            $model::saved(fn () => MallaVisualizerService::flush());
            $model::deleted(fn () => MallaVisualizerService::flush());
        }
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('otp-request', fn (Request $request) => [
            Limit::perMinute(5)->by($request->input('email', $request->ip())),
            Limit::perMinute(30)->by($request->ip()),
        ]);

        RateLimiter::for('otp-verify', fn (Request $request) => [
            Limit::perMinute(10)->by($request->input('email', $request->ip())),
            Limit::perMinutes(15, 5)->by($request->input('email', $request->ip())),
            Limit::perMinute(60)->by($request->ip()),
        ]);
    }
}
