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

// @desc    Get credit report (farmers with balance)
// @route   GET /api/reports/credit
// @access  Private
export const getCreditReport = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalRecords = await Farmer.countDocuments({ creditBalance: { $gt: 0 } });
        const farmers = await Farmer.find({ creditBalance: { $gt: 0 } })
            .sort({ creditBalance: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: farmers,
            page,
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords
        });
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
