import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { farmersAPI, productsAPI, billsAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';


const CreateBill = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [farmerSearch, setFarmerSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [isNewFarmer, setIsNewFarmer] = useState(false);
    const [generatedBillId, setGeneratedBillId] = useState(null);
    // Review modal state
    const [reviewData, setReviewData] = useState(null); // holds validated form data for review

    const { register, control, watch, setValue, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            paymentType: 'cash',
            items: [{ productId: '', quantity: 1, price: 0, total: 0 }],
            newFarmer: { name: '', village: '' }
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const watchedItems = watch('items');
    const watchedNewFarmerName = watch('newFarmer.name');

    // Fetch products and handle search
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await productsAPI.getAll();
                // If backend returns pagination object
                setProducts(Array.isArray(res.data) ? res.data : res.data.data || []);
            } catch (err) {
                toast.error('Failed to load products');
            }
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (farmerSearch.length > 2) {
                try {
                    const res = await farmersAPI.search(farmerSearch);
                    setSearchResults(res.data);
                    // If search query is a 10 digit number and no results, prompt for new farmer
                    if (res.data.length === 0 && /^\d{10}$/.test(farmerSearch)) {
                        setIsNewFarmer(true);
                    } else {
                        setIsNewFarmer(false);
                    }
                } catch (err) {
                    console.error('Search failed');
                }
            } else {
                setSearchResults([]);
                setIsNewFarmer(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [farmerSearch]);

    // Handle product selection — set price and reset quantity
    const handleProductChange = (index, productId) => {
        const product = products.find(p => p._id === productId);
        if (product) {
            setValue(`items.${index}.price`, product.price);
            setValue(`items.${index}.quantity`, 1);
            setValue(`items.${index}.total`, product.price);
        }
    };

    const handleQuantityChange = (index, qty) => {
        const price = watchedItems[index]?.price || 0;
        const productId = watchedItems[index]?.productId;
        const product = products.find(p => p._id === productId);

        if (product && qty > product.stock) {
            toast.error(`⚠️ Only ${product.stock} units of "${product.name}" in stock!`, { id: `stock-${index}` });
        }
        setValue(`items.${index}.total`, price * qty);
    };

    const subtotal = watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const tax = 0;
    const total = subtotal + tax;

    // Step 1: validate → show review modal (no API call yet)
    const onSubmit = async (data) => {
        if (!selectedFarmer && !isNewFarmer) {
            toast.error('Please select or add a farmer');
            return;
        }
        if (isNewFarmer && (!data.newFarmer?.name || !data.newFarmer?.village)) {
            toast.error('Please enter name and village for the new farmer');
            return;
        }
        const validItems = data.items.filter(i => i.productId);
        if (validItems.length === 0) {
            toast.error('Add at least one product');
            return;
        }
        // Show review modal — save data for later confirm
        setReviewData(data);
    };

    // Step 2: generate bill after user confirms in review modal
    const confirmGenerate = async () => {
        const data = reviewData;
        if (!data) return;
        setSubmitting(true);
        setReviewData(null); // close review modal
        try {
            let farmerId = selectedFarmer?._id;

            // Handle New Farmer Creation
            if (isNewFarmer) {
                const farmerRes = await farmersAPI.create({
                    name: data.newFarmer.name,
                    mobile: farmerSearch,
                    village: data.newFarmer.village
                });
                farmerId = farmerRes.data._id;
            }

            const payload = {
                farmerId,
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
            toast.success('Bill generated successfully!');
            setGeneratedBillId(res.data._id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to generate bill');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!generatedBillId) return;
        try {
            const res = await billsAPI.downloadPDF(generatedBillId);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Bill_${generatedBillId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error('Failed to download PDF');
        }
    };

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
                                    <button type="button" onClick={() => { setSelectedFarmer(null); setGeneratedBillId(null); setIsNewFarmer(false); }} className="text-red-400 hover:text-red-600 cursor-pointer">
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                    </button>
                                </div>
                            ) : isNewFarmer ? (
                                <div className="flex flex-col gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl animate-fade-in">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-emerald-600 uppercase">New Farmer detected</p>
                                        <button type="button" onClick={() => { setIsNewFarmer(false); setFarmerSearch(''); }} className="text-slate-400 hover:text-red-400">
                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            {...register('newFarmer.name')}
                                            placeholder="Farmer Name"
                                            className="input text-xs"
                                        />
                                        <input
                                            type="text"
                                            {...register('newFarmer.village')}
                                            placeholder="Village"
                                            className="input text-xs"
                                        />
                                    </div>
                                </div>
                            ) : farmerSearch.length > 2 && (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-sm">
                                    {searchResults.length > 0 ? (
                                        searchResults.map(f => (
                                            <button
                                                key={f._id}
                                                type="button"
                                                onClick={() => { setSelectedFarmer(f); setFarmerSearch(''); setSearchResults([]); }}
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
                                        ))
                                    ) : (
                                        <div className="p-3 text-center text-xs text-slate-500">
                                            No farmer found. Keep typing mobile number to add as new.
                                        </div>
                                    )}
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
                        <div className="card p-5 sticky top-24">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Bill Summary</h3>

                            {(selectedFarmer || watchedNewFarmerName) && (
                                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <p className="text-xs text-slate-500 mb-1">Bill To</p>
                                    <p className="font-bold text-sm">{selectedFarmer?.name || watchedNewFarmerName}</p>
                                    <p className="text-xs text-slate-500">{selectedFarmer?.village || 'New Farmer'}</p>
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
                                    disabled={submitting || !!generatedBillId}
                                    className={`btn-primary w-full ${generatedBillId ? 'opacity-50' : ''}`}
                                >
                                    {submitting ? (
                                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                                    )}
                                    {submitting ? 'Generating...' : generatedBillId ? 'Bill Generated' : 'Generate Bill'}
                                </button>

                                {generatedBillId && (
                                    <div className="flex flex-col gap-2 animate-bounce-in">
                                        <button
                                            type="button"
                                            onClick={handleDownloadPDF}
                                            className="btn-outline w-full text-sm hover:bg-slate-50"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                                            Download PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { reset(); setSelectedFarmer(null); setIsNewFarmer(false); setGeneratedBillId(null); setFarmerSearch(''); }}
                                            className="btn-secondary w-full text-sm"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                                            Create New Bill
                                        </button>
                                    </div>
                                )}

                                <button type="button" className="btn-outline w-full text-sm text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
                                    Send WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* ── Bill Review Modal ───────────────────────────────────── */}
            {reviewData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-lg p-6 animate-slide-up shadow-2xl flex flex-col gap-5">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>fact_check</span>
                                <h2 className="text-lg font-bold">Review Bill</h2>
                            </div>
                            <button onClick={() => setReviewData(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                            </button>
                        </div>

                        {/* Farmer Info */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>person</span>
                            <div>
                                <p className="font-bold text-sm">
                                    {isNewFarmer ? reviewData.newFarmer?.name + ' (New Farmer)' : selectedFarmer?.name}
                                </p>
                                <p className="text-xs text-slate-500">{selectedFarmer?.mobile || farmerSearch}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Product</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-center">Qty</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Price</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {reviewData.items.filter(i => i.productId).map((item, idx) => {
                                        const prod = products.find(p => p._id === item.productId);
                                        return (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 text-sm font-medium">{prod?.name || 'Product'}</td>
                                                <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                                                <td className="px-4 py-2 text-sm text-right text-slate-500">₹{Number(item.price).toLocaleString()}</td>
                                                <td className="px-4 py-2 text-sm text-right font-bold">₹{Number(item.total).toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Total + Payment Type */}
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <span className={`badge ${reviewData.paymentType === 'cash' ? 'badge-success'
                                        : reviewData.paymentType === 'credit' ? 'badge-danger'
                                            : 'badge-info'
                                    } capitalize text-xs`}>
                                    {reviewData.paymentType}
                                </span>
                                <span className="text-xs text-slate-500">payment</span>
                            </div>
                            <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                                Total: ₹{total.toLocaleString()}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setReviewData(null)}
                                className="btn-outline flex-1"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={confirmGenerate}
                                disabled={submitting}
                                className="btn-primary flex-1"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                                    {submitting ? 'hourglass_top' : 'receipt'}
                                </span>
                                {submitting ? 'Generating...' : 'Generate Bill'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateBill;
