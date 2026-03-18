import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { reportsAPI, remindersAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import Pagination from '../components/Pagination';

// ── Pure helper — no reason to be inside the component at all ────────────────
// FIX: was wrapped in useCallback with no deps, which is just overhead for a
// function that closes over nothing and never changes.
const getStatusBadge = (balance) => {
    if (balance > 10000) return <span className="badge badge-danger">High Alert</span>;
    if (balance > 5000) return <span className="badge badge-warning">Medium</span>;
    return <span className="badge badge-info">Regular</span>;
};

const CreditLedger = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sendingReminderFor, setSendingReminderFor] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalOutstanding, setTotalOutstanding] = useState(0);

    // ── Debounce search input — FIX: original fired an API call on every keystroke ──
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1); // reset pagination atomically with the search value
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    // FIX: original included `page` and `search` in useCallback deps, then called
    // fetchCreditReport() in a useEffect that listed fetchCreditReport as a dep.
    // Pattern: state changes → callback rebuilds → effect fires → double-fetch.
    // Fix: callback takes explicit args; effect passes current state as args.
    const fetchCreditReport = useCallback(async (targetPage, targetSearch) => {
        setLoading(true);
        try {
            const params = { page: targetPage, limit: 10 };
            if (targetSearch) params.search = targetSearch;
            const res = await reportsAPI.getCreditReport(params);
            setData(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setTotalRecords(res.data.totalRecords || 0);
            setTotalOutstanding(res.data.totalOutstanding || 0);
        } catch {
            toast.error('Failed to fetch credit ledger');
        } finally {
            setLoading(false);
        }
    }, []); // no deps — args supplied by the effect below

    useEffect(() => {
        fetchCreditReport(page, debouncedSearch);
    }, [fetchCreditReport, page, debouncedSearch]);

    // ── Derived stats ─────────────────────────────────────────────────────────
    // FIX: original split totalOutstanding across `summary` object and `totalRecords`,
    // then computed avgCredit as summary.totalOutstanding / totalRecords — same value
    // divided by itself via two different state slices. Flattened to plain state vars.
    const avgCredit = useMemo(
        () => (totalRecords > 0 ? totalOutstanding / totalRecords : 0),
        [totalOutstanding, totalRecords]
    );

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSendReminder = useCallback(async (farmer) => {
        if (!farmer.mobile || farmer.mobile.length < 10) {
            toast.error('No valid mobile number for this farmer');
            return;
        }
        setSendingReminderFor(farmer._id);
        try {
            const res = await remindersAPI.sendReminder(String(farmer._id));
            const sentTo = res?.data?.sentToE164 || res?.data?.sentTo;
            toast.success(sentTo
                ? `Reminder sent to ${farmer.name} — ${sentTo}`
                : `Reminder sent to ${farmer.name} via WhatsApp`);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to send reminder');
        } finally {
            setSendingReminderFor(null);
        }
    }, []);

    const handleRecordPayment = useCallback((farmer) => {
        navigate('/payments', { state: { farmer } });
    }, [navigate]);

    const handleSearchClear = useCallback(() => {
        setSearch('');
        // debouncedSearch will clear via the debounce effect, page resets there too
    }, []);

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 sm:p-6 flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto">

                <div>
                    <h1 className="page-title">Credit Ledger</h1>
                    <p className="page-subtitle">Outstanding balances across all farmers</p>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="card p-5 border-l-4 border-orange-500 bg-orange-50/30 dark:bg-orange-900/10">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-orange-500" style={{ fontSize: '14px' }}>account_balance_wallet</span>
                            Total Outstanding
                        </p>
                        {/* QUICK WIN: pulse the value while loading so cards don't show stale data */}
                        <p className={`text-2xl font-black text-orange-600 ${loading ? 'animate-pulse opacity-50' : ''}`}>
                            {formatCurrency(totalOutstanding)}
                        </p>
                    </div>
                    <div className="card p-5 border-l-4 border-blue-500 bg-blue-50/30 dark:bg-blue-900/10">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-blue-500" style={{ fontSize: '14px' }}>people</span>
                            Farmers with Credit
                        </p>
                        <p className={`text-2xl font-black text-blue-600 ${loading ? 'animate-pulse opacity-50' : ''}`}>
                            {totalRecords}
                        </p>
                    </div>
                    <div className="card p-5 border-l-4 border-violet-500 bg-violet-50/30 dark:bg-violet-900/10">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-violet-500" style={{ fontSize: '14px' }}>analytics</span>
                            Avg Credit / Farmer
                        </p>
                        <p className={`text-2xl font-black text-violet-600 ${loading ? 'animate-pulse opacity-50' : ''}`}>
                            {formatCurrency(avgCredit)}
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="card p-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '18px' }}>search</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by farmer name, mobile, or village…"
                            className="input pl-10 pr-10 w-full"
                        />
                        {/* QUICK WIN: show spinner in search box while debounce is pending */}
                        {search && search !== debouncedSearch ? (
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 animate-spin" style={{ fontSize: '16px' }}>
                                progress_activity
                            </span>
                        ) : search ? (
                            <button
                                type="button"
                                onClick={handleSearchClear}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Table */}
                <div className="card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                {/* QUICK WIN: sticky header */}
                                <tr className="bg-slate-50 dark:bg-slate-800/60">
                                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Farmer Details</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Village</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Credit Balance</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Status</th>
                                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    // QUICK WIN: per-cell skeletons — more realistic than one wide bar
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
                                                        <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                            <td className="px-4 py-4"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                                            <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <div className="h-7 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                                                    <div className="h-7 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-16 text-center">
                                            <span className="material-symbols-outlined block text-5xl mb-3 text-slate-200">account_balance_wallet</span>
                                            <p className="text-slate-400 italic">No outstanding credit records found</p>
                                            {/* QUICK WIN: contextual empty state hint */}
                                            {debouncedSearch
                                                ? <p className="text-xs text-slate-300 mt-1">No results for "{debouncedSearch}" — try clearing the search</p>
                                                : <p className="text-xs text-slate-300 mt-1">All farmers are settled up</p>
                                            }
                                        </td>
                                    </tr>
                                ) : (
                                    data.map(farmer => (
                                        <tr key={farmer._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 text-sm font-bold shrink-0">
                                                        {farmer.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{farmer.name}</p>
                                                        <p className="text-xs text-slate-500 font-mono">{farmer.mobile}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{farmer.village}</td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-sm font-black text-red-600">{formatCurrency(farmer.creditBalance)}</span>
                                            </td>
                                            <td className="px-4 py-4">{getStatusBadge(farmer.creditBalance)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* FIX: missing type="button" — would submit any parent form */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRecordPayment(farmer)}
                                                        className="btn-primary text-xs px-3 py-2 gap-1.5"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>payments</span>
                                                        Record
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSendReminder(farmer)}
                                                        disabled={sendingReminderFor === farmer._id}
                                                        className="btn-secondary text-xs px-3 py-2 gap-1.5 disabled:opacity-50"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                                            {sendingReminderFor === farmer._id ? 'hourglass_top' : 'notifications_active'}
                                                        </span>
                                                        {sendingReminderFor === farmer._id ? 'Sending…' : 'Remind'}
                                                    </button>
                                                </div>
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
                            limit={10}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreditLedger;