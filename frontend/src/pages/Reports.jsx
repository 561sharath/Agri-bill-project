import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import toast from 'react-hot-toast';
import { reportsAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import TruncatedText from '../components/TruncatedText';

// FIX: lazy imports moved to top — interleaving static imports after dynamic
// expressions breaks eslint import/order and is confusing to read
const MonthlySalesLineChart = lazy(() =>
    import('../components/Charts').then(m => ({ default: m.MonthlySalesLineChart }))
);
const TopProductsChart = lazy(() =>
    import('../components/Charts').then(m => ({ default: m.TopProductsChart }))
);

// ── Skeleton card (used while loading) ───────────────────────────────────────
const SkeletonCard = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl ${className}`} />
);

// ── Reports ───────────────────────────────────────────────────────────────────
const Reports = () => {
    const [monthlyData, setMonthlyData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // FIX: wrapped in useCallback so a retry button can call it safely and deps
    // can be added later without introducing stale closure bugs
    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [salesRes, productsRes] = await Promise.all([
                reportsAPI.getMonthlySales(),
                reportsAPI.getTopProducts(),
            ]);
            setMonthlyData(Array.isArray(salesRes?.data) ? salesRes.data : []);
            setTopProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
        } catch {
            toast.error('Failed to load reports');
            setError(true);
            setMonthlyData([]);
            setTopProducts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    // ── Summary totals ────────────────────────────────────────────────────────
    // REFACTOR: three separate reduce calls → one pass
    const { totalSales, totalCredit, totalCollected } = useMemo(() => {
        return monthlyData.reduce(
            (acc, m) => ({
                totalSales: acc.totalSales + (m?.sales || 0),
                totalCredit: acc.totalCredit + (m?.credit || 0),
                totalCollected: acc.totalCollected + (m?.payments || 0),
            }),
            { totalSales: 0, totalCredit: 0, totalCollected: 0 }
        );
    }, [monthlyData]);

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExportCSV = useCallback(async () => {
        try {
            const res = await reportsAPI.exportCSV('sales');
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'agribill_report.csv';
            // FIX: was missing appendChild/remove — silent failure in Firefox
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success('CSV downloaded');
        } catch {
            toast.error('Export failed');
        }
    }, []);

    // REFACTOR: summary card config — was 3× identical markup blocks
    const summaryCards = [
        {
            key: 'revenue',
            label: 'Total Revenue',
            value: formatCurrency(totalSales),
            icon: 'monitoring',
            iconColor: 'text-primary',
            iconBg: 'bg-primary/10',
            border: 'border-primary',
        },
        {
            key: 'credit',
            label: 'Credit Extensions',
            value: formatCurrency(totalCredit),
            icon: 'account_balance_wallet',
            iconColor: 'text-orange-600',
            iconBg: 'bg-orange-50 dark:bg-orange-900/10',
            border: 'border-orange-500',
        },
        {
            key: 'collected',
            label: 'Collection',
            value: formatCurrency(totalCollected),
            icon: 'payments',
            iconColor: 'text-emerald-600',
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/10',
            border: 'border-emerald-500',
        },
    ];

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">

            {/* Header — always visible, never hidden by loading state */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Reports &amp; Analytics</h1>
                    <p className="page-subtitle">Track your business performance and top selling items</p>
                </div>
                {/* FIX: missing type="button" */}
                <button type="button" onClick={handleExportCSV} disabled={loading} className="btn-outline text-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                    Export CSV
                </button>
            </div>

            {/* FIX: replaced full-page blocking spinner with inline skeleton cards.
                Original: `if (loading) return <spinner />` hid the entire page —
                header, export button, and summary cards were all invisible.
                Now the page renders immediately; each section shows its own skeleton. */}

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loading ? (
                    <>
                        <SkeletonCard className="h-24" />
                        <SkeletonCard className="h-24" />
                        <SkeletonCard className="h-24" />
                    </>
                ) : summaryCards.map(s => (
                    <div key={s.key} className={`card p-5 border-l-4 ${s.border}`}>
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-2xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                                <span
                                    className={`material-symbols-outlined ${s.iconColor}`}
                                    style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
                                >
                                    {s.icon}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{s.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Error state with retry */}
            {error && !loading && (
                <div className="card p-6 text-center border border-dashed border-red-200 dark:border-red-800">
                    <span className="material-symbols-outlined block text-4xl text-red-300 mb-2">error</span>
                    <p className="text-sm text-red-500 mb-3">Failed to load report data</p>
                    <button type="button" onClick={fetchReports} className="btn-outline text-sm">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                        Retry
                    </button>
                </div>
            )}

            {/* Charts
                FIX: original wrapped both charts in a single <Suspense> boundary —
                both were held until the slowest chunk loaded, killing the benefit of
                lazy loading. Each chart now has its own boundary so they render
                independently as their chunks arrive. */}
            {!error && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Suspense fallback={<SkeletonCard className="h-[300px]" />}>
                        <MonthlySalesLineChart data={monthlyData} />
                    </Suspense>
                    <Suspense fallback={<SkeletonCard className="h-[300px]" />}>
                        {topProducts.length > 0
                            ? <TopProductsChart data={topProducts} />
                            : !loading && (
                                // QUICK WIN: empty state when topProducts is empty
                                <div className="card h-[300px] flex flex-col items-center justify-center gap-2 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl text-slate-200">bar_chart</span>
                                    <p className="text-sm">No product sales data yet</p>
                                </div>
                            )
                        }
                    </Suspense>
                </div>
            )}

            {/* Monthly table */}
            {!error && (
                <div className="card overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Monthly Performance Breakup</h3>
                        {!loading && monthlyData.length > 0 && (
                            <span className="text-xs text-slate-400">{monthlyData.length} months</span>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60">
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Month</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Sales</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Credit</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Collected</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Collection Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    // QUICK WIN: per-cell skeletons instead of hiding the whole table
                                    [...Array(6)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-5 py-4"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                            <td className="px-5 py-4"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                                            <td className="px-5 py-4"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                                            <td className="px-5 py-4"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="flex-1 max-w-[100px] h-2 bg-slate-100 dark:bg-slate-800 rounded-full" />
                                                    <div className="h-3.5 w-10 bg-slate-100 dark:bg-slate-800 rounded" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : monthlyData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                                            No data available for the current period
                                        </td>
                                    </tr>
                                ) : (
                                    monthlyData.map((row) => {
                                        const credit = row?.credit || 0;
                                        const payments = row?.payments || 0;
                                        // FIX: collectionPct was a string from toFixed() then compared
                                        // with `>` to numbers — worked by JS coercion but fragile.
                                        // Now a proper number. Also clamped to 100 for the label too.
                                        const rawPct = credit > 0 ? (payments / credit) * 100 : 100;
                                        const collectionPct = Math.min(Math.round(rawPct), 100);
                                        // QUICK WIN: over-collection is data worth surfacing, not hiding
                                        const isOverCollected = payments > credit && credit > 0;

                                        return (
                                            // FIX: was using array index as key — use month string instead
                                            <tr key={row?.month || row?._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-5 py-4 font-bold text-sm text-slate-800 dark:text-slate-200">
                                                    <TruncatedText text={row?.month || 'Unknown'} />
                                                </td>
                                                <td className="px-5 py-4 text-right font-medium text-sm">
                                                    {formatCurrency(row?.sales || 0)}
                                                </td>
                                                <td className="px-5 py-4 text-right text-orange-600 font-bold text-sm">
                                                    {formatCurrency(credit)}
                                                </td>
                                                <td className="px-5 py-4 text-right text-emerald-600 font-bold text-sm">
                                                    {formatCurrency(payments)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <div className="flex-1 max-w-[100px] h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${collectionPct >= 100 ? 'bg-emerald-500'
                                                                        : collectionPct > 50 ? 'bg-amber-500'
                                                                            : 'bg-red-500'
                                                                    }`}
                                                                style={{ width: `${collectionPct}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-xs font-black w-10 ${isOverCollected
                                                                ? 'text-blue-500'
                                                                : 'text-slate-600 dark:text-slate-400'
                                                            }`}>
                                                            {isOverCollected ? '100%+' : `${collectionPct}%`}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;