import express from 'express';
import {
    getFarmers,
    getFarmerById,
    createFarmer,
    updateFarmer,
    deleteFarmer,
    getFarmerTransactions
} from '../controllers/farmerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getFarmers)
    .post(protect, createFarmer);

router.route('/:id')
    .get(protect, getFarmerById)
    .put(protect, updateFarmer)
    .delete(protect, deleteFarmer);

router.route('/:id/transactions').get(protect, getFarmerTransactions);

export default router;
