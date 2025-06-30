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
import { db } from "./db";
import { eq, desc, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // Produtos
  createProduto(produto: InsertProduto): Promise<Produto>;
  getProdutoByNome(nome: string): Promise<Produto | undefined>;
  searchProdutos(query: string): Promise<Produto[]>;
  
  // Contagens
  createContagem(contagem: InsertContagem): Promise<Contagem>;
  getContagem(id: string): Promise<ContagemWithItens | undefined>;
  getContagens(): Promise<ContagemWithItens[]>;
  updateContagemExcelUrl(id: string, excelUrl: string): Promise<void>;
  
  // Itens de contagem
  createItemContagem(item: InsertItemContagem): Promise<ItemContagem>;
  getItensContagem(contagemId: string): Promise<(ItemContagem & { produto?: Produto })[]>;
}

export class DatabaseStorage implements IStorage {
  async createProduto(insertProduto: InsertProduto): Promise<Produto> {
    const [produto] = await db
      .insert(produtos)
      .values(insertProduto)
      .returning();
    return produto;
  }

  async getProdutoByNome(nome: string): Promise<Produto | undefined> {
    const [produto] = await db
      .select()
      .from(produtos)
      .where(eq(produtos.nome, nome));
    return produto || undefined;
  }

  async searchProdutos(query: string): Promise<Produto[]> {
    if (!query.trim()) return [];
    
    return await db
      .select()
      .from(produtos)
      .where(ilike(produtos.nome, `%${query}%`))
      .limit(10);
  }

  async createContagem(insertContagem: InsertContagem): Promise<Contagem> {
    const [contagem] = await db
      .insert(contagens)
      .values(insertContagem)
      .returning();
    return contagem;
  }

  async getContagem(id: string): Promise<ContagemWithItens | undefined> {
    const [contagem] = await db
      .select()
      .from(contagens)
      .where(eq(contagens.id, id));
    
    if (!contagem) return undefined;

    const itens = await this.getItensContagem(id);
    
    return {
      ...contagem,
      itens,
    };
  }

  async getContagens(): Promise<ContagemWithItens[]> {
    const allContagens = await db
      .select()
      .from(contagens)
      .orderBy(desc(contagens.data), desc(contagens.createdAt));

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

  async updateContagemExcelUrl(id: string, excelUrl: string): Promise<void> {
    await db
      .update(contagens)
      .set({ excelUrl })
      .where(eq(contagens.id, id));
  }

  async createItemContagem(insertItem: InsertItemContagem): Promise<ItemContagem> {
    const [item] = await db
      .insert(itensContagem)
      .values(insertItem)
      .returning();
    return item;
  }

  async getItensContagem(contagemId: string): Promise<(ItemContagem & { produto?: Produto })[]> {
    const itens = await db
      .select({
        id: itensContagem.id,
        contagemId: itensContagem.contagemId,
        produtoId: itensContagem.produtoId,
        nomeLivre: itensContagem.nomeLivre,
        pallets: itensContagem.pallets,
        lastros: itensContagem.lastros,
        pacotes: itensContagem.pacotes,
        unidades: itensContagem.unidades,
        produto: produtos,
      })
      .from(itensContagem)
      .leftJoin(produtos, eq(itensContagem.produtoId, produtos.id))
      .where(eq(itensContagem.contagemId, contagemId));

    return itens.map(item => ({
      id: item.id,
      contagemId: item.contagemId,
      produtoId: item.produtoId,
      nomeLivre: item.nomeLivre,
      pallets: item.pallets,
      lastros: item.lastros,
      pacotes: item.pacotes,
      unidades: item.unidades,
      produto: item.produto || undefined,
    }));
  }
}

export const storage = new DatabaseStorage();
