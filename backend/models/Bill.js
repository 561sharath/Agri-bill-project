import mongoose from 'mongoose';

const billItemSchema = mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product',
    },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
});

const billSchema = mongoose.Schema(
    {
        farmerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Farmer',
        },
        items: [billItemSchema],
        totalAmount: {
            type: Number,
            required: true,
        },
        paymentType: {
            type: String,
            required: true,
            enum: ['cash', 'credit', 'upi', 'bank'],
            default: 'cash',
        },
    },
    {
        timestamps: true,
    }
);

billSchema.index({ createdAt: -1 });
billSchema.index({ paymentType: 1 });
billSchema.index({ farmerId: 1 });

export default mongoose.model('Bill', billSchema);
