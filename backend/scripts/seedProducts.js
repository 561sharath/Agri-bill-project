/**
 * Seed products into the database.
 * Run from backend folder: node scripts/seedProducts.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const products = [
    { name: 'Urea', category: 'Fertilizer', unit: 'Bag', price: 266, stock: 100 },
    { name: 'DAP', category: 'Fertilizer', unit: 'Bag', price: 1350, stock: 100 },
    { name: 'MOP Potash', category: 'Fertilizer', unit: 'Bag', price: 1700, stock: 100 },
    { name: 'SSP', category: 'Fertilizer', unit: 'Bag', price: 350, stock: 100 },
    { name: 'NPK 10:26:26', category: 'Fertilizer', unit: 'Bag', price: 1500, stock: 100 },
    { name: 'Imidacloprid', category: 'Pesticide', unit: 'Bottle', price: 650, stock: 100 },
    { name: 'Chlorpyrifos', category: 'Pesticide', unit: 'Bottle', price: 500, stock: 100 },
    { name: 'Mancozeb', category: 'Fungicide', unit: 'Packet', price: 250, stock: 100 },
    { name: 'Paddy Seeds', category: 'Seeds', unit: 'Packet', price: 1200, stock: 100 },
    { name: 'Zinc Sulphate', category: 'Micronutrient', unit: 'Packet', price: 300, stock: 100 },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        const existing = await Product.countDocuments();
        if (existing > 0) {
            console.log(`Found ${existing} existing products. Inserting only if name not present...`);
        }

        for (const p of products) {
            const exists = await Product.findOne({ name: p.name });
            if (exists) {
                console.log(`Skip (exists): ${p.name}`);
                continue;
            }
            await Product.create({
                name: p.name,
                brand: p.category,
                price: p.price,
                stock: p.stock,
            });
            console.log(`Inserted: ${p.name}`);
        }

        console.log('Seed done.');
    } catch (err) {
        console.error('Seed error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
