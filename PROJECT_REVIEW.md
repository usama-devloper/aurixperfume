# 🌟 Aurix Perfume — Comprehensive Project Review & Architecture Document

**Generated on:** October 19, 2026  
**Repository:** [github.com/usama-devloper/aurixperfume](https://github.com/usama-devloper/aurixperfume)  
**Branch:** `main`  
**Application Type:** Full-Stack Luxury E-Commerce Web Application  

---

## 1. 📌 Executive Summary

**Aurix Perfume** is a high-end, luxury fragrance e-commerce web platform engineered with **React 18**, **TypeScript**, **Tailwind CSS**, **Vite**, and backed by **Supabase** (PostgreSQL, Auth, and Storage). The application delivers an immersive, dark-aesthetic shopping experience equipped with full administrative content management, real-time cart and order workflows, role-based access control (RBAC), and security logging.

---

## 2. 🛠️ Technology Stack & Core Architecture

| Layer | Technologies / Libraries |
| :--- | :--- |
| **Frontend Framework** | React 18 (Vite + SWC compiler), TypeScript |
| **Styling & Design System** | Tailwind CSS 3.4, Radix UI primitives, Lucide Icons, Framer Motion |
| **State & Data Fetching** | TanStack React Query v5, React Context API (`AuthContext`, `CartContext`) |
| **Form Handling & Validation** | React Hook Form, Zod schema validation |
| **Backend / BaaS** | Supabase (PostgreSQL, Row Level Security, Storage Buckets, Auth) |
| **Charts & Analytics** | Recharts |
| **Testing** | Vitest, Testing Library, JSDOM |
| **Notifications & UI Polish** | Sonner toasts, Embla Carousel |

---

## 3. 📂 Directory & File Structure

```
aurix-perfume-main/
├── public/                     # Static media, icons, and product imagery
│   ├── oud-sovereign.jpg       # Custom luxury perfume visual
│   ├── desert-saffron.jpg      # Custom luxury perfume visual
│   └── ...
├── src/
│   ├── components/             # Reusable UI & Business components
│   │   ├── auth/               # Auth modal, login/signup dialogs
│   │   ├── cart/               # Cart drawer, checkout summary
│   │   ├── checkout/           # Multi-step checkout & payment handlers
│   │   ├── home/               # Hero sections, featured grids, luxury showcase
│   │   ├── layout/             # Navbar, Footer, MobileNav, SearchBar
│   │   ├── products/           # ProductCard, filters, sorting, reviews
│   │   └── ui/                 # 30+ Radix UI-based design system components
│   ├── context/
│   │   ├── AuthContext.tsx     # Supabase user sessions & session persistence
│   │   └── CartContext.tsx     # Cart items, persistent storage, price calculations
│   ├── hooks/                  # Custom business hooks
│   │   ├── useProducts.ts      # Product fetching, filtering, mutations
│   │   ├── useOrders.ts        # Order creation, order tracking, admin status updates
│   │   ├── useCategories.ts    # Category list & management
│   │   ├── useReviews.ts       # Customer ratings & reviews
│   │   ├── useSiteSettings.ts  # Dynamic site configurations (Brand, contact info)
│   │   ├── useUserRoles.ts     # RBAC (Admin/Customer detection)
│   │   ├── useRateLimiter.ts   # Client-side rate-limiting for auth & sensitive forms
│   │   └── useSecurityLogger.ts# Security audits (login attempts, failed transactions)
│   ├── pages/                  # Main routed views
│   │   ├── Index.tsx           # Home landing page with banners & featured sections
│   │   ├── Products.tsx        # Catalog / Shop with multi-filter & search
│   │   ├── ProductDetail.tsx   # Detailed scent profile, accords, reviews
│   │   ├── Cart.tsx & Checkout.tsx # Cart and multi-step payment flow
│   │   ├── OrderConfirmation.tsx & OrderTracking.tsx # Real-time order lookup
│   │   ├── Dashboard.tsx       # Admin Analytics (sales, orders, revenues)
│   │   ├── ProductManager.tsx  # Admin CRUD for inventory & perfumes
│   │   ├── CategoryManager.tsx # Admin Category management
│   │   ├── HomepageManager.tsx # Dynamic banner & promo configuration
│   │   ├── BrandSettings.tsx   # Social links, branding name, contact details
│   │   └── Profile.tsx         # User profile, address book & order history
│   ├── integrations/supabase/  # Supabase client & auto-generated DB types
│   └── types/                  # TypeScript interface declarations
└── supabase/
    └── migrations/             # SQL schemas, RLS policies, tables, seed data
```

---

## 4. 🔑 Key Functional Modules

### A. Customer Experience (Storefront)
1. **Interactive Fragrance Discovery:** Filter by fragrance type (Attar, Eau de Parfum, Oriental, Floral, Woody), price range, and search keyword.
2. **Detailed Product Pages:** Scent notes breakdown (Top, Heart, Base), volume options, user ratings, and reviews.
3. **Shopping Cart & Checkout:** Seamless drawer/page cart, discount coupon engine, tax/shipping computation, and multiple address management.
4. **Order Tracking:** Track shipment status (Pending, Processing, Shipped, Delivered) using an Order ID.

### B. Administrative Management Suite
1. **Admin Hub & Dashboard:** Real-time revenue statistics, sales graphs (via Recharts), recent orders list, and stock alerts.
2. **Product Manager:** Add/edit/delete fragrances, upload visuals directly, modify pricing, notes, and toggle featured items.
3. **Category & Homepage Management:** Dynamically adjust homepage banners, promotional callouts, and category hierarchies without code changes.
4. **Brand Settings:** Centralized control over brand title, support emails, and social media handles (Facebook, Instagram, Twitter).

### C. Security & Data Integrity
1. **Row Level Security (RLS):** Supabase database policies ensure customers can only access their own orders and profile data.
2. **Security Logger & Rate Limiter:** Hooks implemented to detect and record suspicious activity, brute-force attempts, and rapid submissions.
3. **Role-Based Routing:** Admin pages (`/dashboard`, `/product-manager`, `/brand-settings`) are guarded via `useUserRoles`.

---

## 5. 🔍 Health Check & Code Review Findings

### Strengths
- **Clean Architecture:** Strict separation between hooks (business logic), context (state), components (presentation), and pages (views).
- **Type Safety:** High TypeScript coverage with generated Supabase database types.
- **Modern UI/UX:** Dark-mode tailored luxury aesthetic with smooth animations, mobile responsiveness, and micro-interactions.

### Recommended Next Improvements
1. **Image Storage / CDN:** Move static product images from local `/public` storage into Supabase Storage buckets for dynamic CDN caching and non-code upload workflows.
2. **Automated Testing Coverage:** Expand the test suite (`OrderTracking.test.tsx`) to cover cart calculations and checkout hooks.
3. **Payment Gateway Integration:** Connect a live payment processor (Stripe / Razorpay / JazzCash) alongside Cash on Delivery (COD).

---

## 6. 🚀 Deployment & Git Configuration

- **Current Repository:** `https://github.com/usama-devloper/aurixperfume`
- **Active Branch:** `main`
- **Build Command:** `npm run build` (Vite)
- **Deployment Targets:** Compatible with Lovable.dev, Vercel, Netlify, and Cloudflare Pages.
