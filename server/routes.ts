import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProdutoSchema, insertContagemSchema, insertItemContagemSchema } from "@shared/schema";
import { z } from "zod";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function registerRoutes(app: Express): Promise<Server> {
  // Produtos
  app.get("/api/produtos/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const produtos = await storage.searchProdutos(query);
      res.json(produtos);
    } catch (error) {
      console.error("Error searching produtos:", error);
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  app.post("/api/produtos", async (req, res) => {
    try {
      const data = insertProdutoSchema.parse(req.body);
      
      // Check if produto already exists
      const existing = await storage.getProdutoByNome(data.nome);
      if (existing) {
        return res.json(existing);
      }
      
      const produto = await storage.createProduto(data);
      res.json(produto);
    } catch (error) {
      console.error("Error creating produto:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar produto" });
    }
  });

  // Contagens
  app.get("/api/contagens", async (req, res) => {
    try {
      const contagens = await storage.getContagens();
      res.json(contagens);
    } catch (error) {
      console.error("Error fetching contagens:", error);
      res.status(500).json({ message: "Erro ao buscar contagens" });
    }
  });

  app.get("/api/contagens/:id", async (req, res) => {
    try {
      const contagem = await storage.getContagem(req.params.id);
      if (!contagem) {
        return res.status(404).json({ message: "Contagem não encontrada" });
      }
      res.json(contagem);
    } catch (error) {
      console.error("Error fetching contagem:", error);
      res.status(500).json({ message: "Erro ao buscar contagem" });
    }
  });

  app.post("/api/contagens", async (req, res) => {
    try {
      const data = insertContagemSchema.parse(req.body);
      const contagem = await storage.createContagem(data);
      res.json(contagem);
    } catch (error) {
      console.error("Error creating contagem:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar contagem" });
    }
  });

  // Itens de contagem
  app.post("/api/contagens/:id/itens", async (req, res) => {
    try {
      const contagemId = req.params.id;
      const data = insertItemContagemSchema.parse({
        ...req.body,
        contagemId,
      });

      // Create or find produto if nome is provided
      if (data.nomeLivre && !data.produtoId) {
        const existingProduto = await storage.getProdutoByNome(data.nomeLivre);
        if (existingProduto) {
          data.produtoId = existingProduto.id;
        } else {
          const newProduto = await storage.createProduto({ nome: data.nomeLivre });
          data.produtoId = newProduto.id;
        }
      }

      const item = await storage.createItemContagem(data);
      res.json(item);
    } catch (error) {
      console.error("Error creating item contagem:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao adicionar item à contagem" });
    }
  });

  // Generate Excel
  app.post("/api/contagens/:id/excel", async (req, res) => {
    try {
      const contagem = await storage.getContagem(req.params.id);
      if (!contagem) {
        return res.status(404).json({ message: "Contagem não encontrada" });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Contagem de Estoque");

      // Header
      worksheet.addRow([
        "Contagem de Estoque",
        "",
        "",
        "",
        "",
        format(new Date(contagem.data), "dd/MM/yyyy", { locale: ptBR })
      ]);
      worksheet.addRow([]);

      // Column headers
      const headerRow = worksheet.addRow([
        "Produto",
        "Pallets",
        "Lastros", 
        "Pacotes",
        "Unidades"
      ]);

      // Style header
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });

      // Data rows
      contagem.itens.forEach(item => {
        const nomeDisplay = item.produto?.nome || item.nomeLivre || "Produto sem nome";
        worksheet.addRow([
          nomeDisplay,
          item.pallets,
          item.lastros,
          item.pacotes,
          item.unidades
        ]);
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Set headers for download
      const filename = `contagem_${format(new Date(contagem.data), "yyyy-MM-dd")}_${contagem.id.slice(0, 8)}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(buffer);
    } catch (error) {
      console.error("Error generating Excel:", error);
      res.status(500).json({ message: "Erro ao gerar arquivo Excel" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
