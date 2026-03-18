import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import ProductTable from '../components/ProductTable';
import Pagination from '../components/Pagination';
import { productsAPI } from '../services/api';
import useDebounce from '../hooks/useDebounce';
import TruncatedText from '../components/TruncatedText';

// ── ProductModal (Lazy) ────────────────────────────────────────────────────────
const ProductModal = lazy(() => import('../components/ProductModal'));

// ── DeleteProductModal ────────────────────────────────────────────────────────
const DeleteProductModal = ({ onClose, onConfirm, deleting }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="card w-full max-w-sm p-6 animate-slide-up shadow-2xl text-center">
            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>delete</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Delete Product?</h3>
            <p className="text-sm text-slate-500 mb-6">
                This will permanently remove the product and cannot be undone.
            </p>
            <div className="flex gap-3">
                {/* FIX: both buttons were missing type="button" — would submit parent forms */}
                <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={deleting}
                    className="btn-primary flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60"
                >
                    {deleting ? 'Deleting…' : 'Confirm Delete'}
                </button>
            </div>
        </div>
    </div>
);

// ── Inventory ─────────────────────────────────────────────────────────────────
const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [editProduct, setEditProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [stats, setStats] = useState({ total: 0, lowStock: 0, critical: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Fetch stats ───────────────────────────────────────────────────────────
    // FIX: was a plain function — stale closure + silent console.error on failure
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await productsAPI.getStats();
            setStats(res.data);
        } catch {
            toast.error('Failed to load inventory stats');
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // ── Fetch products ────────────────────────────────────────────────────────
    // FIX: was a plain function — recreated every render, stale closures over
    // `page` and `debouncedSearchTerm`, unstable reference passed to child callbacks
    const fetchProducts = useCallback(async (targetPage = 1) => {
        setLoading(true);
        try {
            const res = await productsAPI.getAll({
                page: targetPage,
                limit: 10,
                search: debouncedSearchTerm,
            });
            setProducts(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setTotalRecords(res.data.totalRecords || 0);
        } catch {
            toast.error('Failed to fetch inventory');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm]);
    // Note: `page` is intentionally excluded — always passed as explicit arg

    // Initial load
    useEffect(() => { fetchStats(); }, [fetchStats]);

    // Page changes
    useEffect(() => {
        fetchProducts(page);
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

    // FIX: search change — reset to page 1 atomically before fetching.
    // Original called setPage(1) inside onChange but then fetchProducts ran with
    // whatever `page` was in its stale closure, not the reset value.
    useEffect(() => {
        setPage(1);
        fetchProducts(1);
    }, [debouncedSearchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handlers ──────────────────────────────────────────────────────────────
    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await productsAPI.delete(deleteTarget);
            toast.success('Product deleted');
            setDeleteTarget(null);
            // After delete, stay on current page unless it's now empty
            fetchProducts(page);
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setIsDeleting(false);
        }
    }, [deleteTarget, fetchProducts, fetchStats, page]);

    const handleSave = useCallback(() => {
        setShowModal(false);
        setEditProduct(null);
        fetchProducts(page);
        fetchStats();
    }, [fetchProducts, fetchStats, page]);

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
        // page reset handled by the debouncedSearchTerm effect above
    }, []);

    const handleSearchClear = useCallback(() => {
        setSearchTerm('');
    }, []);

    // REFACTOR: stat cards as config — was 3× hand-written identical card markup
    const statCards = [
        {
            key: 'total',
            label: 'Total Products',
            value: stats.total || 0,
            icon: 'inventory_2',
            iconColor: 'text-primary',
            iconBg: 'bg-primary/10',
            border: 'border-primary',
            textColor: 'text-slate-800 dark:text-slate-100',
        },
        {
            key: 'lowStock',
            label: 'Low Stock',
            value: stats.lowStock || 0,
            icon: 'warning',
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-50 dark:bg-amber-500/10',
            border: 'border-amber-500',
            textColor: 'text-amber-600',
        },
        {
            key: 'critical',
            label: 'Critical Stock',
            value: stats.critical || 0,
            icon: 'error',
            iconColor: 'text-red-500',
            iconBg: 'bg-red-50 dark:bg-red-500/10',
            border: 'border-red-500',
            textColor: 'text-red-600',
        },
    ];

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Inventory Management</h1>
                    <p className="page-subtitle">Track fertilizer stock levels and pricing</p>
                </div>
                {/* FIX: missing type="button" */}
                <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                    Add New Product
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map(s => (
                    <div key={s.key} className={`card p-5 flex items-center gap-4 border-l-4 ${s.border} shadow-sm hover:shadow-md transition-shadow`}>
                        <div className={`h-12 w-12 ${s.iconBg} rounded-2xl flex items-center justify-center shrink-0`}>
                            <span
                                className={`material-symbols-outlined ${s.iconColor}`}
                                style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
                            >
                                {s.icon}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                            {/* QUICK WIN: pulse while stats loading */}
                            <p className={`text-2xl font-black ${s.textColor} ${statsLoading ? 'animate-pulse opacity-50' : ''}`}>
                                {s.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Critical alert banner */}
            {stats.critical > 0 && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <span className="material-symbols-outlined text-red-500 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                    <p className="text-sm text-red-700 dark:text-red-400 font-bold">
                        {stats.critical} product{stats.critical !== 1 ? 's' : ''} critically low on stock (≤ 5 units). Reorder immediately!
                    </p>
                </div>
            )}

            {/* Search */}
            <div className="relative w-full max-w-sm">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '18px' }}>search</span>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search products by name or brand…"
                    className="input pl-10 pr-10 w-full"
                />
                {/* QUICK WIN: spinner while debounce is pending, clear button when settled */}
                {searchTerm && searchTerm !== debouncedSearchTerm ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </span>
                ) : searchTerm ? (
                    <button
                        type="button"
                        onClick={handleSearchClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                    </button>
                ) : null}
            </div>

            {/* Table */}
            <div className="flex flex-col gap-4">
                {/* FIX: was `loading && products.length === 0` — meant skeleton only showed
                    on first load; page changes and searches showed stale data with no indicator.
                    Now passes `loading` directly so every fetch shows the loading state. */}
                <ProductTable
                    products={products}
                    loading={loading}
                    onEdit={p => { setEditProduct(p); setShowModal(true); }}
                    onDelete={id => setDeleteTarget(id)}
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
                    <ProductModal
                        product={editProduct}
                        onClose={() => { setShowModal(false); setEditProduct(null); }}
                        onSave={handleSave}
                    />
                </Suspense>
            )}

            {deleteTarget && (
                <DeleteProductModal
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={confirmDelete}
                    deleting={isDeleting}
                />
            )}
        </div>
    );
};

export default Inventory;