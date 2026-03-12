import { formatCurrency } from '../utils/formatCurrency';

const StatCard = ({ title, value, percentageChange, icon, colorClass, highlightClass }) => {
    const isPositive = percentageChange > 0;
    const isNegative = percentageChange < 0;
    const isNeutral = percentageChange === 0;

    return (
        <div className="card p-5 group flex justify-between relative overflow-hidden h-full">
            {/* Background design */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${highlightClass} opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-500`} />

            <div className="flex flex-col justify-between relative z-10 w-full">
                <div className="flex justify-between items-start mb-4">
                    <div className={`h-11 w-11 rounded-xl ${highlightClass} flex items-center justify-center`}>
                        <span className={`material-symbols-outlined ${colorClass}`} style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>
                            {icon}
                        </span>
                    </div>
                </div>

                <h3 className="text-slate-500 font-semibold mb-1 truncate">{title}</h3>

                <div className="flex items-end justify-between w-full">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                        {value}
                    </p>

                    {percentageChange !== undefined && (
                        <div className={`flex items-center text-xs font-bold shrink-0 ml-2
                            ${isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-slate-400'}`}
                        >
                            {isPositive && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>}
                            {isNegative && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_down</span>}
                            {isNeutral && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_flat</span>}
                            <span className="ml-[1px]">{Math.abs(percentageChange)}%</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DashboardCards = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <StatCard
                title="Today's Sales"
                value={formatCurrency(stats?.todaySales?.amount || 0)}
                percentageChange={stats?.todaySales?.percentageChange}
                icon="monitoring"
                colorClass="text-primary"
                highlightClass="bg-primary/10"
            />
            <StatCard
                title="Total Credit Given"
                value={formatCurrency(stats?.totalCreditGiven || 0)}
                icon="account_balance_wallet"
                colorClass="text-blue-500"
                highlightClass="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
                title="Farmers Count"
                value={stats?.totalFarmers?.count || 0}
                percentageChange={stats?.totalFarmers?.percentageChange}
                icon="groups"
                colorClass="text-emerald-500"
                highlightClass="bg-emerald-100 dark:bg-emerald-900/30"
            />
            <StatCard
                title="Pending Credit (This Mnt)"
                value={formatCurrency(stats?.pendingCreditThisMonth?.amount || 0)}
                percentageChange={stats?.pendingCreditThisMonth?.percentageChange}
                icon="pending_actions"
                colorClass="text-orange-500 dark:text-orange-400"
                highlightClass="bg-orange-100 dark:bg-orange-900/30"
            />
        </div>
    );
};

export default DashboardCards;
