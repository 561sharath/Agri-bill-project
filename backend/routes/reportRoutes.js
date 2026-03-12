import express from 'express';
import {
    getMonthlySales,
    getTopProducts,
    getCreditReport,
    exportReportCSV
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/monthly-sales', protect, getMonthlySales);
router.get('/top-products', protect, getTopProducts);
router.get('/credit', protect, getCreditReport);
router.get('/export/:type', protect, exportReportCSV);

export default router;
