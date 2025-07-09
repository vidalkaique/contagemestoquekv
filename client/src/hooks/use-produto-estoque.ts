import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProdutoEstoque } from "@shared/schema";

type InsertProdutoEstoque = Omit<ProdutoEstoque, 'id' | 'criadoEm' | 'atualizadoEm'> & {
  id?: string;
  criadoEm?: string | Date;
  atualizadoEm?: string | Date;
};
import { toast } from "sonner";

export function useProdutosPorEstoque(estoqueId?: string) {
  return useQuery({
    queryKey: ["produtos-por-estoque", estoqueId],
    queryFn: async () => {
      if (!estoqueId) return [];
      
      const { data, error } = await supabase
        .from("produto_estoque")
        .select(`
          *,
          produto:produtos(*)
        `)
        .eq("estoque_id", estoqueId)
        .order("criado_em", { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar produtos do estoque:", error);
        throw new Error("Falha ao carregar produtos do estoque");
      }
      
      return data as unknown as Array<ProdutoEstoque & { produto: any }>;
    },
    enabled: !!estoqueId,
  });
}

export function useAdicionarProdutoAoEstoque() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertProdutoEstoque) => {
      const { data: produtoEstoque, error } = await supabase
        .from("produto_estoque")
        .insert({
          produto_id: data.produtoId,
          estoque_id: data.estoqueId,
          localizacao: data.localizacao,
          quantidade_minima: data.quantidadeMinima || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return produtoEstoque;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["produtos-por-estoque", variables.estoqueId] 
      });
      toast.success("Produto adicionado ao estoque com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao adicionar produto ao estoque:", error);
      toast.error("Erro ao adicionar produto ao estoque: " + error.message);
    },
  });
}

export function useRemoverProdutoDoEstoque() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("produto_estoque")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (_, id) => {
      // Invalida todas as consultas de produtos por estoque
      queryClient.invalidateQueries({ queryKey: ["produtos-por-estoque"] });
      toast.success("Produto removido do estoque com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao remover produto do estoque:", error);
      toast.error("Erro ao remover produto do estoque: " + error.message);
    },
  });
}

export function useAtualizarProdutoNoEstoque() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<InsertProdutoEstoque, "id">>;
    }) => {
      const { data: produtoEstoque, error } = await supabase
        .from("produto_estoque")
        .update({
          localizacao: updates.localizacao,
          quantidade_minima: updates.quantidadeMinima,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return produtoEstoque;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["produtos-por-estoque", data.estoque_id] 
      });
      toast.success("Produto no estoque atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar produto no estoque:", error);
      toast.error("Erro ao atualizar produto no estoque: " + error.message);
    },
  });
}
