<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Componente;

class ComponenteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $componentes = [
            [
                'Nombre_Componente' => 'Fundamentación',
                'Descripcion_Componente' => 'Este componente introduce y contextualiza el campo de conocimiento por el que optó el estudiante desde una perspectiva de ciudadanía, humanística, ambiental y cultural. Identifica las relaciones generales que caracterizan los saberes de las distintas disciplinas y profesiones del área, el contexto nacional e internacional de su desarrollo, el contexto institucional y los requisitos indispensables para su formación integral.',
            ],
            [
                'Nombre_Componente' => 'Disciplinar o Profesional',
                'Descripcion_Componente' => 'Este componente suministra al estudiante la gramática básica de su profesión o disciplina, las teorías, métodos y prácticas fundamentales, cuyo ejercicio formativo, investigativo y de extensión le permitirá integrarse con una comunidad profesional o disciplinar determinada. El Trabajo de Grado en cualquier modalidad hará parte de este componente.',
            ],
            [
                'Nombre_Componente' => 'Libre Elección',
                'Descripcion_Componente' => 'Este componente permite al estudiante aproximarse, contextualizar y/o profundizar temas de su profesión o disciplina y apropiar herramientas y conocimientos de distintos saberes tendientes a la diversificación, flexibilidad e interdisciplinariedad. Es objetivo de este componente acercar a los estudiantes a las tareas de investigación, extensión, emprendimiento y toma de conciencia de las implicaciones sociales de la generación de conocimiento. Las asignaturas que lo integran podrán ser contextos, cátedras de facultad o sede, líneas de profundización o asignaturas de éstas, asignaturas de posgrado o de otros programas curriculares de pregrado de la Universidad u otras con las cuales existan los convenios pertinentes.',
            ],
            [
                'Nombre_Componente' => 'Nivelatorio',
                'Descripcion_Componente' => 'La Universidad realizará en el examen de admisión análisis clasificatorios de conocimientos como lecto-escritura, inglés y matemáticas, con el fin de valorar las habilidades y destrezas de los aspirantes o proponer, si fuera necesario, cursos nivelatorios con créditos adicionales a los del programa curricular. Las facultades podrán solicitar a la Dirección Nacional de Admisiones análisis clasificatorios adicionales en las áreas de conocimiento que determinen. De esta forma se caracterizará el capital cultural de los estudiantes para una adecuada inserción en el medio universitario.',
            ],
            [
                'Nombre_Componente' => 'Lengua Extranjera',
                'Descripcion_Componente' => 'Todo estudiante deberá tener formación en una de las lenguas extranjeras ofrecidas por las sedes de la Universidad Nacional de Colombia de acuerdo con las necesidades académicas propias de los programas curriculares. Los programas curriculares de pregrado deben incluir en los cuatro primeros semestres de la carrera los niveles de lengua extranjera, correspondientes a los doce (12) créditos que serán adicionales al los estipulados para el programa curricular. Los programas curriculares de pregrado y posgrado estimularán la lectura en lenguas extranjeras.',
            ],
        ];

        foreach ($componentes as $componente) {
            Componente::create($componente);
        }
    }
}
