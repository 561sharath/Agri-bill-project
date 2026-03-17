import Bill from '../models/Bill.js';
import Farmer from '../models/Farmer.js';
import Product from '../models/Product.js';

const calcPct = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
};

const getDateBounds = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisWeekStart = new Date(todayStart);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    return { now, todayStart, yesterdayStart, thisMonthStart, lastMonthStart, thisWeekStart };
};

// ─── Sales Summary ────────────────────────────────────────────────────────────
export const getSalesSummaryService = async () => {
    const { todayStart, yesterdayStart, thisMonthStart, lastMonthStart } = getDateBounds();

    const [billAgg] = await Bill.aggregate([
        {
            $facet: {
                todaySales: [
                    { $match: { createdAt: { $gte: todayStart } } },
                    { $group: { _id: null, amount: { $sum: '$totalAmount' } } }
                ],
                yesterdaySales: [
                    { $match: { createdAt: { $gte: yesterdayStart, $lt: todayStart } } },
                    { $group: { _id: null, amount: { $sum: '$totalAmount' } } }
                ],
                totalCreditGiven: [
                    { $match: { paymentType: 'credit' } },
                    { $group: { _id: null, amount: { $sum: '$totalAmount' } } }
                ],
            }
        }
    ]);

    const todayAmt = billAgg.todaySales[0]?.amount || 0;
    const yestAmt = billAgg.yesterdaySales[0]?.amount || 0;

    return {
        todaySales: {
            amount: todayAmt,
            percentageChange: calcPct(todayAmt, yestAmt)
        },
        totalCreditGiven: billAgg.totalCreditGiven[0]?.amount || 0,
    };
};

// ─── Chart Data ───────────────────────────────────────────────────────────────
export const getChartDataService = async () => {
    const { thisWeekStart } = getDateBounds();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const [agg] = await Bill.aggregate([
        {
            $facet: {
                monthlyRevenue: [
                    { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$totalAmount' } } },
                    { $sort: { _id: 1 } }
                ],
                weeklyRevenue: [
                    { $match: { createdAt: { $gte: thisWeekStart } } },
                    { $group: { _id: { $dayOfWeek: '$createdAt' }, revenue: { $sum: '$totalAmount' } } },
                    { $sort: { _id: 1 } }
                ]
            }
        }
    ]);

    return {
        monthlyRevenue: agg.monthlyRevenue.map(m => ({ month: months[m._id - 1], revenue: m.revenue })),
        weeklyRevenue: agg.weeklyRevenue.map(d => ({ day: days[d._id - 1], revenue: d.revenue })),
    };
};

// ─── Inventory Summary ────────────────────────────────────────────────────────
export const getInventorySummaryService = async () => {
    const lowStockProducts = await Product.aggregate([
        { $sort: { stock: 1 } },
        { $limit: 5 },
        { $project: { _id: 0, productName: '$name', stock: 1, threshold: { $literal: 20 } } }
    ]);

    // Full dataset counts (not paginated)
    const [stockStats] = await Product.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 5] }, { $lte: ['$stock', 20] }] }, 1, 0] } },
                critical: { $sum: { $cond: [{ $lte: ['$stock', 5] }, 1, 0] } },
            }
        }
    ]);

    return {
        lowStockProducts,
        stockStats: stockStats || { total: 0, lowStock: 0, critical: 0 },
    };
};

// ─── Farmer Statistics ────────────────────────────────────────────────────────
export const getFarmerStatsSummaryService = async () => {
    const { thisMonthStart, lastMonthStart } = getDateBounds();

    const [farmerAgg] = await Farmer.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                thisMonth: [{ $match: { createdAt: { $gte: thisMonthStart } } }, { $count: 'count' }],
                lastMonth: [{ $match: { createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } } }, { $count: 'count' }],
                // Full dataset counts for stats accuracy
                withCredit: [{ $match: { creditBalance: { $gt: 0 } } }, { $count: 'count' }],
                clearAccounts: [{ $match: { creditBalance: { $lte: 0 } } }, { $count: 'count' }],
            }
        }
    ]);

    const totalFarmersCount = farmerAgg.total[0]?.count || 0;
    const thisMonthFarmers = farmerAgg.thisMonth[0]?.count || 0;
    const lastMonthFarmers = farmerAgg.lastMonth[0]?.count || 0;

    return {
        totalFarmers: {
            count: totalFarmersCount,
            percentageChange: calcPct(thisMonthFarmers, lastMonthFarmers)
        },
        withCredit: farmerAgg.withCredit[0]?.count || 0,
        clearAccounts: farmerAgg.clearAccounts[0]?.count || 0,
    };
};

// ─── Credit Summary ───────────────────────────────────────────────────────────
export const getCreditSummaryService = async () => {
    const { now, lastMonthStart, thisMonthStart } = getDateBounds();

    // Pending credit ledger from live Farmer.creditBalance
    const pendingLedger = await Farmer.aggregate([
        { $match: { creditBalance: { $gt: 0 } } },
        { $sort: { creditBalance: -1 } },
        { $limit: 5 },
        {
            $project: {
                _id: 0,
                farmerId: '$_id',
                farmerName: '$name',
                farmerMobile: '$mobile',
                amount: '$creditBalance',
                daysPending: {
                    $floor: {
                        $divide: [{ $subtract: [now, '$createdAt'] }, 1000 * 60 * 60 * 24]
                    }
                }
            }
        }
    ]);

    // Live outstanding credit
    const [pendingCreditAgg] = await Farmer.aggregate([
        {
            $facet: {
                thisMonth: [
                    { $match: { creditBalance: { $gt: 0 } } },
                    { $group: { _id: null, amount: { $sum: '$creditBalance' } } }
                ],
                lastMonthSnapshot: [
                    { $match: { createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } } },
                    { $group: { _id: null, amount: { $sum: '$creditBalance' } } }
                ]
            }
        }
    ]);

    const currentOutstanding = pendingCreditAgg.thisMonth[0]?.amount || 0;
    const lastMonthOutstanding = pendingCreditAgg.lastMonthSnapshot[0]?.amount || 0;

    return {
        pendingCreditThisMonth: {
            amount: currentOutstanding,
            percentageChange: calcPct(currentOutstanding, lastMonthOutstanding)
        },
        pendingLedger,
    };
};

// ─── Legacy: kept for backward compatibility if needed ───────────────────────
export const getDashboardSummaryService = async () => {
    const [sales, charts, inventory, farmers, credit] = await Promise.all([
        getSalesSummaryService(),
        getChartDataService(),
        getInventorySummaryService(),
        getFarmerStatsSummaryService(),
        getCreditSummaryService(),
    ]);
    return { ...sales, ...charts, ...inventory, ...farmers, ...credit };
};
