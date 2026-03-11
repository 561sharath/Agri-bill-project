import express from 'express';
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getLowStockProducts
} from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getProducts)
    .post(protect, createProduct);

router.route('/low-stock').get(protect, getLowStockProducts);

router.route('/:id')
    .get(protect, getProductById)
    .put(protect, updateProduct)
    .delete(protect, deleteProduct);

export default router;
