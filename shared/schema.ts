import { pgTable, text, serial, integer, uuid, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const produtos = pgTable("produtos", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").notNull().unique(),
  nome: text("nome").notNull(),
  unidadesPorPacote: integer("unidades_por_pacote").notNull().default(1),
  pacotesPorLastro: integer("pacotes_por_lastro").notNull().default(1),
  lastrosPorPallet: integer("lastros_por_pallet").notNull().default(1),
  quantidadePacsPorPallet: integer("quantidade_pacs_por_pallet"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contagens = pgTable("contagens", {
  id: uuid("id").primaryKey().defaultRandom(),
  data: date("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  excelUrl: text("excel_url"),
  finalizada: boolean("finalizada").notNull().default(false),
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
});

// Relations
export const contagensRelations = relations(contagens, ({ many }) => ({
  itens: many(itensContagem),
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
}));

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
  data: z.string().refine((data) => {
    try {
      const date = new Date(data);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }, "Data inválida"),
  finalizada: z.boolean().optional().default(false)
});

export const insertItemContagemSchema = createInsertSchema(itensContagem).omit({
  id: true,
}).extend({
  contagem_id: z.string().uuid(),
  produto_id: z.string().uuid().optional(),
  nome_livre: z.string().optional(),
  pallets: z.number().min(0, "Pallets não pode ser negativo"),
  lastros: z.number().min(0, "Lastros não pode ser negativo"),
  pacotes: z.number().min(0, "Pacotes não pode ser negativo"),
  unidades: z.number().min(0, "Unidades não pode ser negativo"),
});

// Types
export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = Omit<Produto, 'id' | 'createdAt' | 'quantidadePacsPorPallet'>;

export type Contagem = typeof contagens.$inferSelect;
export type InsertContagem = z.infer<typeof insertContagemSchema>;

export type ItemContagem = typeof itensContagem.$inferSelect;
export type InsertItemContagem = {
  contagem_id: string;
  produto_id?: string;
  nome_livre?: string;
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
};

export type ContagemWithItens = Contagem & {
  itens: (ItemContagem & { produto?: Produto })[];
};
