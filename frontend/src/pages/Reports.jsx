import { MonthlySalesLineChart, TopProductsChart } from '../components/Charts';
import { formatCurrency } from '../utils/formatCurrency';

const MONTHLY_DATA = [
    { month: 'Jan', sales: 82000, credit: 25000, payments: 18000 },
    { month: 'Feb', sales: 123000, credit: 42000, payments: 35000 },
    { month: 'Mar', sales: 113000, credit: 38000, payments: 28000 },
    { month: 'Apr', sales: 175400, credit: 52000, payments: 44000 },
    { month: 'May', sales: 144000, credit: 44000, payments: 39000 },
    { month: 'Jun', sales: 196500, credit: 61000, payments: 52000 },
];

const Reports = () => {
    const totalSales = MONTHLY_DATA.reduce((s, m) => s + m.sales, 0);
    const totalCredit = MONTHLY_DATA.reduce((s, m) => s + m.credit, 0);
    const totalCollected = MONTHLY_DATA.reduce((s, m) => s + m.payments, 0);

    const handleExportCSV = () => {
        const headers = ['Month', 'Sales', 'Credit Given', 'Payments Collected'];
        const rows = MONTHLY_DATA.map(m => [m.month, m.sales, m.credit, m.payments]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agribill_report.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Reports</h1>
                    <p className="page-subtitle">Business analytics and insights</p>
                </div>
                <button onClick={handleExportCSV} className="btn-outline text-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                    Export CSV
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Revenue (6m)', value: formatCurrency(totalSales, true), icon: 'trending_up', color: 'text-primary', bg: 'bg-primary/10' },
                    { label: 'Credit Extended', value: formatCurrency(totalCredit, true), icon: 'account_balance_wallet', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
                    { label: 'Cash Collected', value: formatCurrency(totalCollected, true), icon: 'payments', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                ].map((s, i) => (
                    <div key={i} className="card p-4 flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                            <span className={`material-symbols-outlined ${s.color}`} style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{s.label}</p>
                            <p className="text-xl font-bold">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <MonthlySalesLineChart data={MONTHLY_DATA} />
                </div>
                <div>
                    <TopProductsChart />
                </div>
            </div>

            {/* Monthly breakdown table */}
            <div className="card overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold">Monthly Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60">
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Month</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Sales</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Credit Given</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Collected</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Collection %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {MONTHLY_DATA.map((row, i) => {
                                const collectionPct = ((row.payments / row.credit) * 100).toFixed(0);
                                return (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-sm">{row.month}</td>
                                        <td className="px-4 py-3 text-right font-medium text-sm">{formatCurrency(row.sales)}</td>
                                        <td className="px-4 py-3 text-right text-orange-500 font-medium text-sm">{formatCurrency(row.credit)}</td>
                                        <td className="px-4 py-3 text-right text-emerald-600 font-medium text-sm">{formatCurrency(row.payments)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(collectionPct, 100)}%` }} />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{collectionPct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
