import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { paymentsAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatCurrency';

const MOCK_FARMERS = [
    { _id: 'f1', name: 'Ramesh Kumar', creditBalance: 12450 },
    { _id: 'f2', name: 'Suresh Reddy', creditBalance: 8900 },
    { _id: 'f3', name: 'Venkatesh Rao', creditBalance: 15200 },
    { _id: 'f4', name: 'M. Satish', creditBalance: 0 },
];

const MOCK_PAYMENTS = [
    { _id: 'pay1', farmerName: 'Ramesh Kumar', amount: 5000, method: 'upi', date: '2025-01-10', notes: '' },
    { _id: 'pay2', farmerName: 'Venkatesh Rao', amount: 2800, method: 'cash', date: '2025-01-08', notes: '' },
    { _id: 'pay3', farmerName: 'Suresh Reddy', amount: 3000, method: 'bank', date: '2025-01-05', notes: 'Partial payment' },
];

const PaymentModal = ({ onClose, onSave }) => {
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm();

    const amount = watch('amount');

    const onSubmit = async (data) => {
        try {
            await paymentsAPI.create({ ...data, farmerId: selectedFarmer._id });
            toast.success('Payment recorded!');
            onSave();
        } catch {
            toast.success('Payment recorded! (Demo)');
            onSave();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold">Record Payment</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div>
                        <label className="label">Select Farmer *</label>
                        <select
                            {...register('farmerId', { required: 'Select a farmer' })}
                            onChange={e => setSelectedFarmer(MOCK_FARMERS.find(f => f._id === e.target.value) || null)}
                            className="input"
                        >
                            <option value="">Choose farmer...</option>
                            {MOCK_FARMERS.filter(f => f.creditBalance > 0).map(f => (
                                <option key={f._id} value={f._id}>{f.name} (Due: {formatCurrency(f.creditBalance)})</option>
                            ))}
                        </select>
                        {errors.farmerId && <p className="text-xs text-red-500 mt-1">{errors.farmerId.message}</p>}
                    </div>

                    {selectedFarmer && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                Outstanding Balance: {formatCurrency(selectedFarmer.creditBalance)}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="label">Amount (₹) *</label>
                        <input
                            type="number"
                            step="0.01"
                            {...register('amount', { required: 'Amount required', min: { value: 1, message: 'Min ₹1' } })}
                            className="input"
                            placeholder="5000"
                        />
                        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
                    </div>

                    <div>
                        <label className="label">Payment Method *</label>
                        <select {...register('method', { required: true })} className="input">
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>

                    <div>
                        <label className="label">Date</label>
                        <input
                            type="date"
                            {...register('date')}
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label">Notes</label>
                        <input {...register('notes')} className="input" placeholder="Optional note..." />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                            {isSubmitting ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Payments = () => {
    const [payments, setPayments] = useState(MOCK_PAYMENTS);
    const [showModal, setShowModal] = useState(false);

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    const methodBadge = (method) => {
        const map = { cash: 'badge-success', upi: 'badge-primary', bank: 'badge-info', cheque: 'badge-warning' };
        return <span className={`badge ${map[method] || 'badge-info'} capitalize`}>{method}</span>;
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Payments</h1>
                    <p className="page-subtitle">Record and track farmer credit payments</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                    Record Payment
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { label: 'Total Collected', value: formatCurrency(totalCollected), icon: 'payments', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                    { label: 'This Month', value: formatCurrency(7800), icon: 'calendar_month', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                    { label: 'Transactions', value: payments.length, icon: 'receipt', color: 'text-primary', bg: 'bg-primary/10' },
                ].map((s, i) => (
                    <div key={i} className="card p-4 flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                            <span className={`material-symbols-outlined ${s.color}`} style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{s.label}</p>
                            <p className="text-lg font-bold">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Payments table */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold">Transaction History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60">
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Farmer</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Method</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {payments.map(payment => (
                                <tr key={payment._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-4 py-3 font-medium text-sm">{payment.farmerName}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(payment.date)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm">{formatCurrency(payment.amount)}</td>
                                    <td className="px-4 py-3">{methodBadge(payment.method)}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{payment.notes || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <PaymentModal onClose={() => setShowModal(false)} onSave={() => setShowModal(false)} />
            )}
        </div>
    );
};

export default Payments;
