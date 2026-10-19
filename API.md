# 📖 Aurix Perfume — Complete REST API Documentation

Base URL for Edge Functions: `https://<PROJECT_REF>.supabase.co/functions/v1`  
All responses follow the standard JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "timestamp": "2026-10-19T11:30:00.000Z" }
}
```

---

## 1. Authentication & Security
- **Public endpoints** require only the Supabase public API key in the `apikey` header.
- **User endpoints** require a valid Supabase JWT in the `Authorization: Bearer <access_token>` header.
- **Admin endpoints** require a user token belonging to an account with `role = 'admin'` in `public.user_roles`.
- Every Edge Function invocation is recorded in `public.api_logs` with latency, user ID, status code, and payload.

---

## 2. Public Storefront APIs

### 2.1 List Products
`GET /products-list`

**Query Parameters:**
- `category` (optional): Filter by category (e.g. `oriental`, `woody`, `floral`)
- `search` (optional): Search fragrance name and description
- `min_price` / `max_price` (optional): Price range in INR
- `sort` (optional): `featured` | `price-low` | `price-high` | `rating`
- `page` (optional, default `1`): Page number
- `limit` (optional, default `20`): Page size (max `50`)

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Oud Sovereign",
      "slug": "oud-sovereign-1",
      "price": 2499,
      "compare_price": 2999,
      "category": "Oriental & Woody",
      "stock": 42,
      "image": "/oud-sovereign.jpg",
      "in_stock": true,
      "featured": true
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12 }
}
```

---

### 2.2 Get Product Detail
`GET /products-get`

**Query Parameters:**
- `id` or `slug` (required)

**Example Request:**
```bash
curl -X GET "https://<PROJECT_REF>.supabase.co/functions/v1/products-get?slug=oud-sovereign-1" \
  -H "apikey: <ANON_KEY>"
```

---

### 2.3 Validate Coupon
`GET /coupons-validate`

**Query Parameters:**
- `code` (required): Coupon code (e.g. `WELCOME10`)
- `subtotal` (optional): Cart subtotal in INR to check minimum order requirement

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "c1a2b3c4-...",
    "code": "WELCOME10",
    "discount_type": "percent",
    "discount_value": 10,
    "min_order": 500,
    "estimated_discount": 249.9
  }
}
```

---

## 3. Authenticated Customer APIs

### 3.1 Server-Authoritative Checkout
`POST /checkout`  
*Header: `Authorization: Bearer <TOKEN>`*

**Request Body:**
```json
{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 2, "quantity": 1 }
  ],
  "shipping_address": {
    "full_name": "Usama Malik",
    "address": "42 Luxury Estate, Bandra West",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zip": "400050",
    "phone": "+919876543210",
    "email": "customer@aurixperfume.in"
  },
  "coupon_code": "WELCOME10",
  "payment_method": "card"
}
```

**Security Guarantees:**
- Product prices are looked up directly in the database (`products` table). Any client-submitted prices are discarded.
- Validates that sufficient stock exists for every item with row-level locks (`FOR UPDATE`).
- Atomically decrements product stock.
- Calculates tax (8%) and shipping (₹400 if subtotal < ₹2000, else ₹0 free shipping).

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "order_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "order_number": "ORD-261019-a1b2c3",
    "subtotal": 4998,
    "discount": 499.8,
    "shipping": 0,
    "tax": 359.86,
    "total_amount": 4858.06,
    "payment_status": "unpaid",
    "status": "pending"
  }
}
```

---

### 3.2 List My Orders
`GET /orders-my?page=1&limit=10`  
*Header: `Authorization: Bearer <TOKEN>`*

Returns only the authenticated customer's own order history.

---

### 3.3 Get Order Detail
`GET /orders-get?id=<ORDER_UUID>`  
*Header: `Authorization: Bearer <TOKEN>`*

Enforces ownership check: customers can only view their own orders.

---

### 3.4 Update Profile
`POST /profile-update`  
*Header: `Authorization: Bearer <TOKEN>`*

**Request Body:**
```json
{
  "full_name": "Usama Malik",
  "phone": "+919876543210"
}
```

---

### 3.5 Initiate Payment
`POST /payment-initiate`  
*Header: `Authorization: Bearer <TOKEN>`*

**Request Body:**
```json
{
  "order_id": "<ORDER_UUID>",
  "provider": "stripe"
}
```

---

### 3.6 Payment Webhook
`POST /payment-webhook`  
Handles Stripe / Razorpay asynchronous notifications, verifies HMAC signature, checks order ownership, and marks order `paid` idempotently.

---

## 4. Admin APIs (`role = 'admin'` Required)

### 4.1 Dashboard Analytics
`GET /admin-dashboard-stats`

Returns verified revenue, total orders, low-stock items, recent orders, and total API invocations.

---

### 4.2 Admin Orders Management
- `GET /admin-orders-list?status=pending&payment_status=paid&search=ORD-`
- `POST /admin-orders-update-status`
```json
{
  "order_id": "<ORDER_UUID>",
  "status": "shipped",
  "tracking_number": "BD-892374619",
  "shipping_carrier": "bluedart",
  "estimated_delivery": "2026-10-25T12:00:00Z"
}
```

---

### 4.3 Admin Catalog Operations
- `POST /admin-products-create`
- `POST /admin-products-update`
- `POST /admin-products-delete` (soft delete via `is_active = false`)

---

### 4.4 Admin Coupons & Discounts
- `GET /admin-coupons-manage`
- `POST /admin-coupons-manage`
```json
{
  "code": "DIWALI30",
  "discount_type": "percent",
  "discount_value": 30,
  "min_order": 2500,
  "valid_until": "2026-11-15T23:59:59Z"
}
```

---

### 4.5 Admin API & Security Audit Logs
`GET /admin-api-logs?page=1&limit=30`

Returns the telemetry trail from `public.api_logs` with duration, endpoint, method, user ID, and HTTP status codes.
