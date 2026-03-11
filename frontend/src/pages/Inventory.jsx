import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import ProductTable from '../components/ProductTable';
import { productsAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';

const MOCK_PRODUCTS = [
    { _id: 'p1', name: 'Urea (50kg)', brand: 'IFFCO', price: 1450, stock: 5 },
    { _id: 'p2', name: 'NPK Complex', brand: 'Coromandel', price: 2100, stock: 12 },
    { _id: 'p3', name: 'DAP (50kg)', brand: 'IFFCO', price: 1680, stock: 40 },
    { _id: 'p4', name: 'Zinc Sulphate', brand: 'Vedanta', price: 750, stock: 30 },
    { _id: 'p5', name: 'Potash (MOP)', brand: 'Generic', price: 1200, stock: 8 },
    { _id: 'p6', name: 'Boron 20%', brand: 'Fertis', price: 480, stock: 25 },
];

const ProductModal = ({ product, onClose, onSave }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        defaultValues: product || { name: '', brand: '', price: '', stock: '' }
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
            onSave(data);
        } catch {
            toast.success(product ? 'Product updated! (Demo)' : 'Product added! (Demo)');
            onSave(data);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold">{product ? 'Edit Product' : 'Add Product'}</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div>
                        <label className="label">Product Name *</label>
                        <input {...register('name', { required: 'Name required' })} className="input" placeholder="e.g. Urea (50kg)" />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="label">Brand</label>
                        <input {...register('brand')} className="input" placeholder="e.g. IFFCO" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Price (₹) *</label>
                            <input type="number" step="0.01" {...register('price', { required: 'Price required', min: 0 })} className="input" placeholder="1450" />
                            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
                        </div>
                        <div>
                            <label className="label">Stock (units) *</label>
                            <input type="number" {...register('stock', { required: 'Stock required', min: 0 })} className="input" placeholder="50" />
                            {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock.message}</p>}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                            {isSubmitting ? 'Saving...' : product ? 'Update' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Inventory = () => {
    const [products, setProducts] = useState(MOCK_PRODUCTS);
    const [editProduct, setEditProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const lowStockCount = products.filter(p => p.stock <= 20).length;
    const criticalCount = products.filter(p => p.stock <= 5).length;

    const handleDelete = async (id) => {
        if (!confirm('Delete this product?')) return;
        setProducts(p => p.filter(x => x._id !== id));
        toast.success('Product deleted');
    };

    const handleSave = () => {
        setShowModal(false);
        setEditProduct(null);
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Inventory</h1>
                    <p className="page-subtitle">Manage fertilizer stock and pricing</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                    Add Product
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-4 flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Total Products</p>
                        <p className="text-xl font-bold">{products.length}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-3">
                    <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-500" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>warning</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Low Stock</p>
                        <p className="text-xl font-bold text-amber-500">{lowStockCount}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-3">
                    <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>error</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Critical Stock</p>
                        <p className="text-xl font-bold text-red-500">{criticalCount}</p>
                    </div>
                </div>
            </div>

            {/* Low stock alert banner */}
            {criticalCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <span className="material-symbols-outlined text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                        {criticalCount} product{criticalCount > 1 ? 's' : ''} {criticalCount > 1 ? 'are' : 'is'} critically low on stock. Please reorder soon.
                    </p>
                </div>
            )}

            <ProductTable
                products={products}
                onEdit={p => { setEditProduct(p); setShowModal(true); }}
                onDelete={handleDelete}
            />

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
