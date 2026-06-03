import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Malla {
    ID_Malla: number;
    ID_Programa: number;
    Fecha_Vigencia: string;
    Estado: string;
    programa?: {
        Nombre_Programa: string;
    };
}

interface Props {
    mallas: {
        data: Malla[];
        meta: {
            current_page: number;
            last_page: number;
            total: number;
        };
    };
}

export default function MallasIndex({ mallas }: Props) {
    return (
        <Layout>
            <Head title="Gestión de Mallas Curriculares" />
            
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-800">Mallas Curriculares</h2>
                            <Link
                                href="/cargas"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Cargar Nueva Malla
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programa</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vigencia</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {mallas.data.map((malla) => (
                                        <tr key={malla.ID_Malla}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{malla.ID_Malla}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{malla.programa?.Nombre_Programa || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{malla.Fecha_Vigencia}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold uppercase">{malla.Estado}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <Link 
                                                    href={`/mallas/${malla.ID_Malla}`}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                >
                                                    Ver Estructura
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
