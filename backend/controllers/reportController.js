import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import Farmer from '../models/Farmer.js';

// @desc    Get monthly sales report
// @route   GET /api/reports/monthly-sales
// @access  Private
export const getMonthlySales = async (req, res, next) => {
    try {
        const aggs = await Bill.aggregate([
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    sales: { $sum: '$totalAmount' },
                    credit: {
                        $sum: { $cond: [{ $eq: ['$paymentType', 'credit'] }, '$totalAmount', 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const payments = await Payment.aggregate([
            {
                $group: {
                    _id: { $month: '$date' },
                    payments: { $sum: '$amount' }
                }
            }
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const data = aggs.map(ag => {
            const pay = payments.find(p => p._id === ag._id);
            return {
                month: months[ag._id - 1],
                sales: ag.sales,
                credit: ag.credit,
                payments: pay ? pay.payments : 0
            };
        });

        res.json(data);
    } catch (error) {
        next(error);
    }
};

// @desc    Get top products report
// @route   GET /api/reports/top-products
// @access  Private
export const getTopProducts = async (req, res, next) => {
    try {
        const aggs = await Bill.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.total' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 5 }
        ]);

        const populated = await Product.populate(aggs, { path: '_id', select: 'name' });

        const totalRev = populated.reduce((s, a) => s + a.totalRevenue, 0);

        const data = populated.map(p => ({
            name: p._id.name,
            value: Math.round((p.totalRevenue / totalRev) * 100) // Percentage
        }));

        res.json(data);
    } catch (error) {
        next(error);
    }
};

// @desc    Get credit report (farmers with balance). Optional ?search= for name/mobile.
// @route   GET /api/reports/credit
// @access  Private
export const getCreditReport = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = (req.query.search || '').trim();
        const skip = (page - 1) * limit;

        const filter = { creditBalance: { $gt: 0 } };
        if (search.length >= 1) {
            const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [
                { name: re },
                { mobile: re },
                { village: re },
            ];
        }

        const [totalRecords, totalAgg, farmers] = await Promise.all([
            Farmer.countDocuments(filter),
            Farmer.aggregate([
                { $match: filter },
                { $group: { _id: null, totalOutstanding: { $sum: '$creditBalance' } } }
            ]),
            Farmer.find(filter)
                .sort({ creditBalance: -1 })
                .skip(skip)
                .limit(limit)
        ]);

        res.json({
            data: farmers,
            page,
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords,
            totalOutstanding: totalAgg[0]?.totalOutstanding || 0
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get credit statement (bank-statement style: bills + payments with running balance)
// @route   GET /api/reports/credit-statement?farmerId=&startDate=&endDate=&page=&limit=
// @access  Private
export const getCreditStatement = async (req, res, next) => {
    try {
        const { farmerId, startDate, endDate, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (farmerId) filter.farmerId = farmerId;

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }
        const hasDateFilter = Object.keys(dateFilter).length > 0;

        // Fetch credit bills (only paymentType === 'credit') and all payments for the farmer(s)
        const billFilter = { paymentType: 'credit' };
        if (farmerId) billFilter.farmerId = farmerId;
        if (hasDateFilter) billFilter.createdAt = dateFilter;

        const paymentFilter = farmerId ? { farmerId } : {};
        if (hasDateFilter) paymentFilter.date = dateFilter;

        const [bills, payments] = await Promise.all([
            Bill.find(billFilter).populate('farmerId', 'name mobile village').populate('items.productId', 'name').sort({ createdAt: 1 }),
            Payment.find(paymentFilter).populate('farmerId', 'name mobile village').sort({ date: 1 }),
        ]);

        // Build unified rows: oldest first for running balance
        const rows = [
            ...bills.map((b) => ({
                date: b.createdAt,
                type: 'bill',
                ref: b._id,
                farmerId: b.farmerId?._id,
                farmerName: b.farmerId?.name,
                description: `Bill #${b._id.toString().slice(-8)}`,
                debit: b.totalAmount,
                credit: 0,
            })),
            ...payments.map((p) => ({
                date: p.date,
                type: 'payment',
                ref: p._id,
                farmerId: p.farmerId?._id,
                farmerName: p.farmerId?.name,
                description: p.notes || `Payment ${p.method}`,
                debit: 0,
                credit: p.amount,
            })),
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Running balance per farmer (credit = balance owed by farmer; +debit -credit)
        const balanceByFarmer = {};
        const statement = rows.map((r) => {
            const fid = r.farmerId?.toString() || 'global';
            if (!balanceByFarmer[fid]) balanceByFarmer[fid] = 0;
            balanceByFarmer[fid] += (r.debit || 0) - (r.credit || 0);
            return { ...r, balance: balanceByFarmer[fid] };
        });

        const skip = (Number(page) - 1) * Number(limit);
        const totalRecords = statement.length;
        const data = statement.slice(skip, skip + Number(limit));

        res.json({
            data,
            page: Number(page),
            totalPages: Math.ceil(totalRecords / Number(limit)),
            totalRecords,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Export credit statement (all rows for CSV/PDF export)
// @route   GET /api/reports/credit-statement/export?farmerId=&startDate=&endDate=
// @access  Private
export const exportCreditStatement = async (req, res, next) => {
    try {
        const { farmerId, startDate, endDate } = req.query;
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }
        const hasDateFilter = Object.keys(dateFilter).length > 0;
        const billFilter = { paymentType: 'credit' };
        if (farmerId) billFilter.farmerId = farmerId;
        if (hasDateFilter) billFilter.createdAt = dateFilter;
        const paymentFilter = farmerId ? { farmerId } : {};
        if (hasDateFilter) paymentFilter.date = dateFilter;

        const [bills, payments] = await Promise.all([
            Bill.find(billFilter).populate('farmerId', 'name mobile village').sort({ createdAt: 1 }),
            Payment.find(paymentFilter).populate('farmerId', 'name mobile village').sort({ date: 1 }),
        ]);

        const rows = [
            ...bills.map((b) => ({
                date: b.createdAt,
                type: 'Bill',
                farmerId: b.farmerId?._id?.toString(),
                farmerName: b.farmerId?.name || '-',
                description: `Bill #${b._id.toString().slice(-8)}`,
                debit: b.totalAmount,
                credit: 0,
            })),
            ...payments.map((p) => ({
                date: p.date,
                type: 'Payment',
                farmerId: p.farmerId?._id?.toString(),
                farmerName: p.farmerId?.name || '-',
                description: p.notes || `Payment ${p.method}`,
                debit: 0,
                credit: p.amount,
            })),
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        const balanceByFarmer = {};
        const data = rows.map((r) => {
            const fid = r.farmerId || 'global';
            if (!balanceByFarmer[fid]) balanceByFarmer[fid] = 0;
            balanceByFarmer[fid] += (r.debit || 0) - (r.credit || 0);
            return {
                date: r.date,
                type: r.type,
                farmerName: r.farmerName,
                description: r.description,
                debit: r.debit,
                credit: r.credit,
                balance: balanceByFarmer[fid],
            };
        });
        res.json({ data });
    } catch (error) {
        next(error);
    }
};

// @desc    Export CSV
// @route   GET /api/reports/export/:type
// @access  Private
export const exportReportCSV = async (req, res, next) => {
    // Basic CSV stub. In prod, use json2csv package
    res.send('Month,Sales,Credit Given,Payments Collected\nJan,82000,25000,18000');
};
