import express from 'express';
import {
    createBill,
    getBills,
    getBillById,
    downloadBillPDF,
    getPublicPDF,
    sendBillWhatsApp,
} from '../controllers/billController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createBill)
    .get(protect, getBills);

router.get('/pdf-public', getPublicPDF);
// WhatsApp: POST only (GET returns 405 – use the "Send WhatsApp" button in the app)
router.route('/send-whatsapp/:id')
    .post(protect, sendBillWhatsApp)
    .all((req, res) => res.status(405).json({ message: 'Method not allowed. Use POST from the app (Send WhatsApp button).' }));
router.post('/:id/whatsapp', protect, sendBillWhatsApp);
router.route('/:id/pdf').get(protect, downloadBillPDF);
router.route('/:id').get(protect, getBillById);

export default router;
