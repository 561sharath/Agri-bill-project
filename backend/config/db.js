import mongoose from 'mongoose';
import User from '../models/User.js';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agribill');
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Seed default admin user if none exists
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            await User.create({
                name: 'Admin User',
                email: 'admin@agribill.com',
                password: '123456', // Will be hashed by pre-save hook
                role: 'admin'
            });
            console.log('Default admin user seeded: admin@agribill.com / 123456');
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
