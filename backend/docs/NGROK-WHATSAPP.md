# Testing WhatsApp PDF with Ngrok

WhatsApp (Chatmitra) needs a **public HTTPS URL** to download the bill PDF. Use ngrok to expose your local backend.

---

## 1. Get a free ngrok account and authtoken (one-time)

Ngrok requires a verified account:

1. Sign up: **https://dashboard.ngrok.com/signup**
2. Get your authtoken: **https://dashboard.ngrok.com/get-started/your-authtoken**
3. Install the token (run once):

```bash
cd backend
npx ngrok config add-authtoken YOUR_AUTHTOKEN
```

Replace `YOUR_AUTHTOKEN` with the token from the ngrok dashboard.

---

## 2. Start your backend

```bash
cd backend && npm run dev
```

Server runs at `http://localhost:5002` (or your `PORT` in `.env`).

---

## 3. Start Ngrok

In a **new terminal** (from the project):

```bash
cd backend
npm run ngrok
```

Or: `npx ngrok http 5002` (use the same port as your backend).

You’ll see something like:

```
Forwarding   https://8a3d-2401-4900.ngrok-free.app -> http://localhost:5002
```

Copy the **HTTPS** URL (e.g. `https://8a3d-2401-4900.ngrok-free.app`).

---

## 4. Set PUBLIC_APP_URL in .env

In `backend/.env`:

```env
PUBLIC_APP_URL=https://8a3d-2401-4900.ngrok-free.app
```

(Use your actual ngrok URL; no trailing slash.)

Restart the backend so it picks up the new value.

---

## 5. How it works

- When you **send a bill via WhatsApp**, the backend:
  1. Generates the PDF
  2. Saves it to `backend/bills/<billId>.pdf`
  3. Sends Chatmitra this URL: `https://your-ngrok-url/bills/<billId>.pdf`

- Express serves the `bills/` folder at `/bills`, so the PDF is available at:
  `https://your-ngrok-url/bills/<billId>.pdf`

- Chatmitra fetches that URL (ngrok forwards to your local server) and attaches the PDF to the WhatsApp message.

---

## 6. Test the PDF link

Before sending to WhatsApp, open in a browser:

```
https://your-ngrok-url/bills/<billId>.pdf
```

Replace `<billId>` with a real bill ID (e.g. from the app after creating a bill). You should see the invoice PDF.

---

## 7. Optional: keep .env in sync

Each time you restart ngrok you may get a **new URL** (on free tier). Update `PUBLIC_APP_URL` in `.env` and restart the backend so WhatsApp still uses the correct base URL.
