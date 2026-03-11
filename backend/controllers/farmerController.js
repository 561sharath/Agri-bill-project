import Farmer from '../models/Farmer.js';
import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';

// @desc    Get all farmers
// @route   GET /api/farmers
// @access  Private
export const getFarmers = async (req, res, next) => {
    try {
        const farmers = await Farmer.find({}).sort({ createdAt: -1 });
        res.json(farmers);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single farmer
// @route   GET /api/farmers/:id
// @access  Private
export const getFarmerById = async (req, res, next) => {
    try {
        const farmer = await Farmer.findById(req.params.id);

        if (farmer) {
            res.json(farmer);
        } else {
            res.status(404);
            throw new Error('Farmer not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Create a farmer
// @route   POST /api/farmers
// @access  Private
export const createFarmer = async (req, res, next) => {
    const { name, mobile, village } = req.body;

    try {
        const farmerExists = await Farmer.findOne({ mobile });
        if (farmerExists) {
            res.status(400);
            throw new Error('Farmer with this mobile already exists');
        }

        const farmer = await Farmer.create({ name, mobile, village });
        res.status(201).json(farmer);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a farmer
// @route   PUT /api/farmers/:id
// @access  Private
export const updateFarmer = async (req, res, next) => {
    const { name, mobile, village } = req.body;

    try {
        const farmer = await Farmer.findById(req.params.id);

        if (farmer) {
            farmer.name = name || farmer.name;
            farmer.mobile = mobile || farmer.mobile;
            farmer.village = village || farmer.village;

            const updatedFarmer = await farmer.save();
            res.json(updatedFarmer);
        } else {
            res.status(404);
            throw new Error('Farmer not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a farmer
// @route   DELETE /api/farmers/:id
// @access  Private
export const deleteFarmer = async (req, res, next) => {
    try {
        const farmer = await Farmer.findById(req.params.id);

        if (farmer) {
            await farmer.deleteOne();
            res.json({ message: 'Farmer removed' });
        } else {
            res.status(404);
            throw new Error('Farmer not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get farmer transactions (bills + payments)
// @route   GET /api/farmers/:id/transactions
// @access  Private
export const getFarmerTransactions = async (req, res, next) => {
    try {
        const bills = await Bill.find({ farmerId: req.params.id }).populate('items.productId');
        const payments = await Payment.find({ farmerId: req.params.id });

        // Merge and sort
        const transactions = [
            ...bills.map(b => ({ ...b.toObject(), type: 'bill', date: b.createdAt })),
            ...payments.map(p => ({ ...p.toObject(), type: 'payment', date: p.date }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(transactions);
    } catch (error) {
        next(error);
    }
};
