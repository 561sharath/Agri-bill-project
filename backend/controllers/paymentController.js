import Payment from '../models/Payment.js';
import Farmer from '../models/Farmer.js';
import Bill from '../models/Bill.js';
import ExcelJS from 'exceljs';
import { sendPaymentConfirmationWhatsApp, sendCreditClearedWhatsApp } from '../services/whatsappService.js';

// @desc    Record new payment and update farmer balance
// @route   POST /api/payments
// @access  Private
// Body may include sendWhatsApp: true to auto-send confirmation; credit cleared message sent when balance becomes 0
export const createPayment = async (req, res, next) => {
    const { farmerId, amount, method, date, notes, sendWhatsApp } = req.body;

    try {
        const farmer = await Farmer.findById(farmerId);
        if (!farmer) {
            res.status(404);
            throw new Error('Farmer not found');
        }

        const payment = await Payment.create({
            farmerId,
            amount: Number(amount),
            method,
            date: date || Date.now(),
            notes,
        });

        // Reduce farmer credit balance (never below 0)
        farmer.creditBalance = Math.max(0, farmer.creditBalance - Number(amount));
        await farmer.save();

        // Populate farmer info before responding
        const populated = await payment.populate('farmerId', 'name mobile village creditBalance');
        const payload = { ...populated.toObject(), farmerCreditBalance: farmer.creditBalance };

        // Auto-send WhatsApp: one confirmation message covers both partial and fully-cleared cases
        if (sendWhatsApp !== false && (farmer.mobile || '').replace(/\D/g, '').length >= 10) {
            try {
                await sendPaymentConfirmationWhatsApp(populated);
                payload.whatsAppSent = true;
            } catch (waErr) {
                console.warn('[Payment] WhatsApp send failed:', waErr?.message);
                payload.whatsAppSent = false;
            }
        }

        res.status(201).json(payload);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all payments with optional date filtering
// @route   GET /api/payments?startDate=&endDate=&page=&limit=
// @access  Private
export const getPayments = async (req, res, next) => {
    try {
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // include full end day
                filter.date.$lte = end;
            }
        }

        const skip = (Number(page) - 1) * Number(limit);
        const totalRecords = await Payment.countDocuments(filter);

        const payments = await Payment.find(filter)
            .populate('farmerId', 'name mobile village')
            .sort({ date: -1 })
            .skip(skip)
            .limit(Number(limit));

        const result = payments.map(p => ({
            ...p.toObject(),
            farmerName: p.farmerId?.name || 'Unknown',
            farmerMobile: p.farmerId?.mobile || '-',
        }));

        res.json({
            data: result,
            page: Number(page),
            totalPages: Math.ceil(totalRecords / Number(limit)),
            totalRecords
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Export payments to Excel
// @route   GET /api/payments/export?startDate=&endDate=
// @access  Private
export const exportPaymentsExcel = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = {};

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.date.$lte = end;
            }
        }

        const payments = await Payment.find(filter)
            .populate('farmerId', 'name mobile village')
            .sort({ date: -1 });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'AgriBill';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Payment History', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        // Header styling
        sheet.columns = [
            { header: '#', key: 'sr', width: 6 },
            { header: 'Farmer Name', key: 'name', width: 25 },
            { header: 'Mobile', key: 'mobile', width: 16 },
            { header: 'Village', key: 'village', width: 18 },
            { header: 'Amount Paid (₹)', key: 'amount', width: 18 },
            { header: 'Payment Method', key: 'method', width: 18 },
            { header: 'Payment Date', key: 'date', width: 20 },
            { header: 'Notes', key: 'notes', width: 30 },
            { header: 'Reference ID', key: 'ref', width: 30 },
        ];

        // Style header row
        const headerRow = sheet.getRow(1);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F7F33' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });
        headerRow.height = 22;

        // Data rows
        payments.forEach((p, idx) => {
            const row = sheet.addRow({
                sr: idx + 1,
                name: p.farmerId?.name || 'Unknown',
                mobile: p.farmerId?.mobile || '-',
                village: p.farmerId?.village || '-',
                amount: p.amount,
                method: p.method?.toUpperCase() || '-',
                date: p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
                notes: p.notes || '-',
                ref: p._id.toString(),
            });

            // Alternate row color
            if (idx % 2 === 0) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
                });
            }

            // Bold amount
            row.getCell('amount').font = { bold: true, color: { argb: 'FF16A34A' } };
            row.getCell('amount').numFmt = '#,##0.00';
        });

        // Total row
        const totalAmt = payments.reduce((s, p) => s + p.amount, 0);
        const totalRow = sheet.addRow({
            sr: '', name: 'TOTAL', mobile: '', village: '',
            amount: totalAmt, method: '', date: '', notes: '', ref: ''
        });
        totalRow.eachCell(cell => {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=payment-history-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
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

// @desc    Send payment confirmation via WhatsApp for an existing payment (manual trigger)
// @route   POST /api/payments/:id/send-whatsapp
// @access  Private
export const sendPaymentWhatsApp = async (req, res, next) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('farmerId', 'name mobile village creditBalance');
        if (!payment) {
            res.status(404);
            throw new Error('Payment not found');
        }
        const farmer = payment.farmerId;
        if (!farmer?.mobile || String(farmer.mobile).replace(/\D/g, '').length < 10) {
            return res.status(400).json({ message: 'Farmer has no valid mobile number' });
        }
        await sendPaymentConfirmationWhatsApp(payment);
        res.json({
            success: true,
            message: 'Payment confirmation sent via WhatsApp',
            sentTo: farmer.mobile,
            farmerName: farmer.name,
        });
    } catch (error) {
        const msg = error?.message || '';
        if (msg.includes('not configured') || msg.includes('CHATMITRA')) {
            return res.status(503).json({ message: 'WhatsApp not configured. Add CHATMITRA_API_TOKEN in backend .env' });
        }
        next(error);
    }
};
