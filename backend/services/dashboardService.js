import Bill from '../models/Bill.js';
import Farmer from '../models/Farmer.js';
import Product from '../models/Product.js';

export const getDashboardSummaryService = async () => {
    const now = new Date();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisWeekStart = new Date(todayStart);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay()); // Sunday start

    // 1. Bill Aggregations (Sales, Revenue graphs)
    const billAggregations = await Bill.aggregate([
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
                monthlyRevenue: [
                    {
                        $group: {
                            _id: { $month: '$createdAt' },
                            revenue: { $sum: '$totalAmount' }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                weeklyRevenue: [
                    { $match: { createdAt: { $gte: thisWeekStart } } },
                    {
                        $group: {
                            _id: { $dayOfWeek: '$createdAt' },
                            revenue: { $sum: '$totalAmount' }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]
            }
        }
    ]);

    // 2. Pending Ledger — Use LIVE creditBalance from Farmer model (reflects actual payments made)
    //    This automatically updates when creditBalance is deducted on payment
    const pendingLedgerAgg = await Farmer.aggregate([
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
                        $divide: [
                            { $subtract: [now, '$createdAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        }
    ]);

    // 3. Pending Credit (this month) — Use SUM of live creditBalance across all farmers
    //    Replaces the old "bills created this month" metric which doesn't reflect payments
    const pendingCreditAgg = await Farmer.aggregate([
        {
            $facet: {
                thisMonth: [
                    { $match: { creditBalance: { $gt: 0 } } },
                    { $group: { _id: null, amount: { $sum: '$creditBalance' } } }
                ],
                lastMonthSnapshot: [
                    // Approximate: use credit bills created last month as a reference
                    { $match: { createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } } },
                    { $group: { _id: null, amount: { $sum: '$creditBalance' } } }
                ]
            }
        }
    ]);

    // 4. Farmer Aggregations (Total and Month-over-Month)
    const farmerAggregations = await Farmer.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                thisMonth: [
                    { $match: { createdAt: { $gte: thisMonthStart } } },
                    { $count: 'count' }
                ],
                lastMonth: [
                    { $match: { createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } } },
                    { $count: 'count' }
                ]
            }
        }
    ]);

    // 5. Products Stock Alerts (Lowest stock first)
    const lowStockProducts = await Product.aggregate([
        { $sort: { stock: 1 } },
        { $limit: 5 },
        {
            $project: {
                _id: 0,
                productName: '$name',
                stock: 1,
                threshold: { $literal: 20 }
            }
        }
    ]);

    // Percentage Calculation Helper
    const calcPct = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(2));
    };

    const b = billAggregations[0];
    const f = farmerAggregations[0];
    const pc = pendingCreditAgg[0];

    const todayAmt = b.todaySales[0]?.amount || 0;
    const yestAmt = b.yesterdaySales[0]?.amount || 0;

    // Live outstanding credit = sum of all farmer creditBalance values
    const currentOutstanding = pc.thisMonth[0]?.amount || 0;
    const lastMonthOutstanding = pc.lastMonthSnapshot[0]?.amount || 0;

    const totalFarmersCount = f.total[0]?.count || 0;
    const thisMonthFarmers = f.thisMonth[0]?.count || 0;
    const lastMonthFarmers = f.lastMonth[0]?.count || 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return {
        todaySales: {
            amount: todayAmt,
            percentageChange: calcPct(todayAmt, yestAmt)
        },
        totalCreditGiven: b.totalCreditGiven[0]?.amount || 0,
        totalFarmers: {
            count: totalFarmersCount,
            percentageChange: calcPct(thisMonthFarmers, lastMonthFarmers)
        },
        // Now reflects LIVE outstanding credit (updates instantly when payments clear)
        pendingCreditThisMonth: {
            amount: currentOutstanding,
            percentageChange: calcPct(currentOutstanding, lastMonthOutstanding)
        },
        monthlyRevenue: b.monthlyRevenue.map(m => ({
            month: months[m._id - 1],
            revenue: m.revenue
        })),
        weeklyRevenue: b.weeklyRevenue.map(d => ({
            day: days[d._id - 1],
            revenue: d.revenue
        })),
        // Live pendingLedger from Farmer.creditBalance — auto-updates when payment is made
        pendingLedger: pendingLedgerAgg,
        lowStockProducts
    };
};
