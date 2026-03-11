import puppeteer from 'puppeteer';

export const generatePDFBuffer = async (bill) => {
    // Generate simple HTML template for invoice
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Invoice #${bill._id}</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #2f7f33; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #2f7f33; font-size: 28px; }
            .header p { margin: 5px 0; color: #666; }
            .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .details div { width: 48%; }
            .details h3 { margin-top: 0; color: #2f7f33; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f6f8f6; color: #555; }
            td.right, th.right { text-align: right; }
            .total-row { font-weight: bold; background-color: #f0faf0; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #888; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Green Harvest Fertilisers</h1>
            <p>123 Main Bazaar, Guntur, AP - 522001</p>
            <p>Phone: 98765 43210</p>
        </div>
        
        <div class="details">
            <div>
                <h3>Bill To:</h3>
                <p><strong>${bill.farmerId.name}</strong></p>
                <p>Mobile: ${bill.farmerId.mobile}</p>
                <p>Village: ${bill.farmerId.village}</p>
            </div>
            <div style="text-align: right;">
                <h3>Invoice Details:</h3>
                <p><strong>Invoice No:</strong> ${bill._id.toString().substring(18)}</p>
                <p><strong>Date:</strong> ${new Date(bill.createdAt).toLocaleDateString('en-IN')}</p>
                <p><strong>Payment Type:</strong> ${bill.paymentType.toUpperCase()}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>SN</th>
                    <th>Product Description</th>
                    <th class="right">Qty</th>
                    <th class="right">Rate (₹)</th>
                    <th class="right">Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${bill.items.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.productId.name}</td>
                    <td class="right">${item.quantity}</td>
                    <td class="right">${item.price.toFixed(2)}</td>
                    <td class="right">${item.total.toFixed(2)}</td>
                </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="4" class="right">Grand Total:</td>
                    <td class="right text-primary">₹${bill.totalAmount.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Computer generated invoice. No signature required.</p>
        </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new'
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    await browser.close();

    return pdfBuffer;
};
