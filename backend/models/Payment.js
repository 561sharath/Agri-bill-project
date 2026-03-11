import mongoose from 'mongoose';

const paymentSchema = mongoose.Schema(
    {
        farmerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Farmer',
        },
        amount: {
            type: Number,
            required: true,
        },
        method: {
            type: String,
            required: true,
            enum: ['cash', 'upi', 'bank', 'cheque'],
            default: 'cash',
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Payment', paymentSchema);
