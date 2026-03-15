import express from 'express';
import {
    createPayment,
    getPayments,
    exportPaymentsExcel,
    getPaymentsByFarmer,
    sendPaymentWhatsApp
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createPayment)
    .get(protect, getPayments);

router.get('/export', protect, exportPaymentsExcel);
router.get('/farmer/:farmerId', protect, getPaymentsByFarmer);
router.post('/:id/send-whatsapp', protect, sendPaymentWhatsApp);

export default router;
