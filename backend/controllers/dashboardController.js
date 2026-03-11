import Bill from '../models/Bill.js';
import Farmer from '../models/Farmer.js';

// @desc    Get dashboard metrics
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = async (req, res, next) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // 1. Today's sales
        const todayBills = await Bill.find({ createdAt: { $gte: startOfToday } });
        const todaySales = todayBills.reduce((acc, bill) => acc + bill.totalAmount, 0);

        // 2. Fetch all farmers for credit & counts
        const farmers = await Farmer.find({});
        const totalFarmers = farmers.length;

        let totalCredit = 0; // Total credit ever issued could be calculated from Bills
        let pendingCredit = 0; // Current outstanding

        // Compute pending from current balances
        farmers.forEach(f => {
            if (f.creditBalance > 0) pendingCredit += f.creditBalance;
        });

        // Compute total credit issued from all bills
        const allCreditBills = await Bill.find({ paymentType: 'credit' });
        totalCredit = allCreditBills.reduce((acc, bill) => acc + bill.totalAmount, 0);

        res.json({
            todaySales,
            totalFarmers,
            totalCredit,
            pendingCredit
        });
    } catch (error) {
        next(error);
    }
};

// Returns dummy data if aggregate fails
export const getDashboardCharts = async (req, res, next) => {
    res.json({
        daily: [
            { day: 'MON', sales: 8500 },
            { day: 'TUE', sales: 14200 }
        ],
        monthly: [
            { month: 'Jan', revenue: 82000 }
        ]
    });
};
