import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Produto, InsertProduto, ProdutoComEstoque } from "@shared/schema";
import { supabase } from "@/lib/supabase";

const fullProductSelect = 'id, codigo, nome, created_at, unidades_por_pacote, pacotes_por_lastro, lastros_por_pallet, quantidade_pacs_por_pallet';

const mapProdutoFromDb = (produto: any): Produto => ({
  id: produto.id,
  codigo: produto.codigo,
  nome: produto.nome,
  createdAt: new Date(produto.created_at),
  updatedAt: new Date(produto.updated_at || produto.created_at),
  unidadesPorPacote: produto.unidades_por_pacote ?? 1,
  pacotesPorLastro: produto.pacotes_por_lastro ?? 1,
  lastrosPorPallet: produto.lastros_por_pallet ?? 1,
  quantidadePacsPorPallet: produto.quantidade_pacs_por_pallet ?? 0,
  ativo: produto.ativo ?? true,
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

interface ProductSearchOptions {
  query: string;
  estoqueId?: string;
}

export function useProductSearch({ query, estoqueId }: ProductSearchOptions) {
  return useQuery<ProdutoComEstoque[]>({ 
    queryKey: ["produtos/search", { query, estoqueId }],
    queryFn: async () => {
      const searchTerm = query.trim().toLowerCase();
      
      // Se não houver termo de busca, retorna vazio
      if (!searchTerm) return [];
      
      // Se houver um estoqueId, busca apenas os produtos desse estoque
      if (estoqueId) {
        const { data: produtosEstoque, error: peError } = await supabase
          .from('produto_estoque')
          .select(`
            *,
            produto:produtos(${fullProductSelect})
          `)
          .eq('estoque_id', estoqueId)
          .or(
            `produto.nome.ilike.%${searchTerm}%,` +
            `produto.codigo.ilike.%${searchTerm}%`
          );
          
        if (peError) throw peError;
        
        return (produtosEstoque || []).map(pe => ({
          ...mapProdutoFromDb(pe.produto),
          produtoEstoque: {
            id: pe.id,
            produtoId: pe.produto_id,
            estoqueId: pe.estoque_id,
            localizacao: pe.localizacao,
            quantidadeMinima: pe.quantidade_minima,
            criadoEm: new Date(pe.criado_em),
            atualizadoEm: new Date(pe.atualizado_em)
          }
        }));
      }
      
      // Busca geral sem filtro de estoque
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

      // Se não encontrou resultados, tenta uma busca mais flexível
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

// Hook para buscar produtos de um estoque específico
export function useProductsByEstoque(estoqueId?: string) {
  return useQuery<ProdutoComEstoque[]>({
    queryKey: ["produtos/estoque", estoqueId],
    queryFn: async () => {
      if (!estoqueId) return [];
      
      const { data: produtosEstoque, error } = await supabase
        .from('produto_estoque')
        .select(`
          *,
          produto:produtos(${fullProductSelect})
        `)
        .eq('estoque_id', estoqueId)
        .order('criado_em', { ascending: false });
        
      if (error) throw error;
      
      return (produtosEstoque || []).map(pe => ({
        ...mapProdutoFromDb(pe.produto),
        produtoEstoque: {
          id: pe.id,
          produtoId: pe.produto_id,
          estoqueId: pe.estoque_id,
          localizacao: pe.localizacao,
          quantidadeMinima: pe.quantidade_minima,
          criadoEm: new Date(pe.criado_em),
          atualizadoEm: new Date(pe.atualizado_em)
        }
      }));
    },
    enabled: !!estoqueId,
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
