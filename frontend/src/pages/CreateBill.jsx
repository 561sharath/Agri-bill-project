import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { pdf } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import { farmersAPI, productsAPI, billsAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { getShopDetails } from '../utils/shopStorage';
import { BillPDFDocument } from '../components/BillPDFDocument';

const GST_RATES = [5, 12, 18];

/* ─────────────────────────────────────────────────────────────────────────────
   ProductRow — isolated so only one row re-renders when it changes
───────────────────────────────────────────────────────────────────────────── */
const ProductRow = ({ index, field, products, register, setValue, watch, remove, disabled, isLast }) => {
    const productId = watch(`items.${index}.productId`);
    const quantity  = watch(`items.${index}.quantity`);
    const price     = watch(`items.${index}.price`);
    const total     = watch(`items.${index}.total`);

    // When product selection changes, clear and fill price
    const handleProductChange = (e) => {
        const newId = e.target.value;
        // Always reset price / qty / total first
        setValue(`items.${index}.productId`, newId);
        setValue(`items.${index}.price`, 0);
        setValue(`items.${index}.quantity`, 1);
        setValue(`items.${index}.total`, 0);

        if (!newId) return;

        const product = products.find(p => String(p._id) === newId);
        if (product) {
            setValue(`items.${index}.price`, product.price);
            setValue(`items.${index}.total`, product.price);
        }
    };

    const handleQtyChange = (e) => {
        const val = e.target.value;
        const qty = val === '' ? '' : Math.max(0, parseInt(val) || 0);
        const currentPrice = Number(price) || 0;
        setValue(`items.${index}.quantity`, qty);
        setValue(`items.${index}.total`, qty === '' ? 0 : parseFloat((currentPrice * qty).toFixed(2)));

        // Stock check
        if (productId && qty !== '') {
            const product = products.find(p => String(p._id) === productId);
            if (product && qty > product.stock) {
                toast.error(`Only ${product.stock} units of "${product.name}" in stock`, { id: `stock-${index}` });
            }
        }
    };

    const selectedProduct = products.find(p => String(p._id) === productId);

    return (
        <tr className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
            <td className="px-3 py-2">
                <select
                    value={productId || ''}
                    onChange={handleProductChange}
                    disabled={disabled}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                >
                    <option value="">Select product...</option>
                    {products.map(p => (
                        <option key={p._id} value={p._id} disabled={p.stock === 0}>
                            {p.name} — ₹{p.price} {p.stock === 0 ? '(Out of stock)' : `(${p.stock} left)`}
                        </option>
                    ))}
                </select>
                {selectedProduct && (
                    <p className="text-[10px] text-slate-400 mt-0.5 pl-1">
                        Stock: {selectedProduct.stock} units
                    </p>
                )}
            </td>
            <td className="px-3 py-2 w-20">
                <input
                    type="number"
                    min={0}
                    value={quantity !== undefined ? quantity : 1}
                    onChange={handleQtyChange}
                    disabled={disabled || !productId}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-40 text-center"
                />
            </td>
            <td className="px-3 py-2 w-28">
                <input
                    type="text"
                    value={price ? `₹${price}` : '—'}
                    readOnly
                    className="w-full text-xs rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 text-slate-500 cursor-not-allowed"
                />
            </td>
            <td className="px-3 py-2 w-28 text-right">
                <span className={`text-sm font-bold ${total > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300'}`}>
                    {total > 0 ? formatCurrency(total) : '—'}
                </span>
            </td>
            <td className="px-3 py-2 w-8 text-center">
                <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={disabled || isLast}
                    className="p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    title="Remove row"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                </button>
            </td>
        </tr>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main CreateBill Component
───────────────────────────────────────────────────────────────────────────── */

const transliterateToKannada = async (text) => {
    if (!text || !text.trim()) return '';
    try {
        const res = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(text.trim())}&itc=kn-t-i0-und&num=1`);
        const json = await res.json();
        if (json[0] === 'SUCCESS' && json[1][0][1][0]) {
            return json[1][0][1][0];
        }
    } catch { return ''; }
    return '';
};

const CreateBill = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [farmerSearch, setFarmerSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [isNewFarmer, setIsNewFarmer] = useState(false);
    const [generatedBill, setGeneratedBill] = useState(null); // full bill object for PDF
    const [sendToWhatsApp, setSendToWhatsApp] = useState(true);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [reviewData, setReviewData] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Kannada name (optional)
    const [kannadaName, setKannadaName] = useState('');
    const [showKannadaInput, setShowKannadaInput] = useState(false);

    // GST
    const [gstEnabled, setGstEnabled] = useState(false);
    const [gstPercent, setGstPercent] = useState(5);

    const farmerInputRef = useRef(null);

    const { register, control, watch, setValue, handleSubmit, reset, getValues } = useForm({
        defaultValues: {
            paymentType: 'cash',
            items: [{ productId: '', quantity: 1, price: 0, total: 0 }],
            newFarmer: { name: '', village: '' },
            interestRate: 0,
            dueDate: '',
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const watchedPaymentType = watch('paymentType');
    const watchedInterestRate = watch('interestRate');
    const watchedNewFarmerName = watch('newFarmer.name');

    // Per-item totals for summary (watched at top level to avoid per-row re-renders)
    const watchedItems = watch('items'); // watch handles referential equality better than useWatch for arrays here

    // Fetch products once
    useEffect(() => {
        productsAPI.getAll().then(res => {
            setProducts(Array.isArray(res.data) ? res.data : res.data?.data || []);
        }).catch(() => toast.error('Failed to load products'));
    }, []);

    // Auto-transliterate farmer name
    useEffect(() => {
        if (selectedFarmer?.name) {
            transliterateToKannada(selectedFarmer.name).then(res => {
                if (res) {
                    setKannadaName(res);
                    setShowKannadaInput(true);
                }
            });
        }
    }, [selectedFarmer?.name]);

    useEffect(() => {
        if (isNewFarmer && watchedNewFarmerName) {
            const t = setTimeout(() => {
                transliterateToKannada(watchedNewFarmerName).then(res => {
                    if (res) {
                        setKannadaName(res);
                        setShowKannadaInput(true);
                    }
                });
            }, 800);
            return () => clearTimeout(t);
        }
    }, [isNewFarmer, watchedNewFarmerName]);

    // Debounced farmer search
    useEffect(() => {
        if (farmerSearch.length < 2) { setSearchResults([]); setIsNewFarmer(false); return; }
        const t = setTimeout(async () => {
            try {
                const res = await farmersAPI.search(farmerSearch);
                setSearchResults(res.data || []);
                setIsNewFarmer(res.data.length === 0 && /^\d{10}$/.test(farmerSearch));
            } catch { /* silent */ }
        }, 400);
        return () => clearTimeout(t);
    }, [farmerSearch]);

    // ── Computed financials ───────────────────────────────────────────────────
    const subtotal = useMemo(
        () => watchedItems.reduce((sum, i) => sum + (Number(i.total) || 0), 0),
        [watchedItems]
    );

    const gstAmount = useMemo(
        () => gstEnabled ? parseFloat((subtotal * gstPercent / 100).toFixed(2)) : 0,
        [subtotal, gstEnabled, gstPercent]
    );

    const grandTotal = useMemo(
        () => parseFloat((subtotal + gstAmount).toFixed(2)),
        [subtotal, gstAmount]
    );

    const interestAmount = useMemo(() => {
        if (watchedPaymentType !== 'credit') return 0;
        const rate = Number(watchedInterestRate) || 0;
        return rate > 0 ? parseFloat((subtotal * rate / 100).toFixed(2)) : 0;
    }, [subtotal, watchedInterestRate, watchedPaymentType]);

    // ── Add new row ───────────────────────────────────────────────────────────
    const addRow = useCallback(() => {
        const items = getValues('items');
        const hasEmpty = items.some(i => !i.productId);
        if (hasEmpty) {
            toast('Please fill the empty product row first', { icon: '⚠️', id: 'empty-row', duration: 2000 });
            return;
        }
        append({ productId: '', quantity: 1, price: 0, total: 0 });
    }, [getValues, append]);

    // ── Clear farmer ─────────────────────────────────────────────────────────
    const clearFarmer = useCallback(() => {
        setSelectedFarmer(null);
        setIsNewFarmer(false);
        setFarmerSearch('');
        setSearchResults([]);
        setKannadaName('');
        setShowKannadaInput(false);
        if (generatedBill) setGeneratedBill(null);
        setTimeout(() => farmerInputRef.current?.focus(), 50);
    }, [generatedBill]);

    // ── Step 1: Validate → open review modal ────────────────────────────────
    const onSubmit = useCallback(async (data) => {
        if (!selectedFarmer && !isNewFarmer) { toast.error('Please select or add a farmer'); return; }
        if (isNewFarmer && (!data.newFarmer?.name?.trim() || !data.newFarmer?.village?.trim())) {
            toast.error('Enter name and village for new farmer'); return;
        }
        const validItems = data.items.filter(i => i.productId && Number(i.total) > 0);
        if (validItems.length === 0) { toast.error('Add at least one product with a valid quantity'); return; }

        for (const item of validItems) {
            const product = products.find(p => String(p._id) === String(item.productId));
            if (product && Number(item.quantity) > product.stock) {
                toast.error(`"${product.name}" only has ${product.stock} units available`);
                return;
            }
        }
        setReviewData({ ...data, validItems });
    }, [selectedFarmer, isNewFarmer, products]);

    // ── Step 2: Confirm → create bill ─────────────────────────────────────
    const confirmGenerate = useCallback(async () => {
        const data = reviewData;
        if (!data) return;
        setSubmitting(true);
        setReviewData(null);
        try {
            let farmerId = selectedFarmer?._id;
            let farmerName = selectedFarmer?.name || '';
            let farmerMobile = selectedFarmer?.mobile || '';
            let farmerVillage = selectedFarmer?.village || '';

            if (isNewFarmer) {
                const r = await farmersAPI.create({ name: data.newFarmer.name, mobile: farmerSearch, village: data.newFarmer.village });
                farmerId = r.data._id;
                farmerName = data.newFarmer.name;
                farmerMobile = farmerSearch;
                farmerVillage = data.newFarmer.village;
            }

            const payload = {
                farmerId,
                items: data.validItems.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    price: Number(i.price),
                    total: Number(i.total),
                })),
                totalAmount: grandTotal,
                paymentType: data.paymentType,
                sendWhatsApp: sendToWhatsApp,
                gstEnabled,
                gstPercent: gstEnabled ? gstPercent : 0,
                interestRate: data.paymentType === 'credit' ? (Number(data.interestRate) || 0) : 0,
                dueDate: data.dueDate || undefined,
            };

            const res = await billsAPI.create(payload);
            const resData = res?.data || {};

            // Build a local bill object for PDF generation (no extra API call needed)
            const localBill = {
                _id: resData._id,
                billNumber: resData.billNumber,
                createdAt: resData.createdAt || new Date().toISOString(),
                paymentType: data.paymentType,
                subtotal,
                totalAmount: grandTotal,
                gstEnabled,
                gstPercent: gstEnabled ? gstPercent : 0,
                gstAmount,
                interestRate: payload.interestRate,
                interestAmount,
                dueDate: data.dueDate || null,
                farmerId: {
                    _id: farmerId,
                    name: kannadaName ? `${farmerName} (${kannadaName})` : farmerName,
                    mobile: farmerMobile,
                    village: farmerVillage,
                },
                items: data.validItems.map(i => {
                    const p = products.find(pr => String(pr._id) === String(i.productId));
                    return {
                        productId: { _id: i.productId, name: p?.name || 'Product' },
                        quantity: Number(i.quantity),
                        price: Number(i.price),
                        total: Number(i.total),
                    };
                }),
            };

            setGeneratedBill(localBill);

            if (resData.sentToE164 || resData.sentTo) {
                toast.success(`Bill created & WhatsApp sent to ${resData.farmerName || farmerName}`);
            } else {
                toast.success('Bill created successfully!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to create bill');
        } finally {
            setSubmitting(false);
        }
    }, [reviewData, selectedFarmer, isNewFarmer, farmerSearch, grandTotal, sendToWhatsApp, gstEnabled, gstPercent, subtotal, gstAmount, interestAmount, kannadaName, products]);

    // ── PDF helpers (use local bill object — no extra API call) ──────────────
    const buildPDFBlob = useCallback(async () => {
        if (!generatedBill) throw new Error('No bill available');
        const shopDetails = getShopDetails();
        return await pdf(<BillPDFDocument bill={generatedBill} shopDetails={shopDetails} />).toBlob();
    }, [generatedBill]);

    const handleViewPDF = useCallback(async () => {
        setPdfLoading(true);
        try {
            const blob = await buildPDFBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            toast.success('PDF opened in new tab');
        } catch (err) {
            toast.error(err.message || 'Failed to generate PDF');
        } finally {
            setPdfLoading(false);
        }
    }, [buildPDFBlob]);

    const handleDownloadPDF = useCallback(async () => {
        setPdfLoading(true);
        try {
            const blob = await buildPDFBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bill_${generatedBill?.billNumber || generatedBill?._id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success('PDF downloaded');
        } catch (err) {
            toast.error(err.message || 'Failed to download PDF');
        } finally {
            setPdfLoading(false);
        }
    }, [buildPDFBlob, generatedBill]);

    const handleSendWhatsApp = useCallback(async () => {
        if (!generatedBill?._id) { toast.error('No bill ID available'); return; }
        setSendingWhatsApp(true);
        try {
            const res = await billsAPI.sendWhatsApp(generatedBill._id);
            toast.success(res?.data?.sentToE164
                ? `WhatsApp sent to ${res.data.farmerName} — ${res.data.sentToE164}`
                : 'Bill sent via WhatsApp');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send WhatsApp');
        } finally {
            setSendingWhatsApp(false);
        }
    }, [generatedBill]);

    const handleReset = useCallback(() => {
        reset({
            paymentType: 'cash',
            items: [{ productId: '', quantity: 1, price: 0, total: 0 }],
            newFarmer: { name: '', village: '' },
            interestRate: 0,
            dueDate: '',
        });
        setSelectedFarmer(null);
        setIsNewFarmer(false);
        setGeneratedBill(null);
        setFarmerSearch('');
        setSearchResults([]);
        setGstEnabled(false);
        setGstPercent(5);
        setKannadaName('');
        setShowKannadaInput(false);
        setReviewData(null);
    }, [reset]);

    return (
        <div className="p-4 sm:p-6 flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto">
            <div>
                <h1 className="page-title">Create Bill</h1>
                <p className="page-subtitle">Add farmer, select products, configure GST &amp; payment</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* ── Left: Farmer + Products + Payment ─────────────── */}
                    <div className="xl:col-span-2 flex flex-col gap-5">

                        {/* Farmer Card */}
                        <div className="card p-5">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>person</span>
                                Select Farmer
                            </h3>

                            {selectedFarmer ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                        <div>
                                            <p className="font-bold text-sm">{selectedFarmer.name}</p>
                                            <p className="text-xs text-slate-500">{selectedFarmer.village} · {selectedFarmer.mobile}</p>
                                            {selectedFarmer.creditBalance > 0 && (
                                                <p className="text-xs text-red-500 font-semibold mt-0.5">
                                                    Outstanding credit: {formatCurrency(selectedFarmer.creditBalance)}
                                                </p>
                                            )}
                                        </div>
                                        <button type="button" onClick={clearFarmer} disabled={!!generatedBill}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                        </button>
                                    </div>

                                    {/* Optional Kannada name */}
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setShowKannadaInput(v => !v)}
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                            disabled={!!generatedBill}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>translate</span>
                                            {showKannadaInput ? 'Remove Kannada name from PDF' : 'Add Kannada name for PDF (optional)'}
                                        </button>
                                        {showKannadaInput && (
                                            <div className="mt-2 flex gap-2 animate-fade-in">
                                                <input
                                                    type="text"
                                                    value={kannadaName}
                                                    onChange={e => setKannadaName(e.target.value)}
                                                    placeholder="ಕನ್ನಡದಲ್ಲಿ ಹೆಸರು ಟೈಪ್ ಮಾಡಿ..."
                                                    className="input text-sm flex-1"
                                                    disabled={!!generatedBill}
                                                />
                                                {kannadaName && (
                                                    <button type="button" onClick={() => setKannadaName('')}
                                                        className="text-slate-400 hover:text-red-400">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {kannadaName && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                PDF will show: <strong>{selectedFarmer.name}</strong> ({kannadaName})
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : isNewFarmer ? (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl space-y-3 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person_add</span>
                                            New Farmer — {farmerSearch}
                                        </p>
                                        <button type="button" onClick={() => { setIsNewFarmer(false); setFarmerSearch(''); }}
                                            className="text-slate-400 hover:text-red-400">
                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="label">Name *</label>
                                            <input type="text" {...register('newFarmer.name', { required: true })}
                                                placeholder="Full name" className="input" />
                                        </div>
                                        <div>
                                            <label className="label">Village *</label>
                                            <input type="text" {...register('newFarmer.village', { required: true })}
                                                placeholder="Village" className="input" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '16px' }}>search</span>
                                        <input
                                            ref={farmerInputRef}
                                            type="text"
                                            value={farmerSearch}
                                            onChange={e => setFarmerSearch(e.target.value)}
                                            placeholder="Search by name or enter 10-digit mobile to add new..."
                                            className="input pl-9"
                                            disabled={!!generatedBill}
                                        />
                                        {farmerSearch && (
                                            <button type="button" onClick={() => { setFarmerSearch(''); setSearchResults([]); }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                            </button>
                                        )}
                                    </div>
                                    {farmerSearch.length >= 2 && searchResults.length > 0 && (
                                        <div className="mt-1 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-sm">
                                            {searchResults.map(f => (
                                                <button key={f._id} type="button"
                                                    onClick={() => { setSelectedFarmer(f); setFarmerSearch(''); setSearchResults([]); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary/5 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                        {f.name?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{f.name}</p>
                                                        <p className="text-xs text-slate-500">{f.village} · {f.mobile}
                                                            {f.creditBalance > 0 && <span className="ml-2 text-red-500 font-semibold">Due: {formatCurrency(f.creditBalance)}</span>}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {farmerSearch.length >= 2 && searchResults.length === 0 && (
                                        <p className="text-xs text-slate-400 mt-2 px-1">
                                            {/^\d{10}$/.test(farmerSearch)
                                                ? '✅ 10-digit number detected — new farmer mode activated'
                                                : 'No farmers found. Try a different name or enter a 10-digit mobile.'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Products Table Card */}
                        <div className="card p-5 flex flex-col">
                            <div className="flex items-center justify-between mb-3 shrink-0">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                                    Products
                                    <span className="text-xs font-normal text-slate-400">({fields.length})</span>
                                </h3>
                                <button type="button" onClick={addRow} disabled={!!generatedBill}
                                    className="btn-secondary text-xs disabled:opacity-40">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                                    Add Row
                                </button>
                            </div>

                            {/* Table with fixed height scroll — only products scroll, not whole page */}
                            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="overflow-auto" style={{ maxHeight: '280px' }}>
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-slate-100 dark:bg-slate-800">
                                                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">Product</th>
                                                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase w-20 text-center">Qty</th>
                                                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase w-28">Rate</th>
                                                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase w-28 text-right">Total</th>
                                                <th className="px-3 py-2.5 w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fields.map((field, index) => (
                                                <ProductRow
                                                    key={field.id}
                                                    index={index}
                                                    field={field}
                                                    products={products}
                                                    register={register}
                                                    setValue={setValue}
                                                    watch={watch}
                                                    remove={remove}
                                                    disabled={!!generatedBill}
                                                    isLast={fields.length === 1}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Payment + GST + Interest */}
                        <div className="card p-5">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>payments</span>
                                Payment &amp; Tax
                            </h3>

                            {/* Payment type */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {['cash', 'credit', 'upi'].map(type => (
                                    <label key={type} className="cursor-pointer">
                                        <input type="radio" value={type} {...register('paymentType')} className="sr-only peer" disabled={!!generatedBill} />
                                        <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center text-sm font-semibold text-slate-500 peer-checked:border-primary peer-checked:text-primary peer-checked:bg-primary/5 transition-all select-none">
                                            {type === 'upi' ? '📱 UPI' : type === 'cash' ? '💵 Cash' : '📋 Credit'}
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {/* GST Toggle */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <button
                                            type="button"
                                            onClick={() => !generatedBill && setGstEnabled(v => !v)}
                                            className={`relative w-10 h-6 rounded-full transition-colors ${gstEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${gstEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                        <div>
                                            <p className="text-sm font-semibold">GST Applicable</p>
                                            <p className="text-xs text-slate-400">Enable for taxable goods</p>
                                        </div>
                                    </label>
                                    {gstEnabled && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-slate-500 mr-1">Rate:</span>
                                            {GST_RATES.map(rate => (
                                                <button key={rate} type="button"
                                                    onClick={() => setGstPercent(rate)}
                                                    disabled={!!generatedBill}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${gstPercent === rate ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-primary/50'}`}>
                                                    {rate}%
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Interest — credit only */}
                            {watchedPaymentType === 'credit' && (
                                <div className="border border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl p-4 mb-4 animate-fade-in">
                                    <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>trending_up</span>
                                        Credit Interest (Optional)
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="label text-xs">Interest Rate (%/month)</label>
                                            <input type="number" step="0.1" min="0" max="10"
                                                {...register('interestRate', { min: 0, max: 10, valueAsNumber: true })}
                                                placeholder="0" className="input" disabled={!!generatedBill} />
                                            <p className="text-xs text-slate-400 mt-1">0 = no interest</p>
                                        </div>
                                        <div>
                                            <label className="label text-xs">Due Date (optional)</label>
                                            <input type="date" {...register('dueDate')}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="input" disabled={!!generatedBill} />
                                        </div>
                                    </div>
                                    {interestAmount > 0 && (
                                        <p className="text-xs text-orange-600 mt-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg px-3 py-1.5">
                                            Interest: <strong>{formatCurrency(interestAmount)}</strong> — noted on invoice (not added to bill total)
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* WhatsApp */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={sendToWhatsApp}
                                    onChange={e => setSendToWhatsApp(e.target.checked)}
                                    disabled={!!generatedBill}
                                    className="rounded border-slate-300 text-primary focus:ring-primary" />
                                <span className="text-sm text-slate-600 dark:text-slate-300">Send bill receipt via WhatsApp</span>
                            </label>
                        </div>
                    </div>

                    {/* ── Right: Summary + Actions ─────────────────────────── */}
                    <div>
                        <div className="card p-5 xl:sticky xl:top-24">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                                Bill Summary
                            </h3>

                            {/* Farmer preview */}
                            {(selectedFarmer || watch('newFarmer.name')) && (
                                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <p className="text-xs text-slate-500 mb-0.5">Bill To</p>
                                    <p className="font-bold text-sm">{selectedFarmer?.name || watch('newFarmer.name')}</p>
                                    {kannadaName && <p className="text-xs text-slate-500">{kannadaName}</p>}
                                    <p className="text-xs text-slate-400">{selectedFarmer?.village || 'New Farmer'}</p>
                                </div>
                            )}

                            {/* Totals */}
                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                </div>
                                {gstEnabled ? (
                                    <>
                                        <div className="flex justify-between text-blue-600 text-xs">
                                            <span>CGST ({gstPercent / 2}%)</span>
                                            <span>+ {formatCurrency(gstAmount / 2)}</span>
                                        </div>
                                        <div className="flex justify-between text-blue-600 text-xs">
                                            <span>SGST ({gstPercent / 2}%)</span>
                                            <span>+ {formatCurrency(gstAmount / 2)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">GST</span>
                                        <span className="text-emerald-600 font-medium">Exempt</span>
                                    </div>
                                )}
                                {watchedPaymentType === 'credit' && interestAmount > 0 && (
                                    <div className="flex justify-between text-orange-500 text-xs">
                                        <span>Interest ({watchedInterestRate}%/mo) *</span>
                                        <span>{formatCurrency(interestAmount)}</span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Total Payable</span>
                                    <span className="text-primary text-lg">{formatCurrency(grandTotal)}</span>
                                </div>
                                {watchedPaymentType === 'credit' && interestAmount > 0 && (
                                    <p className="text-[10px] text-slate-400">* Informational only</p>
                                )}
                            </div>

                            {watchedPaymentType === 'credit' && (
                                <div className="mb-4 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>warning</span>
                                        Credit bill — adds to farmer's outstanding balance
                                    </p>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="space-y-2">
                                {!generatedBill ? (
                                    <button type="submit" disabled={submitting} className="btn-primary w-full">
                                        {submitting
                                            ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span> Generating...</>
                                            : <><span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>receipt</span> Preview &amp; Generate Bill</>
                                        }
                                    </button>
                                ) : (
                                    <div className="space-y-2 animate-fade-in">
                                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Bill Created!</p>
                                        </div>
                                        <button type="button" onClick={handleViewPDF} disabled={pdfLoading} className="btn-primary w-full">
                                            {pdfLoading
                                                ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span> Building PDF...</>
                                                : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>picture_as_pdf</span> View PDF</>
                                            }
                                        </button>
                                        <button type="button" onClick={handleDownloadPDF} disabled={pdfLoading} className="btn-outline w-full">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span> Download PDF
                                        </button>
                                        <button type="button" onClick={handleSendWhatsApp} disabled={sendingWhatsApp} className="btn-outline w-full text-green-600 border-green-200 hover:bg-green-50">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
                                            {sendingWhatsApp ? 'Sending...' : 'Send WhatsApp'}
                                        </button>
                                        <button type="button" onClick={handleReset} className="btn-secondary w-full">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> New Bill
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* ── Review Modal ─────────────────────────────────────────────── */}
            {reviewData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>fact_check</span>
                                Confirm Bill
                            </h2>
                            <button type="button" onClick={() => setReviewData(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                            </button>
                        </div>

                        {/* Farmer */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>person</span>
                            <div>
                                <p className="font-bold text-sm">{isNewFarmer ? `${reviewData.newFarmer?.name} (New)` : selectedFarmer?.name}</p>
                                <p className="text-xs text-slate-500">{selectedFarmer?.mobile || farmerSearch}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="max-h-52 overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Product</th>
                                            <th className="px-4 py-2 text-center text-xs font-bold text-slate-500 uppercase">Qty</th>
                                            <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Rate</th>
                                            <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {reviewData.validItems.map((item, idx) => {
                                            const prod = products.find(p => String(p._id) === String(item.productId));
                                            return (
                                                <tr key={idx}>
                                                    <td className="px-4 py-2 font-medium">{prod?.name || 'Product'}</td>
                                                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-right text-slate-500">{formatCurrency(item.price)}</td>
                                                    <td className="px-4 py-2 text-right font-bold">{formatCurrency(item.total)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
                            {gstEnabled && gstAmount > 0 && (
                                <div className="flex justify-between text-sm text-blue-600"><span>GST ({gstPercent}%)</span><span>+ {formatCurrency(gstAmount)}</span></div>
                            )}
                            {reviewData.paymentType === 'credit' && interestAmount > 0 && (
                                <p className="text-xs text-orange-600">Interest @ {reviewData.interestRate}%/mo = {formatCurrency(interestAmount)} (noted on invoice)</p>
                            )}
                            <div className="h-px bg-slate-200 dark:bg-slate-700" />
                            <div className="flex items-center justify-between">
                                <span className={`badge capitalize ${reviewData.paymentType === 'cash' ? 'badge-success' : reviewData.paymentType === 'credit' ? 'badge-danger' : 'badge-primary'}`}>
                                    {reviewData.paymentType}
                                </span>
                                <p className="text-xl font-black">{formatCurrency(grandTotal)}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 shrink-0">
                            <button type="button" onClick={() => setReviewData(null)} className="btn-outline flex-1">
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span> Edit
                            </button>
                            <button type="button" onClick={confirmGenerate} disabled={submitting} className="btn-primary flex-1">
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                                    {submitting ? 'hourglass_top' : 'receipt'}
                                </span>
                                {submitting ? 'Creating...' : 'Confirm & Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateBill;
