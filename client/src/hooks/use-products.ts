import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Produto, InsertProduto } from "@shared/schema";

export function useProducts() {
  return useQuery<Produto[]>({
    queryKey: ["/api/produtos"],
  });
}

export function useProductSearch(query: string) {
  return useQuery<Produto[]>({
    queryKey: ["/api/produtos/search", { q: query }],
    enabled: query.length >= 2,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertProduto) => {
      const response = await apiRequest("POST", "/api/produtos", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
    },
  });
}
