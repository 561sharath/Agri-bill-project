import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure bills folder exists for static PDF serving (ngrok-friendly URLs)
const billsDir = path.join(__dirname, 'bills');
fs.mkdirSync(billsDir, { recursive: true });

// Routes imports
import authRoutes from './routes/authRoutes.js';
import farmerRoutes from './routes/farmerRoutes.js';
import productRoutes from './routes/productRoutes.js';
import billRoutes from './routes/billRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Log requests in dev (helps debug 403)
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`${req.method} ${req.path} [Origin: ${req.get('origin') || 'none'}]`);
    }
    next();
});

// CORS – allow frontend origin (fixes 403 on login from proxy/preflight)
app.use(cors({
    origin: true, // reflect request origin (e.g. http://localhost:5175)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
}));
// Ensure preflight OPTIONS gets a proper response
app.options('*', cors());
app.use(express.json());

// Static PDF folder – PDFs at /bills/<id>.pdf (use with PUBLIC_APP_URL + ngrok for WhatsApp)
app.use('/bills', express.static(billsDir));

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reminders', reminderRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
