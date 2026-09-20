import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Link: (props: React.ComponentProps<'a'>) => <a {...props} />,
    router: { visit: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ login: vi.fn(), requestOtp: vi.fn() }),
}));

import { anioActual } from '../lib/anio';
import Login from '../pages/Auth/Login';
import ProgramasActivos from '../pages/Inicio/ProgramasActivos';

describe('Manejo del año (Tarea 3: no dejar años hardcodeados)', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('anioActual() devuelve el año del reloj del sistema', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2027-03-15T12:00:00'));

        expect(anioActual()).toBe(2027);
    });

    it('Login muestra el año actual dinámicamente', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2027-01-15T08:00:00'));

        render(<Login />);

        expect(screen.getByText('2027')).toBeInTheDocument();
    });

    it('ProgramasActivos muestra "Admisiones" con el año actual dinámico', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2027-03-15T12:00:00'));

        render(<ProgramasActivos facultades={[]} />);

        expect(screen.getByText('Admisiones 2027')).toBeInTheDocument();
    });
});
