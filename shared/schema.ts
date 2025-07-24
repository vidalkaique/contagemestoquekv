import { pgTable, text, serial, integer, uuid, date, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const produtos = pgTable("produtos", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").notNull().unique(),
  nome: text("nome").notNull(),
  tag: text("tag"),
  unidadesPorPacote: integer("unidades_por_pacote").notNull().default(1),
  pacotesPorLastro: integer("pacotes_por_lastro").notNull().default(1),
  lastrosPorPallet: integer("lastros_por_pallet").notNull().default(1),
  quantidadePacsPorPallet: integer("quantidade_pacs_por_pallet"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const produtoEstoque = pgTable("produto_estoque", {
  id: uuid("id").primaryKey().defaultRandom(),
  produtoId: uuid("produto_id").notNull().references(() => produtos.id, { onDelete: "cascade" }),
  estoqueId: uuid("estoque_id").notNull().references(() => estoques.id, { onDelete: "cascade" }),
  localizacao: text("localizacao"),
  quantidadeMinima: integer("quantidade_minima").notNull().default(0),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull()
}, (table) => ({
  // Índice único para garantir que um produto só pode estar uma vez em cada estoque
  unqProdutoEstoque: uniqueIndex("unq_produto_estoque").on(table.produtoId, table.estoqueId),
}));

export const estoques = pgTable("estoques", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Estoque = typeof estoques.$inferSelect & {
  produtos?: Array<Produto & { produtoEstoque?: ProdutoEstoque }>;
};

export type ProdutoEstoque = typeof produtoEstoque.$inferSelect & {
  produto?: Produto;
  estoque?: Estoque;
};

export type ProdutoComEstoque = Produto & {
  produtoEstoque?: ProdutoEstoque;
};

export const contagens = pgTable("contagens", {
  id: uuid("id").primaryKey().defaultRandom(),
  estoqueId: uuid("estoque_id").references(() => estoques.id),
  data: date("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  excelUrl: text("excel_url"),
  finalizada: boolean("finalizada").notNull().default(false),
  qntdProdutos: integer("qntd_produtos").notNull().default(0),
  matricula: text("matricula"),
  nome: text("nome"),
});

export const itensContagem = pgTable("itens_contagem", {
  id: uuid("id").primaryKey().defaultRandom(),
  contagemId: uuid("contagem_id").notNull().references(() => contagens.id, { onDelete: "cascade" }),
  produtoId: uuid("produto_id").references(() => produtos.id),
  nomeLivre: text("nome_livre"),
  pallets: integer("pallets").notNull().default(0),
  lastros: integer("lastros").notNull().default(0),
  pacotes: integer("pacotes").notNull().default(0),
  unidades: integer("unidades").notNull().default(0),
  total: integer("total").notNull().default(0),
  totalPacotes: integer("total_pacotes").notNull().default(0),
});

// Relations
export const contagensRelations = relations(contagens, ({ many, one }) => ({
  itens: many(itensContagem),
  estoque: one(estoques, {
    fields: [contagens.estoqueId],
    references: [estoques.id],
  }),
}));

export const itensContagemRelations = relations(itensContagem, ({ one }) => ({
  contagem: one(contagens, {
    fields: [itensContagem.contagemId],
    references: [contagens.id],
  }),
  produto: one(produtos, {
    fields: [itensContagem.produtoId],
    references: [produtos.id],
  }),
}));

export const produtosRelations = relations(produtos, ({ many }) => ({
  itens: many(itensContagem),
  estoques: many(produtoEstoque, { relationName: "produto_estoque" }),
}));

export const estoquesRelations = relations(estoques, ({ many }) => ({
  produtos: many(produtoEstoque, { relationName: "produto_estoque" }),
  contagens: many(contagens),
}));

export const produtoEstoqueRelations = relations(produtoEstoque, ({ one }) => ({
  produto: one(produtos, {
    fields: [produtoEstoque.produtoId],
    references: [produtos.id],
  }),
  estoque: one(estoques, {
    fields: [produtoEstoque.estoqueId],
    references: [estoques.id],
  }),
}));

// Schema para produto_estoque
export const insertProdutoEstoqueSchema = createInsertSchema(produtoEstoque).omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
}).extend({
  produtoId: z.string().uuid("ID do produto inválido"),
  estoqueId: z.string().uuid("ID do estoque inválido"),
  quantidadeMinima: z.number().min(0, "A quantidade mínima não pode ser negativa").optional(),
});

// Insert schemas
export const insertProdutoSchema = createInsertSchema(produtos).omit({
  id: true,
  createdAt: true,
}).extend({
  unidadesPorPacote: z.number().min(0, "Unidades por pacote não pode ser negativo"),
  pacotesPorLastro: z.number().min(0, "Pacotes por lastro não pode ser negativo"),
  lastrosPorPallet: z.number().min(0, "Lastros por pallet não pode ser negativo"),
});

export const insertContagemSchema = createInsertSchema(contagens).omit({
  id: true,
  createdAt: true,
  excelUrl: true,
}).extend({
  estoqueId: z.string().uuid(),
  data: z.string().refine((data) => {
    try {
      const date = new Date(data);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }, "Data inválida"),
  finalizada: z.boolean().optional().default(false),
  matricula: z.string().min(1, "A matrícula é obrigatória"),
  nome: z.string().min(1, "O nome é obrigatório"),
});

export const insertItemContagemSchema = createInsertSchema(itensContagem).omit({
  id: true,
}).extend({
  contagemId: z.string().uuid(),
  produtoId: z.string().uuid().optional(),
  nomeLivre: z.string().optional(),
  pallets: z.number().min(0, "Pallets não pode ser negativo"),
  lastros: z.number().min(0, "Lastros não pode ser negativo"),
  pacotes: z.number().min(0, "Pacotes não pode ser negativo"),
  unidades: z.number().min(0, "Unidades não pode ser negativo"),
  codigo: z.string().optional(), // Adicionado para suportar o código do produto
});

// Types
export const novaContagemSchema = z.object({
  estoqueId: z.string().uuid(),
  data_contagem: z.string().optional(),
});

export type NovaContagem = z.infer<typeof novaContagemSchema>;

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = Omit<Produto, 'id' | 'createdAt'>;

export type Contagem = typeof contagens.$inferSelect & {
  qntdProdutos: number;
};

export type InsertContagem = z.infer<typeof insertContagemSchema>;

export type ItemContagem = typeof itensContagem.$inferSelect;
export type InsertItemContagem = z.infer<typeof insertItemContagemSchema>;

export type ContagemWithItens = Contagem & {
  itens: (ItemContagem & { produto: Produto | null })[];
  produto: Produto | null;
  estoque: Estoque | null;
  nome: string | null;
  matricula: string | null;
};

export type EstoqueComProdutos = Estoque & {
  produtos: Array<Produto & { produtoEstoque?: ProdutoEstoque }>;
};
