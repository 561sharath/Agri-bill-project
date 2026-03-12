# 🌾 AgriBill — Fertilizer Shop Billing & Farmer Credit Management System

A full-stack SaaS-style web application built for fertilizer shop owners to manage billing, farmer credit, inventory, payments, and analytics — all in one place.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Application Flow](#-application-flow)
- [Getting Started (Local Setup)](#-getting-started-local-setup)
- [Environment Variables](#-environment-variables)
- [Default Login Credentials](#-default-login-credentials)
- [API Reference](#-api-reference)
- [Key Features](#-key-features)
- [Docker Setup (Optional)](#-docker-setup-optional)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

**AgriBill** helps fertilizer shop owners:
- 📄 Create bills with smart farmer lookup and product search
- 🧑‍🌾 Manage a farmer directory with credit balances
- 📦 Track inventory stock levels and get low-stock alerts
- 💰 Record credit payments from farmers
- 📊 View monthly sales and analytics reports
- 📑 Download bills as high-quality PDF files

---

## 🛠 Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| **Frontend** | React 18 (Vite), React Router, Axios, Recharts, TailwindCSS, React Hook Form |
| **Backend**  | Node.js, Express.js (ES Modules)                |
| **Database** | MongoDB with Mongoose ODM                       |
| **Auth**     | JWT (JSON Web Tokens) + bcryptjs                |
| **PDF**      | Puppeteer (headless Chrome)                     |
| **Dev Tools**| Nodemon, Vite HMR                               |

---

## 📁 Project Structure

```
agribill-app/
├── backend/                      # Express API server
│   ├── config/
│   │   └── db.js                 # MongoDB connection + admin user seeding
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── farmerController.js   # Farmers CRUD + search + pagination
│   │   ├── billController.js     # Bill creation + PDF generation
│   │   ├── productController.js  # Inventory CRUD + pagination
│   │   ├── paymentController.js  # Payment recording
│   │   ├── dashboardController.js
│   │   └── reportController.js
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT protect middleware
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Farmer.js             # Indexed: mobile, name (text)
│   │   ├── Bill.js               # Indexed: createdAt, paymentType, farmerId
│   │   ├── Product.js            # Indexed: name, brand
│   │   └── Payment.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── farmerRoutes.js
│   │   ├── billRoutes.js
│   │   ├── productRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── reportRoutes.js
│   │   └── dashboardRoutes.js
│   ├── services/
│   │   ├── dashboardService.js   # Aggregation pipeline for dashboard metrics
│   │   └── pdfService.js         # Puppeteer HTML-to-PDF generation
│   ├── .env                      # ⚠️ NOT committed to git
│   ├── .env.example              # Template for env setup
│   └── server.js                 # Express app entry point (port 5000)
│
├── frontend/                     # React + Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Collapsible navigation sidebar
│   │   │   ├── Navbar.jsx        # Top bar with dark mode toggle
│   │   │   ├── FarmerTable.jsx   # Reusable farmer listing table
│   │   │   ├── ProductTable.jsx  # Reusable product/inventory table
│   │   │   ├── Pagination.jsx    # Reusable pagination component
│   │   │   ├── DashboardCards.jsx
│   │   │   └── Charts.jsx        # Recharts wrappers (Bar, Area, Line, Pie)
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global auth state + JWT management
│   │   ├── hooks/
│   │   │   ├── useDashboardData.js
│   │   │   └── useFetch.js
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx     # KPI cards + charts + pending ledger
│   │   │   ├── CreateBill.jsx    # Smart billing form with farmer autocomplete
│   │   │   ├── Farmers.jsx       # Directory with search + pagination
│   │   │   ├── Inventory.jsx     # Stock management with CRUD
│   │   │   ├── CreditLedger.jsx  # Farmers with outstanding balances
│   │   │   ├── Payments.jsx      # Payment recording + history
│   │   │   ├── Reports.jsx       # Monthly analytics + CSV export
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   └── api.js            # Axios instance + all API call functions
│   │   └── utils/
│   │       └── formatCurrency.js
│   └── vite.config.js            # Proxy: /api → http://localhost:5000
│
├── docker-compose.yml            # Docker setup (MongoDB + Backend + Frontend)
└── .gitignore
```

---

## 🔄 Application Flow

### 1. Authentication
```
User → Login Page → POST /api/auth/login
     ← JWT Token stored in localStorage
     → All subsequent requests include: Authorization: Bearer <token>
```

### 2. Dashboard
```
Authenticated User → GET /api/dashboard/summary
                   ← Single optimized aggregation response with:
                      - Today's sales & percentage change
                      - Total credit given
                      - Total farmer count
                      - Pending credit this month
                      - Monthly & weekly revenue data
                      - Low stock product alerts
                      - Pending credit ledger entries
```

### 3. Creating a Bill
```
User types farmer name/mobile
→ GET /api/farmers/search?q=<query>     (autocomplete dropdown)

User selects or creates farmer
→ POST /api/farmers                     (if new farmer)

User adds products using the product selector
→ GET /api/products                     (search & select products)

User clicks "Generate Bill"
→ POST /api/bills                       (stores bill in DB, returns bill ID)
→ GET /api/bills/:id/pdf                (Puppeteer generates PDF blob)
← PDF downloads automatically in the browser
```

### 4. Farmer Management
```
GET /api/farmers?page=1&limit=10&search=<query>
    → Server-side search + pagination
    → Full-text search on name, phone lookup on mobile

POST /api/farmers      → Create new farmer
DELETE /api/farmers/:id → Delete farmer (also cascades logically)
```

### 5. Payment Recording
```
User selects farmer from dropdown (only farmers with credit balance > 0)
→ POST /api/payments { farmerId, amount, method, date, notes }
← Farmer's creditBalance is automatically reduced in DB
← Payment record is stored in Payment collection
```

### 6. PDF Generation (Internal Flow)
```
Backend receives GET /api/bills/:id/pdf
→ Fetches bill + farmer + items from MongoDB
→ Builds an HTML string (receipt template)
→ Launches Puppeteer (headless Chrome)
→ Renders HTML → captures PDF buffer
→ Sends buffer as application/pdf to frontend
← Frontend triggers browser download
```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites

Make sure you have the following installed:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| npm | v9+ | Included with Node |
| MongoDB Community Server | v6+ | https://www.mongodb.com/try/download/community |
| Git | Any | https://git-scm.com |

> **Tip:** MongoDB must be running locally on `mongodb://127.0.0.1:27017`. You can also use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster.

---

### Step 1 — Clone the Repository

```bash
git clone <your-repo-url>
cd agribill-app
```

---

### Step 2 — Set Up the Backend

```bash
cd backend
npm install
```

Create your `.env` file from the template:

```bash
cp .env.example .env
```

> Edit `.env` and set your values (see [Environment Variables](#-environment-variables) section below).

Start the backend dev server:

```bash
npm run dev
```

✅ Backend will be running at: **http://localhost:5000**

On first run, the system will automatically seed a default admin user if the database is empty.

---

### Step 3 — Set Up the Frontend

Open a **new terminal window** (keep backend running):

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend will be running at: **http://localhost:5173**

> The Vite dev server is pre-configured to proxy all `/api` requests to `http://localhost:5000`, so no CORS issues in development.

---

### Step 4 — Open the App

Navigate to: **http://localhost:5173**

You'll be redirected to the login page. Use the default credentials below.

---

## 🔐 Default Login Credentials

When the server starts with an empty database, it **automatically creates** an admin account:

| Field    | Value                |
|----------|----------------------|
| Email    | `admin@agribill.com` |
| Password | `123456`             |

> ⚠️ **Change these credentials immediately in a production environment!**

---

## 🌍 Environment Variables

The backend requires a `.env` file inside the `backend/` directory.

```env
# Server
NODE_ENV=development
PORT=5000

# Database — Local MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/agribill

# Database — MongoDB Atlas (use this instead for cloud)
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/agribill?retryWrites=true&w=majority

# JWT — Use a long, random secret in production
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

### How to get a MongoDB Atlas URI:
1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free M0 cluster
3. Click **Connect → Drivers → Node.js**
4. Copy the connection string and paste it as `MONGO_URI`
5. Replace `<password>` with your cluster password

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login and receive JWT | ❌ |
| POST | `/api/auth/register` | Register new user | ❌ |
| GET  | `/api/auth/me` | Get logged-in user | ✅ |

### Dashboard
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dashboard/summary` | All KPI data in one call | ✅ |

### Farmers
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/farmers?page=1&limit=10&search=` | List with pagination + search | ✅ |
| GET | `/api/farmers/search?q=ramesh` | Autocomplete search | ✅ |
| GET | `/api/farmers/:id` | Get single farmer | ✅ |
| POST | `/api/farmers` | Create farmer | ✅ |
| PUT | `/api/farmers/:id` | Update farmer | ✅ |
| DELETE | `/api/farmers/:id` | Delete farmer | ✅ |

### Products / Inventory
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/products?page=1&limit=10` | List with pagination | ✅ |
| GET | `/api/products/:id` | Single product | ✅ |
| POST | `/api/products` | Create product | ✅ |
| PUT | `/api/products/:id` | Update product | ✅ |
| DELETE | `/api/products/:id` | Delete product | ✅ |

### Bills
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/bills?page=1&limit=10` | List all bills | ✅ |
| GET | `/api/bills/:id` | Single bill | ✅ |
| POST | `/api/bills` | Create bill | ✅ |
| GET | `/api/bills/:id/pdf` | Download PDF for a bill | ✅ |

### Payments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/payments` | All payment history | ✅ |
| POST | `/api/payments` | Record a payment | ✅ |
| GET | `/api/payments/farmer/:farmerId` | Payments by farmer | ✅ |

### Reports
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/reports/monthly-sales` | Monthly sales vs credit | ✅ |
| GET | `/api/reports/top-products` | Top 5 selling products | ✅ |
| GET | `/api/reports/credit` | Farmers with pending credit | ✅ |
| GET | `/api/reports/export/:type` | CSV export | ✅ |

---

## ✨ Key Features

### 🧾 Smart Bill Creation
- Search for existing farmers by **name or mobile number** with autocomplete
- Create a **new farmer on the fly** if they don't exist in the system
- Add multiple products with quantity, price auto-fill, and running total
- Choose **cash or credit** payment
- **Download the bill as a PDF** with one click (uses Puppeteer)

### 🧑‍🌾 Farmer Management
- Full directory with **server-side search and pagination**
- Tracks individual **credit balance** per farmer
- Quick-action buttons: View, Edit, Transactions
- Stats bar: Total Farmers | Pending Credit | Clear Accounts

### 📦 Inventory Management
- Full **CRUD** for fertilizer products
- **Low stock alerts** (≤ 20 units) and **critical alerts** (≤ 5 units)
- Real-time banner warning when stock is critically low
- Paginated product table with Edit/Delete actions

### 💸 Payment Recording
- Select only farmers who have an **outstanding credit balance**
- Supports Cash, UPI, Bank Transfer, Cheque methods
- Automatically **reduces farmer's credit balance** upon saving
- Full payment history sorted by date

### 📊 Reports & Analytics
- **Monthly Sales vs Credit** line chart
- **Top Products by Revenue** donut chart (Recharts)
- Monthly performance table with collection efficiency percentage bar
- **CSV export** of monthly summary data

### 🌙 Dark Mode
- Toggle available in the top navbar
- System preference is detected automatically on first load

---

## 🐳 Docker Setup (Optional)

If you have Docker installed, you can run the entire stack with one command:

```bash
docker-compose up --build
```

This will start:
- **MongoDB** on port `27017`
- **Backend API** on port `5000`
- **Frontend** (Nginx-served build) on port `80`

Access the app at: **http://localhost**

> Note: Make sure ports 27017, 5000, and 80 are free before running.

---

## 🔧 Troubleshooting

### ❌ "Cannot connect to MongoDB"
- Make sure MongoDB is running: `mongod --dbpath /data/db`
- Check your `MONGO_URI` in the `.env` file
- If using Atlas, whitelist your IP address in the Atlas dashboard

### ❌ Login fails with "Invalid credentials"
- The admin user is seeded **only on first run** when the DB is empty
- If you've run the app before, the admin may not exist. Connect to MongoDB and check:
  ```bash
  mongosh agribill
  db.users.find()
  ```
- If empty, **drop the database and restart the backend** to trigger seeding:
  ```bash
  mongosh agribill --eval "db.dropDatabase()"
  # then restart: npm run dev
  ```
- Default credentials: `admin@agribill.com` / `123456`

### ❌ PDF download doesn't work
- Puppeteer needs **Chromium** to be installed. On first use it downloads it automatically.
- If it fails on Windows, run: `npx puppeteer browsers install chrome`
- Make sure you have enough disk space for the ~170MB Chromium binary.

### ❌ Frontend shows "Failed to fetch" errors
- Ensure the **backend is running** on port `5000`
- The Vite dev server proxies `/api` → `http://localhost:5000`. Check `vite.config.js` if you changed ports.

### ❌ CORS errors in production
- In `backend/server.js`, update the CORS config to allow your frontend domain:
  ```js
  app.use(cors({ origin: 'https://your-frontend-domain.com' }));
  ```

### ❌ Port already in use
- Backend: Change `PORT` in `.env`
- Frontend: Edit `vite.config.js` `server.port`

---

## 📜 Scripts Summary

### Backend (`/backend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start in production mode |

### Frontend (`/frontend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

---

## 🗺 Roadmap (Planned Features)

- [ ] Farmer Detail / Transaction Ledger page
- [ ] Edit Farmer profile page
- [ ] Bill list view with search and filters
- [ ] WhatsApp bill sharing (via API)
- [ ] Role-based access (Admin, Staff)
- [ ] Multi-shop / multi-user support
- [ ] SMS / notification reminders for overdue credit

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

> Built with ❤️ for Indian fertilizer shop owners. Simplifying agricultural commerce one bill at a time.
