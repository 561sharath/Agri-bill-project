import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { paymentsAPI, farmersAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import useDebounce from '../hooks/useDebounce';
import Pagination from '../components/Pagination';

// ─── Debounced Farmer Search Dropdown ─────────────────────────────────────────
const FarmerSearchSelect = ({ onSelect, selectedFarmer, onClear }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const debouncedQuery = useDebounce(query, 400);
    const inputRef = useRef(null);

    useEffect(() => {
        if (debouncedQuery.length < 2) { setResults([]); return; }
        const search = async () => {
            setSearching(true);
            try {
                const res = await farmersAPI.search(debouncedQuery);
                setResults(res.data.filter(f => f.creditBalance > 0));
            } catch { }
            finally { setSearching(false); }
        };
        search();
    }, [debouncedQuery]);

    if (selectedFarmer) {
        return (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <div>
                    <p className="font-bold text-sm">{selectedFarmer.name}</p>
                    <p className="text-xs text-slate-500">{selectedFarmer.mobile}</p>
                </div>
                <button type="button" onClick={onClear} className="text-slate-400 hover:text-red-500 cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: '16px' }}>search</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search farmer by name or mobile..."
                    className="input pl-9"
                />
                {searching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </span>
                )}
            </div>
            {open && query.length >= 2 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {results.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-400">No farmers with credit found</p>
                    ) : (
                        results.map(f => (
                            <button
                                key={f._id}
                                type="button"
                                onClick={() => { onSelect(f); setQuery(''); setOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors text-left border-b border-slate-100 dark:border-slate-700 last:border-0 cursor-pointer"
                            >
                                <div>
                                    <p className="text-sm font-medium">{f.name}</p>
                                    <p className="text-xs text-slate-500">{f.mobile} · Due: {formatCurrency(f.creditBalance)}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Record Payment Modal ──────────────────────────────────────────────────────
const RecordPaymentModal = ({ onClose, onSave, initialFarmer = null }) => {
    const [selectedFarmer, setSelectedFarmer] = useState(initialFarmer);
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm();

    const onSubmit = async (data) => {
        if (!selectedFarmer) { toast.error('Please select a farmer'); return; }
        try {
            await paymentsAPI.create({ ...data, farmerId: selectedFarmer._id });
            toast.success('Payment recorded successfully!');
            onSave();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record payment');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 animate-slide-up shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold">Record Payment</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div>
                        <label className="label">Select Farmer *</label>
                        <FarmerSearchSelect
                            selectedFarmer={selectedFarmer}
                            onSelect={setSelectedFarmer}
                            onClear={() => setSelectedFarmer(null)}
                        />
                    </div>

                    {selectedFarmer && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                            <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                                Outstanding Balance: {formatCurrency(selectedFarmer.creditBalance)}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Amount (₹) *</label>
                            <input
                                type="number" step="0.01"
                                {...register('amount', {
                                    required: 'Required',
                                    min: { value: 1, message: 'Min ₹1' },
                                    validate: val => !selectedFarmer || val <= selectedFarmer.creditBalance || 'Exceeds balance'
                                })}
                                className="input" placeholder="5000"
                            />
                            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
                        </div>
                        <div>
                            <label className="label">Method *</label>
                            <select {...register('method', { required: true })} className="input">
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Date</label>
                        <input type="date" {...register('date')} defaultValue={new Date().toISOString().split('T')[0]} className="input" />
                    </div>
                    <div>
                        <label className="label">Notes</label>
                        <input {...register('notes')} className="input" placeholder="Optional note..." />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                            {isSubmitting ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Get today's date string
const todayStr = () => new Date().toISOString().split('T')[0];

// ─── Main Component ────────────────────────────────────────────────────────────
const Payments = () => {
    const location = useLocation();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(!!location.state?.farmer);
    const [preselectedFarmer] = useState(location.state?.farmer || null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    // Default: today's date
    const [filters, setFilters] = useState({ startDate: todayStr(), endDate: todayStr() });
    const [exporting, setExporting] = useState(false);

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
            toast.error('Failed to load payment history');
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
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `payments-${filters.startDate || 'all'}-to-${filters.endDate || 'today'}.xlsx`);
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
    const methodBadge = method => {
        const map = { cash: 'badge-success', upi: 'badge-primary', bank: 'badge-info', cheque: 'badge-warning' };
        return <span className={`badge ${map[method] || 'badge-info'} capitalize`}>{method}</span>;
    };
    const isCustomFilter = filters.startDate !== todayStr() || filters.endDate !== todayStr();

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Payment History</h1>
                    <p className="page-subtitle">All payment records. Defaults to today — change dates to filter.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExport} disabled={exporting} className="btn-outline">
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                        {exporting ? 'Exporting...' : 'Export Excel'}
                    </button>
                    <button onClick={() => setShowModal(true)} className="btn-primary">
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        Record Payment
                    </button>
                </div>
            </div>

            {/* Date Filter Bar */}
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
                    { label: 'Transactions', value: totalRecords, icon: 'receipt', color: 'text-primary', bg: 'bg-primary/5' },
                    { label: 'Showing', value: `${payments.length} records`, icon: 'list', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
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
                    <h3 className="font-bold">
                        Transaction Records
                        {isCustomFilter && <span className="ml-2 badge badge-info text-xs">Custom Range</span>}
                    </h3>
                    <span className="text-xs text-slate-400">{totalRecords} total records</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60">
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
                                        <td colSpan={7} className="px-5 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                    </tr>
                                ))
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                                        {isCustomFilter ? 'No payments found for the selected date range' : 'No payment records found'}
                                    </td>
                                </tr>
                            ) : (
                                payments.map(payment => (
                                    <tr key={payment._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-sm">{payment.farmerId?.name || payment.farmerName || 'Unknown'}</p>
                                            <p className="text-xs text-slate-400">{payment.farmerId?.village || '-'}</p>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-slate-500 font-mono">{payment.farmerId?.mobile || payment.farmerMobile || '-'}</td>
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
                    <Pagination currentPage={page} totalPages={totalPages} totalRecords={totalRecords} onPageChange={setPage} limit={20} />
                </div>
            </div>

            {showModal && (
                <RecordPaymentModal
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); fetchPayments(1, filters); setPage(1); }}
                    initialFarmer={preselectedFarmer}
                />
            )}
        </div>
    );
};

export default Payments;
