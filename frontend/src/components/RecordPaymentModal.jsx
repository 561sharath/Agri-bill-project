import { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { paymentsAPI, farmersAPI } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import useDebounce from '../hooks/useDebounce';
import TruncatedText from './TruncatedText';

// ── FarmerSearchSelect ────────────────────────────────────────────────────────
const FarmerSearchSelect = ({ onSelect, selectedFarmer, onClear }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const debouncedQuery = useDebounce(query, 400);
    const inputRef = useRef(null);
    const searchReqId = useRef(0);

    useEffect(() => {
        if (debouncedQuery.length < 2) { setResults([]); return; }
        const id = ++searchReqId.current;
        setSearching(true);
        farmersAPI.search(debouncedQuery)
            .then(res => {
                if (id !== searchReqId.current) return;
                setResults((res.data || []).filter(f => f.creditBalance > 0));
            })
            .catch(() => { if (id === searchReqId.current) setResults([]); })
            .finally(() => { if (id === searchReqId.current) setSearching(false); });
    }, [debouncedQuery]);

    if (selectedFarmer) {
        return (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <div>
                    <p className="font-bold text-sm">
                        <TruncatedText text={selectedFarmer.name || 'Unknown'} />
                    </p>
                    <p className="text-xs text-slate-500">
                        {selectedFarmer.mobile || '–'} · <TruncatedText text={selectedFarmer.village || '–'} />
                    </p>
                </div>
                <button type="button" onClick={onClear} className="text-slate-400 hover:text-red-500 cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '16px' }}>search</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search farmer by name or mobile…"
                    className="input pl-9"
                />
                {searching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </span>
                )}
            </div>
            {open && query.length >= 2 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {results.length === 0 && !searching ? (
                        <p className="px-4 py-3 text-sm text-slate-400">No farmers with credit found for "{query}"</p>
                    ) : results.map(f => (
                        <button
                            key={f._id}
                            type="button"
                            onClick={() => { onSelect(f); setQuery(''); setOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors text-left border-b border-slate-100 dark:border-slate-700 last:border-0 cursor-pointer"
                        >
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                {f.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">
                                    <TruncatedText text={f.name || 'Unknown'} />
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {f.mobile || '–'} ·{' '}
                                    <span className="text-red-500 font-semibold">
                                        Due: {formatCurrency(f.creditBalance || 0)}
                                    </span>
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── RecordPaymentModal ────────────────────────────────────────────────────────
const RecordPaymentModal = ({ onClose, onSave, initialFarmer = null }) => {
    const [selectedFarmer, setSelectedFarmer] = useState(initialFarmer);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);

    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm({
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            method: 'cash',
        }
    });

    const watchAmount = watch('amount');
    const notesValue = watch('notes') || '';

    const handleFullPayment = useCallback(() => {
        if (selectedFarmer?.creditBalance) setValue('amount', selectedFarmer.creditBalance);
    }, [selectedFarmer, setValue]);

    const onSubmit = async (data) => {
        if (!selectedFarmer) { toast.error('Please select a farmer'); return; }
        try {
            const res = await paymentsAPI.create({
                ...data,
                farmerId: selectedFarmer._id,
                sendWhatsApp,
            });
            toast.success(res?.data?.whatsAppSent
                ? 'Payment recorded and WhatsApp sent!'
                : 'Payment recorded successfully!');
            onSave();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record payment');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 animate-slide-up shadow-2xl max-h-[95vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>payments</span>
                        Record Payment
                    </h2>
                    <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div>
                        <label className="label">Select Farmer *</label>
                        <FarmerSearchSelect
                            selectedFarmer={selectedFarmer}
                            onSelect={setSelectedFarmer}
                            onClear={() => setSelectedFarmer(null)}
                        />
                    </div>

                    {selectedFarmer && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-red-500 font-bold uppercase mb-0.5">Outstanding Balance</p>
                                    <p className="text-lg font-black text-red-600">
                                        {formatCurrency(selectedFarmer.creditBalance || 0)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleFullPayment}
                                    className="text-xs btn-outline text-red-600 border-red-200 hover:bg-red-50 py-1.5"
                                >
                                    Full Payment
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Amount (₹) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="1"
                                {...register('amount', {
                                    required: 'Required',
                                    min: { value: 1, message: 'Min ₹1' },
                                    valueAsNumber: true,
                                    validate: val =>
                                        !selectedFarmer ||
                                        val <= (selectedFarmer.creditBalance || 0) ||
                                        'Exceeds outstanding balance',
                                })}
                                className={`input ${errors.amount ? 'border-red-400' : ''}`}
                                placeholder="5000"
                            />
                            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
                        </div>
                        <div>
                            <label className="label">Method *</label>
                            <select {...register('method', { required: true })} className="input">
                                <option value="cash">💵 Cash</option>
                                <option value="upi">📱 UPI</option>
                                <option value="bank">🏦 Bank Transfer</option>
                                <option value="cheque">📝 Cheque</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Date</label>
                        <input
                            type="date"
                            max={new Date().toISOString().split('T')[0]} // QUICK WIN: prevent future dates
                            {...register('date')}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label">Notes (optional)</label>
                        <input
                            {...register('notes', { maxLength: { value: 300, message: 'Max 300 characters' } })}
                            className={`input ${notesValue.length > 300 ? 'border-red-400' : ''}`}
                            placeholder="e.g. Kharif season partial payment…"
                        />
                        <div className="flex justify-between items-start mt-1">
                            {errors.notes
                                ? <p className="text-xs text-red-500">{errors.notes.message}</p>
                                : <div />}
                            <span className={`text-xs ${notesValue.length > 300 ? 'text-red-500' : 'text-slate-400'}`}>
                                {notesValue.length}/300
                            </span>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <input
                            type="checkbox"
                            checked={sendWhatsApp}
                            onChange={e => setSendWhatsApp(e.target.checked)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <div>
                            <span className="text-sm font-medium">Send WhatsApp confirmation</span>
                            <p className="text-xs text-slate-400">Farmer will receive payment receipt</p>
                        </div>
                    </label>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
                        <button
                            type="submit"
                            disabled={isSubmitting || notesValue.length > 300}
                            className="btn-primary flex-1"
                        >
                            {isSubmitting
                                ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                                : <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            }
                            {isSubmitting ? 'Recording…' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RecordPaymentModal;
