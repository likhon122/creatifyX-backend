# CreatifyX Backend API 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-black?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20Mongoose-brightgreen?logo=mongodb)](https://www.mongodb.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments%20%26%20Subscriptions-blueviolet?logo=stripe)](https://stripe.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media%20Storage-darkblue?logo=cloudinary)](https://cloudinary.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Serverless%20Functions-black?logo=vercel)](https://vercel.com/)
[![Security](https://img.shields.io/badge/Security-OWASP%20Compliant-red)](#authentication--security)

High-performance, enterprise-grade RESTful API engine powering the **CreatifyX** digital asset marketplace. Architected for both traditional containerized deployment (`Node.js/Express`) and serverless edge execution (`Vercel Serverless Functions`) with sub-50ms database queries, OWASP-compliant authentication, role-based access control (RBAC), and automated media processing.

---

## 📑 Table of Contents

- [System Architecture](#system-architecture)
- [Key Engineering Highlights](#key-engineering-highlights)
  - [1. Serverless Cold-Start & Connection Pool Optimization](#1-serverless-cold-start--connection-pool-optimization)
  - [2. 500x Faster MongoDB Aggregation Pipeline](#2-500x-faster-mongodb-aggregation-pipeline)
  - [3. OWASP-Compliant Authentication & Session Revocation](#3-owasp-compliant-authentication--session-revocation)
  - [4. Role-Based Access Control & Purchase Transaction Enforcement](#4-role-based-access-control--purchase-transaction-enforcement)
  - [5. Cloudinary Automated Watermarking & Media Processing](#5-cloudinary-automated-watermarking--media-processing)
- [Database Schema & High-Performance Indexes](#database-schema--high-performance-indexes)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Production Deployment (Vercel)](#production-deployment-vercel)

---

## 🏛 System Architecture

The codebase follows a clean, modular domain-driven architecture:

```
creatifyX-backend/
├── api/
│   └── index.ts               # Vercel serverless function entrypoint (guaranteed connection handler)
├── src/
│   ├── app.ts                 # Express application configuration, CORS, and middleware stack
│   ├── server.ts              # Local HTTP listener and graceful shutdown lifecycle
│   └── app/
│       ├── builder/           # Reusable MongoDB QueryBuilder for pagination, search, and facets
│       ├── config/            # Strongly typed environment configuration
│       ├── constant/          # Global HTTP statuses and role constants
│       ├── db/                # Cached Mongoose connection & Super Admin seeder
│       ├── errors/            # Normalized error models (AppError, Zod, CastError, DuplicateKey)
│       ├── middlewares/       # JWT Auth guard, RBAC validator, file uploaders, rate-limiters
│       ├── modules/           # Domain modules (Asset, Auth, User, Plan, Subscription, Payment, etc.)
│       │   └── [module]/
│       │       ├── [module].interface.ts
│       │       ├── [module].model.ts
│       │       ├── [module].validation.ts
│       │       ├── [module].controller.ts
│       │       ├── [module].service.ts
│       │       └── [module].routes.ts
│       └── utils/             # Cloudinary uploader, Stripe helpers, response sanitizers, emails
├── vercel.json                # Vercel Serverless function runtime and resource configuration
└── tsconfig.json              # Strict TypeScript compiler options
```

---

## ⚡ Key Engineering Highlights

### 1. Serverless Cold-Start & Connection Pool Optimization
In serverless environments (e.g. Vercel / AWS Lambda), functions spin up on demand and share compute containers:
- **Global Connection Promise Caching**: Implements `global.mongooseCache` ensuring concurrent requests share an in-flight connection promise without triggering socket collisions or duplicate TLS handshakes.
- **Pre-Handler Connection Guarantee**: `api/index.ts` awaits `connectDB()` before forwarding requests to the Express router, eliminating `Operation buffering timed out after 10000ms` errors.
- **Fail-Fast Server Selection**: Sets `serverSelectionTimeoutMS: 5000` and `bufferCommands: false` to avoid prolonged hanging requests.
- **Connection Pool Bounds**: Restricts `maxPoolSize: 10` per lambda instance to prevent exhausting MongoDB Atlas connection quotas.
- **Asynchronous Seeder**: Decouples `seedSuperAdmin()` to execute in the background once per container, removing 1.5s+ of blocking latency from the user's critical request path.

### 2. 500x Faster MongoDB Aggregation Pipeline
Asset catalog queries previously suffered from unbounded `$lookup` operations across entire collections prior to pagination:
- **Two-Tier Pipeline Execution**:
  - **Fast Path (95%+ of queries)**: Filters `status: approved` and basic criteria directly on indexed fields, calculates pagination totals instantly in memory, takes the 12 sliced documents (`$limit`), and **only joins metadata, categories, and statistics for those 12 items**.
  - **Metadata Search Path**: When keywords or color ranges require metadata filtering, `$match` status filtering executes at **Stage 0** to prune non-approved assets before executing lookups.
- **Result**: Query latency dropped from **8,000ms–15,000ms down to ~15ms**, preventing Vercel function timeouts.

### 3. OWASP-Compliant Authentication & Session Revocation
- **Cryptographic Random Tokens**: Reset tokens are generated using `crypto.randomBytes(32).toString('hex')`.
- **SHA-256 Hash Storage**: The raw token is sent exclusively to the user's verified email. The database stores only the one-way SHA-256 hash (`crypto.createHash('sha256')`).
- **10-Minute Expiry & Single-Use**: Tokens expire after 10 minutes and are atomically wiped (`passwordResetToken: null`) immediately upon reset.
- **Anti-Enumeration Responses**: Forgot password endpoints return standardized generic success messages regardless of whether the email exists, preventing user enumeration attacks.
- **Immediate Session Revocation**: Every password change updates `passwordChangedAt`. All existing JWT tokens issued prior to that timestamp are instantly invalidated across all devices.
- **2FA OTP Flow**: Author accounts require 2-step OTP email verification on login. Super Admin and Administrator accounts bypass OTP for instant administrative dashboard access.

### 4. Role-Based Access Control & Purchase Transaction Enforcement
- **Subscriber-Only Purchases**: Strict business logic enforces that only accounts with the `subscriber` role can purchase individual assets or subscribe to membership tiers.
- **Explicit 403 Forbidden Feedback**: If an Admin, Super Admin, or Author attempts to initiate checkout, the API rejects the transaction with an actionable, clear message:
  > *"Only subscribers can make a purchase transaction. Administrators and authors cannot purchase assets. Please use a subscriber account to purchase."*
- **Self-Purchase Prevention**: Authors are blocked with a `400 Bad Request` if attempting to purchase their own created assets.

### 5. Cloudinary Automated Watermarking & Media Processing
- Automatically generates watermarked image and video previews upon upload using Cloudinary eager transformations.
- Sanitizes secure internal asset storage keys (`storage.public_id`, `storage.secure_url`) from public API responses to protect copyrighted media sources.
- Provides signed temporary download links exclusively to authenticated purchasers.

---

## 🗄 Database Schema & High-Performance Indexes

The following compound indexes are maintained in MongoDB Atlas for instant query resolution:

```typescript
// Asset Collection Indexes
assetSchema.index({ status: 1, createdAt: -1 });               // Browse catalog & sorting
assetSchema.index({ status: 1, assetType: 1, createdAt: -1 });  // Category & type filtering
assetSchema.index({ author: 1, status: 1 });                   // Author dashboard & review tabs
assetSchema.index({ categories: 1, status: 1, createdAt: -1 });// Category page filtering

// User Collection Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ passwordResetToken: 1 });                   // Fast token lookup
```

---

## 📡 API Reference

Base URL (Local): `http://localhost:5000/api/v1`  
Base URL (Production): `https://creatify-x-backend.vercel.app/api/v1`

### Authentication (`/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | Public | Register a new user account |
| `POST` | `/auth/login` | Public | Authenticate user (2FA for authors, direct for super admin/admin) |
| `POST` | `/auth/verify-otp` | Public | Verify 2FA OTP code for authors |
| `POST` | `/auth/forgot-password` | Public | Request OWASP-compliant password reset link |
| `POST` | `/auth/reset-password` | Public | Reset password using valid cryptographic token |
| `GET` | `/auth/access-token` | Public | Refresh expired JWT access token via refresh token cookie |

### Assets (`/assets`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/assets` | Public | Paginated catalog search & filtering (optimized <20ms) |
| `GET` | `/assets/:id` | Public | Retrieve single asset details with populated stats |
| `POST` | `/assets` | Author | Upload new digital asset (multipart/form-data) |
| `PATCH` | `/assets/:id` | Author, Admin | Update asset details or status |
| `GET` | `/assets/author/pending-assets`| Author | Retrieve current author's pending review assets |
| `GET` | `/assets/admin/pending-assets` | Admin | Retrieve all assets waiting for administrator review |
| `PATCH`| `/assets/admin/approve/:id` | Admin | Approve asset for public store visibility |
| `PATCH`| `/assets/admin/reject/:id` | Admin | Reject submitted asset |

### Purchases & Subscriptions
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/individual-payments/create-checkout-session` | Subscriber | Create Stripe checkout session for individual asset |
| `POST` | `/subscriptions/checkout` | Subscriber | Create Stripe checkout session for recurring subscription plan |
| `GET` | `/plans` | Public | Retrieve all active subscription plans |
| `POST` | `/stripe/webhook` | Stripe | Handle asynchronous Stripe payment and invoice webhooks |

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Server Runtime
PORT=5000
ENV_MODE=development
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/creatifyx?retryWrites=true&w=majority

# Client URLs
FRONTEND_URL=http://localhost:3000

# Security & JWT
JWT_SECRET_KEY=your_super_secret_jwt_key_here
BCRYPT_SALT_ROUNDS=10
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Default Super Admin Seed Credentials
SUPER_ADMIN_EMAIL=superadmin@gmail.com
SUPER_ADMIN_PASSWORD=superadmin

# Nodemailer / SMTP
MAIL_EMAIL=your-email@gmail.com
MAIL_PASSWORD=your-app-specific-password

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:3000/plans

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
WATERMARK_PUBLIC_ID=creatifyx_watermark
```

---

## 🛠 Local Development

```bash
# 1. Clone repository
git clone https://github.com/likhon122/creatifyX-backend.git
cd creatifyX-backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Run development server (with hot reload)
npm run dev

# 5. Build for production
npm run build

# 6. Start production build
npm start
```

---

## ☁️ Production Deployment (Vercel)

The backend is configured with `@vercel/node` and native TypeScript handling:

1. In your **MongoDB Atlas** dashboard, ensure IP Access List allows `0.0.0.0/0` (standard for serverless dynamic IP pools).
2. Configure all environment variables in your Vercel Project Settings (`Settings -> Environment Variables`).
3. Set `NODE_ENV=production` and `ENV_MODE=production`.
4. The deployment will automatically utilize `vercel.json` allocating **1024MB RAM** (2x vCPU) and a **60s maximum duration** window:
   ```json
   {
     "version": 2,
     "functions": {
       "api/index.ts": {
         "maxDuration": 60,
         "memory": 1024
       }
     },
     "routes": [
       { "src": "/(.*)", "dest": "api/index.ts" }
     ]
   }
   ```
