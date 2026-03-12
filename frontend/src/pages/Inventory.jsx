import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import ProductTable from '../components/ProductTable';
import Pagination from '../components/Pagination';
import { productsAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';

const ProductModal = ({ product, onClose, onSave }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        defaultValues: product ? {
            name: product.name,
            brand: product.brand,
            price: product.price,
            stock: product.stock
        } : { name: '', brand: '', price: '', stock: '' }
    });

    const onSubmit = async (data) => {
        try {
            if (product) {
                await productsAPI.update(product._id, data);
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
                        <label className="label">Product Name * <span className="text-slate-400 font-normal">(max 300 chars)</span></label>
                        <input
                            {...register('name', {
                                required: 'Name is required',
                                maxLength: { value: 300, message: 'Max 300 characters allowed' }
                            })}
                            maxLength={300}
                            className="input"
                            placeholder="e.g. Urea (50kg)"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="label">Brand</label>
                        <input {...register('brand')} className="input" placeholder="e.g. IFFCO" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Price (₹) *</label>
                            <input type="number" step="0.01" {...register('price', { required: 'Price is required', min: 0 })} className="input" placeholder="1450" />
                            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
                        </div>
                        <div>
                            <label className="label">Stock (units) *</label>
                            <input type="number" {...register('stock', { required: 'Stock is required', min: 0 })} className="input" placeholder="50" />
                            {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock.message}</p>}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
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

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [editProduct, setEditProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [stats, setStats] = useState({ total: 0, lowStock: 0, critical: 0 });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await productsAPI.getAll({ page, limit: 10 });
            setProducts(res.data.data);
            setTotalPages(res.data.totalPages);
            setTotalRecords(res.data.totalRecords);

            // Simple stats from current page for UI
            // Ideally should come from a dedicated stats API
            setStats({
                total: res.data.totalRecords,
                lowStock: res.data.data.filter(p => p.stock <= 20 && p.stock > 5).length,
                critical: res.data.data.filter(p => p.stock <= 5).length
            });
        } catch (err) {
            toast.error('Failed to fetch inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [page]);

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await productsAPI.delete(id);
            toast.success('Product deleted successfully');
            fetchProducts();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleSave = () => {
        setShowModal(false);
        setEditProduct(null);
        fetchProducts();
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
                <div className="card p-5 flex items-center gap-4 border-l-4 border-primary">
                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Products</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalRecords}</p>
                    </div>
                </div>
                <div className="card p-5 flex items-center gap-4 border-l-4 border-amber-500">
                    <div className="h-12 w-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-500" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>warning</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock</p>
                        <p className="text-2xl font-black text-amber-600">{stats.lowStock}</p>
                    </div>
                </div>
                <div className="card p-5 flex items-center gap-4 border-l-4 border-red-500">
                    <div className="h-12 w-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>error</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical Stock</p>
                        <p className="text-2xl font-black text-red-600">{stats.critical}</p>
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

            <div className="flex flex-col gap-4">
                <ProductTable
                    products={products}
                    loading={loading}
                    onEdit={p => { setEditProduct(p); setShowModal(true); }}
                    onDelete={handleDelete}
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
                <ProductModal
                    product={editProduct}
                    onClose={() => { setShowModal(false); setEditProduct(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default Inventory;
