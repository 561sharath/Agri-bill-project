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
    // HSN code for GST compliance (optional per product)
    hsn: { type: String, default: '' },
});

const billSchema = mongoose.Schema(
    {
        farmerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Farmer',
        },
        items: [billItemSchema],
        subtotal: {
            type: Number,
            default: 0,
        },
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
        // ── GST fields ──────────────────────────────────────────────────────
        gstEnabled: { type: Boolean, default: false },
        gstPercent: { type: Number, default: 0, min: 0, max: 28 }, // e.g. 5, 12, 18
        gstAmount: { type: Number, default: 0 },
        shopGSTIN: { type: String, default: '' }, // owner's GSTIN for the invoice
        // ── Credit / Interest fields ─────────────────────────────────────────
        // Optional: owner can mark interest rate (% per month) when creating a credit bill
        interestRate: { type: Number, default: 0, min: 0 }, // % per month, 0 = no interest
        interestAmount: { type: Number, default: 0 },       // computed at bill time
        dueDate: { type: Date },                            // optional due date for credit
        // ── Bill number (human-readable) ─────────────────────────────────────
        billNumber: { type: String },
    },
    {
        timestamps: true,
    }
);

// Auto-generate human-readable bill number before save
billSchema.pre('save', async function (next) {
    if (!this.billNumber && this.isNew) {
        const count = await mongoose.model('Bill').countDocuments();
        const year = new Date().getFullYear().toString().slice(-2);
        this.billNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

billSchema.index({ createdAt: -1 });
billSchema.index({ paymentType: 1 });
billSchema.index({ farmerId: 1 });
billSchema.index({ billNumber: 1 });

export default mongoose.model('Bill', billSchema);
