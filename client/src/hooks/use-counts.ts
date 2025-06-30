import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ContagemWithItens, InsertContagem } from "@shared/schema";

export function useCounts() {
  return useQuery<ContagemWithItens[]>({
    queryKey: ["/api/contagens"],
  });
}

export function useCreateCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertContagem) => {
      const response = await apiRequest("POST", "/api/contagens", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contagens"] });
    },
  });
}
