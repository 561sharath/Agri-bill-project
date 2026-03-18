import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // QUICK WIN: show/hide toggle
    const { login, isAuthenticated, initialising } = useAuth();
    const navigate = useNavigate();

    // FIX: if AuthContext is still resolving its initial auth check (e.g. validating
    // a stored token), don't flash the login form or redirect prematurely.
    // `initialising` should be a boolean exported from AuthContext; if your context
    // doesn't expose it yet, add `const [initialising, setInitialising] = useState(true)`
    // that flips to false after the first auth check completes.
    if (initialising) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return; // guard against double-submit
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Logged in successfully!');
            navigate('/');
        } catch (err) {
            // FIX: original always showed the same generic message regardless of error type.
            // Now surfaces the server's message when available, with sensible fallbacks.
            const status = err?.response?.status;
            const serverMsg = err?.response?.data?.message;
            if (serverMsg) {
                toast.error(serverMsg);
            } else if (status === 401 || status === 403) {
                toast.error('Invalid email or password.');
            } else if (!navigator.onLine) {
                toast.error('No internet connection. Please check your network.');
            } else {
                toast.error('Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex text-slate-900 bg-white dark:bg-slate-900 overflow-hidden relative">

            {/* Left panel — branding */}
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
                        Streamline billing, track credit reliably, and manage stock — all in one powerful dashboard tailored for agri-businesses.
                    </p>
                </div>
                {/* FIX: missing pointer-events-none — decorative element was eating hover/click events */}
                <div className="absolute right-0 top-0 translate-x-[40%] -translate-y-[20%] w-[35rem] h-[35rem] bg-white/5 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white dark:bg-slate-900 z-10">
                <div className="w-full max-w-[400px] animate-fade-in">

                    {/* Mobile logo */}
                    <div className="mb-8 lg:hidden flex justify-center">
                        <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Welcome Back</h2>
                        <p className="text-slate-500 dark:text-slate-400">Sign in to your AgriBill account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                        {/* Email */}
                        <div>
                            <label className="label text-slate-700 dark:text-slate-300" htmlFor="login-email">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '18px' }}>mail</span>
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    // QUICK WIN: autoFocus so user can start typing immediately
                                    autoFocus
                                    // FIX: autoComplete lets password managers fill the form
                                    autoComplete="email"
                                    required
                                    disabled={loading}
                                    placeholder="you@example.com"
                                    className="input pl-10 py-2.5 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="label text-slate-700 dark:text-slate-300" htmlFor="login-password">
                                    Password
                                </label>
                                {/* FIX: was <a href="#"> — scrolled page to top and added # to URL */}
                                <button
                                    type="button"
                                    className="text-xs font-bold text-primary hover:underline"
                                    onClick={() => toast('Password reset is not available yet.', { icon: 'ℹ️' })}
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '18px' }}>lock</span>
                                {/* QUICK WIN: show/hide toggle for password */}
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    disabled={loading}
                                    className="input pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="btn-primary w-full py-3 mt-4 text-base shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>progress_activity</span>
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <span className="material-symbols-outlined ml-1" style={{ fontSize: '20px' }}>arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;