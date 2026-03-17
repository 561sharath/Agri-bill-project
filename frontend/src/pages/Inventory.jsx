import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import ProductTable from '../components/ProductTable';
import Pagination from '../components/Pagination';
import { productsAPI } from '../services/api';
import useDebounce from '../hooks/useDebounce';
import TruncatedText from '../components/TruncatedText';

const ProductModal = ({ product, onClose, onSave }) => {
    // If product exists, we show 'Present Stock' (readonly) and use 'updateStock' input
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm({
        defaultValues: product ? {
            name: product.name,
            brand: product.brand,
            price: product.price,
            updateStock: '' // Additional stock to add
        } : { name: '', brand: '', price: '', stock: '' }
    });

    const nameValue = watch('name') || '';

    const onSubmit = async (data) => {
        try {
            if (product) {
                // Determine new total stock
                const additional = Number(data.updateStock) || 0;
                if (additional < 0) {
                    toast.error('Update Stock cannot be negative');
                    return;
                }
                const newTotalStock = (product?.stock || 0) + additional;
                // Prepare update payload
                const payload = { ...data, stock: newTotalStock };
                delete payload.updateStock; // unnecessary for the backend endpoint for standard update
                
                await productsAPI.update(product._id, payload);
                toast.success('Product updated!');
            } else {
                await productsAPI.create(data);
                toast.success('Product added!');
            }
            onSave();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save product');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 animate-slide-up shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold">{product ? 'Edit Product' : 'Add New Product'}</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div>
                        <label className="label">
                            <TruncatedText text="Product Name *" />
                        </label>
                        <input
                            {...register('name', { 
                                required: 'Name is required', 
                                maxLength: { value: 300, message: 'Maximum 300 characters allowed' } 
                            })}
                            className={`input w-full ${errors.name ? 'input-invalid' : ''}`}
                            placeholder="e.g. Urea (50kg)"
                        />
                        <div className="flex justify-between items-start mt-1">
                            {errors.name ? (
                                <p className="field-error">{errors.name.message}</p>
                            ) : <div />}
                            <span className={`char-count ${nameValue.length > 300 ? 'text-red-500' : ''}`}>
                                {nameValue.length}/300
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="label">Brand</label>
                        <input {...register('brand')} className="input w-full" placeholder="e.g. IFFCO" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Price (₹) *</label>
                            <input type="number" step="0.01" {...register('price', { required: 'Price is required', min: 0 })} className="input w-full" />
                            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
                        </div>
                        {product ? (
                            <div className="flex flex-col gap-2">
                                <div>
                                    <label className="label">Present Stock</label>
                                    <input type="text" value={product.stock} disabled className="input w-full bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-bold" />
                                </div>
                                <div>
                                    <label className="label">Update Stock <span className="text-[10px] text-slate-400 font-normal">(Add)</span></label>
                                    <input type="number" {...register('updateStock')} className="input w-full" placeholder="+ 0" />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="label">Initial Stock *</label>
                                <input type="number" {...register('stock', { required: 'Stock is required', min: 0 })} className="input w-full" />
                                {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock.message}</p>}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                            {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteProductModal = ({ onClose, onConfirm, deleting }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="card w-full max-w-sm p-6 animate-slide-up shadow-2xl text-center">
            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>delete</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Delete Product?</h3>
            <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex gap-3">
                <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
                <button
                    onClick={onConfirm}
                    disabled={deleting}
                    className="btn-primary flex-1 bg-red-500 hover:bg-red-600"
                >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
            </div>
        </div>
    </div>
);

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [editProduct, setEditProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
    // Search + Debounce
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Global Stats state
    const [stats, setStats] = useState({ total: 0, lowStock: 0, critical: 0 });
    
    // Delete state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await productsAPI.getStats();
            setStats(res.data);
        } catch {
            console.error('Failed to load inventory stats');
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await productsAPI.getAll({ page, limit: 10, search: debouncedSearchTerm });
            setProducts(res.data.data);
            setTotalPages(res.data.totalPages);
            setTotalRecords(res.data.totalRecords);
        } catch (err) {
            toast.error('Failed to fetch inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [page, debouncedSearchTerm]);

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await productsAPI.delete(deleteTarget);
            toast.success('Product deleted successfully');
            setDeleteTarget(null);
            fetchProducts();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = () => {
        setShowModal(false);
        setEditProduct(null);
        fetchProducts();
        fetchStats();
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Inventory Management</h1>
                    <p className="page-subtitle">Track fertilizer stock levels and pricing</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                    Add New Product
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-5 flex items-center gap-4 border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Products</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.total || 0}</p>
                    </div>
                </div>
                <div className="card p-5 flex items-center gap-4 border-l-4 border-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-500" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>warning</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock</p>
                        <p className="text-2xl font-black text-amber-600">{stats.lowStock || 0}</p>
                    </div>
                </div>
                <div className="card p-5 flex items-center gap-4 border-l-4 border-red-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>error</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical Stock</p>
                        <p className="text-2xl font-black text-red-600">{stats.critical || 0}</p>
                    </div>
                </div>
            </div>

            {/* Low stock alert banner */}
            {stats.critical > 0 && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-pulse-subtle">
                    <span className="material-symbols-outlined text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                    <p className="text-sm text-red-700 dark:text-red-400 font-bold">
                        {stats.critical} product(s) are critically low on stock (≤ 5 units). Reorder immediately!
                    </p>
                </div>
            )}

            <div className="flex flex-col gap-4 relative">
                <div className="flex items-center justify-between mb-2">
                    <div className="relative w-full max-w-sm">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '18px' }}>search</span>
                        {/* 2-second typing indicator */}
                        {searchTerm !== debouncedSearchTerm && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </span>
                        )}
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            placeholder="Search products by name or brand..."
                            className="input pl-10 w-full"
                        />
                    </div>
                </div>

                <ProductTable
                    products={products}
                    loading={loading && products.length === 0}
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

            {/* Edit / Create Form Modal */}
            {showModal && (
                <ProductModal
                    product={editProduct}
                    onClose={() => { setShowModal(false); setEditProduct(null); }}
                    onSave={handleSave}
                />
            )}
            
            {/* Delete Confirmation Modal */}
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
