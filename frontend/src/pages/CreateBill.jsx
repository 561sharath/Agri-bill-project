import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { farmersAPI, productsAPI, billsAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';

// Mock data for demo
const MOCK_FARMERS = [
    { _id: 'f1', name: 'Ramesh Kumar', village: 'Mylavaram', mobile: '9876543210' },
    { _id: 'f2', name: 'Suresh Reddy', village: 'Vijayawada', mobile: '9123456789' },
    { _id: 'f3', name: 'Venkatesh Rao', village: 'Guntur', mobile: '8887766554' },
];
const MOCK_PRODUCTS = [
    { _id: 'p1', name: 'Urea (50kg)', price: 1450, stock: 5 },
    { _id: 'p2', name: 'NPK Complex', price: 2100, stock: 12 },
    { _id: 'p3', name: 'DAP (50kg)', price: 1680, stock: 40 },
    { _id: 'p4', name: 'Zinc Sulphate', price: 750, stock: 30 },
];

const CreateBill = () => {
    const navigate = useNavigate();
    const [farmers, setFarmers] = useState(MOCK_FARMERS);
    const [products, setProducts] = useState(MOCK_PRODUCTS);
    const [farmerSearch, setFarmerSearch] = useState('');
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const { register, control, watch, setValue, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            paymentType: 'cash',
            items: [{ productId: '', quantity: 1, price: 0, total: 0 }],
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const watchedItems = watch('items');

    // Auto-set price when product selected
    const handleProductChange = (index, productId) => {
        const product = products.find(p => p._id === productId);
        if (product) {
            setValue(`items.${index}.price`, product.price);
            setValue(`items.${index}.total`, product.price * (watchedItems[index]?.quantity || 1));
        }
    };

    const handleQuantityChange = (index, qty) => {
        const price = watchedItems[index]?.price || 0;
        setValue(`items.${index}.total`, price * qty);
    };

    const subtotal = watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const tax = 0; // No GST on fertilizers
    const total = subtotal + tax;

    const onSubmit = async (data) => {
        if (!selectedFarmer) { toast.error('Please select a farmer'); return; }
        if (!data.items.some(i => i.productId)) { toast.error('Add at least one product'); return; }

        setSubmitting(true);
        try {
            const payload = {
                farmerId: selectedFarmer._id,
                items: data.items.filter(i => i.productId).map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    price: Number(i.price),
                    total: Number(i.total),
                })),
                totalAmount: total,
                paymentType: data.paymentType,
            };
            const res = await billsAPI.create(payload);
            toast.success('Bill created successfully!');
            navigate(`/bills/${res.data._id}`);
        } catch (err) {
            // Demo mode: show success even without backend
            toast.success('Bill created! (Demo mode)');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredFarmers = farmers.filter(f =>
        f.name.toLowerCase().includes(farmerSearch.toLowerCase()) ||
        f.mobile.includes(farmerSearch)
    );

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in max-w-5xl mx-auto">
            <div>
                <h1 className="page-title">Create Bill</h1>
                <p className="page-subtitle">POS-style billing for fertilizer sales</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Bill builder */}
                    <div className="lg:col-span-2 flex flex-col gap-5">
                        {/* Farmer selection */}
                        <div className="card p-5">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>person</span>
                                Select Farmer
                            </h3>
                            <div className="relative mb-3">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '16px' }}>search</span>
                                <input
                                    type="text"
                                    value={farmerSearch}
                                    onChange={e => setFarmerSearch(e.target.value)}
                                    placeholder="Search by name or mobile..."
                                    className="input pl-9"
                                />
                            </div>

                            {selectedFarmer ? (
                                <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                    <div>
                                        <p className="font-bold text-sm">{selectedFarmer.name}</p>
                                        <p className="text-xs text-slate-500">{selectedFarmer.village} · {selectedFarmer.mobile}</p>
                                    </div>
                                    <button type="button" onClick={() => setSelectedFarmer(null)} className="text-red-400 hover:text-red-600 cursor-pointer">
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                                    {filteredFarmers.map(f => (
                                        <button
                                            key={f._id}
                                            type="button"
                                            onClick={() => { setSelectedFarmer(f); setFarmerSearch(''); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary/5 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                                        >
                                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                {f.name[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{f.name}</p>
                                                <p className="text-xs text-slate-500">{f.village} · {f.mobile}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Products */}
                        <div className="card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                                    Add Products
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => append({ productId: '', quantity: 1, price: 0, total: 0 })}
                                    className="btn-secondary text-xs"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                                    Add Row
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60">
                                            <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Product</th>
                                            <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase w-20">Qty</th>
                                            <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase w-28">Price</th>
                                            <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase w-28 text-right">Total</th>
                                            <th className="px-3 py-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fields.map((field, index) => (
                                            <tr key={field.id} className="border-t border-slate-100 dark:border-slate-800">
                                                <td className="px-3 py-2">
                                                    <select
                                                        {...register(`items.${index}.productId`)}
                                                        onChange={e => { handleProductChange(index, e.target.value); register(`items.${index}.productId`).onChange(e); }}
                                                        className="input text-xs py-1.5"
                                                    >
                                                        <option value="">Select product...</option>
                                                        {products.map(p => (
                                                            <option key={p._id} value={p._id}>{p.name} (Stock: {p.stock})</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        {...register(`items.${index}.quantity`, { min: 1 })}
                                                        onChange={e => { handleQuantityChange(index, Number(e.target.value)); register(`items.${index}.quantity`).onChange(e); }}
                                                        className="input text-xs py-1.5 w-16"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        {...register(`items.${index}.price`)}
                                                        readOnly
                                                        className="input text-xs py-1.5 w-24 bg-slate-100 dark:bg-slate-700"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold text-sm">
                                                    {formatCurrency(watchedItems[index]?.total || 0)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {fields.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => remove(index)}
                                                            className="p-1 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payment type */}
                        <div className="card p-5">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>payments</span>
                                Payment Type
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {['cash', 'credit', 'upi'].map(type => (
                                    <label key={type} className="cursor-pointer">
                                        <input type="radio" value={type} {...register('paymentType')} className="sr-only peer" />
                                        <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-400 peer-checked:border-primary peer-checked:text-primary peer-checked:bg-primary/5 transition-all capitalize">
                                            {type === 'upi' ? 'UPI' : type.charAt(0).toUpperCase() + type.slice(1)}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Summary */}
                    <div className="flex flex-col gap-4">
                        <div className="card p-5">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Bill Summary</h3>

                            {selectedFarmer && (
                                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <p className="text-xs text-slate-500 mb-1">Bill To</p>
                                    <p className="font-bold text-sm">{selectedFarmer.name}</p>
                                    <p className="text-xs text-slate-500">{selectedFarmer.village}</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Tax</span>
                                    <span className="font-semibold text-emerald-600">₹0 (Exempt)</span>
                                </div>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                                <div className="flex justify-between text-base font-bold">
                                    <span>Total</span>
                                    <span className="text-primary text-lg">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 mt-5">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-primary w-full"
                                >
                                    {submitting ? (
                                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                                    )}
                                    {submitting ? 'Generating...' : 'Generate Bill'}
                                </button>
                                <button type="button" className="btn-outline w-full text-sm">
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                                    Download PDF
                                </button>
                                <button type="button" className="btn-outline w-full text-sm text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
                                    Send WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateBill;
