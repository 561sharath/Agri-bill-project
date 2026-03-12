import { useState, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout components (not lazy — always needed)
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// ─── Code-split pages (each chunk loads independently) ────────────────────────
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateBill = lazy(() => import('./pages/CreateBill'));
const Farmers = lazy(() => import('./pages/Farmers'));
const Inventory = lazy(() => import('./pages/Inventory'));
const CreditLedger = lazy(() => import('./pages/CreditLedger'));
const Payments = lazy(() => import('./pages/Payments'));
const CreditPaymentHistory = lazy(() => import('./pages/CreditPaymentHistory'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

// ─── Suspense fallback ────────────────────────────────────────────────────────
const PageLoader = () => (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
);

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <PageLoader />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
};

const AppLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    const getPageTitle = useCallback(() => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path.includes('/bills/create')) return 'Create Bill';
        if (path.includes('farmers')) return 'Farmers Directory';
        if (path.includes('inventory')) return 'Inventory Management';
        if (path.includes('credit-ledger')) return 'Credit Ledger';
        if (path.includes('credit-payment-history')) return 'Credit Payment History';
        if (path.includes('payments')) return 'Payment History';
        if (path.includes('reports')) return 'Analytics & Reports';
        if (path.includes('settings')) return 'Settings';
        return 'AgriBill';
    }, [location.pathname]);

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display transition-colors">
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden lg:pointer-events-none animate-fade-in"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto transition-transform duration-300 shadow-xl lg:shadow-none
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            </div>

            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Navbar title={getPageTitle()} onMobileMenuToggle={() => setMobileMenuOpen(true)} />
                <div className="flex-1 overflow-y-auto">
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/bills/create" element={<CreateBill />} />
                            <Route path="/bills/:id" element={<div className="p-6 text-slate-500">Bill detail view coming soon</div>} />
                            <Route path="/farmers" element={<Farmers />} />
                            <Route path="/farmers/:id" element={<Farmers />} />
                            <Route path="/farmers/:id/edit" element={<Farmers />} />
                            <Route path="/farmers/:id/transactions" element={<Farmers />} />
                            <Route path="/inventory" element={<Inventory />} />
                            <Route path="/credit-ledger" element={<CreditLedger />} />
                            <Route path="/payments" element={<Payments />} />
                            <Route path="/credit-payment-history" element={<CreditPaymentHistory />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
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
                    style: { borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                    duration: 4000,
                }}
            />
            <Router>
                <Suspense fallback={<PageLoader />}>
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
                </Suspense>
            </Router>
        </AuthProvider>
    );
};

export default App;
