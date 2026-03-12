import Farmer from '../models/Farmer.js';
import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';
import ExcelJS from 'exceljs';

// @desc    Get all farmers with pagination + search
// @route   GET /api/farmers?page=&limit=&search=
// @access  Private
export const getFarmers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const search = req.query.search?.trim();

        const query = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { mobile: { $regex: search, $options: 'i' } }
                ]
            }
            : {};

        const totalRecords = await Farmer.countDocuments(query);
        const farmers = await Farmer.find(query)
            .sort({ createdAt: -1 })
            .skip(startIndex)
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

// @desc    Search farmers by name or mobile for autocomplete
// @route   GET /api/farmers/search?q=
// @access  Private
export const searchFarmers = async (req, res, next) => {
    try {
        const query = req.query.q?.trim();
        if (!query) return res.json([]);

        const farmers = await Farmer.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { mobile: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);

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
        if (!farmer) {
            res.status(404);
            throw new Error('Farmer not found');
        }

        // Check mobile uniqueness if changed
        if (mobile && mobile !== farmer.mobile) {
            const exists = await Farmer.findOne({ mobile, _id: { $ne: farmer._id } });
            if (exists) {
                res.status(400);
                throw new Error('Mobile number already registered to another farmer');
            }
        }

        farmer.name = name || farmer.name;
        farmer.mobile = mobile || farmer.mobile;
        farmer.village = village || farmer.village;

        const updatedFarmer = await farmer.save();
        res.json(updatedFarmer);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a farmer — blocked if credit balance > 0
// @route   DELETE /api/farmers/:id
// @access  Private
export const deleteFarmer = async (req, res, next) => {
    try {
        const farmer = await Farmer.findById(req.params.id);
        if (!farmer) {
            res.status(404);
            throw new Error('Farmer not found');
        }

        if (farmer.creditBalance > 0) {
            res.status(400);
            throw new Error(`Farmer has ₹${farmer.creditBalance.toLocaleString('en-IN')} pending credit. Clear all dues before deleting.`);
        }

        await farmer.deleteOne();
        res.json({ message: 'Farmer removed successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get farmer transaction timeline (bills + payments merged)
// @route   GET /api/farmers/:id/transactions
// @access  Private
export const getFarmerTransactions = async (req, res, next) => {
    try {
        const farmer = await Farmer.findById(req.params.id);
        if (!farmer) {
            res.status(404);
            throw new Error('Farmer not found');
        }

        const bills = await Bill.find({ farmerId: req.params.id })
            .populate('items.productId', 'name brand');
        const payments = await Payment.find({ farmerId: req.params.id });

        // Merge and sort latest first
        const transactions = [
            ...bills.map(b => ({
                ...b.toObject(),
                type: 'bill',
                date: b.createdAt,
            })),
            ...payments.map(p => ({
                ...p.toObject(),
                type: 'payment',
                date: p.date,
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({ farmer, transactions });
    } catch (error) {
        next(error);
    }
};

// @desc    Export farmer transaction history as Excel
// @route   GET /api/farmers/:id/export
// @access  Private
export const exportFarmerHistory = async (req, res, next) => {
    try {
        const farmer = await Farmer.findById(req.params.id);
        if (!farmer) {
            res.status(404);
            throw new Error('Farmer not found');
        }

        const bills = await Bill.find({ farmerId: req.params.id })
            .populate('items.productId', 'name brand');
        const payments = await Payment.find({ farmerId: req.params.id });

        // Merge & sort
        const timeline = [
            ...bills.map(b => ({ type: 'Bill', date: b.createdAt, amount: b.totalAmount, method: b.paymentType, notes: b.items.map(i => `${i.productId?.name || 'Product'} ×${i.quantity}`).join(', '), ref: b._id })),
            ...payments.map(p => ({ type: 'Payment', date: p.date, amount: p.amount, method: p.method, notes: p.notes || '', ref: p._id }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'AgriBill';

        // ── Sheet 1: Summary ────────────────────────────────────────────────
        const summarySheet = workbook.addWorksheet('Farmer Summary');
        summarySheet.columns = [
            { key: 'key', width: 30 },
            { key: 'value', width: 40 }
        ];

        const summaryRows = [
            ['Farmer Name', farmer.name],
            ['Mobile Number', farmer.mobile],
            ['Village', farmer.village],
            ['Total Bills', bills.length],
            ['Total Payments Made', payments.length],
            ['Total Purchased (₹)', bills.reduce((s, b) => s + b.totalAmount, 0)],
            ['Total Paid (₹)', payments.reduce((s, p) => s + p.amount, 0)],
            ['Outstanding Balance (₹)', farmer.creditBalance],
            ['Report Generated', new Date().toLocaleString('en-IN')],
        ];

        summaryRows.forEach(([key, value]) => {
            const row = summarySheet.addRow({ key, value });
            row.getCell(1).font = { bold: true };
            row.getCell(2).font = {};
        });

        // Highlight outstanding balance row
        const balRow = summarySheet.getRow(9);
        balRow.getCell(2).font = { bold: true, color: { argb: farmer.creditBalance > 0 ? 'FFE53935' : 'FF1B5E20' } };

        // ── Sheet 2: Transaction Timeline ───────────────────────────────────
        const txSheet = workbook.addWorksheet('Transaction History');
        txSheet.columns = [
            { header: '#', key: 'sr', width: 5 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Type', key: 'type', width: 12 },
            { header: 'Amount (₹)', key: 'amount', width: 16 },
            { header: 'Method / Payment Type', key: 'method', width: 22 },
            { header: 'Details / Notes', key: 'notes', width: 50 },
            { header: 'Reference ID', key: 'ref', width: 30 },
        ];

        // Style header row
        const hdr = txSheet.getRow(1);
        hdr.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F7F33' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        hdr.height = 22;

        // Data rows
        let runningBalance = 0;
        // rebuild sorted oldest-first for running balance calc
        const sortedAsc = [...timeline].reverse();
        sortedAsc.forEach((tx, idx) => {
            if (tx.type === 'Bill') runningBalance += tx.amount;
            else runningBalance = Math.max(0, runningBalance - tx.amount);
        });

        timeline.forEach((tx, idx) => {
            const isBill = tx.type === 'Bill';
            const row = txSheet.addRow({
                sr: idx + 1,
                date: new Date(tx.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                type: tx.type,
                amount: tx.amount,
                method: tx.method?.toUpperCase(),
                notes: tx.notes,
                ref: tx.ref?.toString(),
            });

            // Color-code by type
            const fillColor = isBill ? 'FFFFF3E0' : 'FFF1F8E9'; // orange tint for bill, green for payment
            row.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            });

            row.getCell('type').font = { bold: true, color: { argb: isBill ? 'FFE65100' : 'FF1B5E20' } };
            row.getCell('amount').numFmt = '#,##0.00';
            row.getCell('amount').font = { bold: true, color: { argb: isBill ? 'FFE53935' : 'FF388E3C' } };
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=farmer-${farmer.name.replace(/\s+/g, '-')}-history.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};
