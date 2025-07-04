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

export class Storage {
  async createContagem(insertContagem: InsertContagem): Promise<Contagem> {
    try {
      // Garantir que a data está no formato correto (YYYY-MM-DD)
      const date = new Date(insertContagem.data);
      if (isNaN(date.getTime())) {
        throw new Error('Data inválida');
      }
      
      const formattedDate = date.toISOString().split('T')[0];
      console.log('Data formatada:', formattedDate);
      
      const { data, error } = await supabase
        .from('contagens')
        .insert({
          data: formattedDate,
          finalizada: insertContagem.finalizada || false
        })
        .select('id, data, finalizada, excel_url, created_at')
        .single();
        
      if (error) {
        console.error('Error creating contagem:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from insert');
      }
      
      return {
        id: data.id,
        data: data.data,
        finalizada: data.finalizada,
        excelUrl: data.excel_url,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Error in createContagem:', error);
      throw error;
    }
  }

  async getContagens(): Promise<ContagemWithItens[]> {
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
      
    if (error) {
      console.error('Error fetching contagens:', error);
      throw error;
    }

    if (!rawData) {
      return [];
    }

    const data = rawData as unknown as SupabaseContagem[];

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
        createdAt: new Date(item.created_at),
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
} 