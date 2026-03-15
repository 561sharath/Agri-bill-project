import express from 'express';
import {
    getFarmers,
    getFarmerStats,
    getFarmerById,
    createFarmer,
    updateFarmer,
    deleteFarmer,
    getFarmerTransactions,
    exportFarmerHistory,
    searchFarmers
} from '../controllers/farmerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getFarmers)
    .post(protect, createFarmer);

router.get('/stats', protect, getFarmerStats);
router.get('/search', protect, searchFarmers);

router.route('/:id')
    .get(protect, getFarmerById)
    .put(protect, updateFarmer)
    .delete(protect, deleteFarmer);

router.get('/:id/transactions', protect, getFarmerTransactions);
router.get('/:id/export', protect, exportFarmerHistory);

export default router;
