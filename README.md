# AgriBill – Fertilizer Shop Billing & Farmer Credit Mgmt

A production-ready full-stack application for fertilizer shops to manage billing, inventory, and farmer credit tracking.

## Architecture & Tech Stack

This project uses a modern component-based microservice architecture.

**Frontend:**
- **React 18 + Vite** for fast HMR and optimized builds
- **Tailwind CSS (Vanilla)** for complete styling control following the Stitch "UI Pro Max" design intelligence
- **React Router v6** for nested, declarative routing
- **React Hook Form** for robust, performant forms
- **Recharts** for data visualization
- **Axios** with interceptors for JWT auth management

**Backend:**
- **Node.js + Express** serving RESTful APIs
- **MongoDB + Mongoose** for flexible schema management
- **Puppeteer** for high-fidelity HTML-to-PDF bill generation
- **JWT + bcrypt** for stateless secure authentication
- Clean controller/route/service separation

**Core Philosophy:**
The architecture intentionally isolates business logic (Controllers) from network mapping (Routes) and data mapping (Models). The frontend leverages Context API for global auth state and a unified `useFetch` hook to handle asynchronous boilerplate smoothly.

## Features Built

1. **Dashboard Overview**: KPI cards with trend indicators, Recharts-based revenue tracking, and a real-time ledger preview.
2. **Dynamic POS Billing**: Complex form management with auto-calculations across multiple product rows, linking inventory to sales.
3. **Credit Management**: Dedicated Credit Ledger filtering farmers by days old, calculating outstanding balances automatically.
4. **Inventory Tracking**: Stock level monitoring with status indicators (Low, Critical) and stock-out prevention.
5. **Farmer CRM**: Profile management, transaction history tracking for both payments and bills.
6. **PDF Generation**: Backend Puppeteer service rendering beautifully formatted A4 invoices.

## Running Locally

**Prerequisites:** Node 18+, MongoDB installed/running

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Make sure MongoDB is running on localhost:27017 or set MONGO_URI in .env
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Docker Compose**
   ```bash
   docker-compose up --build
   ```

## Design Notes

This project accurately replicated the provided Stitch project layout (#3945642958179782143):
- Minimalist aesthetics, focus on utility.
- Custom Tailwind tokens bridging the design system.
- Focus states and proper touch target interactions implemented per internal UI UX heuristics.
