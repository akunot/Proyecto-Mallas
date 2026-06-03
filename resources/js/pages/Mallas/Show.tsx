import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/Layout/MainLayout';

interface Asignatura {
    ID_Asignatura: number;
    Nombre_Asignatura: string;
    Codigo_Asignatura: string;
    Creditos_Asignatura: number;
    pivot: {
        Semestre_Sugerido: number;
        Tipo_Asignatura: string;
    };
}

interface Agrupacion {
    ID_Agrupacion: number;
    Nombre_Agrupacion: string;
    asignaturas: Asignatura[];
}

interface Props {
    malla: {
        ID_Malla: number;
        Codigo_Plan: string;
        programa: {
            Nombre_Programa: string;
        };
        agrupaciones: Agrupacion[];
    };
}

export default function MallaShow({ malla }: Props) {
    return (
        <Layout>
            <Head title={`Malla - ${malla.programa.Nombre_Programa}`} />
            
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <Link href="/mallas" className="text-blue-600 hover:underline">
                                &larr; Volver a Mallas
                            </Link>
                            <h1 className="text-3xl font-bold text-gray-900 mt-2">
                                {malla.programa.Nombre_Programa}
                            </h1>
                        </div>
                        <Link 
                            href={`/mallas/${malla.ID_Malla}/grafica`}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-colors font-semibold"
                        >
                            Ver Vista Gráfica (Semestres)
                        </Link>
                    </div>

                    <div className="space-y-8">
                        {malla.agrupaciones
                            .filter((agrup) => agrup.asignaturas.length > 0)
                            .map((agrup) => (
                            <div key={agrup.ID_Agrupacion} className="bg-white shadow overflow-hidden sm:rounded-lg">
                                <div className="px-4 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center sm:px-6">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                        {agrup.Nombre_Agrupacion}
                                    </h3>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                        {agrup.asignaturas.length} Asignaturas
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-white">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semestre</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créditos</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {agrup.asignaturas.map((asig) => (
                                                <tr key={asig.ID_Asignatura} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asig.Codigo_Asignatura}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asig.Nombre_Asignatura}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{asig.pivot.Semestre_Sugerido}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{asig.Creditos_Asignatura}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{asig.pivot.Tipo_Asignatura}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
