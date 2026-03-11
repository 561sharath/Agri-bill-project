import Product from '../models/Product.js';

// @desc    Get all products
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res, next) => {
    try {
        const products = await Product.find({}).sort({ name: 1 });
        res.json(products);
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

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = async (req, res, next) => {
    const { name, brand, price, stock } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.brand = brand || product.brand;
            product.price = price !== undefined ? price : product.price;
            product.stock = stock !== undefined ? stock : product.stock;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404);
            throw new Error('Product not found');
        }
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
