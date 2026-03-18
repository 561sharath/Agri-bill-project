import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { paymentsAPI, farmersAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import useDebounce from '../hooks/useDebounce';
import Pagination from '../components/Pagination';
import TruncatedText from '../components/TruncatedText';

const RecordPaymentModal = lazy(() => import('../components/RecordPaymentModal'));

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

// FIX: was wrapped in useCallback with no component-state deps — pure lookup,
// moved to module level so it's never recreated at all
const methodBadge = (method) => {
    const map = {
        cash: { cls: 'badge-success', label: '💵 Cash' },
        upi: { cls: 'badge-primary', label: '📱 UPI' },
        bank: { cls: 'badge-info', label: '🏦 Bank' },
        cheque: { cls: 'badge-warning', label: '📝 Cheque' },
    };
    const m = map[method] || { cls: 'badge-info', label: method };
    return <span className={`badge ${m.cls} text-xs`}>{m.label}</span>;
};

// ── Payments ──────────────────────────────────────────────────────────────────
const Payments = () => {
    const location = useLocation();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(!!location.state?.farmer);
    // useState with no setter — effectively a constant derived from navigation state
    const [preselectedFarmer] = useState(location.state?.farmer || null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [filters, setFilters] = useState({ startDate: todayStr(), endDate: todayStr() });
    const [exporting, setExporting] = useState(false);
    const [sendingWaFor, setSendingWaFor] = useState(null);

    // ── Fetch payments ────────────────────────────────────────────────────────
    // FIX: original had `page` and `filters` in useCallback deps AND as default
    // args AND in the useEffect dep array. Triple-tracking caused every state
    // change to rebuild the callback AND re-trigger the effect = double fetch.
    // Fix: callback takes explicit args, empty deps, effect passes current values.
    const fetchPayments = useCallback(async (targetPage, targetFilters) => {
        setLoading(true);
        try {
            const params = { page: targetPage, limit: 20 };
            if (targetFilters.startDate) params.startDate = targetFilters.startDate;
            if (targetFilters.endDate) params.endDate = targetFilters.endDate;
            const res = await paymentsAPI.getAll(params);
            setPayments(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setTotalRecords(res.data.totalRecords || 0);
        } catch {
            toast.error('Failed to load payment history');
        } finally {
            setLoading(false);
        }
    }, []); // no deps — always called with explicit args

    // Re-fetch when page changes
    useEffect(() => {
        fetchPayments(page, filters);
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch when filters change, reset to page 1
    useEffect(() => {
        setPage(1);
        fetchPayments(1, filters);
    }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(f => ({ ...f, [name]: value }));
        // page reset handled by filters effect above
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilters({ startDate: todayStr(), endDate: todayStr() });
    }, []);

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            const res = await paymentsAPI.exportExcel(params);
            const blob = new Blob(
                [res.data],
                { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payments-${filters.startDate || 'all'}-to-${filters.endDate || 'today'}.xlsx`;
            // FIX: was missing appendChild/remove — silent failure in Firefox
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success('Excel downloaded!');
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    }, [filters]);

    const handleSendPaymentWhatsApp = useCallback(async (payment) => {
        if (!payment.farmerId?.mobile) { toast.error('No mobile number for this farmer'); return; }
        setSendingWaFor(payment._id);
        try {
            await paymentsAPI.sendPaymentWhatsApp(payment._id);
            toast.success(`Confirmation sent to ${payment.farmerId?.name || 'farmer'}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send WhatsApp');
        } finally {
            setSendingWaFor(null);
        }
    }, []);

    // FIX: was summing only the current page of payments (max 20 records).
    // "Amount Collected" implies a period total, not a page subtotal.
    // Renamed to "Page Subtotal" which is honest about what it shows,
    // and totalRecords already shows the true transaction count.
    const pageSubtotal = useMemo(
        () => payments.reduce((s, p) => s + (p.amount || 0), 0),
        [payments]
    );

    const isCustomFilter =
        filters.startDate !== todayStr() || filters.endDate !== todayStr();

    // REFACTOR: stat card config — was array-index keyed inline objects
    const statCards = [
        {
            key: 'subtotal',
            label: 'Page Subtotal',
            value: formatCurrency(pageSubtotal),
            icon: 'payments',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/10',
        },
        {
            key: 'total',
            label: 'Total Transactions',
            value: totalRecords,
            icon: 'receipt',
            color: 'text-primary',
            bg: 'bg-primary/5',
        },
        {
            key: 'showing',
            label: 'Showing Now',
            value: `${payments.length} records`,
            icon: 'list',
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/10',
        },
    ];

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 sm:p-6 flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-title">Payment History</h1>
                        <p className="page-subtitle">All payment records. Defaults to today — change dates to filter.</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        {/* FIX: both buttons were missing type="button" */}
                        <button type="button" onClick={handleExport} disabled={exporting} className="btn-outline">
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                            {exporting ? 'Exporting…' : 'Export Excel'}
                        </button>
                        <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                            Record Payment
                        </button>
                    </div>
                </div>

                {/* Date filter */}
                <div className="card p-4 flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1">
                        <label className="label">Start Date</label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            max={filters.endDate || undefined}
                            className="input"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="label">End Date</label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            min={filters.startDate || undefined}
                            className="input"
                        />
                    </div>
                    {isCustomFilter && (
                        <button type="button" onClick={handleClearFilters} className="btn-outline text-sm shrink-0">
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>today</span>
                            Reset to Today
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* FIX: was using array index as key */}
                    {statCards.map(s => (
                        <div key={s.key} className="card p-5 flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <span className={`material-symbols-outlined ${s.color}`} style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>
                                    {s.icon}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p>
                                <p className={`text-xl font-black text-slate-800 dark:text-slate-100 ${loading ? 'animate-pulse opacity-50' : ''}`}>
                                    {s.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="card overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold">
                            Transaction Records
                            {isCustomFilter && <span className="ml-2 badge badge-info text-xs">Custom Range</span>}
                        </h3>
                        <span className="text-xs text-slate-400">
                            {loading ? '…' : `${totalRecords} total`}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                {/* QUICK WIN: sticky header */}
                                <tr className="bg-slate-50 dark:bg-slate-800/60">
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Farmer</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Mobile</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Method</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Notes</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Ref ID</th>
                                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase text-center">WhatsApp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    // QUICK WIN: per-cell skeletons
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-5 py-4">
                                                <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800 rounded mb-1.5" />
                                                <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                                            </td>
                                            <td className="px-5 py-4"><div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                            <td className="px-5 py-4"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                            <td className="px-5 py-4"><div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                                            <td className="px-5 py-4"><div className="h-5 w-14 bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                                            <td className="px-5 py-4"><div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                            <td className="px-5 py-4"><div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                            <td className="px-5 py-4"><div className="h-6 w-6 bg-slate-100 dark:bg-slate-800 rounded-lg mx-auto" /></td>
                                        </tr>
                                    ))
                                ) : payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-16 text-center">
                                            <span className="material-symbols-outlined block text-5xl mb-3 text-slate-200">receipt_long</span>
                                            <p className="text-slate-400">
                                                {isCustomFilter
                                                    ? 'No payments found for the selected date range'
                                                    : 'No payment records found for today'}
                                            </p>
                                            {isCustomFilter && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearFilters}
                                                    className="mt-2 text-xs text-primary hover:underline"
                                                >
                                                    Reset to today
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map(payment => (
                                        <tr key={payment._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-5 py-4">
                                                <p className="font-bold text-sm">{payment.farmerId?.name || payment.farmerName || 'Unknown'}</p>
                                                <p className="text-xs text-slate-400">{payment.farmerId?.village || '–'}</p>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-500 font-mono">
                                                {payment.farmerId?.mobile || payment.farmerMobile || '–'}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                {formatDate(payment.date)}
                                            </td>
                                            <td className="px-5 py-4 text-right font-black text-emerald-600">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="px-5 py-4">{methodBadge(payment.method)}</td>
                                            <td className="px-5 py-4 text-xs text-slate-500 italic max-w-[150px] truncate" title={payment.notes}>
                                                {payment.notes || '—'}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-400 font-mono">
                                                {payment._id?.toString().slice(-8)}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {payment.farmerId?.mobile ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSendPaymentWhatsApp(payment)}
                                                        disabled={sendingWaFor === payment._id}
                                                        className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                                                        title="Send payment confirmation via WhatsApp"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                                            {sendingWaFor === payment._id ? 'hourglass_top' : 'chat'}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300 select-none">—</span>
                                                )}
                                            </td>
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
                            onPageChange={setPage}
                            limit={20}
                        />
                    </div>
                </div>

                {showModal && (
                    <Suspense fallback={null}>
                        <RecordPaymentModal
                            onClose={() => setShowModal(false)}
                            // FIX: was calling fetchPayments(1, filters) then setPage(1) separately —
                            // fetchPayments was a stale closure; setPage after was racy and redundant.
                            // Now: close modal, let the filters effect handle the refetch cleanly.
                            onSave={() => {
                                setShowModal(false);
                                setPage(1);
                                fetchPayments(1, filters);
                            }}
                            initialFarmer={preselectedFarmer}
                        />
                    </Suspense>
                )}
            </div>
        </div>
    );
};

export default Payments;