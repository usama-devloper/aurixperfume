# Aurix Perfume — Safe Admin Provisioning Guide

This guide documents the secure, database-level procedure for establishing and managing administrator access for Aurix Perfume.

---

## 1. Security Architecture

Aurix Perfume does **not** rely on client-side roles, insecure session flags, or editable user metadata for administrative privilege. 

- **Table:** `public.user_roles`
- **Columns:** `user_id (UUID)`, `role (app_role enum)`, `created_at`
- **Enforcement:** PostgreSQL Row-Level Security (RLS) policies check `public.is_admin(auth.uid())` which queries `public.user_roles`.
- **Client Route Guard:** `src/pages/AdminHub.tsx`, `Dashboard.tsx`, `CategoryManager.tsx`, etc., verify `isAdmin` via `AuthContext` (populated from `user_roles`).
- **Database Operations Guard:** All mutating queries against products, categories, orders, and homepage settings require admin role directly in PostgreSQL.

---

## 2. Safe Procedure to Grant First Admin Role

### Step 1: Sign up a regular user account
Navigate to `/auth` on the deployed Aurix Perfume storefront (or local dev) and sign up with the intended administrator email address (e.g., `admin@aurixperfume.in`).

### Step 2: Retrieve the User UUID
1. Open your **Supabase Dashboard** -> **Authentication** -> **Users**.
2. Locate the user by email and copy their `User UID` (a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).

### Step 3: Grant Admin Role in Supabase SQL Editor
Run the following SQL statement in the Supabase SQL Editor:

```sql
-- Replace <USER_UUID> with the actual UID from Step 2
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 4: Verification
Verify that the role has been assigned:

```sql
SELECT ur.user_id, ur.role, u.email, ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

Log in with that user at `/auth` and navigate to `/admin`. You will have full access to:
- `/admin` (Admin Hub)
- `/dashboard` (Seller Dashboard & Order Management)
- `/product-manager` (Product Catalog & Inventory)
- `/category-manager` (Category Hierarchy)
- `/homepage-manager` (Banners & Featured Sections)
- `/brand-settings` (Brand Identity & Socials)

---

## 3. Revoking Admin Access

To demote an administrator:

```sql
DELETE FROM public.user_roles
WHERE user_id = '<USER_UUID>' AND role = 'admin';
```

---

## 4. Emergency Lockout Prevention

- Always maintain at least one verified admin account.
- Never grant admin privileges via `auth.users.raw_user_meta_data`, as client code could attempt to manipulate metadata during profile updates.
- Keep the Supabase project password and database connection string securely in an encrypted password manager.
