import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, getInitials, avatarColor } from '../utils/formatCurrency';

// ─── Farmer Table (reusable) ──────────────────────────────────────────────────
const FarmerTable = ({ farmers = [], loading = false, onDelete, onView, compact = false }) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const filtered = farmers.filter(f =>
        f.name?.toLowerCase().includes(search.toLowerCase()) ||
        f.village?.toLowerCase().includes(search.toLowerCase()) ||
        f.mobile?.includes(search)
    );

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 skeleton rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="card overflow-hidden">
            {!compact && (
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '16px' }}>search</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search farmers..."
                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <button
                        onClick={() => navigate('/farmers/add')}
                        className="btn-primary text-xs"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person_add</span>
                        Add Farmer
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
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
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={compact ? 4 : 6} className="px-4 py-12 text-center text-slate-400">
                                    <span className="material-symbols-outlined block text-4xl mb-2">groups</span>
                                    No farmers found
                                </td>
                            </tr>
                        ) : (
                            filtered.map(farmer => (
                                <tr
                                    key={farmer._id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/farmers/${farmer._id}`)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(farmer.name)}`}>
                                                {getInitials(farmer.name)}
                                            </div>
                                            <span className="font-medium text-sm">{farmer.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{farmer.village}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{farmer.mobile}</td>
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
                                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => navigate(`/farmers/${farmer._id}`)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                                                aria-label="View farmer"
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                                            </button>
                                            <button
                                                onClick={() => navigate(`/farmers/${farmer._id}/edit`)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                                                aria-label="Edit farmer"
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                            </button>
                                            {onDelete && (
                                                <button
                                                    onClick={() => onDelete(farmer._id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                                    aria-label="Delete farmer"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FarmerTable;
