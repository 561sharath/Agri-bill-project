import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

        // Load fonts if available
        const fontDir = path.join(__dirname, '../../frontend/public/fonts');
        const regularFont = path.join(fontDir, 'NotoSans-Regular.ttf');
        const boldFont = path.join(fontDir, 'NotoSans-Bold.ttf');
        const kannadaFont = path.join(fontDir, 'NotoSansKannada-Regular.ttf');
        const kannadaBoldFont = path.join(fontDir, 'NotoSansKannada-Bold.ttf');

        const hasCustomFonts = fs.existsSync(regularFont) && fs.existsSync(boldFont);
        const hasKannada = fs.existsSync(kannadaFont);

        if (hasCustomFonts) {
            doc.registerFont('Regular', regularFont);
            doc.registerFont('Bold', boldFont);
        } else {
            doc.registerFont('Regular', 'Helvetica');
            doc.registerFont('Bold', 'Helvetica-Bold');
        }

        if (hasKannada) {
            doc.registerFont('Kannada', kannadaFont);
            doc.registerFont('KannadaBold', kannadaBoldFont);
        }

        // Helper to switch font based on text content (rudimentary unicode check)
        const formatText = (text, isBold = false) => {
            if (!text) return '';
            const str = String(text);
            const isKannadaText = /[\u0C80-\u0CFF]/.test(str);
            if (isKannadaText && hasKannada) {
                doc.font(isBold ? 'KannadaBold' : 'Kannada');
            } else {
                doc.font(isBold ? 'Bold' : 'Regular');
            }
            return str;
        };

        const primary = '#1a7a2e'; // match BRAND from frontend
        const farmer = bill.farmerId || {};
        const shopName = process.env.SHOP_NAME || 'Green Harvest Fertilisers';
        const shopAddress = process.env.SHOP_ADDRESS || '123 Main Bazaar, Guntur, AP - 522001';
        const shopPhone = process.env.SHOP_PHONE || '98765 43210';
        const shopGSTIN = bill.shopGSTIN || process.env.SHOP_GSTIN || '';

        // --- Helper: Draw a box with a thick left border ---
        const drawCalloutBox = (x, y, w, h, bgHex, leftBorderHex) => {
            doc.roundedRect(x, y, w, h, 6).fill(bgHex);
            // Overdraw the left edge as a path to simulate a left border with top-left/bottom-left roundness
            // PDFKit roundedRect doesn't support border-left alone, so we clip
            doc.save();
            doc.roundedRect(x, y, w, h, 6).clip();
            doc.rect(x, y, 3, h).fill(leftBorderHex);
            doc.restore();
        };

        const paymentType = (bill.paymentType || 'cash').toLowerCase();
        const paymentColors = {
            cash: { bg: '#dcfce7', text: '#166534' },
            credit: { bg: '#fee2e2', text: '#991b1b' },
            upi: { bg: '#ede9fe', text: '#5b21b6' },
            bank: { bg: '#dbeafe', text: '#1e40af' },
        };
        const payBadge = paymentColors[paymentType] || paymentColors.cash;
        const fmt = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // --- Header (Rounded) ---
        doc.roundedRect(40, 36, 515, 60, 6).fill(primary);
        formatText(shopName, true);
        doc.fontSize(18).fillColor('#ffffff').text(shopName, 60, 48);
        formatText(`${shopAddress}${shopPhone ? `  |  ${shopPhone}` : ''}`, false);
        doc.fontSize(8).fillColor('rgba(255,255,255,0.75)').text(`${shopAddress}${shopPhone ? `  |  ${shopPhone}` : ''}`, 60, 70);
        if (shopGSTIN) {
            doc.text(`GSTIN: ${shopGSTIN}`, 60, 80);
        }

        formatText('TAX INVOICE', false); // The font makes it blocky
        doc.fontSize(10).fillColor('rgba(255,255,255,0.85)').font('Bold').text('TAX INVOICE', 400, 48, { align: 'right', width: 135, characterSpacing: 1.5 });
        const shortId = bill.billNumber || (bill._id ? String(bill._id).slice(-8) : '-');
        formatText(shortId, true);
        doc.fontSize(14).fillColor('#ffffff').text(shortId, 400, 60, { align: 'right', width: 135 });
        formatText(new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), false);
        doc.fontSize(8).fillColor('rgba(255,255,255,0.75)').text(new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 400, 78, { align: 'right', width: 135 });
        
        doc.y = 114;

        // --- Bill To | Invoice Details ---
        const col1 = 40;
        const col2 = 320;

        // Bill To Box
        drawCalloutBox(col1, doc.y, 235, 75, '#f9fafb', primary);
        formatText('BILL TO', true);
        doc.fontSize(7).fillColor('#6b7280').text('BILL TO', col1 + 12, doc.y + 12, { characterSpacing: 1 });
        const nameVal = formatText(farmer.name || '-', true);
        doc.fontSize(11).fillColor('#1a1a2e').text(nameVal, col1 + 12, doc.y + 8);
        formatText(`Mobile: ${farmer.mobile || '-'}`, false);
        doc.fontSize(8).fillColor('#6b7280').text(`Mobile: ${farmer.mobile || '-'}`, col1 + 12, doc.y + 6);
        const villageVal = formatText(`Village: ${farmer.village || '-'}`, false);
        doc.text(villageVal, col1 + 12, doc.y + 4);

        // Invoice Details Box
        const startY = doc.y - 48;
        drawCalloutBox(col2, startY, 235, 75, '#f9fafb', '#6366f1');
        formatText('INVOICE DETAILS', true);
        doc.fontSize(7).fillColor('#6b7280').text('INVOICE DETAILS', col2 + 12, startY + 12, { characterSpacing: 1 });
        
        formatText(`Invoice No: `, false);
        doc.fontSize(8).fillColor('#6b7280').text(`Invoice No: `, col2 + 12, startY + 28, { continued: true });
        formatText(shortId, true);
        doc.fillColor('#1a1a2e').text(shortId);
        
        formatText(`Date: ${new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN')}`, false);
        doc.fillColor('#6b7280').text(`Date: ${new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN')}`, col2 + 12, startY + 44);
        
        // Payment Badge
        const badgeY = startY + 58;
        doc.roundedRect(col2 + 12, badgeY, 65, 12, 4).fill(payBadge.bg);
        formatText(`${(paymentType).replace('upi','UPI').toUpperCase()} PAYMENT`, true);
        doc.fontSize(7).fillColor(payBadge.text).text(`${(paymentType).replace('upi','UPI').toUpperCase()} PAYMENT`, col2 + 12, badgeY + 3, { width: 65, align: 'center', characterSpacing: 0.5 });

        doc.y = startY + 90;

        // --- Items Table ---
        const tableTop = doc.y;
        // Exact percentages mapped to 515pt total width:
        // SN: 8% (41.2), Product: Flex, HSN: 12% (61.8), Qty: 10% (51.5), Rate: 16% (82.4), Amt: 16% (82.4)
        // With GST:    Product = 195.7
        // Without GST: Product = 257.5
        const colW = bill.gstEnabled 
            ? [41.2, 195.7, 61.8, 51.5, 82.4, 82.4] 
            : [41.2, 257.5, 51.5, 82.4, 82.4];
        
        const tableLeft = 40;
        
        doc.save();
        doc.roundedRect(tableLeft, tableTop, 515, 20, 6).clip();
        doc.rect(tableLeft, tableTop, 515, 20).fill(primary); // header bg
        
        doc.fontSize(8).fillColor('#ffffff');
        formatText('SN', true);
        
        // Helper to draw cells with padding
        const drawCell = (text, x, y, width, align, isHeader = false) => {
            const padding = 6;
            doc.text(text, x + padding, y, { width: width - (padding * 2), align, characterSpacing: isHeader ? 0.5 : 0 });
        };

        let currentX = tableLeft;
        drawCell('#', currentX, tableTop + 7, colW[0], 'center', true); currentX += colW[0];
        drawCell('Product / Description', currentX, tableTop + 7, colW[1], 'left', true); currentX += colW[1];
        if (bill.gstEnabled) { 
            drawCell('HSN', currentX, tableTop + 7, colW[2], 'center', true); currentX += colW[2]; 
        }
        drawCell('Qty', currentX, tableTop + 7, bill.gstEnabled ? colW[3] : colW[2], 'center', true); currentX += bill.gstEnabled ? colW[3] : colW[2];
        drawCell('Rate (Rs)', currentX, tableTop + 7, bill.gstEnabled ? colW[4] : colW[3], 'right', true); currentX += bill.gstEnabled ? colW[4] : colW[3];
        drawCell('Amount (Rs)', currentX, tableTop + 7, bill.gstEnabled ? colW[5] : colW[4], 'right', true);
        doc.restore();

        let rowY = tableTop + 20;
        const rowHeight = 22;
        const items = bill.items || [];

        items.forEach((item, index) => {
            if (rowY > 700) { doc.addPage(); rowY = 50; } // pagination
            
            // Background row
            doc.rect(tableLeft, rowY, 515, rowHeight).fill(index % 2 === 0 ? '#ffffff' : '#f9fafb');
            // Bottom border
            doc.moveTo(tableLeft, rowY + rowHeight).lineTo(tableLeft + 515, rowY + rowHeight).strokeColor('#e5e7eb').stroke();
            
            doc.fontSize(9).fillColor('#1a1a2e');
            
            let cx = tableLeft;
            formatText(String(index + 1), false);
            drawCell(String(index + 1), cx, rowY + 7, colW[0], 'center'); cx += colW[0];
            
            const productName = (item.productId && item.productId.name) ? item.productId.name : 'Product';
            formatText(productName, false);
            drawCell(productName, cx, rowY + 7, colW[1], 'left'); cx += colW[1];
            
            if (bill.gstEnabled) {
                const hsn = item.hsn || (item.productId && item.productId.hsn) || '-';
                formatText(hsn, false);
                drawCell(hsn, cx, rowY + 7, colW[2], 'center'); cx += colW[2];
            }
            
            formatText(String(item.quantity || 0), false);
            drawCell(String(item.quantity || 0), cx, rowY + 7, bill.gstEnabled ? colW[3] : colW[2], 'center'); cx += bill.gstEnabled ? colW[3] : colW[2];
            
            const rateStr = fmt(item.price);
            formatText(rateStr, false);
            drawCell(rateStr, cx, rowY + 7, bill.gstEnabled ? colW[4] : colW[3], 'right'); cx += bill.gstEnabled ? colW[4] : colW[3];
            
            const totalStr = fmt(item.total);
            formatText(totalStr, false);
            drawCell(totalStr, cx, rowY + 7, bill.gstEnabled ? colW[5] : colW[4], 'right');
            
            rowY += rowHeight;
        });

        doc.y = rowY + 16;

        // --- GST / Interest Notice ---
        if ((bill.gstEnabled && bill.gstAmount > 0) || (bill.interestRate > 0 && bill.interestAmount > 0)) {
            if (doc.y > 650) doc.addPage();
            
            if (bill.gstEnabled && bill.gstAmount > 0) {
                const bY = doc.y;
                drawCalloutBox(40, bY, 260, 60, '#f0f9ff', '#0ea5e9');
                
                formatText('GST SUMMARY', true);
                doc.fontSize(8).fillColor('#0c4a6e').text(`GST SUMMARY — ${bill.gstPercent}% (CGST ${bill.gstPercent / 2}% + SGST ${bill.gstPercent / 2}%)`, 50, bY + 10);
                
                formatText(`Taxable Value`, false); doc.fontSize(8).fillColor('#0369a1').text(`Taxable Value`, 50, bY + 24);
                formatText(`Rs. ${fmt(bill.subtotal)}`, true); doc.text(`Rs. ${fmt(bill.subtotal)}`, 200, bY + 24, { width: 90, align: 'right' });
                
                formatText(`CGST @ ${bill.gstPercent / 2}%`, false); doc.fillColor('#0369a1').text(`CGST @ ${bill.gstPercent / 2}%`, 50, bY + 36);
                formatText(`Rs. ${fmt(bill.gstAmount / 2)}`, true); doc.text(`Rs. ${fmt(bill.gstAmount / 2)}`, 200, bY + 36, { width: 90, align: 'right' });

                formatText(`SGST @ ${bill.gstPercent / 2}%`, false); doc.fillColor('#0369a1').text(`SGST @ ${bill.gstPercent / 2}%`, 50, bY + 48);
                formatText(`Rs. ${fmt(bill.gstAmount / 2)}`, true); doc.text(`Rs. ${fmt(bill.gstAmount / 2)}`, 200, bY + 48, { width: 90, align: 'right' });
                doc.y = bY + 72;
            }

            if (bill.interestRate > 0 && bill.interestAmount > 0) {
                const iY = doc.y;
                drawCalloutBox(40, iY, 515, 35, '#fff7ed', '#f59e0b');
                formatText(`CREDIT INTEREST NOTICE`, true);
                doc.fontSize(8).fillColor('#92400e').text(`CREDIT INTEREST NOTICE`, 50, iY + 8);
                const dueText = bill.dueDate ? `  Due Date: ${new Date(bill.dueDate).toLocaleDateString('en-IN')}.` : '';
                formatText(`Interest @ ${bill.interestRate}% per month`, false);
                doc.fillColor('#b45309').text(`Interest @ ${bill.interestRate}% per month on credit amount of Rs. ${bill.subtotal}.${dueText} Interest accrued: Rs. ${bill.interestAmount} (informational — payable on recovery).`, 50, iY + 20);
                doc.y += 20;
            }
        }

        // --- Totals Box ---
        const totalBoxY = rowY + 16;
        const tbLeft = 320;
        const tbHeight = bill.gstEnabled ? 80 : 60;
        
        doc.save();
        doc.roundedRect(tbLeft, totalBoxY, 235, tbHeight, 6).clip();
        doc.rect(tbLeft, totalBoxY, 235, tbHeight).fill('#f9fafb'); // Background
        doc.roundedRect(tbLeft, totalBoxY, 235, tbHeight, 6).strokeColor('#e5e7eb').lineWidth(1).stroke(); // Border
        
        formatText('Subtotal', false);
        doc.fontSize(9).fillColor('#6b7280').text('Subtotal', tbLeft + 12, totalBoxY + 8);
        formatText(`Rs. ${fmt(bill.subtotal)}`, true);
        doc.fillColor('#1a1a2e').text(`Rs. ${fmt(bill.subtotal)}`, tbLeft + 140, totalBoxY + 8, { width: 80, align: 'right' });
        
        // border line
        doc.moveTo(tbLeft, totalBoxY + 24).lineTo(tbLeft + 235, totalBoxY + 24).strokeColor('#e5e7eb').stroke();

        let grandY = totalBoxY + 24;
        if (bill.gstEnabled) {
            formatText(`GST (${bill.gstPercent}%)`, false);
            doc.fillColor('#6b7280').text(`GST (${bill.gstPercent}%)`, tbLeft + 12, grandY + 8);
            formatText(`Rs. ${fmt(bill.gstAmount)}`, true);
            doc.fillColor('#1a1a2e').text(`Rs. ${fmt(bill.gstAmount)}`, tbLeft + 140, grandY + 8, { width: 80, align: 'right' });
            doc.moveTo(tbLeft, grandY + 24).lineTo(tbLeft + 235, grandY + 24).strokeColor('#e5e7eb').stroke();
            grandY += 24;
        } else {
            formatText(`Tax`, false);
            doc.fillColor('#6b7280').text(`Tax`, tbLeft + 12, grandY + 8);
            formatText(`Exempt`, true);
            doc.fillColor('#059669').text(`Exempt`, tbLeft + 140, grandY + 8, { width: 80, align: 'right' });
            doc.moveTo(tbLeft, grandY + 24).lineTo(tbLeft + 235, grandY + 24).strokeColor('#e5e7eb').stroke();
            grandY += 24; // 48
        }

        // Grand Total Row Background (Primary)
        doc.rect(tbLeft, grandY, 235, tbHeight - (grandY - totalBoxY)).fill(primary);
        formatText('GRAND TOTAL', true);
        doc.fontSize(10).fillColor('#ffffff').text('GRAND TOTAL', tbLeft + 12, grandY + 8);
        formatText(`Rs. ${fmt(bill.totalAmount)}`, true);
        doc.text(`Rs. ${fmt(bill.totalAmount)}`, tbLeft + 120, grandY + 8, { width: 100, align: 'right' });
        
        doc.restore();

        doc.y = Math.max(doc.y, grandY + 60);

        // --- Footer ---
        if (doc.y > 750) doc.addPage();
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e5e7eb').stroke();
        doc.moveDown(1);
        
        formatText(shopName, false);
        doc.fontSize(8).fillColor('#6b7280').text(shopName, 40, doc.y);
        formatText(shopAddress, false); doc.text(shopAddress, 40, doc.y + 12);
        if (shopGSTIN) { formatText(`GSTIN: ${shopGSTIN}`, false); doc.text(`GSTIN: ${shopGSTIN}`, 40, doc.y + 24); }

        doc.moveTo(455, doc.y - 12).lineTo(555, doc.y - 12).stroke('#e5e7eb');
        formatText('Authorised Signatory', false);
        doc.text('Authorised Signatory', 455, doc.y + 6, { width: 100, align: 'center' });

        doc.moveDown(4);
        formatText('This is a computer-generated invoice. No physical signature required.', false);
        doc.fontSize(7).text('This is a computer-generated invoice. No physical signature required.', { align: 'center' });

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
