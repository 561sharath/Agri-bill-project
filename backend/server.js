import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import Bill from './models/Bill.js';
import Farmer from './models/Farmer.js';
import Payment from './models/Payment.js';
import { generatePDFBuffer, generateCreditReminderPDF, generatePaymentReceiptPDF } from './services/pdfService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure bills folder exists for static PDF serving (ngrok-friendly URLs)
const billsDir = path.join(__dirname, 'bills');
fs.mkdirSync(billsDir, { recursive: true });

// Routes imports
import authRoutes from './routes/authRoutes.js';
import farmerRoutes from './routes/farmerRoutes.js';
import productRoutes from './routes/productRoutes.js';
import billRoutes from './routes/billRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Log requests in dev (helps debug 403)
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`${req.method} ${req.path} [Origin: ${req.get('origin') || 'none'}]`);
    }
    next();
});

// CORS – allow frontend origin (fixes 403 on login from proxy/preflight)
app.use(cors({
    origin: true, // reflect request origin (e.g. http://localhost:5175)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
}));
// Ensure preflight OPTIONS gets a proper response
app.options('*', cors());
app.use(express.json());

// Dynamic PDF serving — always regenerates from DB so style updates reflect immediately.
// Filename patterns (set by whatsappService / billController):
//   {billId}.pdf             → invoice PDF
//   reminder-{farmerId}.pdf  → credit reminder PDF
//   receipt-{paymentId}.pdf  → payment receipt PDF
//   cleared-{farmerId}.pdf   → credit cleared receipt PDF
app.get('/bills/:filename', async (req, res) => {
    const { filename } = req.params;
    if (!filename.endsWith('.pdf')) return res.status(400).send('Not a PDF');

    const name = filename.replace(/\.pdf$/, '');

    try {
        let pdfBuffer;
        let downloadName = filename;

        if (name.startsWith('reminder-')) {
            const farmerId = name.replace('reminder-', '');
            const farmer = await Farmer.findById(farmerId).lean();
            if (!farmer) return res.status(404).send('Farmer not found');
            pdfBuffer = await generateCreditReminderPDF(farmer, farmer.creditBalance || 0);
            downloadName = `Credit-Reminder-${farmer.name}.pdf`;

        } else if (name.startsWith('receipt-')) {
            const paymentId = name.replace('receipt-', '');
            const payment = await Payment.findById(paymentId)
                .populate('farmerId', 'name mobile village creditBalance').lean();
            if (!payment) return res.status(404).send('Payment not found');
            const farmer = payment.farmerId || {};
            pdfBuffer = await generatePaymentReceiptPDF(farmer, payment.amount, farmer.creditBalance || 0);
            downloadName = `Receipt-${farmer.name}.pdf`;

        } else if (name.startsWith('cleared-')) {
            const farmerId = name.replace('cleared-', '');
            const farmer = await Farmer.findById(farmerId).lean();
            if (!farmer) return res.status(404).send('Farmer not found');
            pdfBuffer = await generatePaymentReceiptPDF(farmer, 0, 0);
            downloadName = `Cleared-${farmer.name}.pdf`;

        } else {
            // Treat as bill ObjectId
            const bill = await Bill.findById(name)
                .populate('farmerId', 'name mobile village')
                .populate('items.productId', 'name').lean();
            if (!bill) return res.status(404).send('Bill not found');
            pdfBuffer = await generatePDFBuffer(bill);
            downloadName = `Invoice-${bill.farmerId?.name || 'bill'}.pdf`;
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
        res.setHeader('Cache-Control', 'no-store');
        return res.end(pdfBuffer);

    } catch (err) {
        console.error('[PDF] Serve error:', err.message);
        // Fallback: try to serve from disk if DB lookup fails
        const diskPath = path.join(billsDir, filename);
        if (fs.existsSync(diskPath)) return res.sendFile(diskPath);
        return res.status(500).send('PDF generation failed');
    }
});

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reminders', reminderRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
