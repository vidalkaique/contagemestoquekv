import { pgTable, text, serial, integer, uuid, date, timestamp, relations } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const produtos = pgTable("produtos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contagens = pgTable("contagens", {
  id: uuid("id").primaryKey().defaultRandom(),
  data: date("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  excelUrl: text("excel_url"),
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
});

export const insertContagemSchema = createInsertSchema(contagens).omit({
  id: true,
  createdAt: true,
  excelUrl: true,
});

export const insertItemContagemSchema = createInsertSchema(itensContagem).omit({
  id: true,
}).extend({
  pallets: z.number().min(0, "Pallets não pode ser negativo"),
  lastros: z.number().min(0, "Lastros não pode ser negativo"),
  pacotes: z.number().min(0, "Pacotes não pode ser negativo"),
  unidades: z.number().min(0, "Unidades não pode ser negativo"),
});

// Types
export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = z.infer<typeof insertProdutoSchema>;

export type Contagem = typeof contagens.$inferSelect;
export type InsertContagem = z.infer<typeof insertContagemSchema>;

export type ItemContagem = typeof itensContagem.$inferSelect;
export type InsertItemContagem = z.infer<typeof insertItemContagemSchema>;

export type ContagemWithItens = Contagem & {
  itens: (ItemContagem & { produto?: Produto })[];
};
