/**
 * Full seed: products, farmers, and 2 years of bills + payments for edge-case testing.
 * Run from backend: node scripts/seedFull.js
 * Uses MONGO_URI from .env (or default).
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Product from '../models/Product.js';
import Farmer from '../models/Farmer.js';
import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Ensure MONGO_URI has a database name (default: agribill)
function getMongoUri() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agribill';
    if (uri.endsWith('/') || (uri.includes('mongodb.net') && !uri.match(/\.net\/[^/?]/))) {
        return uri.replace(/\/*$/, '') + '/agribill';
    }
    return uri;
}

const PRODUCTS = [
    { name: 'Urea', brand: 'Fertilizer', price: 266, stock: 200 },
    { name: 'DAP', brand: 'Fertilizer', price: 1350, stock: 200 },
    { name: 'MOP Potash', brand: 'Fertilizer', price: 1700, stock: 200 },
    { name: 'SSP', brand: 'Fertilizer', price: 350, stock: 200 },
    { name: 'NPK 10:26:26', brand: 'Fertilizer', price: 1500, stock: 200 },
    { name: 'Imidacloprid', brand: 'Pesticide', price: 650, stock: 150 },
    { name: 'Chlorpyrifos', brand: 'Pesticide', price: 500, stock: 150 },
    { name: 'Mancozeb', brand: 'Fungicide', price: 250, stock: 150 },
    { name: 'Paddy Seeds', brand: 'Seeds', price: 1200, stock: 100 },
    { name: 'Zinc Sulphate', brand: 'Micronutrient', price: 300, stock: 150 },
    { name: '19:19:19 NPK', brand: 'Fertilizer', price: 1200, stock: 150 },
    { name: 'Ammonium Sulphate', brand: 'Fertilizer', price: 450, stock: 100 },
    { name: 'Bordeaux Mixture', brand: 'Fungicide', price: 180, stock: 100 },
    { name: 'Neem Oil', brand: 'Pesticide', price: 400, stock: 80 },
    { name: 'Vermicompost', brand: 'Organic', price: 25, stock: 500 },
];

const FARMERS = [
    { name: 'Ramesh Gowda', mobile: '9876543210', village: 'Belur' },
    { name: 'Suresh Reddy', mobile: '9876543211', village: 'Hassan' },
    { name: 'Lakshmi Devi', mobile: '9876543212', village: 'Mysore' },
    { name: 'Venkatesh K', mobile: '9876543213', village: 'Tumkur' },
    { name: 'Manjunath M', mobile: '9876543214', village: 'Chitradurga' },
    { name: 'Shantha Bai', mobile: '9876543215', village: 'Shimoga' },
    { name: 'Chandru P', mobile: '9876543216', village: 'Davangere' },
    { name: 'Kavitha R', mobile: '9876543217', village: 'Harihara' },
    { name: 'Nagaraj B', mobile: '9876543218', village: 'Arsikere' },
    { name: 'Parvathi S', mobile: '9876543219', village: 'Sakleshpur' },
    { name: 'Gopalakrishna', mobile: '9876543220', village: 'Kadur' },
    { name: 'Jayamma', mobile: '9876543221', village: 'Channarayapatna' },
    { name: 'Siddappa', mobile: '9876543222', village: 'Holenarasipura' },
    { name: 'Lakshmamma', mobile: '9876543223', village: 'Arkalgud' },
    { name: 'Basavaraj', mobile: '9876543224', village: 'Belur' },
];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
function addMonths(d, months) {
    const out = new Date(d);
    out.setMonth(out.getMonth() + months);
    return out;
}
function randomDateBetween(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
    const uri = getMongoUri();
    try {
        await mongoose.connect(uri);
        console.log('MongoDB connected to', mongoose.connection.name || 'agribill');

        const now = new Date();
        const twoYearsAgo = addMonths(now, -24);

        // ─── Products ─────────────────────────────────────────
        let products = await Product.find({}).select('_id name price').lean();
        const existingNames = products.map((p) => p.name);
        const toAdd = PRODUCTS.filter((p) => !existingNames.includes(p.name));
        if (toAdd.length > 0) {
            await Product.insertMany(toAdd);
            products = await Product.find({}).select('_id name price').lean();
            console.log(`Products: ${toAdd.length} added, ${products.length} total`);
        } else if (products.length === 0) {
            await Product.insertMany(PRODUCTS);
            products = await Product.find({}).select('_id name price').lean();
            console.log(`Inserted ${products.length} products`);
        }

        // ─── Farmers ─────────────────────────────────────────
        let farmers = await Farmer.find({}).lean();
        const existingMobiles = new Set(farmers.map((f) => f.mobile));
        const farmersToAdd = FARMERS.filter((f) => !existingMobiles.has(f.mobile));
        if (farmersToAdd.length > 0) {
            await Farmer.insertMany(farmersToAdd.map((f) => ({ ...f, creditBalance: 0 })));
            farmers = await Farmer.find({}).lean();
            console.log(`Farmers: ${farmersToAdd.length} added, ${farmers.length} total`);
        } else if (farmers.length === 0) {
            await Farmer.insertMany(FARMERS.map((f) => ({ ...f, creditBalance: 0 })));
            farmers = await Farmer.find({}).lean();
            console.log(`Inserted ${farmers.length} farmers`);
        }

        // ─── Bills & payments over 2 years ───────────────────
        const existingBills = await Bill.countDocuments();
        if (existingBills > 0) {
            console.log(`Found ${existingBills} existing bills. Skipping bill/payment seed to avoid duplicates.`);
            await mongoose.disconnect();
            process.exit(0);
            return;
        }

        const paymentTypes = ['cash', 'credit', 'upi'];
        const methods = ['cash', 'upi', 'bank', 'cheque'];
        let billCount = 0;
        let paymentCount = 0;

        for (let monthOffset = 0; monthOffset < 24; monthOffset++) {
            const monthStart = addMonths(twoYearsAgo, monthOffset);
            const monthEnd = addMonths(monthStart, 1);
            const billsThisMonth = randomInt(8, 25);
            for (let i = 0; i < billsThisMonth; i++) {
                const farmer = randomItem(farmers);
                const numItems = randomInt(1, 4);
                const items = [];
                let totalAmount = 0;
                for (let j = 0; j < numItems; j++) {
                    const prod = randomItem(products);
                    const qty = randomInt(1, 5);
                    const price = prod.price || 500;
                    const total = price * qty;
                    items.push({ productId: prod._id, quantity: qty, price, total });
                    totalAmount += total;
                }
                const paymentType = randomItem(paymentTypes);
                const createdAt = randomDateBetween(monthStart, monthEnd);
                await Bill.create({
                    farmerId: farmer._id,
                    items,
                    totalAmount,
                    paymentType,
                    createdAt,
                    updatedAt: createdAt,
                });
                billCount++;
                if (paymentType === 'credit') {
                    await Farmer.findByIdAndUpdate(farmer._id, { $inc: { creditBalance: totalAmount } });
                }
            }
        }

        // Payments: spread over 2 years, reduce credit for farmers who have credit
        const creditFarmers = await Farmer.find({ creditBalance: { $gt: 0 } }).lean();
        for (const farmer of creditFarmers) {
            let remaining = farmer.creditBalance;
            const numPayments = randomInt(1, Math.max(1, Math.min(8, Math.floor(remaining / 1500))));
            const start = randomDateBetween(twoYearsAgo, addMonths(now, -1));
            for (let i = 0; i < numPayments && remaining > 100; i++) {
                const amount = Math.min(randomInt(500, 2500), Math.max(100, Math.floor(remaining * 0.5)));
                if (amount < 100) break;
                const date = randomDateBetween(start, now);
                await Payment.create({
                    farmerId: farmer._id,
                    amount,
                    method: randomItem(methods),
                    date,
                    notes: 'Payment against credit',
                });
                remaining -= amount;
                paymentCount++;
            }
            const totalPaid = farmer.creditBalance - remaining;
            if (totalPaid > 0) {
                await Farmer.findByIdAndUpdate(farmer._id, { $inc: { creditBalance: -totalPaid } });
            }
        }

        // Recompute credit balances from bills and payments (cleanup)
        const allFarmers = await Farmer.find({}).select('_id').lean();
        for (const f of allFarmers) {
            const billsSum = await Bill.aggregate([
                { $match: { farmerId: f._id, paymentType: 'credit' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]);
            const paySum = await Payment.aggregate([
                { $match: { farmerId: f._id } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]);
            const credit = (billsSum[0]?.total || 0) - (paySum[0]?.total || 0);
            await Farmer.findByIdAndUpdate(f._id, { creditBalance: Math.max(0, credit) });
        }

        console.log(`Seeded ${billCount} bills and ${paymentCount} payments over 2 years.`);
        console.log('Seed done.');
    } catch (err) {
        console.error('Seed error:', err.message || err);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
