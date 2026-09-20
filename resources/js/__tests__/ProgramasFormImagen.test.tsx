import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: (props: React.ComponentProps<'a'>) => <a {...props} />,
    router: { post: vi.fn(), delete: vi.fn(), reload: vi.fn() },
    useForm: () => ({
        data: {},
        setData: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        processing: false,
        errors: {},
    }),
    usePage: () => ({ url: '/programas/1/edit', props: {} }),
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: null, logout: vi.fn() }),
}));

import ProgramasForm from '../pages/Catalogos/ProgramasForm';

const programaBase = {
    ID_Programa: 1,
    Codigo_Facultad: 1,
    Codigo_Programa: '123',
    Nombre_Programa: 'Ingeniería Civil',
    Titulo_Otorgado: 'Ingeniero Civil',
    Nivel_Formacion: 'pregrado',
    Creditos_Totales: 160,
    Duracion_Semestres: 10,
    Codigo_SNIES: null,
    Url_Programa: null,
    Campus_Programa: null,
    Conmutador: null,
    Extension: null,
    Correo: null,
    Area_Curricular: null,
    Esta_Activo: 1,
};

describe('ProgramasForm — sección de imagen (Tarea 2)', () => {
    it('en edición muestra la vista previa con la imagen guardada y acciones de reemplazo/eliminación', () => {
        render(
            <ProgramasForm
                programa={{ ...programaBase, Url_Imagen: '/storage/programas/x.jpg' }}
                facultades={[]}
            />,
        );

        expect(screen.getByText('Imagen del Programa')).toBeInTheDocument();
        expect(screen.getByAltText('Imagen del programa')).toHaveAttribute(
            'src',
            '/storage/programas/x.jpg',
        );
        expect(screen.getByRole('button', { name: /reemplazar imagen/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /eliminar imagen/i })).toBeInTheDocument();
    });

    it('sin imagen en la base de datos muestra la misma imagen por defecto que el sitio público', () => {
        render(<ProgramasForm programa={{ ...programaBase, Url_Imagen: null }} facultades={[]} />);

        // Ingeniería Civil tiene imagen legacy local: el admin debe ver la
        // misma imagen que el listado público, no un placeholder genérico.
        expect(screen.getByAltText('Imagen del programa')).toHaveAttribute(
            'src',
            '/images/programas/Ingenieria civil.jpg',
        );
        expect(screen.getByRole('button', { name: /cargar imagen/i })).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /eliminar imagen/i }),
        ).not.toBeInTheDocument();
    });

    it('sin imagen ni default usa el placeholder institucional', () => {
        render(
            <ProgramasForm
                programa={{
                    ...programaBase,
                    Nombre_Programa: 'Programa Inventado XYZ',
                    Url_Imagen: null,
                }}
                facultades={[]}
            />,
        );

        expect(screen.getByAltText('Imagen del programa')).toHaveAttribute(
            'src',
            '/images/programas/placeholder.svg',
        );
        expect(screen.getByRole('button', { name: /cargar imagen/i })).toBeInTheDocument();
    });

    it('en creación indica que primero debe guardarse el programa', () => {
        render(<ProgramasForm facultades={[]} />);

        expect(
            screen.getByText(/Guarda el programa para poder asignarle una imagen/i),
        ).toBeInTheDocument();
    });
});
