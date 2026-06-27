<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Normativa;

class NormativaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $normativas = [
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '15',
                'Anio_Normativa' => 2025,
                'Instancia' => 'Consejo de Facultad de Ingeniería y Arquitectura',
                'Codigo_Programa' => 4021,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=115278',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se modifica parcialmente el Acuerdo 12 del 11 de noviembre de 2025  del Consejo de Facultad de Ingeniería y Arquitectura de la Sede Manizales de la Universidad Nacional de Colombia',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '253',
                'Anio_Normativa' => 2016,
                'Instancia' => 'Consejo de Facultad de Ingeniería y Arquitectura',
                'Codigo_Programa' => 4025,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=86834',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se modifica el plan de estudios del programa curricular de Arquitectura de la Facultad de Ingeniería y Arquitectura y se derogan los Acuerdos 206 de 2014 y 208 de 2015 del Consejo de Facultad de Ingeniería y Arquitectura de la Sede Manizales de la Universidad Nacional de Colombia',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '254',
                'Anio_Normativa' => 2016,
                'Instancia' => 'Consejo de Facultad de Ingeniería y Arquitectura',
                'Codigo_Programa' => 4022,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=86835',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se modifica el plan de estudios del programa curricular de Ingeniería Eléctrica de la Facultad de Ingeniería y Arquitectura y se derogan las Resoluciones 189 de 2008 y 220 de 2009 del Consejo de Facultad de Ingeniería y Arquitectura de la Sede Manizales de la Universidad Nacional de Colombia',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '14',
                'Anio_Normativa' => 2024,
                'Instancia' => 'Consejo de Facultad de Ingeniería y Arquitectura',
                'Codigo_Programa' => 4028,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=108984',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se modifica el plan de estudios del programa curricular de Ingeniería Electrónica de la Facultad de Ingeniería y Arquitectura y se derogan los Acuerdos 256 de 2016, 277 de 2017, 290 de 2017, 326 de 2019, 07 de 2023, 09 de 2023 y 11 de 2023 del Consejo de Facultad de Ingeniería y Arquitectura de la Sede Manizales de la Universidad Nacional de Colombia',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '296',
                'Anio_Normativa' => 2018,
                'Instancia' => 'Consejo de Facultad de Ingeniería y Arquitectura',
                'Codigo_Programa' => 4024,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=92095',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se modifica el plan de estudios del programa curricular de Ingeniería Industrial de la Facultad de Ingeniería y Arquitectura y se derogan los Acuerdos 255 de 2016, 275 de 2017 y 287 de 2017 del Consejo de Facultad de Ingeniería y Arquitectura de la Sede Manizales, de la de la Universidad Nacional de Colombia',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '252',
                'Anio_Normativa' => 2016,
                'Instancia' => 'Consejo de Facultad de Ingeniería y Arquitectura',
                'Codigo_Programa' => 4023,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=86833',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se modifica el plan de estudios del programa curricular de Ingeniería Química de la Facultad de Ingeniería y Arquitectura y se deroga el Acuerdo 012 del 21 de junio de 2011 del Consejo de Facultad de Ingeniería y Arquitectura de la Sede Manizales de la Universidad Nacional de Colombia',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '98',
                'Anio_Normativa' => 2021,
                'Instancia' => 'Consejo de Facultad de Administración',
                'Codigo_Programa' => 4035,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=98338#1',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se modifica el plan de estudios del Programa Curricular de Administración de Sistemas Informáticos de la Facultad de Administración de la Sede Manizales de la Universidad Nacional de Colombia y se deroga la Resolución CFA-126 de 2008, el Acuerdo 4 de 2011 y el Acuerdo 084 de 2019 del Consejo de la Facultad de Administración',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '5',
                'Anio_Normativa' => 2022,
                'Instancia' => 'Consejo de Facultad de Administración',
                'Codigo_Programa' => 4026,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=100808',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se unifica en un solo Acuerdo las modificaciones del Plan de Estudios del programa de Administración de Empresas adoptadas por el Consejo de la Facultad de Administración mediante Resolución CFA 022 de 2010; Acuerdo 11 de 2012, Oficio SFA-C-525 de 2015 y Acuerdo 85 de 201',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '5',
                'Anio_Normativa' => 2022,
                'Instancia' => 'Consejo de Facultad de Administración',
                'Codigo_Programa' => 4027,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=100808',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se unifica en un solo Acuerdo las modificaciones del Plan de Estudios del programa de Administración de Empresas adoptadas por el Consejo de la Facultad de Administración mediante Resolución CFA 022 de 2010; Acuerdo 11 de 2012, Oficio SFA-C-525 de 2015 y Acuerdo 85 de 201',
            ],
            [
                'Tipo_Normativa' => 'Acuerdo',
                'Numero_Normativa' => '5',
                'Anio_Normativa' => 2022,
                'Instancia' => 'Consejo de Facultad de Administración',
                'Codigo_Programa' => 4033,
                'Url_Normativa' => 'https://legal.unal.edu.co/rlunal/home/doc.jsp?d_i=100808',
                'Esta_Activo' => 1,
                'Descripcion_Normativa' => 'Por el cual se unifica en un solo Acuerdo las modificaciones del Plan de Estudios del programa de Administración de Empresas adoptadas por el Consejo de la Facultad de Administración mediante Resolución CFA 022 de 2010; Acuerdo 11 de 2012, Oficio SFA-C-525 de 2015 y Acuerdo 85 de 201',
            ],
        ];

        foreach ($normativas as $normativa) {
            Normativa::create([
                'Tipo_Normativa' => $normativa['Tipo_Normativa'],
                'Numero_Normativa' => $normativa['Numero_Normativa'],
                'Anio_Normativa' => $normativa['Anio_Normativa'],
                'Instancia' => $normativa['Instancia'],
                'Codigo_Programa' => $normativa['Codigo_Programa'],
                'Url_Normativa' => $normativa['Url_Normativa'],
                'Esta_Activo' => $normativa['Esta_Activo'],
                'Descripcion_Normativa' => $normativa['Descripcion_Normativa'],
            ]);
        }
    }
}
