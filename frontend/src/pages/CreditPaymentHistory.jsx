import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { paymentsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import Pagination from '../components/Pagination';

// Get today's date in YYYY-MM-DD format
const todayStr = () => new Date().toISOString().split('T')[0];

const CreditPaymentHistory = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [exporting, setExporting] = useState(false);

    // Default: today's date
    const [filters, setFilters] = useState({
        startDate: todayStr(),
        endDate: todayStr(),
    });

    const fetchPayments = async (p = page, f = filters) => {
        setLoading(true);
        try {
            const params = { page: p, limit: 20 };
            if (f.startDate) params.startDate = f.startDate;
            if (f.endDate) params.endDate = f.endDate;
            const res = await paymentsAPI.getAll(params);
            setPayments(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setTotalRecords(res.data.totalRecords || 0);
        } catch {
            toast.error('Failed to load credit payment history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPayments(page, filters); }, [page, filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(f => ({ ...f, [name]: value }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setFilters({ startDate: todayStr(), endDate: todayStr() });
        setPage(1);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            const res = await paymentsAPI.exportExcel(params);
            const url = window.URL.createObjectURL(
                new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            );
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `credit-payment-history-${filters.startDate || 'all'}-to-${filters.endDate || 'today'}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Excel downloaded!');
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);

    const methodBadge = (method) => {
        const map = { cash: 'badge-success', upi: 'badge-primary', bank: 'badge-info', cheque: 'badge-warning' };
        return <span className={`badge ${map[method] || 'badge-info'} capitalize`}>{method}</span>;
    };

    const isCustomFilter = filters.startDate !== todayStr() || filters.endDate !== todayStr();

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Credit Payment History</h1>
                    <p className="page-subtitle">Track credit-clearing payments by date. Defaults to today.</p>
                </div>
                <button onClick={handleExport} disabled={exporting} className="btn-outline">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                    {exporting ? 'Exporting...' : 'Download Excel'}
                </button>
            </div>

            {/* Date Filter */}
            <div className="card p-4 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1">
                    <label className="label">Start Date</label>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="input" />
                </div>
                <div className="flex-1">
                    <label className="label">End Date</label>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="input" min={filters.startDate} />
                </div>
                {isCustomFilter && (
                    <button onClick={handleClearFilters} className="btn-outline text-sm shrink-0">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>today</span>
                        Reset to Today
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Amount Collected', value: formatCurrency(totalCollected), icon: 'payments', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
                    { label: 'Total Transactions', value: totalRecords, icon: 'receipt', color: 'text-primary', bg: 'bg-primary/5' },
                    {
                        label: 'Period',
                        value: filters.startDate === filters.endDate
                            ? new Date(filters.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : `${new Date(filters.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(filters.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
                        icon: 'calendar_month',
                        color: 'text-blue-600',
                        bg: 'bg-blue-50 dark:bg-blue-900/10'
                    },
                ].map((s, i) => (
                    <div key={i} className="card p-5 flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                            <span className={`material-symbols-outlined ${s.color}`} style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p>
                            <p className="text-xl font-black text-slate-800 dark:text-slate-100">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold">Credit Payment Records</h3>
                    <span className="text-xs text-slate-400">{totalRecords} transactions</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60">
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">#</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Farmer</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Mobile</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Method</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Notes</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Ref ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-5 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                                        </td>
                                    </tr>
                                ))
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center">
                                        <span className="material-symbols-outlined block text-4xl mb-3 text-slate-300">payments</span>
                                        <p className="text-slate-400 text-sm">No credit payments found for this date range</p>
                                        <p className="text-slate-300 text-xs mt-1">Try selecting a different date</p>
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment, idx) => (
                                    <tr key={payment._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-5 py-4 text-xs text-slate-400">{(page - 1) * 20 + idx + 1}</td>
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-sm">{payment.farmerId?.name || payment.farmerName || 'Unknown'}</p>
                                            <p className="text-xs text-slate-400">{payment.farmerId?.village || '-'}</p>
                                        </td>
                                        <td className="px-5 py-4 text-sm font-mono text-slate-500">{payment.farmerId?.mobile || payment.farmerMobile || '-'}</td>
                                        <td className="px-5 py-4 text-sm text-slate-500">{formatDate(payment.date)}</td>
                                        <td className="px-5 py-4 text-right font-black text-emerald-600">{formatCurrency(payment.amount)}</td>
                                        <td className="px-5 py-4">{methodBadge(payment.method)}</td>
                                        <td className="px-5 py-4 text-xs text-slate-500 italic max-w-[150px] truncate">{payment.notes || '-'}</td>
                                        <td className="px-5 py-4 text-xs text-slate-400 font-mono">{payment._id?.toString().slice(-8)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalRecords={totalRecords}
                        onPageChange={(p) => { setPage(p); fetchPayments(p, filters); }}
                        limit={20}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreditPaymentHistory;
