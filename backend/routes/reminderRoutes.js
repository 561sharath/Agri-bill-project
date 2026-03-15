import express from 'express';
import { sendReminder } from '../controllers/reminderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
// POST only – body: { farmerId: "<mongoose id>" }
router.route('/send')
    .post(protect, sendReminder)
    .all((req, res) => res.status(405).json({ message: 'Method not allowed. Use POST with body { farmerId }.' }));

export default router;
