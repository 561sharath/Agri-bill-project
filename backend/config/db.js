import mongoose from 'mongoose';
import User from '../models/User.js';

// Ensure URI has database name so app and seed use same DB
function getMongoUri() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agribill';
    if (uri.endsWith('/') || (uri.includes('mongodb.net') && !uri.match(/\.net\/[^/?]/))) {
        return uri.replace(/\/*$/, '') + '/agribill';
    }
    return uri;
}

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(getMongoUri());
        console.log(`MongoDB Connected: ${conn.connection.host} (db: ${conn.connection.name})`);

        // Seed default admin user if none exists
        const userCount = await User.countDocuments();
        // if (userCount === 0) {
        //     await User.create({
        //         name: 'Admin User',
        //         email: 'venkatadmin@gmail.com',
        //         password: 'Venkat123', // Will be hashed by pre-save hook
        //         role: 'admin'
        //     });
        // }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
