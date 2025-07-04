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

      // Garantir que os valores numéricos sejam números
      return (data || []).map(produto => ({
        ...produto,
        unidadesPorPacote: parseInt(String(produto.unidades_por_pacote)) || 1,
        pacotesPorLastro: parseInt(String(produto.pacotes_por_lastro)) || 1,
        lastrosPorPallet: parseInt(String(produto.lastros_por_pallet)) || 1,
      }));
    }
  });
}

export function useProductSearch(query: string) {
  return useQuery<Produto[]>({
    queryKey: ["produtos/search", query],
    queryFn: async () => {
      // Se a query estiver vazia, retorna array vazio
      if (!query.trim()) return [];

      // Limpa a query e prepara para busca
      const searchTerm = query.trim().toLowerCase();
      
      const { data, error } = await supabase
        .from('produtos')
        .select()
        .or(
          `nome.ilike.%${searchTerm}%,` + // Busca parcial no nome
          `nome.ilike.${searchTerm}%,` +   // Começa com
          `codigo.ilike.%${searchTerm}%,` + // Busca parcial no código
          `codigo.ilike.${searchTerm}%`     // Começa com
        )
        .order('nome')
        .limit(50);

      if (error) throw error;

      // Se não encontrou nada, tenta uma busca mais flexível
      if (!data?.length) {
        // Divide a query em palavras e busca cada uma
        const terms = searchTerm.split(/\s+/);
        
        const { data: flexData, error: flexError } = await supabase
          .from('produtos')
          .select()
          .or(
            terms.map(term => `nome.ilike.%${term}%`).join(',')
          )
          .order('nome')
          .limit(50);

        if (flexError) throw flexError;
        
        // Garantir que os valores numéricos sejam números
        return (flexData || []).map(produto => ({
          ...produto,
          unidadesPorPacote: parseInt(String(produto.unidades_por_pacote)) || 1,
          pacotesPorLastro: parseInt(String(produto.pacotes_por_lastro)) || 1,
          lastrosPorPallet: parseInt(String(produto.lastros_por_pallet)) || 1,
        }));
      }

      // Garantir que os valores numéricos sejam números
      return (data || []).map(produto => ({
        ...produto,
        unidadesPorPacote: parseInt(String(produto.unidades_por_pacote)) || 1,
        pacotesPorLastro: parseInt(String(produto.pacotes_por_lastro)) || 1,
        lastrosPorPallet: parseInt(String(produto.lastros_por_pallet)) || 1,
      }));
    },
    enabled: true, // Sempre habilitado para melhor experiência
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation<Produto, Error, InsertProduto>({
    mutationFn: async (data: InsertProduto) => {
      const { data: newProduct, error } = await supabase
        .from('produtos')
        .insert([{
          codigo: data.codigo,
          nome: data.nome,
          unidades_por_pacote: data.unidadesPorPacote,
          pacotes_por_lastro: data.pacotesPorLastro,
          lastros_por_pallet: data.lastrosPorPallet
        }])
        .select()
        .single();

      if (error) throw error;

      // Garantir que os valores numéricos sejam números
      return {
        ...newProduct,
        unidadesPorPacote: parseInt(String(newProduct.unidades_por_pacote)) || 1,
        pacotesPorLastro: parseInt(String(newProduct.pacotes_por_lastro)) || 1,
        lastrosPorPallet: parseInt(String(newProduct.lastros_por_pallet)) || 1,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}
