import Payment from '../models/Payment.js';
import Farmer from '../models/Farmer.js';

// @desc    Record new payment
// @route   POST /api/payments
// @access  Private
export const createPayment = async (req, res, next) => {
    const { farmerId, amount, method, date, notes } = req.body;

    try {
        const farmer = await Farmer.findById(farmerId);
        if (!farmer) {
            res.status(404);
            throw new Error('Farmer not found');
        }

        const payment = await Payment.create({
            farmerId,
            amount,
            method,
            date: date || Date.now(),
            notes,
        });

        // Reduce farmer credit balance
        farmer.creditBalance -= amount;

        // Prevent negative balance conceptually, though overpayments happen
        if (farmer.creditBalance < 0) farmer.creditBalance = 0;

        await farmer.save();

        res.status(201).json(payment);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
export const getPayments = async (req, res, next) => {
    try {
        const payments = await Payment.find({})
            .populate('farmerId', 'name mobile')
            .sort({ date: -1 });

        // Transform for frontend
        const result = payments.map(p => ({
            ...p.toObject(),
            farmerName: p.farmerId.name
        }));

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// @desc    Get payments by farmer
// @route   GET /api/payments/farmer/:farmerId
// @access  Private
export const getPaymentsByFarmer = async (req, res, next) => {
    try {
        const payments = await Payment.find({ farmerId: req.params.farmerId })
            .sort({ date: -1 });
        res.json(payments);
    } catch (error) {
        next(error);
    }
};
