import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockRequestOtp = vi.fn();
const mockLogin = vi.fn();

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        requestOtp: mockRequestOtp,
    }),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { visit: vi.fn() },
}));

import Login from '../pages/Auth/Login';

describe('Login Page', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders the email step by default', () => {
        render(<Login />);

        expect(screen.getByText('Bienvenido')).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('usuario@unal.edu.co'),
        ).toBeInTheDocument();
        expect(screen.getByText('Obtener Acceso')).toBeInTheDocument();
    });

    it('advances to OTP step after submitting email', async () => {
        const user = userEvent.setup();
        mockRequestOtp.mockResolvedValue(undefined);
        render(<Login />);

        await user.type(
            screen.getByPlaceholderText('usuario@unal.edu.co'),
            'admin@unal.edu.co',
        );
        await user.click(screen.getByText('Obtener Acceso'));

        await screen.findByText(/Verifica tu identidad/);
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
        expect(mockRequestOtp).toHaveBeenCalledWith('admin@unal.edu.co');
    });

    it('disables verify button when OTP field is empty', async () => {
        const user = userEvent.setup();
        mockRequestOtp.mockResolvedValue(undefined);
        render(<Login />);

        await user.type(
            screen.getByPlaceholderText('usuario@unal.edu.co'),
            'admin@unal.edu.co',
        );
        await user.click(screen.getByText('Obtener Acceso'));

        await screen.findByPlaceholderText('000000');
        expect(screen.getByText('Validar y Entrar')).toBeDisabled();
    });
});
