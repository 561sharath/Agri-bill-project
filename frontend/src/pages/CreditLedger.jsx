import { useState } from 'react';
import { formatCurrency, formatDate } from '../utils/formatCurrency';

const MOCK_LEDGER = [
    { _id: 'l1', farmerName: 'Ramesh Kumar', village: 'Mylavaram', billNo: 'AG-001', billDate: '2024-12-15', billAmount: 14500, paid: 2050, balance: 12450, daysOld: 45 },
    { _id: 'l2', farmerName: 'Suresh Reddy', village: 'Vijayawada Rural', billNo: 'AG-003', billDate: '2024-12-18', billAmount: 8900, paid: 0, balance: 8900, daysOld: 42 },
    { _id: 'l3', farmerName: 'Venkatesh Rao', village: 'Guntur East', billNo: 'AG-005', billDate: '2024-11-20', billAmount: 18000, paid: 2800, balance: 15200, daysOld: 70 },
    { _id: 'l4', farmerName: 'M. Satish', village: 'Tenali', billNo: 'AG-007', billDate: '2025-01-05', billAmount: 4320, paid: 0, balance: 4320, daysOld: 10 },
    { _id: 'l5', farmerName: 'Raju Naidu', village: 'Bapatla', billNo: 'AG-009', billDate: '2024-12-01', billAmount: 9600, paid: 6400, balance: 3200, daysOld: 59 },
];

const CreditLedger = () => {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const filtered = MOCK_LEDGER.filter(item => {
        const matchSearch = item.farmerName.toLowerCase().includes(search.toLowerCase()) || item.billNo.includes(search);
        if (filter === 'overdue') return matchSearch && item.daysOld > 30;
        if (filter === 'recent') return matchSearch && item.daysOld <= 30;
        return matchSearch;
    });

    const totalBalance = filtered.reduce((sum, item) => sum + item.balance, 0);
    const overdueCount = MOCK_LEDGER.filter(i => i.daysOld > 30).length;

    const getStatusBadge = (daysOld, balance) => {
        if (balance === 0) return <span className="badge badge-success">Cleared</span>;
        if (daysOld > 60) return <span className="badge badge-danger">Overdue</span>;
        if (daysOld > 30) return <span className="badge badge-warning">Late</span>;
        return <span className="badge badge-info">Active</span>;
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div>
                <h1 className="page-title">Credit Ledger</h1>
                <p className="page-subtitle">Track pending credit and outstanding balances</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Outstanding', value: formatCurrency(MOCK_LEDGER.reduce((s, i) => s + i.balance, 0)), icon: 'account_balance_wallet', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
                    { label: 'Overdue (>30 days)', value: overdueCount, icon: 'schedule', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
                    { label: 'Total Bills', value: MOCK_LEDGER.length, icon: 'receipt_long', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                    { label: 'Avg Credit/Farmer', value: formatCurrency(MOCK_LEDGER.reduce((s, i) => s + i.balance, 0) / MOCK_LEDGER.length), icon: 'person', color: 'text-primary', bg: 'bg-primary/10' },
                ].map((s, i) => (
                    <div key={i} className="card p-4">
                        <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                            <span className={`material-symbols-outlined ${s.color}`} style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                        <p className="text-lg font-bold">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters + Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ fontSize: '16px' }}>search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search farmer or bill no..."
                        className="input pl-9"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'overdue', 'recent'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer capitalize
                ${filter === f ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60">
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Farmer</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Bill No</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Bill Date</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Bill Amt</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Paid</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filtered.map(item => (
                                <tr
                                    key={item._id}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors
                    ${item.daysOld > 60 ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-sm">{item.farmerName}</p>
                                        <p className="text-xs text-slate-500">{item.village}</p>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-mono text-primary">{item.billNo}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(item.billDate)}</td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(item.billAmount)}</td>
                                    <td className="px-4 py-3 text-right text-sm text-emerald-600 font-semibold">{formatCurrency(item.paid)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`text-sm font-bold ${item.balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {formatCurrency(item.balance)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{getStatusBadge(item.daysOld, item.balance)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button className="btn-secondary text-xs px-3 py-1.5 gap-1">
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>send</span>
                                            Remind
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700">
                                <td colSpan={5} className="px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                                    Showing {filtered.length} of {MOCK_LEDGER.length} entries
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-red-500">
                                    {formatCurrency(totalBalance)}
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CreditLedger;
