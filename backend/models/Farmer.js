import mongoose from 'mongoose';

const farmerSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
        },
        mobile: {
            type: String,
            required: [true, 'Please add a mobile number'],
            unique: true,
        },
        village: {
            type: String,
            required: [true, 'Please add a village'],
        },
        creditBalance: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Farmer', farmerSchema);
