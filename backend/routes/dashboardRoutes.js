import express from 'express';
import { getDashboardStats, getDashboardCharts } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/charts', protect, getDashboardCharts);

export default router;
