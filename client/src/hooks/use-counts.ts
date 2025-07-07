import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ContagemWithItens, InsertContagem } from "@shared/schema";
import type { Database } from "@/lib/database.types";

type Tables = Database['public']['Tables'];
type ContagemRow = Tables['contagens']['Row'];
type ProdutoRow = Tables['produtos']['Row'];

type DatabaseContagem = {
  id: string;
  data: string;
  finalizada: boolean;
  excel_url: string | null;
  created_at: string;
  estoque_id: string | null;
  estoques: Array<{
    id: string;
    nome: string;
    created_at: string;
  }> | null;
  itens_contagem: Array<{
    id: string;
    contagem_id: string;
    produto_id: string | null;
    nome_livre: string | null;
    pallets: number;
    lastros: number;
    pacotes: number;
    unidades: number;
    total: number;
    total_pacotes: number;
    created_at: string;
    produtos: {
      id: string;
      codigo: string;
      nome: string;
      unidades_por_pacote: number;
      pacotes_por_lastro: number;
      lastros_por_pallet: number;
      quantidade_pacs_por_pallet: number | null;
      created_at: string;
    } | null;
  }>;
};

export function useUnfinishedCount() {
  return useQuery<ContagemWithItens | null>({
    queryKey: ["contagens", "unfinished"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contagens')
        .select(`
          id,
          data,
          finalizada,
          excel_url,
          created_at,
          estoque_id,
          estoques (
            id,
            nome,
            created_at
          ),
          itens_contagem (
            id,
            contagem_id,
            produto_id,
            nome_livre,
            pallets,
            lastros,
            pacotes,
            unidades,
            total,
            total_pacotes,
            created_at
          )
        `)
        .eq('finalizada', false)
        .limit(1);

      if (error && error.code !== 'PGRST116') throw error;
      if (!data || data.length === 0) return null;
      const first = data[0];

      // Verifica se estoques é um array e pega o primeiro item
      const estoque = Array.isArray(first.estoques) && first.estoques.length > 0 
        ? first.estoques[0] 
        : null;

      // Convert to ContagemWithItens type
      const contagem: ContagemWithItens = {
        id: first.id,
        data: first.data,
        finalizada: first.finalizada,
        estoqueId: first.estoque_id,
        excelUrl: first.excel_url,
        createdAt: new Date(first.created_at),
        itens: ((first as any).itens_contagem || []).map((item: any) => {
          // Garante que produtos seja um único objeto ou null
          const produtoEntry = Array.isArray(item.produtos) && item.produtos.length > 0 
            ? item.produtos[0] 
            : (item.produtos as any) || null;
          const prodAny = produtoEntry as any;
          // Mantém compatibilidade com código legado
          const produto = prodAny;

          return {
            id: item.id,
            contagemId: item.contagem_id,
            produtoId: item.produto_id,
            nomeLivre: item.nome_livre,
            pallets: item.pallets,
            lastros: item.lastros,
            pacotes: item.pacotes,
            unidades: item.unidades,
            total: item.total,
            totalPacotes: item.total_pacotes,
            unidadesPorPacote: prodAny?.unidades_por_pacote,
            pacotesPorLastro: prodAny?.pacotes_por_lastro,
            lastrosPorPallet: prodAny?.lastros_por_pallet,
            quantidadePacsPorPallet: prodAny?.quantidade_pacs_por_pallet ?? undefined,
            produto: produto ? {
              id: produto.id,
              codigo: produto.codigo,
              nome: produto.nome,
              unidadesPorPacote: prodAny.unidades_por_pacote,
              pacotesPorLastro: prodAny.pacotes_por_lastro,
              lastrosPorPallet: prodAny.lastros_por_pallet,
              quantidadePacsPorPallet: prodAny.quantidade_pacs_por_pallet,
              createdAt: prodAny.created_at ? new Date(prodAny.created_at) : new Date()
            } : null
          };
        }),
        estoque: estoque ? {
          id: estoque.id,
          nome: estoque.nome,
          createdAt: new Date(estoque.created_at)
        } : null
      };

      return contagem;
    },
  });
}

type ContagemLista = DatabaseContagem;

export function useCounts() {
  return useQuery<ContagemWithItens[]>({ 
    queryKey: ["contagens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contagens')
        .select(`
          id,
          data,
          finalizada,
          excel_url,
          created_at,
          estoque_id,
          estoques (
            id,
            nome,
            created_at
          ),
          itens_contagem (
            id,
            contagem_id,
            produto_id,
            nome_livre,
            pallets,
            lastros,
            pacotes,
            unidades,
            total,
            total_pacotes,
            created_at
          )
        `)
        

      if (error) throw error;
      if (!data) return [];

      // Convert to ContagemWithItens[] type
      const resultArray = data.map((contagem) => {
        // Verifica se estoques é um array e pega o primeiro item
        const estoque = Array.isArray(contagem.estoques) && contagem.estoques.length > 0 
          ? contagem.estoques[0] 
          : null;

        const contagemWithItens: ContagemWithItens = {
          id: contagem.id,
          data: contagem.data,
          finalizada: contagem.finalizada,
          estoqueId: contagem.estoque_id,
          excelUrl: contagem.excel_url,
          createdAt: new Date(contagem.created_at),
          itens: [],
          estoque: estoque ? {
            id: estoque.id,
            nome: estoque.nome,
            createdAt: new Date(estoque.created_at)
          } : null
        };


        return contagemWithItens;
      });

      // sort locally by createdAt desc
      resultArray.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
      return resultArray;
    }
  });
}

export function useCreateCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: InsertContagem) => {
      const { data: result, error } = await supabase
        .from('contagens')
        .insert({
          data: payload.data,
          finalizada: payload.finalizada || false,
          estoque_id: payload.estoqueId || null
        })
        .select(`
          id,
          data,
          finalizada,
          excel_url,
          created_at,
          estoque_id
        `)
        .single();

      if (error) throw error;
      if (!result) throw new Error('Nenhum dado retornado');

      const contagem = result as ContagemRow & { estoque_id: string | null };

      const novaContagem: ContagemWithItens = {
        id: contagem.id,
        data: contagem.data,
        finalizada: contagem.finalizada,
        estoqueId: contagem.estoque_id,
        excelUrl: contagem.excel_url,
        createdAt: new Date(contagem.created_at),
        itens: [],
        estoque: null
      };
      
      return novaContagem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contagens"] });
    },
  });
}
