import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Logged in successfully!');
            navigate('/');
        } catch (err) {
            toast.error('Invalid credentials or network error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex text-slate-900 bg-background-light dark:bg-slate-900 overflow-hidden relative">
            <div className="flex-[0.6] bg-primary relative hidden lg:flex flex-col justify-end p-12 text-white overflow-hidden">
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 animate-slide-up">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
                        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold font-display leading-tight mb-4">
                        Manage your fertilizer business with ease.
                    </h1>
                    <p className="text-lg text-primary-100 max-w-xl">
                        Streamline billing, track credit reliably, and manage stock – all in one powerful dashboard tailored for agri-businesses.
                    </p>
                </div>

                {/* Decorative circle graphic */}
                <div className="absolute right-0 top-0 translate-x-[40%] -translate-y-[20%] w-[35rem] h-[35rem] bg-white/5 rounded-full blur-3xl" />
            </div>

            <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white dark:bg-slate-900 z-10">
                <div className="w-full max-w-[400px] animate-fade-in">
                    <div className="mb-8 lg:hidden flex justify-center">
                        <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                    </div>
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Welcome Back</h2>
                        <p className="text-slate-500 dark:text-slate-400">Sign in to your AgriBill account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div>
                            <label className="label text-slate-700 dark:text-slate-300">Email Address</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: '18px' }}>mail</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input pl-10 py-2.5 bg-slate-50 dark:bg-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="label text-slate-700 dark:text-slate-300">Password</label>
                                <a href="#" className="text-xs font-bold text-primary hover:underline">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: '18px' }}>lock</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pl-10 py-2.5 bg-slate-50 dark:bg-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 mt-4 text-base shadow-lg shadow-primary/20"
                        >
                            {loading ? (
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            ) : (
                                <>
                                    Sign In
                                    <span className="material-symbols-outlined ml-1" style={{ fontSize: '20px' }}>arrow_forward</span>
                                </>
                            )}
                        </button>

                        {/* <p className="text-center text-xs text-slate-500 mt-2">
                            Demo Account — User: <span className="font-mono">admin@agribill.com</span> | Pass: <span className="font-mono">123456</span>
                        </p> */}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
