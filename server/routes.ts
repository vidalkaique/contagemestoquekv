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
  app.get("/api/produtos", async (req, res) => {
    try {
      const produtos = await storage.getAllProdutos();
      res.json(produtos);
    } catch (error) {
      console.error("Error fetching produtos:", error);
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

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
      
      // Check if produto already exists by codigo or nome
      const existingCodigo = await storage.getProdutoByCodigo(data.codigo);
      if (existingCodigo) {
        return res.status(400).json({ message: "Produto com este código já existe" });
      }
      
      const existingNome = await storage.getProdutoByNome(data.nome);
      if (existingNome) {
        return res.status(400).json({ message: "Produto com este nome já existe" });
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

  app.put("/api/produtos/:id", async (req, res) => {
    try {
      const data = insertProdutoSchema.partial().parse(req.body);
      const produto = await storage.updateProduto(req.params.id, data);
      res.json(produto);
    } catch (error) {
      console.error("Error updating produto:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar produto" });
    }
  });

  app.delete("/api/produtos/:id", async (req, res) => {
    try {
      await storage.deleteProduto(req.params.id);
      res.json({ message: "Produto removido com sucesso" });
    } catch (error) {
      console.error("Error deleting produto:", error);
      res.status(500).json({ message: "Erro ao remover produto" });
    }
  });

  // Contagens
  app.get("/api/contagens/unfinished", async (req, res) => {
    try {
      const contagens = await storage.getUnfinishedContagens();
      res.json(contagens);
    } catch (error) {
      console.error("Error fetching unfinished contagens:", error);
      res.status(500).json({ message: "Erro ao buscar contagens não finalizadas" });
    }
  });

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
      console.log('Dados recebidos:', req.body); // Para debug
      const data = insertContagemSchema.parse(req.body);
      console.log('Dados após parse:', data); // Para debug
      const contagem = await storage.createContagem(data);
      console.log('Contagem criada:', contagem); // Para debug
      res.json(contagem);
    } catch (error) {
      console.error("Error creating contagem:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar contagem" });
    }
  });

  app.put("/api/contagens/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { finalizada } = req.body;

      await storage.updateContagem(id, { finalizada });
      res.json({ message: "Contagem atualizada com sucesso" });
    } catch (error) {
      console.error("Error updating contagem:", error);
      res.status(500).json({ message: "Erro ao atualizar contagem" });
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
        // Try to find by nome first
        let existingProduto = await storage.getProdutoByNome(data.nomeLivre);
        
        // If not found by name, try by codigo
        if (!existingProduto) {
          existingProduto = await storage.getProdutoByCodigo(data.nomeLivre);
        }
        
        if (existingProduto) {
          data.produtoId = existingProduto.id;
        } else {
          // Create new produto with basic data (will need to be completed later in produto management)
          const newProduto = await storage.createProduto({ 
            codigo: `AUTO_${Date.now()}`,
            nome: data.nomeLivre,
            unidadesPorPacote: 1,
            pacotesPorLastro: 1,
            lastrosPorPallet: 1
          });
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

  // NOVA GERAÇÃO DE PLANILHA EXCEL DO ZERO
  app.post("/api/contagens/:id/excel", async (req, res) => {
    console.log("==============================");
    console.log("GERANDO NOVA PLANILHA EXCEL!!!", new Date());
    console.log("Contagem ID:", req.params.id);
    console.log("==============================");
    try {
      const contagem = await storage.getContagem(req.params.id);
      if (!contagem) {
        return res.status(404).json({ message: "Contagem não encontrada" });
      }

      // Data como texto dd/MM/yyyy
      const [ano, mes, dia] = contagem.data.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;
      const dataParaArquivo = `${dia}-${mes}-${ano}`;

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Contagem de Estoque");

      // CABEÇALHO
      ws.mergeCells('A1:F1');
      ws.getCell('A1').value = "CONTAGEM DE ESTOQUE";
      ws.getCell('A1').font = { size: 16, bold: true };
      ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 28;

      ws.mergeCells('A2:F2');
      ws.getCell('A2').value = `Data da Contagem: ${dataFormatada}`;
      ws.getCell('A2').font = { size: 12, bold: true };
      ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 20;

      ws.addRow([]); // Linha em branco

      // COLUNAS
      ws.columns = [
        { header: 'Produto', key: 'produto', width: 32 },
        { header: 'Código', key: 'codigo', width: 15 },
        { header: 'Pallets', key: 'pallets', width: 12 },
        { header: 'Lastros', key: 'lastros', width: 12 },
        { header: 'Pacotes', key: 'pacotes', width: 12 },
        { header: 'Unidades', key: 'unidades', width: 12 },
        { header: 'Total em unidades', key: 'total', width: 18 },
      ];

      // Cabeçalho visual
      const headerRow = ws.addRow(['Produto', 'Código', 'Pallets', 'Lastros', 'Pacotes', 'Unidades', 'Total em unidades']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' },
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(headerRow.number).height = 22;

      // DADOS
      let totalGeral = 0;
      for (const item of contagem.itens) {
        const nome = item.produto?.nome || item.nomeLivre || "Produto sem nome";
        const codigo = item.produto?.codigo || "N/A";
        const total = item.total || 0;
        totalGeral += total;
        ws.addRow({
          produto: nome,
          codigo: codigo,
          pallets: item.pallets || 0,
          lastros: item.lastros || 0,
          pacotes: item.pacotes || 0,
          unidades: item.unidades || 0,
          total: total,
        });
      }

      ws.addRow([]); // Linha em branco
      const totalRow = ws.addRow({ produto: 'TOTAL GERAL', total: totalGeral });
      totalRow.font = { bold: true };
      totalRow.getCell('A').alignment = { horizontal: 'right' };
      totalRow.getCell('G').alignment = { horizontal: 'center' };
      totalRow.getCell('A').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB7DEE8' },
      };
      totalRow.getCell('G').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB7DEE8' },
      };

      // Bordas
      ws.eachRow((row, rowNumber) => {
        if (rowNumber >= headerRow.number && ws.lastRow && rowNumber <= ws.lastRow.number) {
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });
        }
      });

      // Download
      const filename = `contagem_${dataParaArquivo}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    } catch (error) {
      console.error("Error generating Excel:", error);
      res.status(500).json({ message: "Erro ao gerar arquivo Excel" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
