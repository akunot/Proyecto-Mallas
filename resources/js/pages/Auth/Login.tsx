import { useState, FormEvent } from 'react';
import { Head, router } from '@inertiajs/react';
import { useAuth } from '../../context/AuthContext';

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
            setSuccessMessage('Hemos enviado un código de seguridad a tu correo.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'No pudimos encontrar tu cuenta institucional.');
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
            router.visit('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'El código ingresado es incorrecto o expiró.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen login-bg flex items-center justify-center p-6">
            <Head title="Acceso al Sistema" />
            
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 login-card overflow-hidden">
                
                {/* Lado Izquierdo: Branding (Solo visible en Desktop) */}
                <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-8">
                            <span className="text-[#00236f] font-black text-xl">UN</span>
                        </div>
                        <h2 className="text-4xl font-black leading-tight tracking-tight">
                            Sistema de Gestión <br /> 
                            <span className="text-blue-400">Curricular</span>
                        </h2>
                        <p className="mt-4 text-slate-400 font-medium max-w-xs leading-relaxed">
                            Plataforma oficial para la administración de mallas académicas de la Sede Manizales.
                        </p>
                    </div>
                    
                    <div className="relative z-10 flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>Universidad Nacional de Colombia</span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span>2026</span>
                    </div>

                    {/* Decoración abstracta de fondo */}
                    <span className="material-symbols-outlined absolute -right-20 -bottom-20 !text-[300px] opacity-10 rotate-12 pointer-events-none">
                        account_tree
                    </span>
                </div>

                {/* Lado Derecho: Formulario */}
                <div className="p-8 lg:p-16 flex flex-col justify-center bg-white">
                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            {step === 'email' ? 'Bienvenido' : 'Verifica tu identidad'}
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            {step === 'email' 
                                ? 'Ingresa tus credenciales institucionales' 
                                : `Introduce el código enviado a ${email}`}
                        </p>
                    </div>

                    {/* Alertas */}
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <span className="material-symbols-outlined !text-xl">error</span>
                            <p className="text-sm font-bold leading-tight">{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <span className="material-symbols-outlined !text-xl">mail</span>
                            <p className="text-sm font-bold leading-tight">{successMessage}</p>
                        </div>
                    )}

                    {step === 'email' ? (
                        <form onSubmit={handleRequestOtp} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 ml-1">
                                    Correo Institucional
                                </label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        alternate_email
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 text-slate-900 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                        placeholder="usuario@unal.edu.co"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#00236f] hover:bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
                            >
                                {isLoading ? 'Procesando...' : 'Obtener Acceso'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2 text-center">
                                <label className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">
                                    Código de 6 dígitos
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="otp-input-field w-full"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    disabled={isLoading || otp.length !== 6}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
                                >
                                    {isLoading ? 'Autenticando...' : 'Validar y Entrar'}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => { setStep('email'); setOtp(''); }}
                                    className="w-full py-4 text-slate-400 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-colors"
                                >
                                    Corregir correo electrónico
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}