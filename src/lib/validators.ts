import { z } from "zod";

export const CartItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(50),
});

export const ShippingAddressSchema = z.object({
  full_name: z.string().min(2).max(100),
  address: z.string().min(5).max(255),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zip: z.string().min(3).max(20),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email().optional(),
});

export const CheckoutRequestSchema = z.object({
  items: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
  shipping_address: ShippingAddressSchema,
  coupon_code: z.string().trim().optional(),
  payment_method: z.enum(["card", "upi", "cod", "manual"]).default("card"),
});

export const CouponValidateSchema = z.object({
  code: z.string().trim().min(2).max(50),
  order_total: z.number().nonnegative().optional(),
});

export const ProfileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
});

export const AdminProductCreateSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().min(5),
  price: z.number().positive(),
  compare_price: z.number().positive().optional().nullable(),
  category: z.string().min(2),
  stock: z.number().int().min(0).default(50),
  image: z.string().url().or(z.string().startsWith("/")),
  is_active: z.boolean().default(true),
  featured: z.boolean().default(false),
});

export const AdminProductUpdateSchema = AdminProductCreateSchema.partial().extend({
  id: z.number().int().positive(),
});

export const AdminOrderStatusUpdateSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
  tracking_number: z.string().optional().nullable(),
  shipping_carrier: z.string().optional().nullable(),
  estimated_delivery: z.string().datetime().optional().nullable(),
});

export const AdminCouponCreateSchema = z.object({
  code: z.string().trim().min(3).max(30).transform((val) => val.toUpperCase()),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().positive(),
  min_order: z.number().min(0).default(0),
  valid_until: z.string().datetime().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const AdminUserPromoteSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["customer", "admin"]),
});
