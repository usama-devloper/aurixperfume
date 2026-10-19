# AURIX Luxury Fragrances — Full-Stack E-Commerce Platform

Aurix Perfume is an artisanal luxury fragrance platform crafted with a bespoke dark aesthetic, complete with a secure REST API layer, server-authoritative checkout, real-time inventory management, role-based admin controls, and PostgreSQL audit logging.

---

## 🌟 Tech Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI (shadcn/ui), Framer Motion, TanStack Query v5
- **Backend & Database:** Supabase (PostgreSQL 15+, Row Level Security, Auth, Storage)
- **API Layer:** Supabase Edge Functions (Deno runtime) with Zod validation and structured audit telemetry
- **Payments:** Stripe / Razorpay Webhooks and UPI QR / COD fallback
- **Testing:** Vitest, Testing Library, JSDOM

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm or bun
- Supabase CLI (`npm install -g supabase`)

### 2. Local Frontend Development
```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Environment Variables
Create a `.env` file in the root based on `.env.example`:
```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-publishable-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"
```

---

## 📦 Database & Edge Functions Setup

### 1. Database Migrations
Apply the migrations to your Supabase project in order, including the latest REST API and audit schema:
- `supabase/migrations/20261019123000_secure_orders_and_items_rls.sql`
- `supabase/migrations/20261019124000_authoritative_orders_and_secure_tracking.sql`
- `supabase/migrations/20261019170000_rest_api_and_audit_schema.sql`

### 2. Deploying Edge Functions
Deploy the Edge Functions to your Supabase project:
```bash
# Public storefront functions
supabase functions deploy products-list --no-verify-jwt
supabase functions deploy products-get --no-verify-jwt
supabase functions deploy coupons-validate --no-verify-jwt

# Authenticated customer functions
supabase functions deploy checkout
supabase functions deploy orders-my
supabase functions deploy orders-get
supabase functions deploy profile-update
supabase functions deploy payment-initiate
supabase functions deploy payment-webhook --no-verify-jwt

# Admin functions
supabase functions deploy admin-dashboard-stats
supabase functions deploy admin-orders-list
supabase functions deploy admin-orders-update-status
supabase functions deploy admin-products-create
supabase functions deploy admin-products-update
supabase functions deploy admin-products-delete
supabase functions deploy admin-coupons-manage
supabase functions deploy admin-users-promote
supabase functions deploy admin-api-logs
```

### 3. Set Edge Function Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
supabase secrets set RAZORPAY_KEY_ID="rzp_live_..."
supabase secrets set RAZORPAY_KEY_SECRET="..."
```

---

## 🧪 Testing & Verification

Run the automated test suite covering unit tests, cart pricing rules, and payment security:
```bash
npm test
```

Run linter:
```bash
npm run lint
```

Build for production:
```bash
npm run build
```

---

## 📡 How to Test the REST APIs

Refer to [API.md](API.md) for complete endpoint schemas and import [postman_collection.json](postman_collection.json) into Postman or Thunder Client.

### Example 1: List Products
```bash
curl -X GET "https://<PROJECT-REF>.supabase.co/functions/v1/products-list?category=oriental&limit=5" \
  -H "apikey: <ANON_KEY>"
```

### Example 2: Validate a Coupon
```bash
curl -X GET "https://<PROJECT-REF>.supabase.co/functions/v1/coupons-validate?code=WELCOME10&subtotal=2500" \
  -H "apikey: <ANON_KEY>"
```

### Example 3: Server-Authoritative Checkout
```bash
curl -X POST "https://<PROJECT-REF>.supabase.co/functions/v1/checkout" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <CUSTOMER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{ "product_id": 1, "quantity": 1 }],
    "shipping_address": {
      "full_name": "Customer Name",
      "address": "123 Scent Lane",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zip": "400001",
      "phone": "+919876543210"
    },
    "coupon_code": "WELCOME10",
    "payment_method": "card"
  }'
```

---

## 🛡️ Admin Account Setup
Follow the safe procedure documented in [ADMIN_SETUP.md](ADMIN_SETUP.md) to grant your administrative role in PostgreSQL without hardcoded credentials.
