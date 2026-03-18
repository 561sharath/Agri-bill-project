import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { productsAPI } from '../services/api';
import TruncatedText from './TruncatedText';

const ProductModal = ({ product, onClose, onSave }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm({
        defaultValues: product
            ? { name: product.name, brand: product.brand || '', price: product.price, updateStock: '' }
            : { name: '', brand: '', price: '', stock: '' }
    });

    const nameValue = watch('name') || '';

    const onSubmit = async (data) => {
        try {
            if (product) {
                const additional = Number(data.updateStock) || 0;
                const newTotalStock = (product.stock || 0) + additional;
                const { updateStock, ...rest } = data;
                await productsAPI.update(product._id, { ...rest, stock: newTotalStock });
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
                    <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div>
                        <label className="label"><TruncatedText text="Product Name *" /></label>
                        <input
                            {...register('name', {
                                required: 'Name is required',
                                maxLength: { value: 300, message: 'Maximum 300 characters' }
                            })}
                            className={`input w-full ${errors.name ? 'input-invalid' : ''}`}
                            placeholder="e.g. Urea (50kg)"
                        />
                        <div className="flex justify-between items-start mt-1">
                            {errors.name
                                ? <p className="field-error">{errors.name.message}</p>
                                : <div />
                            }
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
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register('price', {
                                    required: 'Price is required',
                                    min: { value: 0, message: 'Price cannot be negative' },
                                    valueAsNumber: true,
                                })}
                                className={`input w-full ${errors.price ? 'input-invalid' : ''}`}
                            />
                            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
                        </div>

                        {product ? (
                            <div className="flex flex-col gap-2">
                                <div>
                                    <label className="label">Present Stock</label>
                                    <input
                                        type="text"
                                        value={product.stock}
                                        disabled
                                        className="input w-full bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="label">
                                        Add Stock
                                        <span className="text-[10px] text-slate-400 font-normal ml-1">(units to add)</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        {...register('updateStock', {
                                            min: { value: 0, message: 'Cannot be negative' },
                                            validate: v => !v || Number.isInteger(Number(v)) || 'Must be a whole number',
                                            valueAsNumber: true,
                                        })}
                                        className={`input w-full ${errors.updateStock ? 'input-invalid' : ''}`}
                                        placeholder="+ 0"
                                    />
                                    {errors.updateStock && (
                                        <p className="text-xs text-red-500 mt-1">{errors.updateStock.message}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="label">Initial Stock *</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    {...register('stock', {
                                        required: 'Stock is required',
                                        min: { value: 0, message: 'Stock cannot be negative' },
                                        validate: v => Number.isInteger(Number(v)) || 'Must be a whole number',
                                        valueAsNumber: true,
                                    })}
                                    className={`input w-full ${errors.stock ? 'input-invalid' : ''}`}
                                />
                                {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock.message}</p>}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                            {isSubmitting ? 'Saving…' : product ? 'Update Product' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
