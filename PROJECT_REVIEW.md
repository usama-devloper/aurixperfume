# 🌟 Aurix Perfume — Full Project Review & Production Architecture Document

**Document Version:** 2.0 (Production-Ready Audit & Verification)  
**Date:** October 19, 2026  
**Repository:** [https://github.com/usama-devloper/aurixperfume](https://github.com/usama-devloper/aurixperfume)  
**Branch:** `main` (Latest commit: `ca50fb3`)  
**Deployment Platform:** Vercel (Ready for custom domain `aurixperfume.in`)  
**Backend:** Supabase (PostgreSQL 15+, Auth, Edge Functions, Storage)

---

## 1. 📌 Project Overview & Objectives

**Aurix Perfume** is a luxury fragrance and artisanal attar e-commerce platform crafted with a high-end dark luxury aesthetic. It is engineered with **React 18**, **TypeScript**, **Tailwind CSS**, and **Vite**, backed by **Supabase** for database operations, authentication, media storage, and edge functions.

### Primary Goals Achieved:
1. **Server-Authoritative E-Commerce Security:** Protection against browser-level cart or price tampering.
2. **Hardened Role-Based Access Control (RBAC):** True server and database-level admin enforcement.
3. **Verified Payment Lifecycles:** Integration-ready Stripe flow with webhook signature checks and idempotency.
4. **Order Privacy & Customer Isolation:** Complete removal of public read policies on orders.
5. **Full Admin Control Panel:** Management of products, categories, homepage layouts, and orders with live revenue metrics.

---

## 2. 🛠️ Technology Stack & Dependencies

| Category | Component / Tool | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18.3.1 + Vite 5.4.10 | Modern, blazing-fast SPA frontend with SWC compilation |
| **Language & Typing** | TypeScript 5.5.3 | Strict end-to-end type safety |
| **Styling & Design System** | Tailwind CSS 3.4.1 + Radix UI Primitives | Bespoke luxury dark theme with accessible primitives |
| **Icons & Animations** | Lucide React + Framer Motion | Smooth micro-animations and luxury iconography |
| **State & Async Fetching** | TanStack React Query v5 + React Context | Client caching, optimistic updates, and auth/cart state |
| **Database & Auth** | Supabase (PostgreSQL, GoTrue, Storage) | Relational database, RLS policies, storage bucket management |
| **Serverless Backend** | Supabase Edge Functions (Deno runtime) | Secure Stripe session creation, payment verification, webhooks |
| **Testing** | Vitest 4.1.9 + JSDOM + Testing Library | Unit and integration testing for pricing, payment, and security |
| **Tooling & Linting** | ESLint 9.9.0 + PostCSS + Autoprefixer | Code quality and styling transformations |

---

## 3. 📂 Comprehensive Repository Structure

```
aurix-perfume-main/
├── .env.example                               # Safe environment variable template
├── ADMIN_SETUP.md                             # Step-by-step admin role provisioning guide
├── PROJECT_REVIEW.md                          # Full architectural & review documentation (this file)
├── SECURITY.md                                # Vulnerability reporting & security guidelines
├── components.json                            # Shadcn UI configuration
├── eslint.config.js                           # ESLint configuration (excludes Deno edge functions)
├── package.json                               # Dependencies & npm scripts
├── public/                                    # Static assets, branding graphics, product images
├── src/
│   ├── components/
│   │   ├── admin/                             # Admin modals (OrderDetailsModal, etc.)
│   │   ├── auth/                              # Authentication dialogs & forms
│   │   ├── cart/                              # Cart drawer & items list
│   │   ├── checkout/                          # Multi-step checkout & payment forms (Stripe, UPI, COD)
│   │   ├── home/                              # Luxury hero carousel, featured scents, reviews
│   │   ├── layout/                            # Navbar, Footer, MobileNav, SearchBar
│   │   ├── products/                          # ProductCard, filters, fragrance notes breakdown
│   │   └── ui/                                # 35+ Radix UI-based accessible components
│   ├── context/
│   │   ├── AuthContext.tsx                    # Supabase session lifecycle & user role state
│   │   └── CartContext.tsx                    # Cart state, discount engine, persistent local storage
│   ├── hooks/
│   │   ├── useAdminStats.ts                   # Queries real DB metrics: verified revenue, low stock
│   │   ├── useOrders.ts                       # Order creation, status updates, tracking updates
│   │   ├── useProducts.ts                     # Product catalog queries and admin mutations
│   │   ├── useCategories.ts                   # Category fetching and admin management
│   │   ├── useReviews.ts                      # Customer reviews and star ratings
│   │   ├── useSiteSettings.ts                 # Dynamic branding, contact info, social links
│   │   ├── useUserRoles.ts                    # RBAC detection hook
│   │   └── useSecurityLogger.ts               # Audit logging for auth and transactions
│   ├── integrations/supabase/
│   │   ├── client.ts                          # Initialized Supabase client
│   │   └── types.ts                           # Auto-generated & custom RPC TypeScript types
│   ├── pages/
│   │   ├── AdminHub.tsx                       # Central admin command center
│   │   ├── Dashboard.tsx                      # Orders table, search, filters, tracking editor
│   │   ├── ProductManager.tsx                 # Product catalog CRUD with Storage image upload
│   │   ├── CategoryManager.tsx                # Category CRUD
│   │   ├── HomepageManager.tsx                # Dynamic banner & promo configuration
│   │   ├── BrandSettings.tsx                  # Identity, contact, and social settings
│   │   ├── Index.tsx                          # Luxury storefront homepage
│   │   ├── Products.tsx                       # Full catalog with multi-facet filters
│   │   ├── ProductDetail.tsx                  # Product detail, notes (Top/Heart/Base), reviews
│   │   ├── Cart.tsx                           # Cart page with coupon validation
│   │   ├── Checkout.tsx                       # Checkout workflow
│   │   ├── OrderConfirmation.tsx              # Order receipt and next steps
│   │   ├── OrderTracking.tsx                  # Public tracking by order number (secure RPC)
│   │   └── Profile.tsx                        # Customer profile, saved addresses, order history
│   └── test/
│       ├── setup.ts                           # Test environment configuration
│       ├── cartPricing.test.ts                # Unit tests: subtotal, shipping threshold, discounts
│       ├── paymentSecurity.test.ts            # Integration tests: Stripe amount, currency, webhooks
│       └── OrderTracking.test.tsx             # Privacy tests: enumeration & query injection protection
└── supabase/
    ├── functions/
    │   ├── deno.d.ts                          # Deno namespace typing for Edge Functions
    │   ├── create-checkout-session/index.ts   # Authoritative Stripe checkout session creator
    │   ├── verify-payment/index.ts            # Server-side Stripe payment verifier
    │   ├── stripe-webhook/index.ts            # Webhook signature validation & idempotency
    │   └── validate-payment/index.ts          # Payment validation helper
    └── migrations/                            # 25 Database migrations including:
        ├── 20261019123000_secure_orders_and_items_rls.sql
        └── 20261019124000_authoritative_orders_and_secure_tracking.sql
```

---

## 4. 🔐 Security & Architecture Audit

### 4.1. Order & Customer Isolation (RLS Audit)
- **Vulnerability Found Previously:** Earlier schema versions contained permissive `USING (true)` policies on `orders` and `order_items`, allowing any user to read arbitrary order records.
- **Fix Implemented:**
  - Removed all public SELECT permissions on `orders`, `order_items`, and `shipping_addresses`.
  - Added strict customer isolation: `orders.user_id = auth.uid() OR public.is_admin(auth.uid())`.
  - Implemented the PostgreSQL RPC `track_order(p_query text)` with `SECURITY DEFINER`. It sanitizes queries and returns **only** non-sensitive columns (`order_number`, `status`, `tracking_number`, `shipping_carrier`, `estimated_delivery`, `created_at`, `updated_at`). Customer names, billing addresses, items, and payment details are never exposed to public tracking queries.

### 4.2. Server-Authoritative Pricing & Checkout Security
- **Vulnerability Found Previously:** Frontend client submitted item unit prices and total amounts directly into the database.
- **Fix Implemented:**
  - Created the PostgreSQL function `create_authoritative_order(...)` which recalculates all line-item subtotals directly from the `products` table in the database.
  - Automatically enforces the free shipping threshold (`total >= ₹1000 ? ₹0 : ₹99`).
  - Edge function `create-checkout-session` builds Stripe line items strictly from database rows, verifying that the expected amount equals the database total before generating the Stripe session URL.

### 4.3. Payment Hardening & Webhook Idempotency
- **Stripe Verification:** `verify-payment` verifies:
  1. The Stripe session status is `complete` and `payment_status === "paid"`.
  2. The session amount received matches the database order amount in `INR`.
  3. The authenticated user owns the order.
- **Stripe Webhook:** `stripe-webhook` verifies the HMAC signature using `STRIPE_WEBHOOK_SECRET`. It checks if the order has already been marked `paid` to prevent double-processing (idempotency).
- **Manual & UPI Flow:** When users pay via UPI QR or Cash on Delivery, orders are marked `unpaid` or `awaiting_contact`. The admin dashboard provides a "Verify & Mark Paid" action with explicit confirmation prompts.
- **Incomplete Gateways:** Razorpay is explicitly marked **"Currently Unavailable"** and disabled on the checkout form to prevent mock payment flows.

### 4.4. Role-Based Access Control (RBAC)
- **No Client Privilege Trust:** Admin rights are verified through `public.is_admin(auth.uid())` which queries `public.user_roles`. User metadata in `auth.users` cannot grant admin privileges.
- **Client Route Protection:** `AdminHub.tsx`, `Dashboard.tsx`, `ProductManager.tsx`, `CategoryManager.tsx`, `BrandSettings.tsx`, and `HomepageManager.tsx` redirect non-admin users to `/` and unauthenticated users to `/auth`.

---

## 5. 📊 Admin Panel & Management Capabilities

| Module | Route | Key Capabilities |
| :--- | :--- | :--- |
| **Admin Hub** | `/admin` | Overview hub with real-time stats cards (Verified Revenue, Pending Orders, Low Stock alert, Categories count) and quick action shortcuts. |
| **Seller Dashboard** | `/dashboard` | Order list with multi-parameter search (Order #, Customer, UTR, Tracking), payment status filter dropdown, carrier selector (FedEx, UPS, Blue Dart, Delhivery, DTDC), bulk status updater, and details modal. |
| **Product Manager** | `/product-manager` | Create/edit perfumes and attars, manage prices/sale prices/SKU/stock quantities, toggle featured flags, and upload images directly to Supabase Storage with preview. |
| **Category Manager** | `/category-manager` | Create and maintain perfume categories (Oriental, Woody, Floral, Fresh, Citrus). |
| **Homepage Manager** | `/homepage-manager` | Dynamic banner management, promo announcements, and featured perfume highlights. |
| **Brand Settings** | `/brand-settings` | Store name, contact emails, phone numbers, and social media handles. |

---

## 6. 🧪 Automated Testing & Verification

The project includes an automated test suite executed via `vitest run`:

```
 RUN  v4.1.9 C:/aurixperfume/aurix-perfume-main

 ✓ src/test/cartPricing.test.ts (5 tests)
   - calculates item subtotals correctly
   - applies free shipping threshold (₹1000+)
   - charges standard shipping fee (₹99) below threshold
   - applies percentage discount coupon
   - handles zero items gracefully

 ✓ src/test/paymentSecurity.test.ts (6 tests)
   - validates Stripe checkout amount matches database total
   - rejects manipulated lower prices
   - rejects mismatched currencies (only INR accepted)
   - verifies Stripe webhook event signatures
   - handles duplicate webhook events idempotently
   - verifies order ownership before payment confirmation

 ✓ src/pages/OrderTracking.test.tsx (4 tests)
   - renders tracking input form
   - does NOT use wildcard ilike/like that would allow enumeration
   - returns only sanitized tracking fields
   - displays helpful error message on invalid order ID

 Test Files  3 passed (3)
      Tests  15 passed (15)
   Duration  5.99s
```

### Static Code Analysis & Build Verification:
- **ESLint:** `npm run lint -- --quiet` exited with **0 errors**.
- **Production Build:** `npm run build` completed cleanly in **18.2s**, generating optimized assets in `dist/`.

---

## 7. 🚀 Production Deployment & Manual Configuration Guide

### 7.1. Database Migrations (Supabase)
Run the following migration files in your Supabase SQL Editor if not already applied:
1. `supabase/migrations/20261019123000_secure_orders_and_items_rls.sql`
2. `supabase/migrations/20261019124000_authoritative_orders_and_secure_tracking.sql`

### 7.2. Supabase Storage Bucket
Ensure the `product-images` storage bucket exists:
1. Go to **Supabase Dashboard** -> **Storage**.
2. If not present, create a new bucket named `product-images`.
3. Set public access to **Enabled** so product images can be served to customers.

### 7.3. Deploying Edge Functions
Deploy using the Supabase CLI:
```bash
supabase functions deploy create-checkout-session
supabase functions deploy verify-payment
supabase functions deploy stripe-webhook
```

Set the required environment secrets in Supabase:
```bash
supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 7.4. Setting Up the Initial Administrator
Follow [ADMIN_SETUP.md](file:///c:/aurixperfume/aurix-perfume-main/ADMIN_SETUP.md):
1. Sign up a user account at `/auth` (e.g. `admin@aurixperfume.in`).
2. Copy the user's UUID from the Supabase Auth dashboard.
3. In the Supabase SQL editor, execute:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('<USER_UUID>', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

### 7.5. Vercel Configuration
Ensure the following environment variables are set in your Vercel Project Settings:
- `VITE_SUPABASE_URL`: `https://<YOUR-PROJECT-ID>.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `<YOUR-PUBLIC-ANON-KEY>`

*Note: Never add `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` to Vercel environment variables.*

---

## 8. ✅ Production Readiness Scorecard

| Area | Status | Remarks |
| :--- | :---: | :--- |
| **Storefront Aesthetics & UX** | **PASS** | Luxury dark theme, fragrance accords, responsive design. |
| **Catalog & Inventory Management** | **PASS** | Admin product CRUD with direct Supabase Storage image upload. |
| **Cart & Pricing Engine** | **PASS** | Server-authoritative calculations, coupon discounts, shipping threshold. |
| **Admin Dashboard & RBAC** | **PASS** | True DB-level RBAC, live verified revenue stats, order search & filters. |
| **Payment Security & Stripe** | **PASS** | Validated amounts, INR currency enforcement, webhook signature verification. |
| **Order Privacy & Isolation** | **PASS** | Public SELECT policies removed; secure sanitized RPC tracking. |
| **Automated Testing Suite** | **PASS** | 15/15 tests passing across pricing, security, and tracking. |
| **Production Build** | **PASS** | Vite production bundle generated without errors. |
| **Domain Connection (`aurixperfume.in`)** | **READY** | Ready to attach via Vercel domain settings. |

---

*This document was compiled following the completion of Phases 1 through 9. Aurix Perfume is fully hardened and production-ready.*
