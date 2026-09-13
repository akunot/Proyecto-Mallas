import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import InstitutionalFooter from '../components/InstitutionalFooter';
import InstitutionalHeader from '../components/InstitutionalHeader';

describe('InstitutionalHeader — cambios plantilla UNAL 2026', () => {
    it('incluye la sección Servicios dentro del menú móvil', async () => {
        const user = userEvent.setup();
        render(<InstitutionalHeader />);

        await user.click(
            screen.getByRole('button', { name: 'Abrir menú de navegación' }),
        );

        // Existen dos botones "Servicios": el del menú móvil (nombre accesible
        // "Servicios ▼" por la flecha) y el indicador fijo del panel lateral
        // de escritorio. El primero en el DOM es el móvil.
        const serviciosButtons = screen.getAllByRole('button', {
            name: /^servicios/i,
        });
        expect(serviciosButtons.length).toBeGreaterThan(1);
        await user.click(serviciosButtons[0]!);

        expect(
            screen.getByRole('link', { name: 'Correo institucional' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'DINARA - SIA' }),
        ).toBeInTheDocument();
    });
});

describe('InstitutionalFooter — cambios plantilla UNAL 2026', () => {
    it('mantiene los enlaces institucionales y usa HTTPS en Calidad (SIGA)', () => {
        render(<InstitutionalFooter />);

        expect(screen.getByRole('link', { name: 'Régimen Legal' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Glosario' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Calidad' })).toHaveAttribute(
            'href',
            'https://siga.unal.edu.co',
        );
    });

    it('incluye las variantes de impresión (blanco y negro) de los logos', () => {
        render(<InstitutionalFooter />);

        const orgullo = screen.getAllByAltText('Orgullo UN');
        expect(orgullo).toHaveLength(2);
        expect(
            orgullo.some((img) =>
                img.getAttribute('src')?.includes('log_orgullo_black.png'),
            ),
        ).toBe(true);

        const agencia = screen.getAllByAltText('Agencia de Noticias');
        expect(agencia).toHaveLength(2);
        expect(
            agencia.some((img) =>
                img.getAttribute('src')?.includes('log_agenc_black.png'),
            ),
        ).toBe(true);
    });

    it('muestra el copyright de la plantilla y la fecha de actualización', () => {
        render(<InstitutionalFooter />);

        expect(screen.getByText('© Copyright 2019')).toBeInTheDocument();
        expect(
            screen.getByText(/Actualización: \d{2}\/\d{2}\/\d{2}/),
        ).toBeInTheDocument();
    });
});

describe('Revisión de diseño y accesibilidad del header (2026-12)', () => {
    beforeAll(() => {
        // jsdom no implementa scrollIntoView (el panel lo usa al abrirse).
        Element.prototype.scrollIntoView = vi.fn();
    });

    beforeEach(() => {
        window.localStorage.clear();
        document.body.className = '';
        document.documentElement.style.fontSize = '';
        document.documentElement.classList.remove('acc-invertir');
    });

    afterEach(() => {
        window.localStorage.clear();
        document.body.className = '';
        document.documentElement.style.fontSize = '';
        document.documentElement.classList.remove('acc-invertir');
    });

    it('incluye el buscador institucional que envía a los resultados de unal.edu.co', () => {
        render(<InstitutionalHeader />);

        const buscadores = screen.getAllByRole('search', {
            name: 'Buscar en la Universidad',
        });
        expect(buscadores.length).toBeGreaterThanOrEqual(1);

        for (const buscador of buscadores) {
            expect(buscador).toHaveAttribute(
                'action',
                'https://unal.edu.co/resultados-de-la-busqueda/',
            );
            expect(buscador).toHaveAttribute('target', '_blank');
        }

        expect(document.querySelector('input[name="q"]')).not.toBeNull();
    });

    it('usa un indicador desplegable compacto en lugar del carácter ▼', () => {
        const { container } = render(<InstitutionalHeader />);

        // Escritorio: dos menús con caret (INFORMACIÓN DE INTERÉS y SEDES).
        expect(
            container.querySelectorAll('svg[aria-hidden="true"][width="8"]')
                .length,
        ).toBeGreaterThanOrEqual(2);
        expect(container.textContent).not.toContain('▼');
    });

    it('aplica el modo de contraste como clase en <body> y lo persiste', async () => {
        const user = userEvent.setup();
        render(<InstitutionalHeader />);

        await user.click(
            screen.getByRole('button', { name: 'Panel de Accesibilidad' }),
        );
        await user.click(screen.getByRole('button', { name: '2' }));

        expect(document.body.classList.contains('contraste-2')).toBe(true);
        expect(document.body.classList.contains('contraste-1')).toBe(false);
        expect(window.localStorage.getItem('accContraste')).toBe('2');
    });

    it('escala el tamaño de letra con A+/A-, muestra el % y lo persiste', async () => {
        const user = userEvent.setup();
        render(<InstitutionalHeader />);

        await user.click(
            screen.getByRole('button', { name: 'Panel de Accesibilidad' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Aumentar tamaño de letra' }),
        );

        expect(document.documentElement.style.fontSize).toBe('110%');
        expect(screen.getByText('110%')).toBeInTheDocument();
        expect(window.localStorage.getItem('accTamanoLetra')).toBe('110');

        await user.click(
            screen.getByRole('button', { name: 'Disminuir tamaño de letra' }),
        );
        expect(document.documentElement.style.fontSize).toBe('100%');
        expect(window.localStorage.getItem('accTamanoLetra')).toBe('100');
    });

    it('restablece tamaño, contraste e inversión con "Restablecer ajustes"', async () => {
        const user = userEvent.setup();
        render(<InstitutionalHeader />);

        await user.click(
            screen.getByRole('button', { name: 'Panel de Accesibilidad' }),
        );
        await user.click(screen.getByRole('button', { name: '3' }));
        await user.click(
            screen.getByRole('button', { name: 'Aumentar tamaño de letra' }),
        );

        const aplicarButtons = screen.getAllByRole('button', {
            name: 'Aplicar',
        });
        await user.click(aplicarButtons[0]!); // Invertir colores
        expect(
            document.documentElement.classList.contains('acc-invertir'),
        ).toBe(true);

        await user.click(aplicarButtons[1]!); // Restablecer ajustes
        expect(document.documentElement.style.fontSize).toBe('100%');
        expect(document.body.className).not.toContain('contraste-');
        expect(
            document.documentElement.classList.contains('acc-invertir'),
        ).toBe(false);
        expect(window.localStorage.getItem('accContraste')).toBe('0');
        expect(window.localStorage.getItem('accTamanoLetra')).toBe('100');
        expect(window.localStorage.getItem('accInvertirColores')).toBe('false');
    });

    it('deja la paleta normal por defecto (sin clase de contraste en <body>)', () => {
        render(<InstitutionalHeader />);

        expect(document.body.className).not.toContain('contraste-');
        expect(window.localStorage.getItem('accContraste')).toBe('0');
    });

    it('deselecciona el contraste activo al pulsar el mismo número de nuevo', async () => {
        const user = userEvent.setup();
        render(<InstitutionalHeader />);

        await user.click(
            screen.getByRole('button', { name: 'Panel de Accesibilidad' }),
        );
        await user.click(screen.getByRole('button', { name: '2' }));
        expect(document.body.classList.contains('contraste-2')).toBe(true);

        await user.click(screen.getByRole('button', { name: '2' }));
        expect(document.body.className).not.toContain('contraste-');
        expect(window.localStorage.getItem('accContraste')).toBe('0');
    });

    it('restaura las preferencias guardadas al volver a montar el header', async () => {
        const user = userEvent.setup();
        const first = render(<InstitutionalHeader />);
        await user.click(
            screen.getByRole('button', { name: 'Panel de Accesibilidad' }),
        );
        await user.click(screen.getByRole('button', { name: '2' }));
        first.unmount();

        render(<InstitutionalHeader />);

        expect(document.body.classList.contains('contraste-2')).toBe(true);
        expect(document.documentElement.style.fontSize).toBe('100%');
    });
});