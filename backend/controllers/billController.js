import Bill from '../models/Bill.js';
import Farmer from '../models/Farmer.js';
import Product from '../models/Product.js';
import { generatePDFBuffer } from '../services/pdfService.js';

// @desc    Create new bill (with stock validation)
// @route   POST /api/bills
// @access  Private
export const createBill = async (req, res, next) => {
    const { farmerId, items, totalAmount, paymentType } = req.body;

    if (!items || items.length === 0) {
        res.status(400);
        return next(new Error('No bill items provided'));
    }

    try {
        const farmer = await Farmer.findById(farmerId);
        if (!farmer) {
            res.status(404);
            throw new Error('Farmer not found');
        }

        // ── Stock Validation Pass ─────────────────────────────
        const insufficientItems = [];
        for (const item of items) {
            if (!item.productId) continue;
            const product = await Product.findById(item.productId);
            if (!product) {
                res.status(404);
                throw new Error(`Product not found: ${item.productId}`);
            }
            if (product.stock < item.quantity) {
                insufficientItems.push({
                    name: product.name,
                    available: product.stock,
                    requested: item.quantity
                });
            }
        }

        if (insufficientItems.length > 0) {
            const msg = insufficientItems
                .map(i => `"${i.name}" — only ${i.available} units available (requested ${i.requested})`)
                .join(', ');
            res.status(400);
            throw new Error(`Insufficient stock: ${msg}`);
        }
        // ─────────────────────────────────────────────────────

        // 1. Create bill
        const bill = await Bill.create({
            farmerId,
            items,
            totalAmount,
            paymentType,
        });

        // 2. Update farmer credit if payment type is credit
        if (paymentType === 'credit') {
            farmer.creditBalance += Number(totalAmount);
            await farmer.save();
        }

        // 3. Deduct product inventory
        for (const item of items) {
            if (!item.productId) continue;
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }

        res.status(201).json(bill);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all bills with pagination
// @route   GET /api/bills
// @access  Private
export const getBills = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;

        const totalRecords = await Bill.countDocuments();
        const bills = await Bill.find({})
            .populate('farmerId', 'name mobile village')
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit);

        res.json({
            data: bills,
            page,
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get bill by ID
// @route   GET /api/bills/:id
// @access  Private
export const getBillById = async (req, res, next) => {
    try {
        const bill = await Bill.findById(req.params.id)
            .populate('farmerId', 'name mobile village creditBalance')
            .populate('items.productId', 'name brand');

        if (bill) {
            res.json(bill);
        } else {
            res.status(404);
            throw new Error('Bill not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Download bill PDF
// @route   GET /api/bills/:id/pdf
// @access  Private
export const downloadBillPDF = async (req, res, next) => {
    try {
        const bill = await Bill.findById(req.params.id)
            .populate('farmerId', 'name mobile village')
            .populate('items.productId', 'name');

        if (!bill) {
            res.status(404);
            throw new Error('Bill not found');
        }

        const pdfBuffer = await generatePDFBuffer(bill);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename=bill-${bill._id}.pdf`
        });

        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};
