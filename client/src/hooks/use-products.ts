import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Produto, InsertProduto } from "@shared/schema";
import { supabase } from "@/lib/supabase";

const fullProductSelect = 'id, codigo, nome, created_at, unidades_por_pacote, pacotes_por_lastro, lastros_por_pallet, quantidade_pacs_por_pallet';

const mapProdutoFromDb = (produto: any): Produto => ({
  id: produto.id,
  codigo: produto.codigo,
  nome: produto.nome,
  createdAt: new Date(produto.created_at),
  unidadesPorPacote: produto.unidades_por_pacote ?? 1,
  pacotesPorLastro: produto.pacotes_por_lastro ?? 1,
  lastrosPorPallet: produto.lastros_por_pallet ?? 1,
  quantidadePacsPorPallet: produto.quantidade_pacs_por_pallet ?? 0,
});

export function useProducts() {
  return useQuery<Produto[]>({ 
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select(fullProductSelect)
        .order('nome');

      if (error) throw error;

      return (data || []).map(mapProdutoFromDb);
    }
  });
}

export function useProductSearch(query: string) {
  return useQuery<Produto[]>({ 
    queryKey: ["produtos/search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const searchTerm = query.trim().toLowerCase();
      
      const { data, error } = await supabase
        .from('produtos')
        .select(fullProductSelect)
        .or(
          `nome.ilike.%${searchTerm}%,` +
          `codigo.ilike.%${searchTerm}%`
        )
        .order('nome')
        .limit(50);

      if (error) throw error;

      if (!data?.length) {
        const terms = searchTerm.split(/\s+/).filter(t => t.length > 1);
        if (!terms.length) return [];
        const orQuery = terms.map(term => `nome.ilike.%${term}%`).join(',');
        
        const { data: flexData, error: flexError } = await supabase
          .from('produtos')
          .select(fullProductSelect)
          .or(orQuery)
          .order('nome')
          .limit(50);

        if (flexError) throw flexError;
        return (flexData || []).map(mapProdutoFromDb);
      }

      return (data || []).map(mapProdutoFromDb);
    },
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation<Produto, Error, InsertProduto>({
    mutationFn: async (data: InsertProduto) => {
      const produtoParaInserir = {
        codigo: data.codigo,
        nome: data.nome,
        unidades_por_pacote: data.unidadesPorPacote,
        pacotes_por_lastro: data.pacotesPorLastro,
        lastros_por_pallet: data.lastrosPorPallet,
        quantidade_pacs_por_pallet: data.quantidadePacsPorPallet,
      };

      const { data: newProduct, error } = await supabase
        .from('produtos')
        .insert(produtoParaInserir)
        .select(fullProductSelect)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Erro ao criar produto: ${error.message}`);
      }

      if (!newProduct) {
        throw new Error('Nenhum produto foi retornado após a criação.');
      }

      return mapProdutoFromDb(newProduct);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}
