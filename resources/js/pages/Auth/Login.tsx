import { useState, FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';

export default function Login() {
    const { login, requestOtp } = useAuth();
    
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleRequestOtp = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await requestOtp(email);
            setStep('otp');
            setSuccessMessage('Código enviado. Revisa tu correo electrónico.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al solicitar el código');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, otp);
            // Navegar al dashboard - Sanctum cookie se encarga de la autenticación
            window.location.href = '/dashboard';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Código inválido');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        setStep('email');
        setOtp('');
        setError('');
        setSuccessMessage('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-green-700">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-green-900">Mallas Académicas</h1>
                    <p className="text-gray-600 mt-2">Universidad Nacional de Colombia</p>
                    <p className="text-sm text-gray-500">Sede Manizales</p>
                </div>

                {step === 'email' ? (
                    <form onSubmit={handleRequestOtp}>
                        <div className="mb-6">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Correo electrónico institucional
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="correo@unal.edu.co"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Ingresa tu correo institucional (@unal.edu.co)
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                        >
                            {isLoading ? 'Enviando...' : 'Solicitar código de acceso'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                    Código de verificación
                                </label>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="text-sm text-green-700 hover:underline"
                                >
                                    Cambiar correo
                                </button>
                            </div>
                            <input
                                type="text"
                                id="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest"
                                placeholder="------"
                                maxLength={6}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Ingresa el código de 6 dígitos enviado a tu correo
                            </p>
                        </div>

                        {successMessage && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                                {successMessage}
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || otp.length !== 6}
                            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                        >
                            {isLoading ? 'Verificando...' : 'Iniciar sesión'}
                        </button>

                        <button
                            type="button"
                            onClick={handleBack}
                            className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition duration-200"
                        >
                            Solicitar nuevo código
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
