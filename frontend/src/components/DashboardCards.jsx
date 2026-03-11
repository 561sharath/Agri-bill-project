import { formatCurrency } from '../utils/formatCurrency';

const StatCard = ({ icon, iconColor, label, value, trend, trendLabel, compact = false }) => {
    const isPositive = trend > 0;
    const isNeutral = trend === 0;

    return (
        <div className="card p-5 flex flex-col gap-1 animate-slide-up hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-sm font-medium">{label}</span>
                <span
                    className={`material-symbols-outlined ${iconColor}`}
                    style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
                >
                    {icon}
                </span>
            </div>

            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {compact ? formatCurrency(value, true) : (typeof value === 'number' ? formatCurrency(value) : value)}
            </p>

            {trendLabel && (
                <p className={`text-xs font-semibold flex items-center gap-0.5 mt-1
          ${isPositive ? (trend > 0 && label.includes('Credit') || label.includes('Pending') ? 'text-red-500' : 'text-emerald-600') : isNeutral ? 'text-slate-400' : 'text-emerald-600'}
        `}>
                    <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '14px' }}
                    >
                        {isPositive ? 'trending_up' : isNeutral ? 'trending_flat' : 'trending_down'}
                    </span>
                    {trendLabel}
                </p>
            )}
        </div>
    );
};

const DashboardCards = ({ stats }) => {
    const cards = [
        {
            icon: 'point_of_sale',
            iconColor: 'text-primary',
            label: "Today's Sales",
            value: stats?.todaySales ?? 12450,
            trend: 12,
            trendLabel: '+12% from yesterday',
        },
        {
            icon: 'account_balance_wallet',
            iconColor: 'text-orange-500',
            label: 'Total Credit Given',
            value: stats?.totalCredit ?? 485200,
            trend: 5.2,
            trendLabel: '5.2% higher risk',
        },
        {
            icon: 'hourglass_empty',
            iconColor: 'text-red-500',
            label: 'Total Pending Credit',
            value: stats?.pendingCredit ?? 112000,
            trend: -2,
            trendLabel: '-2% from last month',
        },
        {
            icon: 'person_add',
            iconColor: 'text-blue-500',
            label: 'Total Farmers',
            value: stats?.totalFarmers ?? 842,
            trend: 8,
            trendLabel: '+8% new joins',
            compact: false,
        },
    ];

    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
                <StatCard
                    key={i}
                    {...card}
                    // The Farmers card shows raw count - override formatter
                    value={card.label === 'Total Farmers' ? (stats?.totalFarmers ?? 842) : card.value}
                />
            ))}
        </section>
    );
};

// Special overridden export for non-currency value card
export { StatCard };
export default DashboardCards;
