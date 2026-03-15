import PDFDocument from 'pdfkit';

/**
 * Generate bill PDF buffer using PDFKit (no Chrome/Puppeteer required).
 * @param {Object} bill - Populated bill with farmerId and items[].productId
 * @returns {Promise<Buffer>}
 */
export const generatePDFBuffer = async (bill) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const primary = '#2f7f33';
        const farmer = bill.farmerId || {};
        const shopName = process.env.SHOP_NAME || 'Green Harvest Fertilisers';
        const shopAddress = process.env.SHOP_ADDRESS || '123 Main Bazaar, Guntur, AP - 522001';
        const shopPhone = process.env.SHOP_PHONE || '98765 43210';

        // Header
        doc.fontSize(22).fillColor(primary).text(shopName, { align: 'center' });
        doc.fontSize(10).fillColor('#666').text(shopAddress, { align: 'center' });
        doc.text(shopPhone, { align: 'center' });
        doc.moveDown(1);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
        doc.moveDown(1.5);

        // Two columns: Bill To | Invoice Details
        const col1 = 40;
        const col2 = 320;
        doc.fontSize(11).fillColor(primary).text('Bill To:', col1, doc.y);
        doc.fontSize(10).fillColor('#333');
        doc.text(farmer.name || '-', col1, doc.y + 18);
        doc.text(`Mobile: ${farmer.mobile || '-'}`, col1, doc.y + 32);
        doc.text(`Village: ${farmer.village || '-'}`, col1, doc.y + 46);

        const invY = doc.y - 58;
        doc.fontSize(11).fillColor(primary).text('Invoice Details:', col2, invY);
        doc.fontSize(10).fillColor('#333');
        const shortId = bill._id ? String(bill._id).slice(-8) : '-';
        doc.text(`Invoice No: ${shortId}`, col2, invY + 18);
        doc.text(`Date: ${new Date(bill.createdAt).toLocaleDateString('en-IN')}`, col2, invY + 32);
        doc.text(`Payment: ${(bill.paymentType || 'cash').toUpperCase()}`, col2, invY + 46);

        doc.y = Math.max(doc.y, invY + 60);
        doc.moveDown(1);

        // Table header
        const tableTop = doc.y;
        const colW = [30, 220, 70, 80, 90];
        const tableLeft = 40;
        doc.fontSize(9).fillColor('#555');
        doc.rect(tableLeft, tableTop, 475, 22).fill('#f0f4f0');
        doc.fillColor('#333');
        doc.text('SN', tableLeft + 8, tableTop + 6, { width: colW[0] });
        doc.text('Product', tableLeft + colW[0] + 5, tableTop + 6, { width: colW[1] });
        doc.text('Qty', tableLeft + colW[0] + colW[1] + 5, tableTop + 6, { width: colW[2] });
        doc.text('Rate (₹)', tableLeft + colW[0] + colW[1] + colW[2] + 5, tableTop + 6, { width: colW[3] });
        doc.text('Amount (₹)', tableLeft + colW[0] + colW[1] + colW[2] + colW[3] + 5, tableTop + 6, { width: colW[4] });

        let rowY = tableTop + 22;
        const rowHeight = 20;
        const items = bill.items || [];

        items.forEach((item, index) => {
            const productName = (item.productId && item.productId.name) ? item.productId.name : 'Product';
            doc.fontSize(9).fillColor('#333');
            doc.rect(tableLeft, rowY, 475, rowHeight).strokeColor('#eee').stroke();
            doc.text(String(index + 1), tableLeft + 8, rowY + 5, { width: colW[0] });
            doc.text(productName, tableLeft + colW[0] + 5, rowY + 5, { width: colW[1] });
            doc.text(String(item.quantity || 0), tableLeft + colW[0] + colW[1] + 5, rowY + 5, { width: colW[2] });
            doc.text(Number(item.price || 0).toFixed(2), tableLeft + colW[0] + colW[1] + colW[2] + 5, rowY + 5, { width: colW[3] });
            doc.text(Number(item.total || 0).toFixed(2), tableLeft + colW[0] + colW[1] + colW[2] + colW[3] + 5, rowY + 5, { width: colW[4] });
            rowY += rowHeight;
        });

        // Total row
        doc.rect(tableLeft, rowY, 475, rowHeight).fillAndStroke('#e8f5e9', '#eee');
        doc.fontSize(10).fillColor('#333');
        doc.text('Grand Total:', tableLeft + 8, rowY + 5, { width: colW[0] + colW[1] + colW[2] + colW[3] });
        doc.fontSize(10).fillColor(primary).text(`₹${Number(bill.totalAmount || 0).toFixed(2)}`, tableLeft + colW[0] + colW[1] + colW[2] + colW[3] + 5, rowY + 5, { width: colW[4] });

        doc.y = rowY + rowHeight + 25;

        // Footer
        doc.fontSize(10).fillColor('#888').text('Thank you for your business!', { align: 'center' });
        doc.text('Computer generated invoice. No signature required.', { align: 'center' });

        doc.end();
    });
};

/**
 * Generate a credit reminder PDF for a farmer.
 * Used as the header document in the WhatsApp template.
 */
export const generateCreditReminderPDF = async (farmer, amount) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const primary = '#2f7f33';
        const shopName = process.env.SHOP_NAME || 'AgriBill';
        const upiId = process.env.UPI_ID || '';
        const amountStr = Number(amount).toLocaleString('en-IN');

        // Header
        doc.fontSize(22).fillColor(primary).text(shopName, { align: 'center' });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
        doc.moveDown(1.5);

        // Title
        doc.fontSize(18).fillColor('#333').text('Credit Payment Reminder', { align: 'center' });
        doc.moveDown(1);

        // Farmer info box
        doc.rect(50, doc.y, 495, 80).fill('#f8fdf8').stroke('#d4edda');
        const boxY = doc.y + 15;
        doc.fontSize(12).fillColor('#333');
        doc.text(`Dear ${farmer.name},`, 70, boxY);
        doc.fontSize(11).fillColor('#666');
        doc.text(`Mobile: ${farmer.mobile}  |  Village: ${farmer.village || '-'}`, 70, boxY + 22);
        doc.moveDown(4.5);

        // Outstanding amount
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#c0392b')
            .text(`Outstanding Balance: ₹${amountStr}`, { align: 'center' });
        doc.moveDown(1);

        // Message
        doc.fontSize(11).fillColor('#333')
            .text('Your pending fertilizer credit is due. Please clear the payment at your earliest convenience.', {
                align: 'center', width: 400, continued: false
            });
        doc.moveDown(1.5);

        // UPI payment section
        if (upiId) {
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
            doc.moveDown(1);
            doc.fontSize(13).fillColor(primary).text('Payment Details', { align: 'center' });
            doc.moveDown(0.5);
            doc.rect(150, doc.y, 295, 70).fill('#e8f5e9').stroke('#a8d5a2');
            const payY = doc.y + 12;
            doc.fontSize(11).fillColor('#333');
            doc.text(`UPI ID: ${upiId}`, 170, payY, { align: 'left' });
            doc.text(`Amount: ₹${amountStr}`, 170, payY + 22);
            doc.fontSize(9).fillColor('#666')
                .text('Pay via Google Pay / PhonePe / Paytm', 170, payY + 42);
            doc.moveDown(4);
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).fillColor('#888')
            .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
        doc.text('Thank you for your business.', { align: 'center' });

        doc.end();
    });
};

/**
 * Generate a simple one-page PDF (credit reminder or payment receipt).
 * @param {string} title    - Heading on the PDF
 * @param {Array}  lines    - Array of { label, value } rows
 * @returns {Promise<Buffer>}
 */
export const generateSimplePDF = (title, lines = []) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const primary = '#2f7f33';
        const shopName = process.env.SHOP_NAME || 'AgriBill';

        doc.fontSize(20).fillColor(primary).text(shopName, { align: 'center' });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
        doc.moveDown(1);

        doc.fontSize(15).fillColor('#333').text(title, { align: 'center' });
        doc.moveDown(1.5);

        lines.forEach(({ label, value }) => {
            doc.fontSize(11).fillColor('#555').text(`${label}:`, 50, doc.y, { continued: true, width: 200 });
            doc.fillColor('#111').text(`  ${value}`, { align: 'left' });
            doc.moveDown(0.4);
        });

        doc.moveDown(2);
        doc.fontSize(10).fillColor('#888')
            .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
        doc.text('Thank you for your business.', { align: 'center' });

        doc.end();
    });
};

/** Payment receipt PDF. */
export const generatePaymentReceiptPDF = (farmer, paidAmount, remaining) =>
    generateSimplePDF('Payment Receipt', [
        { label: 'Farmer Name', value: farmer.name || '' },
        { label: 'Village', value: farmer.village || '-' },
        { label: 'Amount Paid', value: `Rs. ${Number(paidAmount).toLocaleString('en-IN')}` },
        { label: 'Remaining Balance', value: `Rs. ${Number(remaining).toLocaleString('en-IN')}` },
        { label: 'Date', value: new Date().toLocaleDateString('en-IN') },
    ]);
