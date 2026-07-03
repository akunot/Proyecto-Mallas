<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Programa;
use App\Services\MallaVisualizerService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class MallaPublicaController extends Controller
{
    public function __construct(
        private readonly MallaVisualizerService $visualizer,
    ) {}

    public function show(Request $request, int $idPrograma): Response
    {
        $programa = Programa::with('facultad')->findOrFail($idPrograma);

        $versionId = $request->query('v');

        if ($versionId) {
            $mallaEstructurada = $this->visualizer->byVersion((int) $versionId);
        } else {
            $mallaEstructurada = $this->visualizer->forPrograma($idPrograma);
        }

        if (! $mallaEstructurada) {
            return Inertia::render('Mallas/DetallePublico', [
                'disponible' => false,
                'programa' => [
                    'ID_Programa' => $programa->ID_Programa,
                    'Nombre_Programa' => $programa->Nombre_Programa,
                    'Nivel_Formacion' => $programa->Nivel_Formacion,
                    'Duracion_Semestres' => $programa->Duracion_Semestres,
                ],
            ]);
        }

        return Inertia::render('Mallas/DetallePublico', [
            'disponible' => true,
            'programa' => [
                'ID_Programa' => $programa->ID_Programa,
                'Nombre_Programa' => $programa->Nombre_Programa,
                'Nivel_Formacion' => $programa->Nivel_Formacion,
                'Duracion_Semestres' => $programa->Duracion_Semestres,
                'Creditos_Totales' => $programa->Creditos_Totales,
                'Codigo_SNIES' => $programa->Codigo_SNIES,
                'Titulo_Otorgado' => $programa->Titulo_Otorgado,
                'Facultad' => $programa->facultad->Nombre_Facultad ?? '',
            ],
            'malla' => $mallaEstructurada,
        ]);
    }
}
