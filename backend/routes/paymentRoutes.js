import express from 'express';
import {
    createPayment,
    getPayments,
    getPaymentsByFarmer
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createPayment)
    .get(protect, getPayments);

router.route('/farmer/:farmerId').get(protect, getPaymentsByFarmer);

export default router;
