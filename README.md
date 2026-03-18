# Agri-Bill: Basaveshwara Trading Company Invoice Manager

Agri-Bill is a robust, full-stack POS and invoicing application tailored specifically for agricultural retail businesses. It allows shop owners to easily manage inventory, track farmer credit balances, generate aesthetically pleasing PDF bills, and instantly send automated WhatsApp invoices and payment reminders to farmers.

## Core Features

- **Dashboard & Analytics:** Real-time metrics on total revenue, pending credit, top products, and recent transactions.
- **Inventory Management:** Add, edit, and categorize fertilizer and agricultural products with auto-calculated HSN and Tax components.
- **Farmer Ledger:** Comprehensive tracking of farmer profiles, their purchase history, and outstanding credit balances.
- **Advanced Invoicing:** Fluid, beautiful PDF invoice generation supporting both cash and credit transactions. Includes automated GST calculation tables.
- **WhatsApp Integration:** 1-click WhatsApp messaging using official Chatmitra templates for sending Bills, Payment Receipts, and Credit Reminders.
- **Lazy Loading & Optimizations:** Code-split modals and highly optimized React components for lightning-fast loading speeds on mobile networks.

---

## Tech Stack

### Frontend
- **React 18** (Vite)
- **TailwindCSS** for rapid, responsive, and beautiful styling
- **React Hook Form & Yup** for bulletproof form validation
- **React-PDF / Renderer** for viewing browser-based PDF documents
- **Lucide-React** & Material Symbols for iconography
- **Recharts** for interactive dashboard graphs

### Backend
- **Node.js & Express** 
- **MongoDB & Mongoose** for scalable NoSQL database storage
- **PDFKit** for generating perfectly aligned, pixel-perfect WhatsApp PDF attachments directly from Node.
- **JWT (JSON Web Tokens)** for secure authentication
- **Ngrok** integrated for exposing local servers to WhatsApp Webhooks

---

## Quick Start Guide

### Prerequisites
Make sure you have Node.js (v18+) and MongoDB installed or a MongoDB Atlas URI ready.

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your Environment Variables:
   Open or create `backend/.env` and add:
   ```env
   NODE_ENV=development
   PORT=5002
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   
   SHOP_NAME="Basaveshwara Trading Company"
   UPI_ID="your_upi_id@bank"
   PUBLIC_APP_URL="https://your-ngrok-url.ngrok-free.dev"
   CHATMITRA_API_TOKEN="your_chatmitra_token_here"
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the application at `http://localhost:5175`.

---

## How to Use the Application

### 1. Managing Inventory
Navigate to the **Inventory** tab. Click "Add Product" to create new agricultural stock. You must fill out the Product Name, Category, HSN Code, Stock Quantity, Rate, and GST %.

### 2. Creating a Bill
1. Go to the **Create Bill** tab.
2. Search for an existing Farmer by mobile number or name. If they are new, click the `+` to quick-add their profile.
3. Select products from the searchable dropdown. Duplicates are automatically prevented.
4. Enter the required quantities. The app will warn you if you exceed available stock.
5. Toggle **GST** on or off depending on the transaction type.
6. Select the Payment Type (Cash, Credit, UPI).
7. Click **Preview & Generate Bill**.

### 3. WhatsApp Integration
Once a bill is generated, click the **Send WhatsApp** button.
The backend will automatically:
- Generate a pixel-perfect PDF using `pdfKit`.
- Provide a public URL to the PDF using your `ngrok` link.
- Send an approved WhatsApp Meta template message to the farmer's mobile number containing the PDF document, total amount, and your UPI payment link.

### 4. Recording Payments
When a farmer comes in to clear their pending credit manually:
1. Go to the **Payments** tab.
2. Select the farmer from the dropdown. 
3. The system will display their outstanding balance.
4. Enter the amount they are paying and click Save.
5. Click **Send WhatsApp Receipt** to officially notify them of their cleared or reduced balance with a dynamically generated PDF receipt.

---

## Built with ❤️ for Basaveshwara Trading
*Note: Ensure your `ngrok` url is correctly updated in `.env` every time your session restarts to guarantee WhatsApp PDF attachments work smoothly.*
