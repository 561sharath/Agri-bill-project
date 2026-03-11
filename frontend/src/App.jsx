import { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateBill from './pages/CreateBill';
import Farmers from './pages/Farmers';
import Inventory from './pages/Inventory';
import CreditLedger from './pages/CreditLedger';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    // For demo: Always allow access if demo token present.
    const hasDemoToken = localStorage.getItem('agribill_token') === 'demo_token_xyz123';

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    if (!isAuthenticated && !hasDemoToken) return <Navigate to="/login" replace />;
    return children;
};

const AppLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Get dynamic title based on path
    const getPageTitle = useCallback(() => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path.includes('create')) return 'Create Bill';
        if (path.includes('farmers')) return 'Farmers Directory';
        if (path.includes('inventory')) return 'Inventory Management';
        if (path.includes('credit-ledger')) return 'Credit Ledger';
        if (path.includes('payments')) return 'Payments';
        if (path.includes('reports')) return 'Analytics Reports';
        if (path.includes('settings')) return 'Settings';
        return 'AgriBill';
    }, [location.pathname]);

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display transition-colors">
            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden lg:pointer-events-none animate-fade-in"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - responsive container */}
            <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto transition-transform duration-300 shadow-xl lg:shadow-none
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Navbar
                    title={getPageTitle()}
                    onMobileMenuToggle={() => setMobileMenuOpen(true)}
                />

                {/* Scrollable page body */}
                <div className="flex-1 overflow-y-auto">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/bills/create" element={<CreateBill />} />
                        <Route path="/bills/:id" element={<div className="p-6">Bill generation view dummy (Use Reports or Back)</div>} />
                        <Route path="/farmers" element={<Farmers />} />
                        <Route path="/farmers/add" element={<Farmers />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/credit-ledger" element={<CreditLedger />} />
                        <Route path="/payments" element={<Payments />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    className: 'dark:bg-slate-800 dark:text-white',
                    style: { borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                }}
            />
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <AppLayout />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
