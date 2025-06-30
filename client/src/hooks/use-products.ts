import { useQuery } from "@tanstack/react-query";
import type { Produto } from "@shared/schema";

export function useProductSearch(query: string) {
  return useQuery<Produto[]>({
    queryKey: ["/api/produtos/search", { q: query }],
    enabled: query.length >= 2,
  });
}
