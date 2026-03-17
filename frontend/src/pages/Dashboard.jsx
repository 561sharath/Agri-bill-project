import { useState, useEffect } from 'react';
import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatCurrency';

const MonthlyRevenueChart = lazy(() => import('../components/Charts').then(m => ({ default: m.MonthlyRevenueChart })));
const WeeklyRevenueChart = lazy(() => import('../components/Charts').then(m => ({ default: m.WeeklyRevenueChart })));
import { dashboardAPI } from '../services/api';

// ─── Individual metric fetcher with isolated error state ─────────────────────
const useDashboardSection = (apiFn) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetch = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await apiFn();
            setData(res?.data || null);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch();
    }, []);

    return { data, loading, error, refetch: fetch };
};

// ─── Metric Card with individual error boundary ───────────────────────────────
const MetricFallback = ({ label }) => (
    <div className="card p-5 border border-dashed border-red-200 dark:border-red-800 flex items-center gap-3 opacity-70">
        <span className="material-symbols-outlined text-red-400" style={{ fontSize: '20px' }}>error</span>
        <p className="text-xs text-red-400">{label} unavailable</p>
    </div>
);

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl ${className}`} />
);

const Dashboard = () => {
    const navigate = useNavigate();

    // Independent Data Fetching
    const { data: sales, loading: loadingSales, error: errorSales } = useDashboardSection(dashboardAPI.getSales);
    const { data: farmers, loading: loadingFarmers, error: errorFarmers } = useDashboardSection(dashboardAPI.getFarmers);
    const { data: credit, loading: loadingCredit, error: errorCredit } = useDashboardSection(dashboardAPI.getCredit);
    const { data: inventory, loading: loadingInventory, error: errorInventory } = useDashboardSection(dashboardAPI.getInventory);
    const { data: charts, loading: loadingCharts, error: errorCharts } = useDashboardSection(dashboardAPI.getCharts);

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
                </div>
            </div>

            {/* Independent KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {/* 1. Today Sales */}
                {loadingSales ? <Skeleton className="h-28" /> : errorSales ? <MetricFallback label="Today's Sales" /> : (
                    <div className="card p-5 group flex justify-between relative overflow-hidden h-full">
                        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-primary/10 opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                        <div className="flex flex-col justify-between relative z-10 w-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>monitoring</span>
                                </div>
                            </div>
                            <h3 className="text-slate-500 font-semibold mb-1 truncate">Today's Sales</h3>
                            <div className="flex items-end justify-between w-full">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                                    {formatCurrency(sales?.todaySales?.amount || 0)}
                                </p>
                                {sales?.todaySales?.percentageChange !== undefined && (
                                    <div className={`flex items-center text-xs font-bold shrink-0 ml-2 ${sales.todaySales.percentageChange > 0 ? 'text-emerald-500' : sales.todaySales.percentageChange < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                        {sales.todaySales.percentageChange > 0 && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>}
                                        {sales.todaySales.percentageChange < 0 && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_down</span>}
                                        <span className="ml-[1px]">{Math.abs(sales.todaySales.percentageChange)}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 2. Monthly Revenue */}
                {loadingSales ? <Skeleton className="h-28" /> : errorSales ? <MetricFallback label="Total Revenue" /> : (
                    <div className="card p-5 group flex justify-between relative overflow-hidden h-full">
                        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/10 opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                        <div className="flex flex-col justify-between relative z-10 w-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>payments</span>
                                </div>
                            </div>
                            <h3 className="text-slate-500 font-semibold mb-1 truncate">Total Rev (This Mnt)</h3>
                            <div className="flex items-end justify-between w-full">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                                    {formatCurrency(sales?.totalCreditGiven || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Total Farmers */}
                {loadingFarmers ? <Skeleton className="h-28" /> : errorFarmers ? <MetricFallback label="Active Farmers" /> : (
                    <div className="card p-5 group flex justify-between relative overflow-hidden h-full">
                        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-900/10 opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                        <div className="flex flex-col justify-between relative z-10 w-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>groups</span>
                                </div>
                            </div>
                            <h3 className="text-slate-500 font-semibold mb-1 truncate">Active Farmers</h3>
                            <div className="flex items-end justify-between w-full">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                                    {farmers?.totalFarmers?.count || 0}
                                </p>
                                {farmers?.totalFarmers?.percentageChange !== undefined && (
                                    <div className={`flex items-center text-xs font-bold shrink-0 ml-2 ${farmers.totalFarmers.percentageChange > 0 ? 'text-emerald-500' : farmers.totalFarmers.percentageChange < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                        {farmers.totalFarmers.percentageChange > 0 && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>}
                                        {farmers.totalFarmers.percentageChange < 0 && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_down</span>}
                                        <span className="ml-[1px]">{Math.abs(farmers.totalFarmers.percentageChange)}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Pending Credit */}
                {loadingCredit ? <Skeleton className="h-28" /> : errorCredit ? <MetricFallback label="Pending Credit" /> : (
                    <div className="card p-5 group flex justify-between relative overflow-hidden h-full">
                        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-orange-100 dark:bg-orange-900/30 opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                        <div className="flex flex-col justify-between relative z-10 w-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-11 w-11 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-orange-500 dark:text-orange-400" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                                </div>
                            </div>
                            <h3 className="text-slate-500 font-semibold mb-1 truncate">Pending Credit (This Mnt)</h3>
                            <div className="flex items-end justify-between w-full">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                                    {formatCurrency(credit?.pendingCreditThisMonth?.amount || 0)}
                                </p>
                                {credit?.pendingCreditThisMonth?.percentageChange !== undefined && (
                                    <div className={`flex items-center text-xs font-bold shrink-0 ml-2 ${credit.pendingCreditThisMonth.percentageChange > 0 ? 'text-emerald-500' : credit.pendingCreditThisMonth.percentageChange < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                        {credit.pendingCreditThisMonth.percentageChange > 0 && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>}
                                        {credit.pendingCreditThisMonth.percentageChange < 0 && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_down</span>}
                                        <span className="ml-[1px]">{Math.abs(credit.pendingCreditThisMonth.percentageChange)}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Charts + Ledger */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loadingCharts ? [0, 1].map(i => <Skeleton key={i} className="h-48" />) : errorCharts ? (
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
                                        [...Array(3)].map((_, i) => (
                                            <tr key={i}><td colSpan={4} className="px-5 py-3"><Skeleton className="h-4" /></td></tr>
                                        ))
                                    ) : errorCredit ? (
                                        <tr><td colSpan={4} className="px-5 py-6"><MetricFallback label="Pending Ledger" /></td></tr>
                                    ) : (credit?.pendingLedger?.length || 0) > 0 ? (
                                        credit?.pendingLedger?.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-sm">{item?.farmerName || 'Unknown'}</td>
                                                <td className="px-5 py-3.5 font-bold text-red-500 text-sm">{formatCurrency(item?.amount || 0)}</td>
                                                <td className="px-5 py-3.5 text-sm">
                                                    <span className={`badge ${(item?.daysPending || 0) > 30 ? 'badge-danger' : 'badge-warning'}`}>
                                                        {item?.daysPending || 0} days
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <button
                                                        onClick={() => navigate('/payments')}
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
                            <button
                                onClick={() => navigate('/bills/create')}
                                className="w-full bg-white text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-95 transition-all shadow-md text-sm cursor-pointer"
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                                Create New Bill
                            </button>
                            <button
                                onClick={() => navigate('/farmers')}
                                className="w-full bg-primary-600/60 border border-white/30 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-sm cursor-pointer"
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>person_add</span>
                                Add Farmer
                            </button>
                            <button
                                onClick={() => navigate('/payments')}
                                className="w-full bg-primary-600/60 border border-white/30 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-sm cursor-pointer"
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>account_balance</span>
                                Record Payment
                            </button>
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
                                inventory?.lowStockProducts?.map((item, i) => {
                                    const isCritical = (item?.stock || 0) <= 5;
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className={`h-10 w-10 flex items-center justify-center rounded-xl shrink-0
                                                ${isCritical ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-500'}`}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                                                    {isCritical ? 'warning' : 'error'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">{item?.productName || 'Unknown Product'}</p>
                                                <p className="text-xs text-slate-500">
                                                    {isCritical ? `🔴 Critical: ${item?.stock || 0} units` : `🟠 Low: ${item?.stock || 0} units`}
                                                </p>
                                            </div>
                                            <button
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
