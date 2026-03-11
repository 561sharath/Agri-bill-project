import { useNavigate } from 'react-router-dom';
import DashboardCards from '../components/DashboardCards';
import { MonthlyRevenueChart, DailySalesChart } from '../components/Charts';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import useFetch from '../hooks/useFetch';
import { dashboardAPI } from '../services/api';

// Mock pending credit data (fallback)
const MOCK_PENDING = [
    { _id: '1', name: 'Ramesh Kumar', village: 'Mylavaram', mobile: '98765 43210', creditBalance: 12450 },
    { _id: '2', name: 'Suresh Reddy', village: 'Vijayawada Rural', mobile: '91234 56789', creditBalance: 8900 },
    { _id: '3', name: 'Venkatesh Rao', village: 'Guntur East', mobile: '88877 66554', creditBalance: 15200 },
    { _id: '4', name: 'M. Satish', village: 'Tenali', mobile: '99001 12233', creditBalance: 4320 },
];

const MOCK_STOCK_ALERTS = [
    { name: 'Urea (50kg)', stock: 5, level: 'critical', lastRestocked: null },
    { name: 'NPK Complex', stock: 12, level: 'low', lastRestocked: null },
    { name: 'Zinc Sulphate', stock: 30, level: 'ok', lastRestocked: '14 days ago' },
];

const Dashboard = () => {
    const navigate = useNavigate();
    const { data: statsData } = useFetch(() => dashboardAPI.getStats(), []);

    const stats = statsData || {
        todaySales: 12450,
        totalCredit: 485200,
        pendingCredit: 112000,
        totalFarmers: 842,
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
            </div>

            {/* KPI Cards */}
            <DashboardCards stats={stats} />

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Charts + Table */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MonthlyRevenueChart />
                        <DailySalesChart />
                    </div>

                    {/* Pending Credit Ledger */}
                    <div className="card overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">Pending Credit Ledger</h3>
                            <button
                                onClick={() => navigate('/credit-ledger')}
                                className="text-primary text-sm font-semibold hover:underline cursor-pointer"
                            >
                                View All
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Farmer Name</th>
                                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Village</th>
                                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Pending Amount</th>
                                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {MOCK_PENDING.map(farmer => (
                                        <tr key={farmer._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-5 py-3.5 font-medium text-sm">{farmer.name}</td>
                                            <td className="px-5 py-3.5 text-slate-500 text-sm">{farmer.village}</td>
                                            <td className="px-5 py-3.5 text-slate-500 text-sm">{farmer.mobile}</td>
                                            <td className="px-5 py-3.5 text-right font-bold text-red-500 text-sm">
                                                {formatCurrency(farmer.creditBalance)}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <button className="btn-secondary text-xs gap-1 px-3 py-1.5 mx-auto">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>send</span>
                                                    Send Reminder
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="flex flex-col gap-6">
                    {/* Quick Actions */}
                    <div className="bg-primary p-5 rounded-xl shadow-lg text-white flex flex-col gap-5">
                        <h3 className="text-base font-bold">Quick Actions</h3>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => navigate('/bills/create')}
                                className="w-full bg-white text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-95 transition-all shadow-md text-sm cursor-pointer"
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                                Create New Bill
                            </button>
                            <button
                                onClick={() => navigate('/farmers/add')}
                                className="w-full bg-primary-600/60 border border-white/30 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-sm cursor-pointer"
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>person_add</span>
                                Add Farmer
                            </button>
                            <button
                                onClick={() => navigate('/payments')}
                                className="w-full bg-primary-600/60 border border-white/30 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-sm cursor-pointer"
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>account_balance</span>
                                Record Payment
                            </button>
                        </div>
                    </div>

                    {/* Stock Alerts */}
                    <div className="card p-5">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Stock Alerts</h3>
                        <div className="flex flex-col gap-3">
                            {MOCK_STOCK_ALERTS.map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`h-10 w-10 flex items-center justify-center rounded-xl shrink-0
                    ${item.level === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-500' :
                                            item.level === 'low' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500' :
                                                'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                                        >
                                            {item.level === 'critical' ? 'warning' : item.level === 'low' ? 'error' : 'inventory'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate">{item.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {item.level === 'critical' ? `Only ${item.stock} bags left` :
                                                item.level === 'low' ? `Low stock: ${item.stock} bags` :
                                                    `Last restocked ${item.lastRestocked}`}
                                        </p>
                                    </div>
                                    <button className="text-primary text-xs font-bold border border-primary/20 px-2.5 py-1 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer shrink-0">
                                        {item.level === 'ok' ? 'Check' : 'Order'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => navigate('/inventory')}
                            className="w-full mt-5 py-2 text-xs font-bold text-slate-400 hover:text-primary transition-colors cursor-pointer"
                        >
                            View All Inventory →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
