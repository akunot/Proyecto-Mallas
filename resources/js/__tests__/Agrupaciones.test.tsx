import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: (props: React.ComponentProps<'a'>) => <a {...props} />,
    router: { get: vi.fn(), delete: vi.fn(), post: vi.fn(), put: vi.fn() },
    usePage: () => ({ url: '/agrupaciones', props: {} }),
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: null, logout: vi.fn() }),
}));

import Agrupaciones from '../pages/Catalogos/Agrupaciones';

const plantilla = {
    ID_Plantilla_Agrupacion: 163,
    ID_Programa: 1,
    ID_Componente: 1,
    Nombre_Agrupacion: 'Profesionales Optativas',
    Tipo_Agrupacion: 'OPTATIVA',
    Creditos_Requeridos: 9,
    Creditos_Maximos: 12,
    Es_Obligatoria: false,
    programa: { ID_Programa: 1, Nombre_Programa: 'Ingeniería de Sistemas' },
    componente: { ID_Componente: 1, Nombre_Componente: 'Profesionales' },
};

const meta = {
    current_page: 1,
    total: 1,
    per_page: 20,
    last_page: 1,
    sort_by: 'ID_Plantilla_Agrupacion',
    sort_order: 'asc' as const,
};

describe('Catálogo de Agrupaciones (listado)', () => {
    it('muestra la acción Editar para cada plantilla', () => {
        render(<Agrupaciones agrupaciones={{ data: [plantilla], meta }} />);

        expect(
            document.querySelector('a[href="/agrupaciones/163/edit"]'),
        ).not.toBeNull();
    });

    it('no muestra acciones de eliminación ni modal de confirmación', () => {
        render(<Agrupaciones agrupaciones={{ data: [plantilla], meta }} />);

        // Icono de papelera del botón "Eliminar"
        expect(screen.queryByText('delete')).not.toBeInTheDocument();

        // Modal de confirmación de eliminación
        expect(
            screen.queryByText('¿Eliminar plantilla de agrupación?'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText('Esta acción no se puede deshacer.'),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    });
});
