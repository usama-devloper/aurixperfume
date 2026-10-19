import { apiFetch } from "./client";

export interface Product {
  id: number;
  name: string;
  slug?: string;
  description: string;
  price: number;
  compare_price?: number | null;
  category: string;
  stock: number;
  image: string;
  in_stock: boolean;
  featured: boolean;
  rating?: number;
  reviews?: number;
  top_notes?: string[];
  heart_notes?: string[];
  base_notes?: string[];
}

export interface ProductListParams {
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  sort?: "featured" | "price-low" | "price-high" | "rating";
  page?: number;
  limit?: number;
}

export const getProducts = (params?: ProductListParams) => {
  return apiFetch<Product[]>("/products-list", {
    method: "GET",
    params: params as any,
  });
};

export const getProduct = (idOrSlug: string | number) => {
  const isId = typeof idOrSlug === "number" || !isNaN(Number(idOrSlug));
  return apiFetch<Product>("/products-get", {
    method: "GET",
    params: isId ? { id: idOrSlug } : { slug: String(idOrSlug) },
  });
};
