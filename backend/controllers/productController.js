import Product from '../models/Product.js';

// @desc    Get all products with pagination + optional search
// @route   GET /api/products?page=&limit=&search=
// @access  Private
export const getProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const search = req.query.search?.trim();

        const query = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { brand: { $regex: search, $options: 'i' } },
                ]
            }
            : {};

        const totalRecords = await Product.countDocuments(query);
        const products = await Product.find(query)
            .sort({ name: 1 })
            .skip(startIndex)
            .limit(limit);

        res.json({
            data: products,
            page,
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get inventory stats (across all products — not paginated)
// @route   GET /api/products/stats
// @access  Private
export const getProductStats = async (req, res, next) => {
    try {
        const [stats] = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    lowStock: {
                        $sum: { $cond: [{ $and: [{ $gt: ['$stock', 5] }, { $lte: ['$stock', 20] }] }, 1, 0] }
                    },
                    critical: {
                        $sum: { $cond: [{ $lte: ['$stock', 5] }, 1, 0] }
                    },
                }
            }
        ]);
        res.json(stats || { total: 0, lowStock: 0, critical: 0 });
    } catch (error) {
        next(error);
    }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Private
export const getLowStockProducts = async (req, res, next) => {
    try {
        const products = await Product.find({ stock: { $lte: 20 } }).sort({ stock: 1 });
        res.json(products);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404);
            throw new Error('Product not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private
export const createProduct = async (req, res, next) => {
    const { name, brand, price, stock } = req.body;
    try {
        const product = await Product.create({ name, brand, price, stock });
        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a product (full update)
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = async (req, res, next) => {
    const { name, brand, price, stock } = req.body;
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }
        product.name = name || product.name;
        product.brand = brand !== undefined ? brand : product.brand;
        product.price = price !== undefined ? price : product.price;
        product.stock = stock !== undefined ? stock : product.stock;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        next(error);
    }
};

// @desc    Update stock by adding to present stock
// @route   PATCH /api/products/:id/stock
// @access  Private
// Body: { updateStock: Number }  — additive, so new total = presentStock + updateStock
export const updateProductStock = async (req, res, next) => {
    const { updateStock } = req.body;
    try {
        const addQty = Number(updateStock);
        if (isNaN(addQty) || addQty < 0) {
            res.status(400);
            throw new Error('updateStock must be a non-negative number');
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }

        product.stock = product.stock + addQty;
        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404);
            throw new Error('Product not found');
        }
    } catch (error) {
        next(error);
    }
};
