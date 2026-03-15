import Farmer from '../models/Farmer.js';
import { sendCreditReminderWhatsApp, toE164 } from '../services/whatsappService.js';

// @desc    Send WhatsApp credit reminder to farmer
// @route   POST /api/reminders/send
// @access  Private
export const sendReminder = async (req, res, next) => {
    try {
        const farmerId = req.body?.farmerId != null ? String(req.body.farmerId) : null;
        if (!farmerId) {
            return res.status(400).json({ message: 'farmerId is required in request body' });
        }

        const farmer = await Farmer.findById(farmerId).select('name mobile creditBalance');
        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }
        if (farmer.creditBalance <= 0) {
            return res.status(400).json({ message: `${farmer.name} has no pending credit balance` });
        }
        if (!farmer.mobile || farmer.mobile.replace(/\D/g, '').length < 10) {
            return res.status(400).json({ message: 'Farmer has no valid mobile number (need 10 digits)' });
        }

        await sendCreditReminderWhatsApp(farmer);

        console.log(`[Reminder] Sent to ${farmer.name} (${toE164(farmer.mobile)}) — ₹${farmer.creditBalance}`);

        return res.json({
            success: true,
            message: 'Reminder sent via WhatsApp',
            sentTo: farmer.mobile,
            sentToE164: toE164(farmer.mobile),
            farmerName: farmer.name,
            pendingAmount: farmer.creditBalance,
        });
    } catch (error) {
        const msg = error.message || '';
        console.error('[Reminder] Error:', msg);

        // Token missing — check for exact error from getToken()
        if (msg.includes('CHATMITRA_API_TOKEN')) {
            return res.status(503).json({
                message: 'WhatsApp not configured. Add CHATMITRA_API_TOKEN in backend .env',
            });
        }

        // ChatMitra project not set up correctly
        if (msg.includes('Project credentials incomplete') || msg.includes('credentials incomplete')) {
            return res.status(503).json({
                message: 'Chatmitra project setup incomplete. Log in at https://app.chatmitra.com and verify your WhatsApp Business number.',
            });
        }

        next(error);
    }
};
