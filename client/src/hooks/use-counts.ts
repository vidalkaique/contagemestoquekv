import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ContagemWithItens, InsertContagem, Produto } from "@shared/schema";

interface SupabaseContagem {
  id: string;
  data: string;
  finalizada: boolean;
  excel_url: string | null;
  created_at: string;
  itens_contagem: Array<{
    id: string;
    produto_id: string | null;
    nome_livre: string | null;
    pallets: number;
    lastros: number;
    pacotes: number;
    unidades: number;
    total: number;
    created_at: string;
    produtos?: {
      id: string;
      codigo: string;
      nome: string;
      unidades_por_pacote: number;
      pacotes_por_lastro: number;
      lastros_por_pallet: number;
      created_at: string;
    } | null;
  }>;
}

export function useCounts() {
  return useQuery<ContagemWithItens[]>({
    queryKey: ["/api/contagens"],
    queryFn: async () => {
      const { data: rawData, error } = await supabase
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
      if (!rawData) return [];

      const data = rawData as SupabaseContagem[];

      return data.map(contagem => ({
        id: contagem.id,
        data: contagem.data,
        finalizada: contagem.finalizada,
        excelUrl: contagem.excel_url,
        createdAt: new Date(contagem.created_at),
        itens: (contagem.itens_contagem || []).map(item => ({
          id: item.id,
          contagemId: contagem.id,
          produtoId: item.produto_id,
          nomeLivre: item.nome_livre,
          pallets: item.pallets,
          lastros: item.lastros,
          pacotes: item.pacotes,
          unidades: item.unidades,
          total: item.total,
          produto: item.produtos ? {
            id: item.produtos.id,
            codigo: item.produtos.codigo,
            nome: item.produtos.nome,
            unidadesPorPacote: item.produtos.unidades_por_pacote,
            pacotesPorLastro: item.produtos.pacotes_por_lastro,
            lastrosPorPallet: item.produtos.lastros_por_pallet,
            createdAt: new Date(item.produtos.created_at)
          } : undefined
        }))
      }));
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
      if (!result) throw new Error('Nenhum dado retornado');

      return {
        id: result.id,
        data: result.data,
        finalizada: result.finalizada,
        excelUrl: result.excel_url,
        createdAt: new Date(result.created_at),
        itens: []
      } as ContagemWithItens;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contagens"] });
    },
  });
}
