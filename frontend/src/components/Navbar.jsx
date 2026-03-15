import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getShopDetails } from '../utils/shopStorage';

const Navbar = ({ title, onMobileMenuToggle }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('agribill_theme') === 'dark' ||
            (!localStorage.getItem('agribill_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('agribill_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('agribill_theme', 'light');
        }
    }, [darkMode]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
            {/* Mobile menu toggle */}
            <button
                onClick={onMobileMenuToggle}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer lg:hidden"
                aria-label="Toggle menu"
            >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>menu</span>
            </button>

            {/* Page title / Shop name */}
            <div className="flex-1 flex items-center gap-4">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 hidden sm:block">
                    {title || getShopDetails().shopName || 'AgriBill'}
                </h2>

                {/* Search */}
                <div className="relative flex-1 max-w-md hidden md:block">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '18px' }}>search</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search farmers, bills or inventory..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Dark mode toggle */}
                <button
                    onClick={() => setDarkMode(d => !d)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Toggle dark mode"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {darkMode ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>

                {/* Notifications */}
                <button
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
                    aria-label="Notifications"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                </button>

                <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* User avatar */}
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all">
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
