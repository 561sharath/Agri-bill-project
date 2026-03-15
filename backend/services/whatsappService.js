/**
 * WhatsApp messaging via Chatmitra API — ALL messages use the approved template.
 *
 * Approved template: credit_payment_reminder__20260315103911
 * Fixed body:
 *   Hello {{1}},
 *   Your pending fertilizer credit is ₹{{2}}.
 *   Please clear the payment using the link below.
 *   Pay Now: {{3}}
 *   Basaveshwara Trading Company
 *
 * Strategy — fit every use case into {{1}}, {{2}}, {{3}}:
 *   {{1}} = farmer name (always)
 *   {{2}} = plain amount number (e.g. "5444")
 *   {{3}} = short action text (UPI ID / "Paid via CASH" / "Received ₹X. Remaining: ₹Y" / "Fully cleared!")
 *
 * Environment variables:
 *   CHATMITRA_API_TOKEN   – Bearer token
 *   CHATMITRA_API_URL     – (optional) override endpoint
 *   SHOP_NAME             – Shop display name
 *   UPI_ID                – UPI ID (e.g. venkataravindrap@ybl)
 *   PUBLIC_APP_URL        – Public HTTPS URL (ngrok) for PDF document header
 */

const DEFAULT_API_URL = 'https://backend.chatmitra.com/developer/api/send_message';
const APPROVED_TEMPLATE_NAME = 'credit_payment_reminder__20260315103911';

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

/** Return UPI ID as plain text. */
export function getUpiPayLink() {
    return getUpiId() || null;
}

/** True if bill payment type is already paid (not credit). */
function isBillPaid(paymentType) {
    if (!paymentType) return false;
    const t = String(paymentType).toLowerCase().trim();
    return t === 'cash' || t === 'upi' || t === 'bank' || t === 'cheque' || t === 'card';
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

/**
 * Core template sender. All messages go through here.
 * @param {string} phone       - Raw phone number (will be normalised to E.164)
 * @param {string} name        - Farmer name → {{1}}
 * @param {string} amtNum      - Plain amount number string (e.g. "5444") → {{2}}
 * @param {string} actionText  - Short action text → {{3}}
 * @param {string|null} pdfUrl - Public HTTPS URL to a PDF (document header); null = no header
 * @param {string} pdfFilename - Filename shown to customer
 */
async function sendTemplate(phone, name, amtNum, actionText, pdfUrl = null, pdfFilename = 'document.pdf') {
    const recipient = toE164(phone);
    const baseUrl = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
    const isPublicPdf = pdfUrl && baseUrl.startsWith('https://') && !baseUrl.includes('localhost');

    const components = [];

    // Document header — only when pdfUrl is a valid public HTTPS URL
    if (isPublicPdf) {
        components.push({
            type: 'header',
            parameters: [{
                type: 'document',
                document: { link: pdfUrl, filename: pdfFilename },
            }],
        });
    }

    components.push({
        type: 'body',
        parameters: [
            { type: 'text', text: String(name) },
            { type: 'text', text: String(amtNum) },
            { type: 'text', text: String(actionText) },
        ],
    });

    const payload = {
        recipient_mobile_number: recipient,
        customer_name: String(name),
        messages: [{
            kind: 'template',
            template: {
                name: APPROVED_TEMPLATE_NAME,
                language: 'en_US',
                components,
            },
        }],
    };

    console.log(`[WhatsApp] Template → ${recipient} | {{2}}=${amtNum} | {{3}}=${actionText}`);
    return chatmitraPost(getApiUrl(), payload);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export { APPROVED_TEMPLATE_NAME };

/** Exported for legacy compatibility — kept as template now. */
export async function sendTextMessage(phoneNumber, message) {
    // Kept for backward compat — callers should use specific functions below.
    console.warn('[WhatsApp] sendTextMessage called — routing through template. Message ignored; use specific sender.');
    throw new Error('sendTextMessage is disabled. Use sendCreditReminderWhatsApp / sendBillWhatsApp / etc. instead.');
}

/**
 * CREDIT REMINDER — send approved template to farmer with pending credit.
 * {{2}} = credit balance, {{3}} = UPI ID (to pay).
 * Header = credit reminder PDF if PUBLIC_APP_URL is set.
 */
export async function sendCreditReminderWhatsApp(farmer) {
    const amount = Number(farmer.creditBalance || 0);
    const amtNum = String(Math.round(amount));
    const phone = farmer.mobile;
    if (!phone || String(phone).replace(/\D/g, '').length < 10) {
        throw new Error(`Farmer ${farmer.name} has no valid mobile number`);
    }
    const upiId = getUpiId();
    const actionText = upiId || 'Please visit the shop to pay.';

    // Try to attach credit reminder PDF as document header
    let pdfUrl = null;
    let pdfFilename = `Credit-Reminder-${farmer.name}.pdf`;
    try {
        const baseUrl = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
        if (baseUrl.startsWith('https://') && !baseUrl.includes('localhost')) {
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
            pdfUrl = `${baseUrl}/bills/${fileName}`;
        }
    } catch (err) {
        console.warn('[WhatsApp] Reminder PDF generation failed, sending without document:', err.message);
    }

    console.log(`[WhatsApp] Credit reminder → ${farmer.name} ₹${amtNum}`);
    return sendTemplate(phone, farmer.name, amtNum, actionText, pdfUrl, pdfFilename);
}

/**
 * BILL GENERATED — send approved template with invoice PDF.
 * Paid (cash/upi/bank/cheque): {{2}} = amount, {{3}} = "Paid via CASH. Thank you."
 * Credit: {{2}} = amount, {{3}} = UPI ID (to pay).
 * Header = invoice PDF if PUBLIC_APP_URL is set and pdfUrl provided.
 */
export async function sendBillWhatsApp(phoneNumber, farmerName, amount, pdfUrl, paymentType) {
    const amtNum = String(Math.round(Number(amount)));
    const upiId = getUpiId();
    const paid = isBillPaid(paymentType);
    const method = paid ? String(paymentType).toUpperCase() : null;

    // Paid: {{2}}=amount, {{3}}="Paid via CASH. Thank you."
    // Credit: {{2}}=amount, {{3}}=UPI ID to pay
    const actionText = paid
        ? `Paid via ${method}. Thank you.`
        : (upiId || 'Please visit the shop to pay.');

    const pdfFilename = `Invoice-${farmerName}-${amtNum}.pdf`;

    console.log(`[WhatsApp] Bill → ${farmerName} ₹${amtNum} [${paid ? 'PAID' : 'CREDIT'}]`);
    return sendTemplate(phoneNumber, farmerName, amtNum, actionText, pdfUrl, pdfFilename);
}

/** Save pdfBuffer to disk and return its public URL. Returns null if no valid PUBLIC_APP_URL. */
async function savePdfAndGetUrl(pdfBuffer, fileName) {
    const baseUrl = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
    if (!baseUrl.startsWith('https://') || baseUrl.includes('localhost')) return null;
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;
    const { fileURLToPath } = await import('url');
    const __dir = path.dirname(fileURLToPath(import.meta.url));
    const billsDir = path.join(__dir, '..', 'bills');
    fs.mkdirSync(billsDir, { recursive: true });
    fs.writeFileSync(path.join(billsDir, fileName), pdfBuffer);
    return `${baseUrl}/bills/${fileName}`;
}

/** Sanitise a string for use in a filename. */
function safeFilePart(str) {
    return String(str || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
}

/**
 * PAYMENT RECORDED — farmer made a partial/full payment.
 * {{2}} = remaining balance after payment, {{3}} = UPI (if balance > 0) or "Thank you".
 * Sends ONE message only — if balance is 0, uses "cleared" wording so no second message is needed.
 */
export async function sendPaymentConfirmationWhatsApp(payment) {
    const farmer = payment.farmerId || {};
    const phone = farmer.mobile;
    if (!phone || String(phone).replace(/\D/g, '').length < 10) return;

    const paid    = Math.max(0, Number(payment.amount) || 0);
    const remaining = Math.max(0, Number(farmer.creditBalance) || 0);
    const remainingNum = String(Math.round(remaining));
    const upiId   = getUpiId();

    // {{3}}: if cleared → confirm cleared; if balance remains → UPI to pay
    const actionText = remaining === 0
        ? 'Account fully cleared. Thank you!'
        : (upiId || 'Please clear balance.');

    let pdfUrl = null;
    const fileName = `receipt-${safeFilePart(payment._id || Date.now())}.pdf`;
    const pdfFilename = `Receipt-${safeFilePart(farmer.name)}.pdf`;
    try {
        const { generatePaymentReceiptPDF } = await import('./pdfService.js');
        const pdfBuffer = await generatePaymentReceiptPDF(farmer, paid, remaining);
        pdfUrl = await savePdfAndGetUrl(pdfBuffer, fileName);
    } catch (err) {
        console.warn('[WhatsApp] Receipt PDF failed, sending without document:', err.message);
    }

    console.log(`[WhatsApp] Payment confirmation → ${farmer.name} | paid ₹${paid} | remaining ₹${remaining}`);
    return sendTemplate(phone, farmer.name, remainingNum, actionText, pdfUrl, pdfFilename);
}

/**
 * CREDIT CLEARED — only called when balance becomes exactly 0.
 * Generates a "cleared" receipt PDF as document header.
 */
export async function sendCreditClearedWhatsApp(farmer) {
    const phone = farmer.mobile;
    if (!phone || String(phone).replace(/\D/g, '').length < 10) return;

    let pdfUrl = null;
    const fileName = `cleared-${safeFilePart(farmer._id || Date.now())}.pdf`;
    const pdfFilename = `Cleared-${safeFilePart(farmer.name)}.pdf`;
    try {
        const { generatePaymentReceiptPDF } = await import('./pdfService.js');
        const pdfBuffer = await generatePaymentReceiptPDF(farmer, 0, 0);
        pdfUrl = await savePdfAndGetUrl(pdfBuffer, fileName);
    } catch (err) {
        console.warn('[WhatsApp] Cleared PDF failed, sending without document:', err.message);
    }

    console.log(`[WhatsApp] Credit cleared → ${farmer.name}`);
    return sendTemplate(phone, farmer.name, '0', 'Account fully cleared. Thank you!', pdfUrl, pdfFilename);
}

/**
 * Legacy reminder — kept for backward compatibility, uses template.
 */
export async function sendReminderWhatsApp(phoneNumber, farmerName, pendingAmount) {
    const amtNum = String(Math.round(Number(pendingAmount)));
    const upiId = getUpiId();
    const actionText = upiId || 'Please visit the shop to pay.';
    return sendTemplate(phoneNumber, farmerName, amtNum, actionText);
}
