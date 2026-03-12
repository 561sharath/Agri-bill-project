import mongoose from 'mongoose';

const productSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a product name'],
        },
        brand: {
            type: String,
        },
        price: {
            type: Number,
            required: [true, 'Please add a price'],
        },
        stock: {
            type: Number,
            required: [true, 'Please add stock quantity'],
        },
    },
    {
        timestamps: true,
    }
);

productSchema.index({ name: 1 });
productSchema.index({ brand: 1 });

export default mongoose.model('Product', productSchema);
