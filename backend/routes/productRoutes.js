import express from 'express';
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    updateProductStock,
    deleteProduct,
    getLowStockProducts,
    getProductStats,
} from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getProducts).post(protect, createProduct);
router.route('/low-stock').get(protect, getLowStockProducts);
router.route('/stats').get(protect, getProductStats);

router.route('/:id')
    .get(protect, getProductById)
    .put(protect, updateProduct)
    .delete(protect, deleteProduct);

// Additive stock update
router.route('/:id/stock').patch(protect, updateProductStock);

export default router;
