import { supabase } from './_supabase';
import type { 
  Produto, 
  InsertProduto,
  Contagem,
  InsertContagem,
  ItemContagem,
  InsertItemContagem,
  ContagemWithItens
} from "@shared/schema";

export class Storage {
  async createContagem(insertContagem: InsertContagem): Promise<Contagem> {
    const { data, error } = await supabase
      .from('contagens')
      .insert({
        data: insertContagem.data,
        finalizada: insertContagem.finalizada || false
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating contagem:', error);
      throw error;
    }
    
    return {
      id: data.id,
      data: data.data,
      finalizada: data.finalizada,
      excelUrl: data.excel_url,
      createdAt: data.created_at
    };
  }

  async getContagens(): Promise<ContagemWithItens[]> {
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
      
    if (error) {
      console.error('Error fetching contagens:', error);
      throw error;
    }

    return (data || []).map(contagem => ({
      id: contagem.id,
      data: contagem.data,
      finalizada: contagem.finalizada,
      excelUrl: contagem.excel_url,
      createdAt: contagem.created_at,
      itens: (contagem.itens_contagem || []).map(item => ({
        id: item.id,
        contagemId: contagem.id,
        produtoId: item.produto_id,
        nomeLivre: item.nome_livre,
        pallets: item.pallets,
        lastros: item.lastros,
        pacotes: item.pacotes,
        unidades: item.unidades,
        createdAt: item.created_at,
        produto: item.produtos ? {
          id: item.produtos.id,
          codigo: item.produtos.codigo,
          nome: item.produtos.nome,
          unidadesPorPacote: parseInt(item.produtos.unidades_por_pacote as any) || 1,
          pacotesPorLastro: parseInt(item.produtos.pacotes_por_lastro as any) || 1,
          lastrosPorPallet: parseInt(item.produtos.lastros_por_pallet as any) || 1,
          createdAt: item.produtos.created_at
        } : undefined
      }))
    }));
  }
} 