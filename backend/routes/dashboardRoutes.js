import express from 'express';
import {
    getSalesSummary,
    getInventorySummary,
    getFarmerStatsSummary,
    getCreditSummary,
    getChartData,
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Granular, fault-tolerant dashboard endpoints
router.get('/sales', protect, getSalesSummary);
router.get('/inventory', protect, getInventorySummary);
router.get('/farmers', protect, getFarmerStatsSummary);
router.get('/credit', protect, getCreditSummary);
router.get('/charts', protect, getChartData);

// Legacy summary endpoint — aggregates all sections (kept for backward compat)
import { getDashboardSummaryService } from '../services/dashboardService.js';
router.get('/summary', protect, async (req, res, next) => {
    try {
        const summary = await getDashboardSummaryService();
        res.status(200).json(summary);
    } catch (error) {
        next(error);
    }
});

export default router;
