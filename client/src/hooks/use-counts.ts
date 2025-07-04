import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ContagemWithItens, InsertContagem } from "@shared/schema";

export function useCounts() {
  return useQuery<ContagemWithItens[]>({
    queryKey: ["/api/contagens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contagens')
        .select(`
          id,
          data,
          finalizada,
          excel_url,
          created_at,
          itens_contagem (
            id,
            produto_id,
            nome_livre,
            pallets,
            lastros,
            pacotes,
            unidades,
            total,
            created_at,
            produtos (
              id,
              codigo,
              nome,
              unidades_por_pacote,
              pacotes_por_lastro,
              lastros_por_pallet,
              created_at
            )
          )
        `)
        .order('data', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });
}

export function useCreateCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertContagem) => {
      const { data: result, error } = await supabase
        .from('contagens')
        .insert({
          data: data.data,
          finalizada: data.finalizada || false
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contagens"] });
    },
  });
}
