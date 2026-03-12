import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardCards from '../components/DashboardCards';
import { MonthlyRevenueChart, WeeklyRevenueChart } from '../components/Charts';
import { formatCurrency } from '../utils/formatCurrency';
import { dashboardAPI } from '../services/api';

// ─── Individual metric fetcher with isolated error state ─────────────────────
const useDashboardSection = (key) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await dashboardAPI.getSummary();
                setData(res.data[key]);
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [key]);

    return { data, loading, error };
};

// ─── Full dashboard data (one call, split rendering) ─────────────────────────
const useDashboardAll = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const refetch = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await dashboardAPI.getSummary();
            setData(res.data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refetch(); }, []);
    return { data, loading, error, refetch };
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
    const { data, loading, error, refetch } = useDashboardAll();

    const defaults = {
        todaySales: { amount: 0, percentageChange: 0 },
        totalCreditGiven: 0,
        pendingCreditThisMonth: { amount: 0, percentageChange: 0 },
        totalFarmers: { count: 0, percentageChange: 0 },
        monthlyRevenue: [],
        weeklyRevenue: [],
        pendingLedger: [],
        lowStockProducts: []
    };

    const d = data || defaults;

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
                </div>
                {error && (
                    <button onClick={refetch} className="btn-outline text-sm text-red-500 border-red-200">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                        Retry
                    </button>
                )}
            </div>

            {/* KPI Cards — even if loading show skeleton */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
            ) : error ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Today Sales', 'Total Credit', 'Farmers', 'Pending Credit'].map(label => (
                        <MetricFallback key={label} label={label} />
                    ))}
                </div>
            ) : (
                <DashboardCards stats={d} />
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Charts + Ledger */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading
                            ? [0, 1].map(i => <Skeleton key={i} className="h-48" />)
                            : <>
                                <MonthlyRevenueChart data={d.monthlyRevenue} />
                                <WeeklyRevenueChart data={d.weeklyRevenue} />
                            </>
                        }
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
                                    {loading ? (
                                        [...Array(3)].map((_, i) => (
                                            <tr key={i}><td colSpan={4} className="px-5 py-3"><Skeleton className="h-4" /></td></tr>
                                        ))
                                    ) : d.pendingLedger?.length > 0 ? (
                                        d.pendingLedger.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-sm">{item.farmerName}</td>
                                                <td className="px-5 py-3.5 font-bold text-red-500 text-sm">{formatCurrency(item.amount)}</td>
                                                <td className="px-5 py-3.5 text-sm">
                                                    <span className={`badge ${item.daysPending > 30 ? 'badge-danger' : 'badge-warning'}`}>
                                                        {item.daysPending} days
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
                            {loading ? (
                                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)
                            ) : d.lowStockProducts?.length > 0 ? (
                                d.lowStockProducts.map((item, i) => {
                                    const isCritical = item.stock <= 5;
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className={`h-10 w-10 flex items-center justify-center rounded-xl shrink-0
                                                ${isCritical ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-500'}`}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                                                    {isCritical ? 'warning' : 'error'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">{item.productName}</p>
                                                <p className="text-xs text-slate-500">
                                                    {isCritical ? `🔴 Critical: ${item.stock} units` : `🟠 Low: ${item.stock} units`}
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
