import { formatCurrency } from '../utils/formatCurrency';

const ProductTable = ({ products = [], loading = false, onEdit, onDelete, showActions = true }) => {
    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 skeleton rounded-xl" />
                ))}
            </div>
        );
    }

    const getStockBadge = (stock) => {
        if (stock <= 5) return <span className="badge badge-danger">Critical</span>;
        if (stock <= 20) return <span className="badge badge-warning">Low</span>;
        return <span className="badge badge-success">In Stock</span>;
    };

    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60">
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Brand</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Price (per unit)</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            {showActions && <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={showActions ? 6 : 5} className="px-4 py-12 text-center text-slate-400">
                                    <span className="material-symbols-outlined block text-4xl mb-2">inventory_2</span>
                                    No products found
                                </td>
                            </tr>
                        ) : (
                            products.map(product => (
                                <tr key={product._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>grass</span>
                                            </div>
                                            <span className="font-medium text-sm">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{product.brand || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-semibold">{formatCurrency(product.price)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-sm font-bold ${product.stock <= 5 ? 'text-red-500' : product.stock <= 20 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{getStockBadge(product.stock)}</td>
                                    {showActions && (
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {onEdit && (
                                                    <button
                                                        onClick={() => onEdit(product)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                                                        aria-label="Edit product"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        onClick={() => onDelete(product._id)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                                        aria-label="Delete product"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductTable;
