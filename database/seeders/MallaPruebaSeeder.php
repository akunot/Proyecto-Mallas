<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Sede;
use App\Models\Facultad;
use App\Models\Programa;
use App\Models\Normativa;
use App\Models\Componente;
use App\Models\Agrupacion;
use App\Models\Asignatura;
use App\Models\MallaCurricular;
use App\Models\AgrupacionAsignatura;
use App\Models\Requisito;
use App\Models\Usuario;
use App\Models\CargaMalla;
use App\Models\LogActividad;
use App\Models\DiffMalla;

class MallaPruebaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear usuarios de prueba
        $usuario1 = Usuario::firstOrCreate(
            ['Email_Usuario' => 'admin1@unal.edu.co'],
            [
                'Nombre_Usuario' => 'Administrador 1',
                'Otp_Code' => bcrypt('123456'),
                'Otp_Expires_At' => now()->addMinutes(10),
                'Activo_Usuario' => 1,
            ]
        );

        $usuario2 = Usuario::firstOrCreate(
            ['Email_Usuario' => 'admin2@unal.edu.co'],
            [
                'Nombre_Usuario' => 'Administrador 2',
                'Otp_Code' => bcrypt('654321'),
                'Otp_Expires_At' => now()->addMinutes(10),
                'Activo_Usuario' => 1,
            ]
        );

        // Crear estructura base
        $sede = Sede::firstOrCreate(
            ['Nombre_Sede' => 'Manizales'],
            [
                'Ciudad_Sede' => 'Manizales',
                'Direccion_Sede' => 'Campus UNAL Manizales',
            ]
        );

        $facultad = Facultad::firstOrCreate(
            ['Nombre_Facultad' => 'Ingeniería y Arquitectura'],
            [
                'ID_Sede' => $sede->ID_Sede,
                'Codigo_Facultad' => 'ING',
            ]
        );

        $programa = Programa::firstOrCreate(
            ['Nombre_Programa' => 'Ingeniería de Sistemas'],
            [
                'ID_Facultad' => $facultad->ID_Facultad,
                'Codigo_Programa' => 'IS',
                'Nivel_Formacion' => 'pregrado',
                'Creditos_Totales' => 160,
                'Duracion_Semestres' => 10,
                'Activo_Programa' => 1,
            ]
        );

        // Crear normativa
        $normativa = Normativa::firstOrCreate(
            [
                'ID_Programa' => $programa->ID_Programa,
                'Numero_Normativa' => '015-2026',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Anio_Normativa' => 2026,
                'Instancia' => 'Consejo de Facultad',
                'Descripcion_Normativa' => 'Plan de estudios 2026',
                'Esta_Activo' => 1,
            ]
        );

        // Crear componentes
        $componentes = [
            ['Nombre_Componente' => 'Fundamentación'],
            ['Nombre_Componente' => 'Disciplinar Profesional'],
            ['Nombre_Componente' => 'Libre Elección'],
        ];

        foreach ($componentes as $componente) {
            Componente::firstOrCreate(
                ['Nombre_Componente' => $componente['Nombre_Componente']],
                $componente
            );
        }

        // Crear malla vigente (versión 1) primero
        $mallaVigente = MallaCurricular::firstOrCreate(
            [
                'ID_Programa' => $programa->ID_Programa,
                'Version_Numero' => 1,
            ],
            [
                'ID_Normativa' => $normativa->ID_Normativa,
                'Version_Etiqueta' => 'Plan 2024',
                'Fecha_Vigencia' => now()->subYear()->format('Y-m-d'),
                'Estado' => 'activa',
                'Es_Vigente' => 1,
            ]
        );

        // Crear agrupaciones
        $componenteFund = Componente::where('Nombre_Componente', 'Fundamentación')->first();
        $componenteDisc = Componente::where('Nombre_Componente', 'Disciplinar Profesional')->first();
        $componenteLibre = Componente::where('Nombre_Componente', 'Libre Elección')->first();

        $agrupaciones = [
            ['ID_Componente' => $componenteFund->ID_Componente, 'Nombre_Agrupacion' => 'Matemáticas Básicas', 'Tipo_Agrupacion' => 'fundamentacion', 'Creditos_Requeridos' => 12],
            ['ID_Componente' => $componenteFund->ID_Componente, 'Nombre_Agrupacion' => 'Ciencias Básicas', 'Tipo_Agrupacion' => 'fundamentacion', 'Creditos_Requeridos' => 8],
            ['ID_Componente' => $componenteDisc->ID_Componente, 'Nombre_Agrupacion' => 'Programación', 'Tipo_Agrupacion' => 'disciplinar_profesional', 'Creditos_Requeridos' => 20],
            ['ID_Componente' => $componenteDisc->ID_Componente, 'Nombre_Agrupacion' => 'Bases de Datos', 'Tipo_Agrupacion' => 'disciplinar_profesional', 'Creditos_Requeridos' => 12],
            ['ID_Componente' => $componenteLibre->ID_Componente, 'Nombre_Agrupacion' => 'Electivas Generales', 'Tipo_Agrupacion' => 'libre_eleccion', 'Creditos_Requeridos' => 16],
        ];

        foreach ($agrupaciones as $agrupacion) {
            Agrupacion::firstOrCreate(
                [
                    'ID_Programa' => $programa->ID_Programa,
                    'ID_Componente' => $agrupacion['ID_Componente'],
                    'Nombre_Agrupacion' => $agrupacion['Nombre_Agrupacion'],
                ],
                array_merge($agrupacion, ['ID_Malla' => $mallaVigente->ID_Malla])
            );
        }

        // Crear asignaturas de prueba
        $asignaturas = [
            ['Codigo_Asignatura' => 'MATE101', 'Nombre_Asignatura' => 'Cálculo Diferencial', 'Creditos_Asignatura' => 4],
            ['Codigo_Asignatura' => 'MATE102', 'Nombre_Asignatura' => 'Cálculo Integral', 'Creditos_Asignatura' => 4],
            ['Codigo_Asignatura' => 'FISI101', 'Nombre_Asignatura' => 'Física Mecánica', 'Creditos_Asignatura' => 4],
            ['Codigo_Asignatura' => 'PROG101', 'Nombre_Asignatura' => 'Programación I', 'Creditos_Asignatura' => 4],
            ['Codigo_Asignatura' => 'PROG102', 'Nombre_Asignatura' => 'Programación II', 'Creditos_Asignatura' => 4],
            ['Codigo_Asignatura' => 'BD101', 'Nombre_Asignatura' => 'Bases de Datos I', 'Creditos_Asignatura' => 4],
            ['Codigo_Asignatura' => 'BD102', 'Nombre_Asignatura' => 'Bases de Datos II', 'Creditos_Asignatura' => 4],
            ['Codigo_Asignatura' => 'ELEC001', 'Nombre_Asignatura' => 'Inglés Técnico', 'Creditos_Asignatura' => 2],
            ['Codigo_Asignatura' => 'ELEC002', 'Nombre_Asignatura' => 'Emprendimiento', 'Creditos_Asignatura' => 2],
        ];

        foreach ($asignaturas as $asignatura) {
            Asignatura::firstOrCreate(
                ['Codigo_Asignatura' => $asignatura['Codigo_Asignatura']],
                $asignatura
            );
        }

        // Crear malla nueva (versión 2) para pruebas
        $mallaNueva = MallaCurricular::firstOrCreate(
            [
                'ID_Programa' => $programa->ID_Programa,
                'Version_Numero' => 2,
            ],
            [
                'ID_Normativa' => $normativa->ID_Normativa,
                'Version_Etiqueta' => 'Plan 2026',
                'Fecha_Vigencia' => now()->addMonth()->format('Y-m-d'),
                'Estado' => 'borrador',
                'Es_Vigente' => 0,
            ]
        );

        // Asignar asignaturas a agrupaciones para ambas mallas
        $this->crearAsignacionesMalla($mallaVigente, $programa, true);
        $this->crearAsignacionesMalla($mallaNueva, $programa, false);

        // Crear carga de prueba
        $carga = CargaMalla::firstOrCreate(
            [
                'ID_Programa' => $programa->ID_Programa,
                'ID_Normativa' => $normativa->ID_Normativa,
            ],
            [
                'ID_Malla' => $mallaNueva->ID_Malla,
                'ID_Malla_Base' => $mallaVigente->ID_Malla,
                'ID_Usuario' => $usuario1->ID_Usuario,
                'Estado_Carga' => 'borrador',
                'Comentario_Carga' => 'Actualización del plan de estudios 2026',
            ]
        );

        // Generar diffs entre las mallas
        $diffService = new \App\Services\MallaDiffService();
        $diffService->generarDiffs($mallaNueva, $mallaVigente, $carga);

        // Crear logs de prueba
        LogActividad::create([
            'ID_Usuario' => $usuario1->ID_Usuario,
            'Accion_Log' => 'UPLOAD_EXCEL',
            'Entidad_Log' => 'carga_malla',
            'Entidad_ID_Log' => $carga->ID_Carga,
            'Detalle_Log' => ['archivo' => 'test_malla.xlsx'],
            'IP_Origen_Log' => '127.0.0.1',
        ]);

        LogActividad::create([
            'ID_Usuario' => $usuario1->ID_Usuario,
            'Accion_Log' => 'CREATE_MALLA',
            'Entidad_Log' => 'malla_curricular',
            'Entidad_ID_Log' => $mallaNueva->ID_Malla,
            'Detalle_Log' => ['version' => 2],
            'IP_Origen_Log' => '127.0.0.1',
        ]);

        $this->command->info('✅ Datos de prueba creados exitosamente');
        $this->command->info('📧 Usuarios de prueba:');
        $this->command->info('   - admin1@unal.edu.co (OTP: 123456)');
        $this->command->info('   - admin2@unal.edu.co (OTP: 654321)');
        $this->command->info('🎯 Puedes probar el flujo completo con estos datos');
    }

    /**
     * Crea las asignaciones de asignaturas a agrupaciones para una malla.
     */
    private function crearAsignacionesMalla(MallaCurricular $malla, Programa $programa, bool $esVigente): void
    {
        $agrupaciones = Agrupacion::where('ID_Programa', $programa->ID_Programa)->get()->keyBy('Nombre_Agrupacion');
        $asignaturas = Asignatura::all()->keyBy('Codigo_Asignatura');

        // Asignaciones para malla vigente
        if ($esVigente) {
            $asignaciones = [
                ['agrupacion' => 'Matemáticas Básicas', 'asignatura' => 'MATE101', 'tipo' => 'regular', 'semestre' => 1],
                ['agrupacion' => 'Matemáticas Básicas', 'asignatura' => 'MATE102', 'tipo' => 'regular', 'semestre' => 2],
                ['agrupacion' => 'Ciencias Básicas', 'asignatura' => 'FISI101', 'tipo' => 'regular', 'semestre' => 1],
                ['agrupacion' => 'Programación', 'asignatura' => 'PROG101', 'tipo' => 'regular', 'semestre' => 2],
                ['agrupacion' => 'Programación', 'asignatura' => 'PROG102', 'tipo' => 'regular', 'semestre' => 3],
                ['agrupacion' => 'Bases de Datos', 'asignatura' => 'BD101', 'tipo' => 'regular', 'semestre' => 4],
            ];
        } else {
            // Asignaciones para malla nueva (con cambios)
            $asignaciones = [
                ['agrupacion' => 'Matemáticas Básicas', 'asignatura' => 'MATE101', 'tipo' => 'regular', 'semestre' => 1],
                ['agrupacion' => 'Matemáticas Básicas', 'asignatura' => 'MATE102', 'tipo' => 'regular', 'semestre' => 2],
                ['agrupacion' => 'Ciencias Básicas', 'asignatura' => 'FISI101', 'tipo' => 'regular', 'semestre' => 1],
                ['agrupacion' => 'Programación', 'asignatura' => 'PROG101', 'tipo' => 'regular', 'semestre' => 2],
                ['agrupacion' => 'Programación', 'asignatura' => 'PROG102', 'tipo' => 'regular', 'semestre' => 3],
                ['agrupacion' => 'Bases de Datos', 'asignatura' => 'BD101', 'tipo' => 'regular', 'semestre' => 4],
                ['agrupacion' => 'Bases de Datos', 'asignatura' => 'BD102', 'tipo' => 'regular', 'semestre' => 5], // NUEVO
                ['agrupacion' => 'Electivas Generales', 'asignatura' => 'ELEC001', 'tipo' => 'electiva', 'semestre' => 6], // NUEVO
                ['agrupacion' => 'Electivas Generales', 'asignatura' => 'ELEC002', 'tipo' => 'electiva', 'semestre' => 7], // NUEVO
            ];
        }

        foreach ($asignaciones as $asignacion) {
            $agrupacion = $agrupaciones->get($asignacion['agrupacion']);
            $asignatura = $asignaturas->get($asignacion['asignatura']);

            if ($agrupacion && $asignatura) {
                $relacion = AgrupacionAsignatura::firstOrCreate([
                    'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
                    'ID_Malla' => $malla->ID_Malla,
                    'ID_Asignatura' => $asignatura->ID_Asignatura,
                ], [
                    'Tipo_Asignatura' => $asignacion['tipo'],
                    'Semestre_Sugerido' => $asignacion['semestre'],
                ]);

                // Crear algunos requisitos
                if ($asignacion['asignatura'] === 'MATE102' && $relacion) {
                    Requisito::firstOrCreate([
                        'ID_Agrup_Asig' => $relacion->ID_Agrup_Asig,
                        'Tipo_Requisito' => 'prerequisito',
                    ], [
                        'ID_Agrup_Asig_Requerida' => AgrupacionAsignatura::where('ID_Malla', $malla->ID_Malla)
                            ->whereHas('asignatura', function($q) { $q->where('Codigo_Asignatura', 'MATE101'); })
                            ->first()?->ID_Agrup_Asig,
                    ]);
                }

                if ($asignacion['asignatura'] === 'PROG102' && $relacion) {
                    Requisito::firstOrCreate([
                        'ID_Agrup_Asig' => $relacion->ID_Agrup_Asig,
                        'Tipo_Requisito' => 'prerequisito',
                    ], [
                        'ID_Agrup_Asig_Requerida' => AgrupacionAsignatura::where('ID_Malla', $malla->ID_Malla)
                            ->whereHas('asignatura', function($q) { $q->where('Codigo_Asignatura', 'PROG101'); })
                            ->first()?->ID_Agrup_Asig,
                    ]);
                }
            }
        }
    }
}
