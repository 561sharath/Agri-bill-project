import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import toast from 'react-hot-toast';
import FarmerTable from '../components/FarmerTable';
import Pagination from '../components/Pagination';
import { farmersAPI } from '../services/api';

const AddFarmerModal = lazy(() => import('../components/AddFarmerModal'));
import useDebounce from '../hooks/useDebounce';

const Farmers = () => {
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [creditFilter, setCreditFilter] = useState(''); // '' | 'credit' | 'clear'
    const [showModal, setShowModal] = useState(false);
    const [stats, setStats] = useState({ total: 0, pending: 0, clear: 0 });
    const [statsLoading, setStatsLoading] = useState(true); // QUICK WIN: loading state for stats

    // ── Fetch stats ───────────────────────────────────────────────────────────
    // FIX: was a plain function — no useCallback, no error toast, silent console.error only.
    // Now stable reference + visible error so users know when stats fail to load.
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await farmersAPI.getStats();
            setStats(res.data);
        } catch {
            toast.error('Failed to load farmer stats');
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // ── Fetch farmers ─────────────────────────────────────────────────────────
    // FIX: was a plain function defined inside the component — recreated on every
    // render, meaning FarmerTable (via onRefresh prop) would re-render every time
    // even if wrapped in memo. useCallback with explicit deps fixes both issues.
    const fetchFarmers = useCallback(async (targetPage = page) => {
        setLoading(true);
        try {
            const res = await farmersAPI.getAll({
                page: targetPage,
                limit: 10,
                search: debouncedSearchTerm,
                creditFilter,
            });
            setFarmers(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setTotalRecords(res.data.totalRecords || 0);
        } catch {
            toast.error('Failed to fetch farmers');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm, creditFilter, page]);
    // Note: `page` is in deps so the callback always has the right value,
    // but callers that need to force page 1 pass it explicitly (see below).

    // ── Initial load ──────────────────────────────────────────────────────────
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // ── Re-fetch when page changes ────────────────────────────────────────────
    useEffect(() => {
        fetchFarmers(page);
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
    // Intentionally omitting fetchFarmers — page changes are the only trigger here.
    // Filter/search changes are handled below with an explicit page-1 reset.

    // ── Re-fetch when search or filter changes, always from page 1 ───────────
    // FIX: original only reset page in onSearch handler (for search term), but NOT
    // for creditFilter. Changing the filter on page 3 would fetch page 3 of the new
    // filter. Now both triggers reset to page 1 atomically before fetching.
    useEffect(() => {
        setPage(1);
        fetchFarmers(1);
    }, [debouncedSearchTerm, creditFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSearch = useCallback((term) => {
        setSearchTerm(term);
        // page reset happens in the effect above when debouncedSearchTerm settles
    }, []);

    const handleFilterChange = useCallback((filter) => {
        setCreditFilter(filter);
        // page reset happens in the effect above
    }, []);

    // FIX: onSave now refreshes both farmers list AND stats — adding a farmer
    // previously left "Total Farmers" count stale until page reload.
    const handleFarmerSaved = useCallback(() => {
        setShowModal(false);
        fetchFarmers(1);
        fetchStats();
    }, [fetchFarmers, fetchStats]);

    // QUICK WIN: stable onRefresh reference passed to FarmerTable —
    // previously a new function reference on every render caused unnecessary
    // re-renders in FarmerTable even when nothing changed.
    const handleRefresh = useCallback(() => {
        fetchFarmers(page);
    }, [fetchFarmers, page]);

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Farmers Directory</h1>
                    <p className="page-subtitle">Manage farmer profiles and credit history</p>
                </div>
                {/* FIX: missing type="button" */}
                <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                    Add New Farmer
                </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Total Farmers', value: totalRecords, icon: 'groups', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', key: 'total' },
                    { label: 'Pending Credit', value: stats.pending, icon: 'history_edu', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', key: 'pending' },
                    { label: 'Clear Accounts', value: stats.clear, icon: 'verified', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', key: 'clear' },
                ].map((s) => (
                    // FIX: was using array index as key — use a stable semantic key instead
                    <div key={s.key} className="card p-5 flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl ${s.bg} flex items-center justify-center`}>
                            <span
                                className={`material-symbols-outlined ${s.color}`}
                                style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
                            >
                                {s.icon}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                            {/* QUICK WIN: pulse value while stats are loading */}
                            <p className={`text-2xl font-black text-slate-800 dark:text-slate-100 ${statsLoading ? 'animate-pulse opacity-50' : ''}`}>
                                {s.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-4">
                <FarmerTable
                    farmers={farmers}
                    loading={loading}
                    onSearch={handleSearch}
                    onFilterChange={handleFilterChange}
                    currentFilter={creditFilter}
                    onRefresh={handleRefresh}
                />

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    onPageChange={setPage}
                    limit={10}
                />
            </div>

            {showModal && (
                <Suspense fallback={null}>
                    <AddFarmerModal
                        onClose={() => setShowModal(false)}
                        // FIX: was fetchFarmers() only — stats stayed stale after adding a farmer
                        onSave={handleFarmerSaved}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default Farmers;