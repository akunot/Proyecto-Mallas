import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

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