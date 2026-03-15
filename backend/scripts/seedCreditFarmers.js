/**
 * Seed script: adds 30 farmers with outstanding credit balances.
 * Safe to run multiple times — skips farmers that already exist by mobile.
 * Run: node scripts/seedCreditFarmers.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Farmer from '../models/Farmer.js';
import Bill from '../models/Bill.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

function getMongoUri() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agribill';
    if (uri.endsWith('/') || (uri.includes('mongodb.net') && !uri.match(/\.net\/[^/?]/))) {
        return uri.replace(/\/*$/, '') + '/agribill';
    }
    return uri;
}

const CREDIT_FARMERS = [
    { name: 'Anand Kumar', mobile: '9111100001', village: 'Tumkur', credit: 14500 },
    { name: 'Babanna S', mobile: '9111100002', village: 'Ramanagara', credit: 6800 },
    { name: 'Chandra Naik', mobile: '9111100003', village: 'Kolar', credit: 22300 },
    { name: 'Devraj M', mobile: '9111100004', village: 'Mandya', credit: 9100 },
    { name: 'Erappa H', mobile: '9111100005', village: 'Udupi', credit: 3750 },
    { name: 'Fakeerappa', mobile: '9111100006', village: 'Belagavi', credit: 18600 },
    { name: 'Girish Patil', mobile: '9111100007', village: 'Dharwad', credit: 11200 },
    { name: 'Hanumantha R', mobile: '9111100008', village: 'Gadag', credit: 7400 },
    { name: 'Iranna D', mobile: '9111100009', village: 'Koppal', credit: 25000 },
    { name: 'Jagadeesh K', mobile: '9111100010', village: 'Raichur', credit: 4300 },
    { name: 'Krishnappa V', mobile: '9111100011', village: 'Yadgir', credit: 16800 },
    { name: 'Lakshmana G', mobile: '9111100012', village: 'Bidar', credit: 8900 },
    { name: 'Mallikarjun', mobile: '9111100013', village: 'Kalaburagi', credit: 31500 },
    { name: 'Narasimha P', mobile: '9111100014', village: 'Vijayapura', credit: 5600 },
    { name: 'Onkarappa', mobile: '9111100015', village: 'Bagalkot', credit: 12100 },
    { name: 'Parameshwar', mobile: '9111100016', village: 'Haveri', credit: 2800 },
    { name: 'Rajappa N', mobile: '9111100017', village: 'Shiggaon', credit: 19700 },
    { name: 'Santhosh B', mobile: '9111100018', village: 'Honnavar', credit: 7200 },
    { name: 'Thimmappa', mobile: '9111100019', village: 'Sagar', credit: 28400 },
    { name: 'Umesh Naik', mobile: '9111100020', village: 'Sirsi', credit: 6100 },
    { name: 'Veeranna M', mobile: '9111100021', village: 'Kumta', credit: 13300 },
    { name: 'Waman Reddy', mobile: '9111100022', village: 'Ankola', credit: 4700 },
    { name: 'Yadappa K', mobile: '9111100023', village: 'Yellapur', credit: 21000 },
    { name: 'Zulekha Bi', mobile: '9111100024', village: 'Dandeli', credit: 9800 },
    { name: 'Arjun Shetty', mobile: '9111100025', village: 'Karwar', credit: 15600 },
    { name: 'Bhimappa L', mobile: '9111100026', village: 'Mundgod', credit: 3200 },
    { name: 'Channaiah T', mobile: '9111100027', village: 'Haliyal', credit: 26700 },
    { name: 'Devaraj N', mobile: '9111100028', village: 'Joida', credit: 8300 },
    { name: 'Eranna Goud', mobile: '9111100029', village: 'Sullia', credit: 17400 },
    { name: 'Fakruddin', mobile: '9111100030', village: 'Puttur', credit: 5900 },
];

function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

async function seed() {
    const uri = getMongoUri();
    try {
        await mongoose.connect(uri);
        console.log('Connected to', mongoose.connection.name || 'agribill');

        // Get existing mobiles to avoid duplicates
        const existingMobiles = new Set(
            (await Farmer.find({}, 'mobile').lean()).map(f => f.mobile)
        );

        const toAdd = CREDIT_FARMERS.filter(f => !existingMobiles.has(f.mobile));
        if (toAdd.length === 0) {
            console.log('All 30 credit farmers already exist. Nothing to add.');
            await mongoose.disconnect();
            process.exit(0);
            return;
        }

        // Get products for bill creation
        const products = await Product.find({}).select('_id name price').lean();
        if (products.length === 0) {
            console.log('No products found. Run seedFull.js first to insert products.');
            await mongoose.disconnect();
            process.exit(1);
            return;
        }

        let added = 0;
        for (const f of toAdd) {
            // Insert farmer
            const farmer = await Farmer.create({
                name: f.name,
                mobile: f.mobile,
                village: f.village,
                creditBalance: 0,
            });

            // Create credit bills to reach the target credit amount
            let remaining = f.credit;
            const billDates = [
                daysAgo(randomInt(200, 600)),
                daysAgo(randomInt(60, 199)),
                daysAgo(randomInt(5, 59)),
            ];

            for (const billDate of billDates) {
                if (remaining <= 0) break;
                const numItems = randomInt(1, 3);
                const items = [];
                let billTotal = 0;
                for (let j = 0; j < numItems; j++) {
                    const prod = randomItem(products);
                    const qty = randomInt(1, 4);
                    const price = prod.price;
                    const total = price * qty;
                    items.push({ productId: prod._id, quantity: qty, price, total });
                    billTotal += total;
                }
                // Cap bill at remaining credit target
                const cappedTotal = Math.min(billTotal, remaining);
                // Scale items proportionally if needed
                const scale = cappedTotal / billTotal;
                const scaledItems = items.map(it => ({
                    ...it,
                    total: Math.round(it.total * scale),
                }));
                const actualTotal = scaledItems.reduce((s, i) => s + i.total, 0);

                await Bill.create({
                    farmerId: farmer._id,
                    items: scaledItems,
                    totalAmount: actualTotal,
                    paymentType: 'credit',
                    createdAt: billDate,
                    updatedAt: billDate,
                });
                remaining -= actualTotal;
            }

            // Set the actual credit balance to match what bills created
            const actualCredit = f.credit - Math.max(0, remaining);
            await Farmer.findByIdAndUpdate(farmer._id, { creditBalance: actualCredit });

            added++;
            console.log(`  ✓ ${f.name} — credit ₹${actualCredit.toLocaleString('en-IN')} (${f.village})`);
        }

        console.log(`\nDone! Added ${added} new farmers with outstanding credit.`);
        console.log('Credit Ledger now has enough farmers to test scrolling and pagination.');
    } catch (err) {
        console.error('Seed error:', err.message || err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
