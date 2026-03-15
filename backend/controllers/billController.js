import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Bill from '../models/Bill.js';
import Farmer from '../models/Farmer.js';
import Product from '../models/Product.js';
import { generatePDFBuffer } from '../services/pdfService.js';
import { sendBillWhatsApp as sendBillWhatsAppService, toE164 } from '../services/whatsappService.js';
import { getPdfByToken } from '../utils/pdfCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BILLS_DIR = path.join(__dirname, '..', 'bills');

/** WhatsApp rejects localhost and non-HTTPS URLs. Only public HTTPS is allowed for PDF. */
function isPublicHttpsUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const u = url.trim().replace(/\/$/, '').toLowerCase();
    return u.startsWith('https://') && !u.includes('localhost') && !u.includes('127.0.0.1');
}

function getPublicAppUrl() {
    const raw = process.env.PUBLIC_APP_URL || '';
    return raw.trim().replace(/\/$/, '');
}

// @desc    Create new bill (with stock validation)
// @route   POST /api/bills
// @access  Private
export const createBill = async (req, res, next) => {
    const { farmerId, items, totalAmount, paymentType } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No bill items provided' });
    }
    if (!farmerId) {
        return res.status(400).json({ message: 'Please select a farmer' });
    }

    try {
        const farmer = await Farmer.findById(farmerId);
        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }

        // ── Stock Validation Pass ─────────────────────────────
        const insufficientItems = [];
        for (const item of items) {
            if (!item.productId) continue;
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product not found` });
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
            return res.status(400).json({ message: `Insufficient stock: ${msg}` });
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

        // 4. Optional: send bill via WhatsApp (PDF must use public HTTPS URL – e.g. ngrok)
        let whatsAppResponse = null;
        if (req.body.sendWhatsApp && farmer.mobile) {
            try {
                const baseUrl = getPublicAppUrl();
                if (!isPublicHttpsUrl(baseUrl)) {
                    throw new Error('WhatsApp requires a public HTTPS URL for the PDF. Set PUBLIC_APP_URL in .env to your ngrok URL (e.g. https://xxxx.ngrok-free.app). Localhost is rejected by WhatsApp.');
                }
                const populatedBill = await Bill.findById(bill._id)
                    .populate('farmerId', 'name mobile village')
                    .populate('items.productId', 'name');
                const pdfBuffer = await generatePDFBuffer(populatedBill);
                const billId = bill._id.toString();
                const pdfPath = path.join(BILLS_DIR, `${billId}.pdf`);
                fs.mkdirSync(BILLS_DIR, { recursive: true });
                fs.writeFileSync(pdfPath, pdfBuffer);
                const pdfUrl = `${baseUrl}/bills/${billId}.pdf`;
                await sendBillWhatsAppService(farmer.mobile, farmer.name, bill.totalAmount, pdfUrl);
                whatsAppResponse = {
                    success: true,
                    message: 'Bill sent via WhatsApp',
                    sentTo: farmer.mobile,
                    sentToE164: toE164(farmer.mobile),
                    farmerName: farmer.name,
                    totalAmount: bill.totalAmount,
                };
            } catch (waErr) {
                console.error('WhatsApp send failed:', waErr.message);
                // still return 201; frontend can show warning if needed
            }
        }

        const response = bill.toObject ? bill.toObject() : { ...bill };
        if (whatsAppResponse) Object.assign(response, whatsAppResponse);
        return res.status(201).json(response);
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to create bill' });
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

// @desc    Send bill via WhatsApp (after bill is created)
// @route   POST /api/bills/:id/whatsapp
// @access  Private
export const sendBillWhatsApp = async (req, res, next) => {
    try {
        const bill = await Bill.findById(req.params.id)
            .populate('farmerId', 'name mobile village');
        if (!bill) {
            res.status(404);
            throw new Error('Bill not found');
        }
        const farmer = bill.farmerId;
        if (!farmer || !farmer.mobile) {
            res.status(400);
            throw new Error('Farmer has no mobile number');
        }
        const baseUrl = getPublicAppUrl();
        if (!isPublicHttpsUrl(baseUrl)) {
            res.status(400).json({
                message: 'WhatsApp requires a public HTTPS URL for the PDF. Set PUBLIC_APP_URL in backend .env to your ngrok URL (e.g. https://xxxx.ngrok-free.app). Localhost is rejected by WhatsApp.',
            });
            return;
        }
        const populatedBill = await Bill.findById(bill._id)
            .populate('farmerId', 'name mobile village')
            .populate('items.productId', 'name');
        const pdfBuffer = await generatePDFBuffer(populatedBill);
        const billId = bill._id.toString();
        const pdfPath = path.join(BILLS_DIR, `${billId}.pdf`);
        fs.mkdirSync(BILLS_DIR, { recursive: true });
        fs.writeFileSync(pdfPath, pdfBuffer);
        const pdfUrl = `${baseUrl}/bills/${billId}.pdf`;
        await sendBillWhatsAppService(farmer.mobile, farmer.name, bill.totalAmount, pdfUrl);
        res.json({
            success: true,
            message: 'Bill sent via WhatsApp',
            billId: bill._id,
            totalAmount: bill.totalAmount,
            sentTo: farmer.mobile,
            sentToE164: toE164(farmer.mobile),
            farmerName: farmer.name,
        });
    } catch (error) {
        const msg = error.message || '';
        if (msg.includes('not configured')) {
            res.status(503).json({ message: 'WhatsApp not configured. Add CHATMITRA_API_TOKEN in backend .env' });
            return;
        }
        if (msg.includes('Project credentials incomplete') || msg.includes('credentials incomplete')) {
            res.status(503).json({
                message: 'Chatmitra project setup incomplete. Log in at https://app.chatmitra.com and complete: verify WhatsApp Business number, connect your number, and ensure the project is active.',
            });
            return;
        }
        next(error);
    }
};

// @desc    Public PDF by token (one-time, for WhatsApp media URL)
// @route   GET /api/bills/pdf-public?token=
// @access  Public
export const getPublicPDF = async (req, res, next) => {
    try {
        const token = req.query.token;
        if (!token) {
            res.status(400).json({ message: 'Missing token' });
            return;
        }
        const pdfBuffer = getPdfByToken(token);
        if (!pdfBuffer) {
            res.status(404).json({ message: 'Link expired or invalid' });
            return;
        }
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'inline; filename=invoice.pdf',
        });
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};
