import express from 'express';
import {
    getMonthlySales,
    getTopProducts,
    exportReportCSV
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/monthly-sales', protect, getMonthlySales);
router.get('/top-products', protect, getTopProducts);
router.get('/export/:type', protect, exportReportCSV);

export default router;
