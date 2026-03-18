# 🥦 FreshScan — MERN Stack

Vegetable & fruit freshness detection web app built with MongoDB, Express, React (Vite), and Node.js.

---

## Project Structure

```
freshscan/
├── server/                  # Express + Node.js backend
│   ├── config/db.js         # MongoDB connection
│   ├── controllers/         # Auth, Scan, Vendor logic
│   ├── middleware/auth.js   # JWT protect middleware
│   ├── models/              # Vendor + Scan Mongoose schemas
│   └── routes/              # /api/auth, /api/scans, /api/vendor
├── client/                  # React + Vite frontend
│   └── src/
│       ├── api/axios.js     # Axios instance with JWT interceptor
│       ├── context/         # AuthContext (JWT state)
│       ├── pages/           # Auth, Scan, Dashboard, History
│       └── components/      # Layout (topbar + nav)
├── .env.example
└── package.json
```

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo>
cd freshscan

# Install server deps
npm install

# Install client deps
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/freshscan   # or your Atlas URI
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
AI_BASE_URL=http://localhost:8000               # your AI model server
AI_PREDICT_ENDPOINT=/predict
```

### 3. Run in development

```bash
# From root — starts both server (nodemon) and React (Vite) concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:5000
- API requests from frontend are proxied to backend via Vite proxy

### 4. Build for production

```bash
npm run build          # builds React into client/dist
NODE_ENV=production npm start   # Express serves React + API on port 5000
```

---

## API Endpoints

### Auth
| Method | Endpoint           | Description         | Auth |
|--------|--------------------|---------------------|------|
| POST   | /api/auth/signup   | Register vendor     | No   |
| POST   | /api/auth/login    | Login               | No   |
| GET    | /api/auth/me       | Current vendor      | Yes  |

### Scans
| Method | Endpoint              | Description                   | Auth |
|--------|-----------------------|-------------------------------|------|
| POST   | /api/scans/predict    | Upload image → AI → save      | Yes  |
| GET    | /api/scans            | Scan history (paginated)      | Yes  |
| GET    | /api/scans/stats      | Dashboard stats & charts      | Yes  |
| DELETE | /api/scans/:id        | Delete a scan                 | Yes  |

### Vendor
| Method | Endpoint              | Description    | Auth |
|--------|-----------------------|----------------|------|
| GET    | /api/vendor/profile   | Get profile    | Yes  |
| PATCH  | /api/vendor/profile   | Update name    | Yes  |

---

## MongoDB Collections

### vendors
```json
{
  "_id": "ObjectId",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "<bcrypt hash>",
  "vendorId": "VND-AB3X9K2P",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### scans
```json
{
  "_id": "ObjectId",
  "vendor": "ObjectId (ref: Vendor)",
  "vendorId": "VND-AB3X9K2P",
  "fruit": "Apple",
  "quality": "Fresh",
  "isFresh": true,
  "imageOriginalName": "photo.jpg",
  "createdAt": "2025-01-01T12:00:00.000Z"
}
```

---

## AI Model Integration

FreshScan proxies image uploads to your AI model:

- **Endpoint**: `POST ${AI_BASE_URL}/predict`
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (image)
- **Response**: `{ "fruit": "Apple", "quality": "Fresh" }`

Update `AI_BASE_URL` and `AI_PREDICT_ENDPOINT` in `.env` to point to your model server.
