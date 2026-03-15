/**
 * WhatsApp messaging via Chatmitra API.
 *
 * Environment variables:
 *   CHATMITRA_API_TOKEN   – Bearer token from https://app.chatmitra.com
 *   CHATMITRA_API_URL     – (optional) override message endpoint
 *   SHOP_NAME             – Shop display name
 *   UPI_ID                – UPI ID for payment link (e.g. venkataravindrap@ybl)
 *
 * NOTE: All process.env reads are done inside functions (lazy), NOT at module
 * level, so that dotenv.config() in server.js is guaranteed to have run first.
 */

const DEFAULT_API_URL = 'https://backend.chatmitra.com/developer/api/send_message';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken() {
    const token = process.env.CHATMITRA_API_TOKEN;
    if (!token || !token.trim()) {
        throw new Error('CHATMITRA_API_TOKEN not configured — add it to backend .env');
    }
    return token.trim();
}

function getApiUrl() {
    return (process.env.CHATMITRA_API_URL || DEFAULT_API_URL).trim();
}

function getShopName() {
    return (process.env.SHOP_NAME || 'AgriBill').trim();
}

function getUpiId() {
    return (process.env.UPI_ID || '').trim();
}

/** Normalise any Indian phone number to E.164 (91XXXXXXXXXX). */
export function toE164(phoneNumber) {
    const digits = (phoneNumber || '').replace(/\D/g, '');
    return digits.startsWith('91') ? digits : `91${digits}`;
}

/** Shared fetch + logging. */
async function chatmitraPost(url, payload) {
    const token = getToken();
    console.log(`[WhatsApp] POST ${url}`);
    console.log('[WhatsApp] Payload:', JSON.stringify(payload, null, 2));

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const errMsg = data.message || data.error || res.statusText || 'WhatsApp send failed';
        console.error('[WhatsApp] Error response:', JSON.stringify(data));
        throw new Error(errMsg);
    }

    console.log('[WhatsApp] Success:', JSON.stringify(data));
    return data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a plain text WhatsApp message.
 * NOTE: Only works for customers who have messaged you within the last 24 hours.
 */
export async function sendTextMessage(phoneNumber, message) {
    const recipient = toE164(phoneNumber);
    return chatmitraPost(getApiUrl(), {
        recipient_mobile_number: recipient,
        messages: [
            { kind: 'raw', payload: { type: 'text', text: { body: message } } },
        ],
    });
}

/**
 * Send the approved template `credit_payment_reminder__2026`.
 *
 * Uses kind:'template' so it reaches NEW customers who have never messaged
 * your WhatsApp Business number (outside the 24-hour session window).
 *
 * Approved template in ChatMitra:
 *   Hello {{1}},
 *   Your pending fertilizer credit is ₹{{2}}.
 *   Please clear the payment using the link below.
 *   Pay Now: {{3}}
 *   Basaveshwara Trading Company
 *
 * {{1}} = farmer name
 * {{2}} = pending amount (plain number, e.g. "11800")
 * {{3}} = UPI ID as plain text (upi:// deep links are blocked by WhatsApp in templates)
 *
 * @param {object} farmer  Mongoose farmer doc – name, mobile, creditBalance
 */
export async function sendCreditReminderWhatsApp(farmer) {
    const amount = Number(farmer.creditBalance || 0);
    const amountStr = String(Math.round(amount));
    const phone = toE164(farmer.mobile);
    const upiId = getUpiId();
    const upiText = upiId
        ? `UPI ID: ${upiId} Amount: ₹${Number(amount).toLocaleString('en-IN')}`
        : 'Please visit the shop to pay';

    // Use approved template with PDF header if PUBLIC_APP_URL (ngrok) is configured
    const baseUrl = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
    const isPublicUrl = baseUrl.startsWith('https://') && !baseUrl.includes('localhost');

    if (isPublicUrl) {
        try {
            const { generateCreditReminderPDF } = await import('./pdfService.js');
            const fs = (await import('fs')).default;
            const path = (await import('path')).default;
            const { fileURLToPath } = await import('url');
            const __dir = path.dirname(fileURLToPath(import.meta.url));
            const billsDir = path.join(__dir, '..', 'bills');
            fs.mkdirSync(billsDir, { recursive: true });

            const pdfBuffer = await generateCreditReminderPDF(farmer, amount);
            const fileName = `reminder-${String(farmer._id || Date.now())}.pdf`;
            fs.writeFileSync(path.join(billsDir, fileName), pdfBuffer);
            const pdfUrl = `${baseUrl}/bills/${fileName}`;

            const payload = {
                recipient_mobile_number: phone,
                customer_name: farmer.name,
                messages: [{
                    kind: 'template',
                    template: {
                        name: 'credit_payment_reminder__20260315103911',
                        language: 'en_US',
                        components: [
                            {
                                type: 'header',
                                parameters: [{
                                    type: 'document',
                                    document: {
                                        link: pdfUrl,
                                        filename: `Credit-Reminder-${farmer.name}.pdf`,
                                    },
                                }],
                            },
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: farmer.name },  // {{1}}
                                    { type: 'text', text: amountStr },    // {{2}}
                                    { type: 'text', text: upiText },      // {{3}}
                                ],
                            },
                        ],
                    },
                }],
            };

            console.log(`[WhatsApp] Sending template with PDF to ${phone} — ₹${amountStr}`);
            console.log('[WhatsApp] PDF URL:', pdfUrl);
            return chatmitraPost(getApiUrl(), payload);
        } catch (err) {
            console.warn('[WhatsApp] Template send failed, falling back to plain text:', err.message);
        }
    }

    // Fallback: plain text (works without ngrok / PUBLIC_APP_URL)
    const shopName = getShopName();
    const body =
        `🌾 ${shopName}\n\n` +
        `Hello ${farmer.name},\n\n` +
        `Your pending fertilizer credit is ₹${Number(amount).toLocaleString('en-IN')}.\n\n` +
        `Please clear the payment using the link below.\n\n` +
        `💳 Pay Now:\n${upiText}\n\n` +
        `Thank you.`;

    console.log(`[WhatsApp] Sending plain-text reminder to ${phone} — ₹${amountStr}`);
    return sendTextMessage(farmer.mobile, body);
}

/**
 * Send bill summary + optional PDF via WhatsApp.
 * Uses raw message — only for customers within the 24-hour session window.
 */
export async function sendBillWhatsApp(phoneNumber, farmerName, amount, pdfUrl) {
    const shopName = getShopName();
    const recipient = toE164(phoneNumber);
    const textBody =
        `🌾 ${shopName}\n\n` +
        `Hello ${farmerName},\n\n` +
        `Your fertilizer bill is ready.\n\n` +
        `💰 Amount: ₹${Number(amount).toLocaleString('en-IN')}\n\n` +
        `📄 Invoice attached`;

    const messages = [
        { kind: 'raw', payload: { type: 'text', text: { body: textBody } } },
    ];

    if (pdfUrl) {
        messages.push({
            kind: 'raw',
            payload: {
                type: 'document',
                document: { link: pdfUrl, filename: `invoice-${Date.now()}.pdf` },
            },
        });
    }

    return chatmitraPost(getApiUrl(), {
        recipient_mobile_number: recipient,
        messages,
    });
}

/**
 * Legacy plain-text reminder (kept as fallback).
 * NOTE: Only works for customers within the 24-hour session window.
 */
export async function sendReminderWhatsApp(phoneNumber, farmerName, pendingAmount) {
    const shopName = getShopName();
    const amountStr = Number(pendingAmount).toLocaleString('en-IN');
    const message =
        `🌾 ${shopName}\n\n` +
        `Hello ${farmerName},\n\n` +
        `This is a friendly reminder: you have an outstanding amount to pay.\n\n` +
        `💰 Pay amount: ₹${amountStr}\n\n` +
        `Please clear the payment at your earliest. Thank you!`;
    return sendTextMessage(phoneNumber, message);
}