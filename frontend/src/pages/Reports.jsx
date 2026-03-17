import { useState, useEffect } from 'react';
import { Suspense, lazy } from 'react';
import toast from 'react-hot-toast';
import { reportsAPI } from '../services/api';
const MonthlySalesLineChart = lazy(() => import('../components/Charts').then(m => ({ default: m.MonthlySalesLineChart })));
const TopProductsChart = lazy(() => import('../components/Charts').then(m => ({ default: m.TopProductsChart })));
import { formatCurrency } from '../utils/formatCurrency';
import TruncatedText from '../components/TruncatedText';

const Reports = () => {
    const [monthlyData, setMonthlyData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [salesRes, productsRes] = await Promise.all([
                reportsAPI.getMonthlySales(),
                reportsAPI.getTopProducts()
            ]);
            setMonthlyData(Array.isArray(salesRes?.data) ? salesRes.data : []);
            setTopProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
        } catch (err) {
            toast.error('Failed to load reports');
            setMonthlyData([]);
            setTopProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const totalSales = (monthlyData || []).reduce((s, m) => s + (m?.sales || 0), 0);
    const totalCredit = (monthlyData || []).reduce((s, m) => s + (m?.credit || 0), 0);
    const totalCollected = (monthlyData || []).reduce((s, m) => s + (m?.payments || 0), 0);

    const handleExportCSV = async () => {
        try {
            const res = await reportsAPI.exportCSV('sales');
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'agribill_report.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error('Export failed');
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Reports & Analytics</h1>
                    <p className="page-subtitle">Track your business performance and top selling items</p>
                </div>
                <button onClick={handleExportCSV} className="btn-outline text-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                    Export CSV
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-5 border-l-4 border-primary">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>monitoring</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Total Revenue</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(totalSales)}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-5 border-l-4 border-orange-500">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-orange-600" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Credit Extensions</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(totalCredit)}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-5 border-l-4 border-emerald-500">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>payments</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Collection</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(totalCollected)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Suspense fallback={<div className="h-[300px] animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                    <MonthlySalesLineChart data={monthlyData} />
                    <TopProductsChart data={topProducts} />
                </Suspense>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Monthly Performance Breakup</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60">
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Month</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Sales</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Credit</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Collected</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Collection Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {!(monthlyData?.length > 0) ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">No data available for the current period</td>
                                </tr>
                            ) : (
                                monthlyData.map((row, i) => {
                                    const collectionPct = (row?.credit || 0) > 0 ? (((row?.payments || 0) / row.credit) * 100).toFixed(0) : 100;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-5 py-4 font-bold text-sm text-slate-800 dark:text-slate-200">
                                                <TruncatedText text={row?.month || 'Unknown'} />
                                            </td>
                                            <td className="px-5 py-4 text-right font-medium text-sm">{formatCurrency(row?.sales || 0)}</td>
                                            <td className="px-5 py-4 text-right text-orange-600 font-bold text-sm">{formatCurrency(row?.credit || 0)}</td>
                                            <td className="px-5 py-4 text-right text-emerald-600 font-bold text-sm">{formatCurrency(row?.payments || 0)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="flex-1 max-w-[100px] h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${collectionPct > 80 ? 'bg-emerald-500' : collectionPct > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${Math.min(collectionPct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-600 dark:text-slate-400 w-10">{collectionPct}%</span>
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
        </div>
    );
};

export default Reports;
