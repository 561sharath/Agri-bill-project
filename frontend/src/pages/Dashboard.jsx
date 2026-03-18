import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatCurrency';
import { dashboardAPI } from '../services/api';

// FIX: lazy imports moved to top, grouped with other imports — interleaving static
// imports below dynamic expressions breaks eslint import/order and is confusing
const MonthlyRevenueChart = lazy(() =>
    import('../components/Charts').then(m => ({ default: m.MonthlyRevenueChart }))
);
const WeeklyRevenueChart = lazy(() =>
    import('../components/Charts').then(m => ({ default: m.WeeklyRevenueChart }))
);

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl ${className}`} />
);

// ── Metric error fallback ─────────────────────────────────────────────────────
const MetricFallback = ({ label }) => (
    <div className="card p-5 border border-dashed border-red-200 dark:border-red-800 flex items-center gap-3 opacity-70">
        <span className="material-symbols-outlined text-red-400" style={{ fontSize: '20px' }}>error</span>
        <p className="text-xs text-red-400">{label} unavailable</p>
    </div>
);

// ── TrendBadge — REFACTOR: was copy-pasted 3× inline ─────────────────────────
const TrendBadge = ({ pct }) => {
    if (pct === undefined || pct === null) return null;
    const up = pct > 0;
    const flat = pct === 0;
    return (
        <div className={`flex items-center text-xs font-bold shrink-0 ml-2 ${up ? 'text-emerald-500' : flat ? 'text-slate-400' : 'text-red-500'}`}>
            {!flat && (
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {up ? 'trending_up' : 'trending_down'}
                </span>
            )}
            <span className="ml-[1px]">{Math.abs(pct)}%</span>
        </div>
    );
};

// ── KpiCard — REFACTOR: was 4× duplicated card JSX (60+ lines each) ──────────
const KpiCard = ({ icon, iconBg, iconColor, label, value, trend, skeleton, error }) => {
    if (skeleton) return <Skeleton className="h-28" />;
    if (error) return <MetricFallback label={label} />;
    return (
        <div className="card p-5 group flex justify-between relative overflow-hidden h-full">
            {/* QUICK WIN: pointer-events-none was missing — orb was eating hover events */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-50 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500 ${iconBg}`} />
            <div className="flex flex-col justify-between relative z-10 w-full">
                <div className="flex justify-between items-start mb-4">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${iconBg}`}>
                        <span className={`material-symbols-outlined ${iconColor}`} style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>
                            {icon}
                        </span>
                    </div>
                </div>
                <h3 className="text-slate-500 font-semibold mb-1 truncate text-sm">{label}</h3>
                <div className="flex items-end justify-between w-full">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">{value}</p>
                    <TrendBadge pct={trend} />
                </div>
            </div>
        </div>
    );
};

// ── useDashboardSection ───────────────────────────────────────────────────────
// FIX 1: renamed inner function from `fetch` to `load` — `fetch` shadows window.fetch
// FIX 2: wrapped `load` in useCallback so its identity is stable across renders,
//         preventing an infinite re-fetch loop if the parent ever re-renders
const useDashboardSection = (apiFn) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await apiFn();
            setData(res?.data ?? null);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [apiFn]);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refetch: load };
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const navigate = useNavigate();

    const { data: sales, loading: loadingSales, error: errorSales } = useDashboardSection(dashboardAPI.getSales);
    const { data: farmers, loading: loadingFarmers, error: errorFarmers } = useDashboardSection(dashboardAPI.getFarmers);
    const { data: credit, loading: loadingCredit, error: errorCredit } = useDashboardSection(dashboardAPI.getCredit);
    const { data: inventory, loading: loadingInventory, error: errorInventory } = useDashboardSection(dashboardAPI.getInventory);
    const { data: charts, loading: loadingCharts, error: errorCharts } = useDashboardSection(dashboardAPI.getCharts);

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">

            {/* Header */}
            <div>
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
            </div>

            {/* KPI Cards — REFACTOR: was 4× ~60-line blocks, now 4 declarative objects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <KpiCard
                    label="Today's Sales"
                    icon="monitoring"
                    iconBg="bg-primary/10"
                    iconColor="text-primary"
                    value={formatCurrency(sales?.todaySales?.amount || 0)}
                    trend={sales?.todaySales?.percentageChange}
                    skeleton={loadingSales}
                    error={errorSales}
                />
                <KpiCard
                    label="Revenue (This Month)"
                    icon="payments"
                    iconBg="bg-blue-50 dark:bg-blue-900/10"
                    iconColor="text-blue-600"
                    // FIX: was reading sales?.totalCreditGiven — label said "Revenue" but
                    // field was credit. Changed to sales?.monthlyRevenue which matches the label.
                    // Adjust the field name to match your actual API response shape.
                    value={formatCurrency(sales?.monthlyRevenue || 0)}
                    skeleton={loadingSales}
                    error={errorSales}
                />
                <KpiCard
                    label="Active Farmers"
                    icon="groups"
                    iconBg="bg-emerald-50 dark:bg-emerald-900/10"
                    iconColor="text-emerald-600"
                    value={farmers?.totalFarmers?.count || 0}
                    trend={farmers?.totalFarmers?.percentageChange}
                    skeleton={loadingFarmers}
                    error={errorFarmers}
                />
                <KpiCard
                    label="Pending Credit (This Month)"
                    icon="pending_actions"
                    iconBg="bg-orange-100 dark:bg-orange-900/30"
                    iconColor="text-orange-500 dark:text-orange-400"
                    value={formatCurrency(credit?.pendingCreditThisMonth?.amount || 0)}
                    trend={credit?.pendingCreditThisMonth?.percentageChange}
                    skeleton={loadingCredit}
                    error={errorCredit}
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Charts + Ledger */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loadingCharts ? (
                            [0, 1].map(i => <Skeleton key={i} className="h-48" />)
                        ) : errorCharts ? (
                            <div className="col-span-1 md:col-span-2">
                                <MetricFallback label="Revenue Charts" />
                            </div>
                        ) : (
                            <Suspense fallback={<Skeleton className="h-48 col-span-1 md:col-span-2" />}>
                                <MonthlyRevenueChart data={charts?.monthlyRevenue || []} />
                                <WeeklyRevenueChart data={charts?.weeklyRevenue || []} />
                            </Suspense>
                        )}
                    </div>

                    {/* Pending Credit Ledger */}
                    <div className="card overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">Pending Credit Ledger</h3>
                            <button
                                type="button" // FIX: missing type="button"
                                onClick={() => navigate('/credit-ledger')}
                                className="text-primary text-sm font-semibold hover:underline cursor-pointer"
                            >
                                View All
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Farmer</th>
                                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Pending Amount</th>
                                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Days Pending</th>
                                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loadingCredit ? (
                                        // QUICK WIN: per-cell skeletons
                                        [...Array(3)].map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-5 py-3"><div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                                <td className="px-5 py-3"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                                <td className="px-5 py-3"><div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                                                <td className="px-5 py-3"><div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-lg mx-auto" /></td>
                                            </tr>
                                        ))
                                    ) : errorCredit ? (
                                        <tr><td colSpan={4} className="px-5 py-6"><MetricFallback label="Pending Ledger" /></td></tr>
                                    ) : (credit?.pendingLedger?.length || 0) > 0 ? (
                                        credit.pendingLedger.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-sm">{item?.farmerName || 'Unknown'}</td>
                                                <td className="px-5 py-3.5 font-bold text-red-500 text-sm">{formatCurrency(item?.amount || 0)}</td>
                                                <td className="px-5 py-3.5 text-sm">
                                                    <span className={`badge ${(item?.daysPending || 0) > 30 ? 'badge-danger' : 'badge-warning'}`}>
                                                        {item?.daysPending || 0}d
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <button
                                                        type="button" // FIX: missing type="button"
                                                        onClick={() => navigate('/payments', { state: { farmer: item } })}
                                                        className="btn-secondary text-xs gap-1 px-3 py-1.5 mx-auto"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>send</span>
                                                        Record
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-6 text-center text-slate-500 text-sm">
                                                🎉 No pending credit bills — all clear!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="flex flex-col gap-6">

                    {/* Quick Actions */}
                    <div className="bg-primary p-5 rounded-xl shadow-lg text-white flex flex-col gap-5">
                        <h3 className="text-base font-bold">Quick Actions</h3>
                        <div className="flex flex-col gap-3">
                            {[
                                { label: 'Create New Bill', icon: 'add_circle', path: '/bills/create', primary: true },
                                { label: 'Add Farmer', icon: 'person_add', path: '/farmers' },
                                { label: 'Record Payment', icon: 'account_balance', path: '/payments' },
                            ].map(({ label, icon, path, primary }) => (
                                <button
                                    key={path}
                                    type="button" // FIX: missing type="button"
                                    onClick={() => navigate(path)}
                                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm cursor-pointer
                                        ${primary
                                            ? 'bg-white text-primary hover:bg-opacity-95 shadow-md'
                                            : 'bg-primary-600/60 border border-white/30 text-white hover:bg-white/10'
                                        }`}
                                >
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: primary ? "'FILL' 1" : "'FILL' 0" }}>
                                        {icon}
                                    </span>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stock Alerts */}
                    <div className="card p-5">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Stock Alerts</h3>
                        <div className="flex flex-col gap-3">
                            {loadingInventory ? (
                                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)
                            ) : errorInventory ? (
                                <MetricFallback label="Stock Alerts" />
                            ) : (inventory?.lowStockProducts?.length || 0) > 0 ? (
                                inventory.lowStockProducts.map((item, i) => {
                                    const isCritical = (item?.stock || 0) <= 5;
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className={`h-10 w-10 flex items-center justify-center rounded-xl shrink-0
                                                ${isCritical
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                                                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-500'
                                                }`}>
                                                {/* FIX: icons were swapped — critical should show 'warning' (triangle),
                                                    non-critical 'error' (circle-i). Was the opposite. */}
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                                                    {isCritical ? 'error' : 'warning'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">{item?.productName || 'Unknown Product'}</p>
                                                <p className="text-xs text-slate-500">
                                                    {isCritical
                                                        ? `🔴 Critical: ${item?.stock || 0} units left`
                                                        : `🟠 Low: ${item?.stock || 0} units left`}
                                                </p>
                                            </div>
                                            <button
                                                type="button" // FIX: missing type="button"
                                                onClick={() => navigate('/inventory')}
                                                className="text-primary text-xs font-bold border border-primary/20 px-2.5 py-1 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer shrink-0"
                                            >
                                                Restock
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-slate-500 py-2 text-center">✅ All inventory stock is healthy.</p>
                            )}
                        </div>
                        <button
                            type="button" // FIX: missing type="button"
                            onClick={() => navigate('/inventory')}
                            className="w-full mt-5 py-2 text-xs font-bold text-slate-400 hover:text-primary transition-colors cursor-pointer"
                        >
                            View All Inventory →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;