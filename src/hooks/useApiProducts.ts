import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, getProduct, ProductListParams } from "@/lib/api/products";
import { toast } from "@/components/ui/use-toast";

export const useApiProducts = (params?: ProductListParams) => {
  return useQuery({
    queryKey: ["api-products", params],
    queryFn: () => getProducts(params),
    staleTime: 60 * 1000,
  });
};

export const useApiProduct = (idOrSlug: string | number | undefined) => {
  return useQuery({
    queryKey: ["api-product", idOrSlug],
    queryFn: () => (idOrSlug ? getProduct(idOrSlug) : null),
    enabled: !!idOrSlug,
    staleTime: 60 * 1000,
  });
};
