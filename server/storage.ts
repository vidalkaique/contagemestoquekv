import { 
  produtos, 
  contagens, 
  itensContagem,
  type Produto, 
  type InsertProduto,
  type Contagem,
  type InsertContagem,
  type ItemContagem,
  type InsertItemContagem,
  type ContagemWithItens
} from "@shared/schema";
import { supabase } from "./supabase";
import { eq, desc, ilike, or } from "drizzle-orm";

export interface IStorage {
  // Produtos
  createProduto(produto: InsertProduto): Promise<Produto>;
  getProdutoByNome(nome: string): Promise<Produto | undefined>;
  getProdutoByCodigo(codigo: string): Promise<Produto | undefined>;
  searchProdutos(query: string): Promise<Produto[]>;
  getAllProdutos(): Promise<Produto[]>;
  updateProduto(id: string, produto: Partial<InsertProduto>): Promise<Produto>;
  deleteProduto(id: string): Promise<void>;
  
  // Contagens
  createContagem(contagem: InsertContagem): Promise<Contagem>;
  getContagem(id: string): Promise<ContagemWithItens | undefined>;
  getContagens(): Promise<ContagemWithItens[]>;
  getUnfinishedContagens(): Promise<ContagemWithItens[]>;
  updateContagemExcelUrl(id: string, excelUrl: string): Promise<void>;
  updateContagem(id: string, data: Partial<Contagem>): Promise<void>;
  
  // Itens de contagem
  createItemContagem(item: InsertItemContagem): Promise<ItemContagem>;
  getItensContagem(contagemId: string): Promise<(ItemContagem & { produto?: Produto })[]>;
}

export class SupabaseStorage implements IStorage {
  async createProduto(insertProduto: InsertProduto): Promise<Produto> {
    // Converter camelCase para snake_case
    const produtoData = {
      codigo: insertProduto.codigo,
      nome: insertProduto.nome,
      unidades_por_pacote: insertProduto.unidadesPorPacote,
      pacotes_por_lastro: insertProduto.pacotesPorLastro,
      lastros_por_pallet: insertProduto.lastrosPorPallet
    };

    const { data, error } = await supabase
      .from('produtos')
      .insert(produtoData)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating produto:', error);
      throw error;
    }
    return data;
  }

  async getProdutoByNome(nome: string): Promise<Produto | undefined> {
    const { data, error } = await supabase
      .from('produtos')
      .select(`
        id,
        codigo,
        nome,
        unidades_por_pacote,
        pacotes_por_lastro,
        lastros_por_pallet,
        created_at
      `)
      .eq('nome', nome)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return undefined;

    return {
      id: data.id,
      codigo: data.codigo,
      nome: data.nome,
      unidadesPorPacote: parseInt(data.unidades_por_pacote as any) || 1,
      pacotesPorLastro: parseInt(data.pacotes_por_lastro as any) || 1,
      lastrosPorPallet: parseInt(data.lastros_por_pallet as any) || 1,
      createdAt: data.created_at
    };
  }

  async getProdutoByCodigo(codigo: string): Promise<Produto | undefined> {
    const { data, error } = await supabase
      .from('produtos')
      .select(`
        id,
        codigo,
        nome,
        unidades_por_pacote,
        pacotes_por_lastro,
        lastros_por_pallet,
        created_at
      `)
      .eq('codigo', codigo)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return undefined;

    return {
      id: data.id,
      codigo: data.codigo,
      nome: data.nome,
      unidadesPorPacote: parseInt(data.unidades_por_pacote as any) || 1,
      pacotesPorLastro: parseInt(data.pacotes_por_lastro as any) || 1,
      lastrosPorPallet: parseInt(data.lastros_por_pallet as any) || 1,
      createdAt: data.created_at
    };
  }

  async searchProdutos(query: string): Promise<Produto[]> {
    if (!query.trim()) return [];
    
    const { data, error } = await supabase
      .from('produtos')
      .select(`
        id,
        codigo,
        nome,
        unidades_por_pacote,
        pacotes_por_lastro,
        lastros_por_pallet,
        created_at
      `)
      .or(`nome.ilike.%${query}%,codigo.ilike.%${query}%`)
      .limit(10);
      
    if (error) throw error;
    
    return (data || []).map(produto => ({
      id: produto.id,
      codigo: produto.codigo,
      nome: produto.nome,
      unidadesPorPacote: parseInt(produto.unidades_por_pacote as any) || 1,
      pacotesPorLastro: parseInt(produto.pacotes_por_lastro as any) || 1,
      lastrosPorPallet: parseInt(produto.lastros_por_pallet as any) || 1,
      createdAt: produto.created_at
    }));
  }

  async getAllProdutos(): Promise<Produto[]> {
    const { data, error } = await supabase
      .from('produtos')
      .select(`
        id,
        codigo,
        nome,
        unidades_por_pacote,
        pacotes_por_lastro,
        lastros_por_pallet,
        created_at
      `)
      .order('nome');
      
    if (error) throw error;
    
    // Garantir que os campos numéricos sejam números
    const produtos = (data || []).map(produto => {
      // Converter explicitamente cada campo
      const unidadesPorPacote = parseInt(produto.unidades_por_pacote as any) || 1;
      const pacotesPorLastro = parseInt(produto.pacotes_por_lastro as any) || 1;
      const lastrosPorPallet = parseInt(produto.lastros_por_pallet as any) || 1;

      return {
        id: produto.id,
        codigo: produto.codigo,
        nome: produto.nome,
        unidadesPorPacote,
        pacotesPorLastro,
        lastrosPorPallet,
        createdAt: produto.created_at
      };
    });

    return produtos;
  }

  async updateProduto(id: string, produto: Partial<InsertProduto>): Promise<Produto> {
    // Converter camelCase para snake_case e garantir que os valores numéricos sejam válidos
    const produtoData: any = {};
    
    if (produto.codigo) produtoData.codigo = produto.codigo;
    if (produto.nome) produtoData.nome = produto.nome;
    if (typeof produto.unidadesPorPacote === 'number') {
      produtoData.unidades_por_pacote = Math.max(0, produto.unidadesPorPacote);
    }
    if (typeof produto.pacotesPorLastro === 'number') {
      produtoData.pacotes_por_lastro = Math.max(0, produto.pacotesPorLastro);
    }
    if (typeof produto.lastrosPorPallet === 'number') {
      produtoData.lastros_por_pallet = Math.max(0, produto.lastrosPorPallet);
    }

    const { data, error } = await supabase
      .from('produtos')
      .update(produtoData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Garantir que os valores retornados sejam números
    return {
      ...data,
      unidadesPorPacote: Number(data.unidades_por_pacote) || 0,
      pacotesPorLastro: Number(data.pacotes_por_lastro) || 0,
      lastrosPorPallet: Number(data.lastros_por_pallet) || 0,
    };
  }

  async deleteProduto(id: string): Promise<void> {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  async createContagem(insertContagem: InsertContagem): Promise<Contagem> {
    const { data, error } = await supabase
      .from('contagens')
      .insert(insertContagem)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async getContagem(id: string): Promise<ContagemWithItens | undefined> {
    const { data: contagem, error: contagemError } = await supabase
      .from('contagens')
      .select()
      .eq('id', id)
      .single();
    
    if (contagemError && contagemError.code !== 'PGRST116') throw contagemError;
    if (!contagem) return undefined;

    const itens = await this.getItensContagem(id);
    
    return {
      ...contagem,
      itens,
    };
  }

  async getContagens(): Promise<ContagemWithItens[]> {
    const { data: allContagens, error: contagensError } = await supabase
      .from('contagens')
      .select()
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });

    if (contagensError) throw contagensError;
    if (!allContagens) return [];

    const contagensWithItens = await Promise.all(
      allContagens.map(async (contagem) => {
        const itens = await this.getItensContagem(contagem.id);
        return {
          ...contagem,
          itens,
        };
      })
    );

    return contagensWithItens;
  }

  async getUnfinishedContagens(): Promise<ContagemWithItens[]> {
    try {
      console.log("Buscando contagens não finalizadas...");
      
      const { data: allContagens, error: contagensError } = await supabase
        .from('contagens')
        .select()
        .eq('finalizada', false)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });

      if (contagensError) {
        console.error("Erro ao buscar contagens:", contagensError);
        throw contagensError;
      }
      
      console.log("Contagens encontradas:", allContagens);
      
      if (!allContagens) return [];

      const contagensWithItens = await Promise.all(
        allContagens.map(async (contagem) => {
          const itens = await this.getItensContagem(contagem.id);
          return {
            ...contagem,
            itens,
          };
        })
      );

      return contagensWithItens;
    } catch (error) {
      console.error("Erro detalhado em getUnfinishedContagens:", error);
      throw error;
    }
  }

  async updateContagemExcelUrl(id: string, excelUrl: string): Promise<void> {
    const { error } = await supabase
      .from('contagens')
      .update({ excel_url: excelUrl })
      .eq('id', id);
      
    if (error) throw error;
  }

  async updateContagem(id: string, data: Partial<Contagem>): Promise<void> {
    const { error } = await supabase
      .from('contagens')
      .update(data)
      .eq('id', id);
      
    if (error) throw error;
  }

  async createItemContagem(insertItem: InsertItemContagem): Promise<ItemContagem> {
    // Converter camelCase para snake_case
    const itemData = {
      contagem_id: insertItem.contagem_id,
      produto_id: insertItem.produto_id,
      nome_livre: insertItem.nome_livre,
      pallets: insertItem.pallets,
      lastros: insertItem.lastros,
      pacotes: insertItem.pacotes,
      unidades: insertItem.unidades,
    };

    const { data, error } = await supabase
      .from('itens_contagem')
      .insert(itemData)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating item contagem:', error);
      throw error;
    }
    return data;
  }

  async getItensContagem(contagemId: string): Promise<(ItemContagem & { produto?: Produto })[]> {
    const { data, error } = await supabase
      .from('itens_contagem')
      .select(`
        *,
        produto:produtos(*)
      `)
      .eq('contagem_id', contagemId);

    if (error) throw error;
    if (!data) return [];

    return data.map(item => ({
      ...item,
      produto: item.produto || undefined
    }));
  }
}

export const storage = new SupabaseStorage();
