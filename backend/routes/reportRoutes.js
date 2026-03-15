import express from 'express';
import {
    getMonthlySales,
    getTopProducts,
    getCreditReport,
    getCreditStatement,
    exportCreditStatement,
    exportReportCSV
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/monthly-sales', protect, getMonthlySales);
router.get('/top-products', protect, getTopProducts);
router.get('/credit', protect, getCreditReport);
router.get('/export-credit-statement', protect, exportCreditStatement);
router.get('/credit-statement/export', protect, exportCreditStatement);
router.get('/credit-statement', protect, getCreditStatement);
router.get('/export/:type', protect, exportReportCSV);

export default router;
