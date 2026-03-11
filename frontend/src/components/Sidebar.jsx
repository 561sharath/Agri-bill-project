import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials, avatarColor } from '../utils/formatCurrency';

const navItems = [
    { to: '/', icon: 'dashboard', label: 'Dashboard', end: true },
    { to: '/bills/create', icon: 'receipt_long', label: 'Create Bill' },
    { to: '/farmers', icon: 'groups', label: 'Farmers' },
    { to: '/inventory', icon: 'inventory_2', label: 'Inventory' },
    { to: '/credit-ledger', icon: 'menu_book', label: 'Credit Ledger' },
    { to: '/payments', icon: 'payments', label: 'Payments' },
    { to: '/reports', icon: 'bar_chart', label: 'Reports' },
];

const secondaryItems = [
    { to: '/settings', icon: 'settings', label: 'Settings' },
];

const Sidebar = ({ collapsed, onToggle }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside
            className={`
        ${collapsed ? 'w-16' : 'w-64'} 
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        flex flex-col transition-all duration-300 ease-in-out shrink-0 h-full
      `}
        >
            {/* Logo */}
            <div className={`p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-xl" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>eco</span>
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-base font-bold text-primary tracking-tight leading-none">AgriBill</h1>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Agri-Business Mgmt</p>
                    </div>
                )}

                {/* Collapse toggle */}
                <button
                    onClick={onToggle}
                    className={`ml-auto p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer ${collapsed ? 'hidden' : ''}`}
                    aria-label="Collapse sidebar"
                >
                    <span className="material-symbols-outlined text-lg" style={{ fontSize: '18px' }}>chevron_left</span>
                </button>
            </div>

            {/* Expand button when collapsed */}
            {collapsed && (
                <button
                    onClick={onToggle}
                    className="mx-auto mt-2 p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                    aria-label="Expand sidebar"
                >
                    <span className="material-symbols-outlined text-lg" style={{ fontSize: '18px' }}>chevron_right</span>
                </button>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer group
              ${collapsed ? 'justify-center' : ''}
              ${isActive
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className="material-symbols-outlined shrink-0"
                                    style={{
                                        fontSize: '20px',
                                        fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                    }}
                                >
                                    {item.icon}
                                </span>
                                {!collapsed && (
                                    <span className="text-sm font-medium truncate">{item.label}</span>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {secondaryItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={collapsed ? item.label : undefined}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span
                                        className="material-symbols-outlined shrink-0"
                                        style={{
                                            fontSize: '20px',
                                            fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                        }}
                                    >
                                        {item.icon}
                                    </span>
                                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* User footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                <div className={`flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(user?.name || 'A')}`}>
                        {getInitials(user?.name || 'Admin')}
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold truncate">{user?.name || 'Shop Owner'}</p>
                                <p className="text-[10px] text-slate-500 truncate">{user?.role || 'Admin'}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                title="Logout"
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
