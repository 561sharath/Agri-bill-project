import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { farmersAPI, paymentsAPI } from '../services/api';
import { formatCurrency, formatDate, getInitials, avatarColor } from '../utils/formatCurrency';
import useDebounce from '../hooks/useDebounce';

// ─── Tooltip wrapper ──────────────────────────────────────────────────────────
const Tooltip = ({ text, maxLen = 30, children }) => {
    if (!text || text.length <= maxLen) return children;
    return (
        <span className="relative group cursor-default">
            {children}
            <span className="absolute bottom-full left-0 mb-1 z-50 w-max max-w-xs bg-slate-800 text-white text-xs rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg whitespace-pre-wrap">
                {text}
            </span>
        </span>
    );
};

// ─── Farmer Details / Transaction Modal ───────────────────────────────────────
const FarmerDetailsModal = ({ farmerId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [farmerRes, txRes] = await Promise.all([
                    farmersAPI.getById(farmerId),
                    farmersAPI.getTransactions(farmerId)
                ]);
                setData({ farmer: farmerRes.data, transactions: txRes.data.transactions || [] });
            } catch {
                toast.error('Failed to load farmer details');
                onClose();
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [farmerId]);

    const handleDownloadExcel = async () => {
        setDownloading(true);
        try {
            const res = await farmersAPI.exportHistory(farmerId);
            const url = window.URL.createObjectURL(
                new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            );
            const link = document.createElement('a');
            link.href = url;
            const name = data?.farmer?.name?.replace(/\s+/g, '-') || farmerId;
            link.setAttribute('download', `farmer-${name}-history.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Farmer history downloaded!');
        } catch {
            toast.error('Failed to download history');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="card w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        {data && (
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(data.farmer.name)}`}>
                                {getInitials(data.farmer.name)}
                            </div>
                        )}
                        <div>
                            <h2 className="font-bold text-lg">{loading ? 'Loading...' : data?.farmer.name}</h2>
                            <p className="text-xs text-slate-500">{data?.farmer.mobile} · {data?.farmer.village}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {data && (
                            <>
                                <span className={`badge ${data.farmer.creditBalance > 0 ? 'badge-danger' : 'badge-success'}`}>
                                    {data.farmer.creditBalance > 0 ? `Due: ${formatCurrency(data.farmer.creditBalance)}` : 'Clear'}
                                </span>
                                <button
                                    onClick={handleDownloadExcel}
                                    disabled={downloading}
                                    className="btn-outline text-xs px-3 py-1.5 gap-1"
                                    title="Download farmer history as Excel"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{downloading ? 'hourglass_top' : 'download'}</span>
                                    {downloading ? 'Downloading...' : 'Excel'}
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                        </button>
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : data?.transactions.length === 0 ? (
                        <p className="text-center text-slate-400 py-12 italic">No transaction history yet</p>
                    ) : (
                        <div className="relative">
                            {/* Vertical timeline line */}
                            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                            <div className="flex flex-col gap-4">
                                {data.transactions.map((tx, idx) => {
                                    const isBill = tx.type === 'bill';
                                    return (
                                        <div key={idx} className="flex gap-4 relative">
                                            {/* Icon node */}
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white dark:border-slate-900 shadow-sm
                                                ${isBill
                                                    ? tx.paymentType === 'credit'
                                                        ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600'
                                                        : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
                                                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                                                }`}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                                                    {isBill ? (tx.paymentType === 'credit' ? 'account_balance_wallet' : 'receipt_long') : 'payments'}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-bold text-sm">
                                                            {isBill
                                                                ? tx.paymentType === 'credit'
                                                                    ? '🧾 Credit Purchase'
                                                                    : `🧾 ${tx.paymentType?.toUpperCase()} Purchase`
                                                                : '💰 Payment Received'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(tx.date)}</p>
                                                    </div>
                                                    <span className={`text-sm font-black ${isBill ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                        {isBill ? '-' : '+'}{formatCurrency(isBill ? tx.totalAmount : tx.amount)}
                                                    </span>
                                                </div>

                                                {isBill && tx.items?.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {tx.items.map((item, i) => (
                                                            <span key={i} className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-full">
                                                                {item.productId?.name || 'Product'} × {item.quantity}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {!isBill && tx.notes && (
                                                    <p className="text-xs text-slate-500 mt-1 italic">"{tx.notes}"</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Farmer Edit Modal ────────────────────────────────────────────────────────
const FarmerEditModal = ({ farmer, onClose, onSaved }) => {
    const [form, setForm] = useState({ name: farmer.name, mobile: farmer.mobile, village: farmer.village });
    const [review, setReview] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleConfirmEdit = async () => {
        setSaving(true);
        try {
            await farmersAPI.update(farmer._id, form);
            toast.success('Farmer updated successfully!');
            onSaved();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="card w-full max-w-md p-6 animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-lg">{review ? 'Review Changes' : 'Edit Farmer'}</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                {!review ? (
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="label">Full Name * <span className="text-slate-400 font-normal">(max 50 chars)</span></label>
                            <input name="name" value={form.name} onChange={handleChange} maxLength={50} className="input" placeholder="Farmer full name" />
                            <p className="text-xs text-slate-400 mt-1 text-right">{form.name.length}/50</p>
                        </div>
                        <div>
                            <label className="label">Mobile *</label>
                            <input name="mobile" value={form.mobile} onChange={handleChange} className="input" placeholder="10-digit mobile" maxLength={10} />
                        </div>
                        <div>
                            <label className="label">Village *</label>
                            <input name="village" value={form.village} onChange={handleChange} className="input" placeholder="Village name" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
                            <button
                                onClick={() => {
                                    if (!form.name.trim() || !form.mobile.trim() || !form.village.trim()) {
                                        toast.error('All fields are required');
                                        return;
                                    }
                                    setReview(true);
                                }}
                                className="btn-primary flex-1"
                            >
                                Review Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-slate-500">Please confirm the changes below:</p>
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                            {[
                                { label: 'Name', old: farmer.name, new: form.name },
                                { label: 'Mobile', old: farmer.mobile, new: form.mobile },
                                { label: 'Village', old: farmer.village, new: form.village },
                            ].map(row => (
                                <div key={row.label} className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">{row.label}</span>
                                    <span className="text-sm text-slate-400 line-through truncate">{row.old}</span>
                                    <span className="text-sm font-bold text-primary truncate">{row.new}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setReview(false)} className="btn-outline flex-1">← Go Back</button>
                            <button onClick={handleConfirmEdit} disabled={saving} className="btn-primary flex-1">
                                {saving ? 'Saving...' : 'Confirm Edit'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Farmer Delete Modal ──────────────────────────────────────────────────────
const FarmerDeleteModal = ({ farmer, onClose, onDeleted }) => {
    const [deleting, setDeleting] = useState(false);
    const hasCredit = farmer.creditBalance > 0;

    const handleDelete = async () => {
        if (hasCredit) {
            toast.error(`Cannot delete — farmer has ${formatCurrency(farmer.creditBalance)} pending credit`);
            return;
        }
        setDeleting(true);
        try {
            await farmersAPI.delete(farmer._id);
            toast.success(`${farmer.name} has been removed`);
            onDeleted();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Deletion failed');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="card w-full max-w-sm p-6 animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-5">
                    <div className={`h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center ${hasCredit ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        <span className={`material-symbols-outlined text-3xl ${hasCredit ? 'text-orange-500' : 'text-red-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {hasCredit ? 'warning' : 'person_remove'}
                        </span>
                    </div>
                    <h3 className="font-bold text-lg">Delete Farmer?</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{farmer.name}</span>
                    </p>
                </div>

                {hasCredit ? (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl mb-4 text-sm text-orange-700 dark:text-orange-400 text-center">
                        <span className="font-bold">Deletion blocked.</span> This farmer has{' '}
                        <span className="font-black">{formatCurrency(farmer.creditBalance)}</span> in outstanding credit.
                        Clear all dues before deleting.
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center mb-4">
                        This action is irreversible. All linked bills and payments will remain in the system.
                    </p>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting || hasCredit}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all
                            ${hasCredit
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'}`}
                    >
                        {deleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Farmer Table ────────────────────────────────────────────────────────
const FarmerTable = ({ farmers = [], loading = false, onDelete, onSearch, onFilterChange, currentFilter = '', onRefresh, compact = false }) => {
    const [search, setSearch] = useState('');
    const [viewFarmer, setViewFarmer] = useState(null);
    const [editFarmer, setEditFarmer] = useState(null);
    const [deleteFarmerTarget, setDeleteFarmerTarget] = useState(null);
    const searchInputRef = useRef(null);
    const debouncedSearch = useDebounce(search, 500);

    // Trigger search when debounced value changes
    useEffect(() => {
        if (onSearch) onSearch(debouncedSearch);
    }, [debouncedSearch]);

    // Restore focus after re-render from search results
    useEffect(() => {
        if (!loading && searchInputRef.current && document.activeElement !== searchInputRef.current) {
            // Only restore focus if user was typing (search is not empty)
            if (search.length > 0) {
                searchInputRef.current.focus();
            }
        }
    }, [loading]);

    if (loading && !search && !currentFilter) {
        return (
            <div className="card p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                            <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="card overflow-hidden shadow-sm">
                {!compact && (
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-sm">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '18px' }}>search</span>
                            {loading && search && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </span>
                            )}
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Find farmer by name or mobile..."
                                className="input pl-10 w-full"
                            />
                        </div>
                        
                        {onFilterChange && (
                            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    onClick={() => onFilterChange('')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${currentFilter === '' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} cursor-pointer`}
                                >
                                    All Farmers
                                </button>
                                <button
                                    onClick={() => onFilterChange('credit')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${currentFilter === 'credit' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'} cursor-pointer`}
                                >
                                    Credit Farmers
                                </button>
                                <button
                                    onClick={() => onFilterChange('clear')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${currentFilter === 'clear' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} cursor-pointer`}
                                >
                                    Clear Farmers
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="overflow-auto min-h-0 max-h-[55vh]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60">
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Farmer</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Village</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                                {!compact && <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Credit Balance</th>}
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {farmers.length === 0 ? (
                                <tr>
                                    <td colSpan={compact ? 5 : 6} className="px-4 py-12 text-center text-slate-400">
                                        <span className="material-symbols-outlined block text-4xl mb-2">groups</span>
                                        {search ? `No farmers found for "${search}"` : 'No farmers found'}
                                    </td>
                                </tr>
                            ) : (
                                farmers.map(farmer => (
                                    <tr
                                        key={farmer._id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(farmer.name)}`}>
                                                    {getInitials(farmer.name)}
                                                </div>
                                                <Tooltip text={farmer.name} maxLen={25}>
                                                    <button
                                                        onClick={() => setViewFarmer(farmer._id)}
                                                        className="font-medium text-sm truncate max-w-[140px] hover:text-primary transition-colors cursor-pointer text-left"
                                                    >
                                                        {farmer.name}
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500">
                                            <Tooltip text={farmer.village} maxLen={18}>
                                                <span className="truncate max-w-[100px] block">{farmer.village}</span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{farmer.mobile}</td>
                                        {!compact && (
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-sm font-bold ${farmer.creditBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    {formatCurrency(farmer.creditBalance || 0)}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            {farmer.creditBalance > 0 ? (
                                                <span className="badge badge-danger">Pending</span>
                                            ) : (
                                                <span className="badge badge-success">Clear</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => setViewFarmer(farmer._id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                                                    title="View history"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => setEditFarmer(farmer)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                                                    title="Edit farmer"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                                </button>
                                                <button
                                                    onClick={() => setDeleteFarmerTarget(farmer)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                                    title="Delete farmer"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {viewFarmer && (
                <FarmerDetailsModal
                    farmerId={viewFarmer}
                    onClose={() => setViewFarmer(null)}
                />
            )}
            {editFarmer && (
                <FarmerEditModal
                    farmer={editFarmer}
                    onClose={() => setEditFarmer(null)}
                    onSaved={() => { setEditFarmer(null); onRefresh?.(); }}
                />
            )}
            {deleteFarmerTarget && (
                <FarmerDeleteModal
                    farmer={deleteFarmerTarget}
                    onClose={() => setDeleteFarmerTarget(null)}
                    onDeleted={() => { setDeleteFarmerTarget(null); onRefresh?.(); }}
                />
            )}
        </>
    );
};

export default FarmerTable;
