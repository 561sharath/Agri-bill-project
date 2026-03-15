import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { reportsAPI, remindersAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import Pagination from '../components/Pagination';
import useDebounce from '../hooks/useDebounce';

const CreditLedger = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);
    const [sendingReminderFor, setSendingReminderFor] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [summary, setSummary] = useState({ totalOutstanding: 0, count: 0 });

    const fetchCreditReport = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 10 };
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            const res = await reportsAPI.getCreditReport(params);
            setData(res.data.data);
            setTotalPages(res.data.totalPages);
            setTotalRecords(res.data.totalRecords);
            setSummary({
                totalOutstanding: res.data.totalOutstanding || 0,
                count: res.data.totalRecords
            });
        } catch (err) {
            toast.error('Failed to fetch credit ledger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCreditReport();
    }, [page, debouncedSearch]);

    const getStatusBadge = (balance) => {
        if (balance > 10000) return <span className="badge badge-danger">High Alert</span>;
        if (balance > 5000) return <span className="badge badge-warning">Medium</span>;
        return <span className="badge badge-info">Regular</span>;
    };

    const handleSendReminder = async (farmer) => {
        if (!farmer.mobile || farmer.mobile.length < 10) {
            toast.error('No valid mobile number for this farmer');
            return;
        }
        setSendingReminderFor(farmer._id);
        try {
            const res = await remindersAPI.sendReminder(String(farmer._id));
            const sentToE164 = res?.data?.sentToE164 || res?.data?.sentTo;
            toast.success(sentToE164
                ? `Reminder sent to ${farmer.name} — ${sentToE164}`
                : `Reminder sent to ${farmer.name} via WhatsApp`);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to send reminder');
        } finally {
            setSendingReminderFor(null);
        }
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div>
                <h1 className="page-title">Credit Ledger</h1>
                <p className="page-subtitle">Outstanding balances across all farmers</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="card p-5 border-l-4 border-orange-500 bg-orange-50/30 dark:bg-orange-900/10">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Outstanding</p>
                    <p className="text-2xl font-black text-orange-600">
                        {formatCurrency(summary.totalOutstanding)}
                    </p>
                </div>
                <div className="card p-5 border-l-4 border-blue-500 bg-blue-50/30 dark:bg-blue-900/10">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Farmers with Credit</p>
                    <p className="text-2xl font-black text-blue-600">{totalRecords}</p>
                </div>
                <div className="card p-5 border-l-4 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Recovery Target</p>
                    <p className="text-2xl font-black text-emerald-600">₹50,000</p>
                </div>
            </div>

            {/* Search */}
            <div className="card p-4">
                <label className="label">Search Credit Ledger</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: '18px' }}>search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by farmer name, mobile, or village..."
                        className="input pl-10 w-full max-w-md"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => { setSearch(''); setPage(1); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
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
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-4 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">No outstanding credit records found</td>
                                </tr>
                            ) : (
                                data.map(farmer => (
                                    <tr key={farmer._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{farmer.name}</p>
                                            <p className="text-xs text-slate-500">{farmer.mobile}</p>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{farmer.village}</td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-sm font-black text-red-600">{formatCurrency(farmer.creditBalance)}</span>
                                        </td>
                                        <td className="px-4 py-4">{getStatusBadge(farmer.creditBalance)}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => navigate('/payments', { state: { farmer } })}
                                                    className="btn-primary text-xs px-3 py-2 gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>payments</span>
                                                    Record
                                                </button>
                                                <button
                                                    onClick={() => handleSendReminder(farmer)}
                                                    disabled={sendingReminderFor === farmer._id}
                                                    className="btn-secondary text-xs px-3 py-2 gap-1.5 disabled:opacity-50"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>notifications_active</span>
                                                    {sendingReminderFor === farmer._id ? 'Sending...' : 'Remind'}
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
    );
};

export default CreditLedger;
