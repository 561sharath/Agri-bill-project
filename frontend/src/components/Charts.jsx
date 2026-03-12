import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { formatCurrency } from '../utils/formatCurrency';

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-2.5 text-sm">
                <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-primary font-bold">
                        {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value, true) : p.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// ─── Monthly Revenue Bar Chart ───────────────────────────────────────────────
export const MonthlyRevenueChart = ({ data }) => {
    // Fallback if data is not provided or empty
    const chartData = data && data.length > 0 ? data : [
        { month: 'Q1', revenue: 0 },
        { month: 'Q2', revenue: 0 }
    ];

    return (
        <div className="card p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2f7f3310' }} />
                    <Bar dataKey="revenue" fill="#2f7f33" radius={[6, 6, 0, 0]}>
                        {chartData.map((_, i) => (
                            <Cell
                                key={i}
                                fill={i === chartData.length - 1 ? '#2f7f33' : '#2f7f3333'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// ─── Weekly Revenue Line/Area Chart ───────────────────────────────────────────
export const WeeklyRevenueChart = ({ data }) => {
    const chartData = data && data.length > 0 ? data : [
        { day: 'Mon', revenue: 0 },
        { day: 'Tue', revenue: 0 }
    ];

    return (
        <div className="card p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Weekly Revenue</h3>
            <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2f7f33" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#2f7f33" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#2f7f33" strokeWidth={2.5} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: '#2f7f33' }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// ─── Top Products Pie Chart ───────────────────────────────────────────────────
const PIE_COLORS = ['#2f7f33', '#4ade80', '#fb923c', '#60a5fa', '#a78bfa', '#f472b6'];

export const TopProductsChart = ({ data }) => {
    const chartData = data || [
        { name: 'Urea', value: 35 },
        { name: 'NPK Complex', value: 28 },
        { name: 'DAP', value: 20 },
        { name: 'Zinc Sulphate', value: 10 },
        { name: 'Others', value: 7 },
    ];

    return (
        <div className="card p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Top Products by Sales</h3>
            <div className="flex gap-4 items-center">
                <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                            {chartData.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v}%`, '']} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 flex-1">
                    {chartData.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{entry.name}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 ml-auto">{entry.value}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Monthly Sales Line Chart (for Reports) ──────────────────────────────────
export const MonthlySalesLineChart = ({ data }) => {
    const chartData = data || [
        { month: 'Jan', sales: 82000, credit: 25000 },
        { month: 'Feb', sales: 123000, credit: 42000 },
        { month: 'Mar', sales: 113000, credit: 38000 },
        { month: 'Apr', sales: 175400, credit: 52000 },
        { month: 'May', sales: 144000, credit: 44000 },
        { month: 'Jun', sales: 196500, credit: 61000 },
    ];

    return (
        <div className="card p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Monthly Sales vs Credit</h3>
            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" name="Sales" stroke="#2f7f33" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="credit" name="Credit" stroke="#fb923c" strokeWidth={2} dot={false} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
