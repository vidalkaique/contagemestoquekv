import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Produto, InsertProduto } from "@shared/schema";
import { supabase } from "@/lib/supabase";

export function useProducts() {
  return useQuery<Produto[]>({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select()
        .order('nome');

      if (error) throw error;
      return data || [];
    }
  });
}

export function useProductSearch(query: string) {
  return useQuery<Produto[]>({
    queryKey: ["produtos/search", query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select()
        .or(`nome.ilike.%${query}%,codigo.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: query.length >= 2,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertProduto) => {
      const { data: newProduct, error } = await supabase
        .from('produtos')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}
