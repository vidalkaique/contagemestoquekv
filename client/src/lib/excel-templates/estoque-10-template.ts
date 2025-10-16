import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
// import { RealtimeProductItem } from '../types';
import { ExcelTemplate, ExcelExportData, ExcelStyles } from './index';
import { ProductItem } from '@/pages/new-count';

export interface Estoque10ExportData {
  contagem: {
    id: string;
    nome: string;
    data_criacao: string;
    tipo_estoque: number;
  };
  products: any[];
}

/**
 * Template Estoque 10 usando ExcelJS com bordas e formatação completa
 */
export class Estoque10Template implements ExcelTemplate {
  
  // Métodos da interface ExcelTemplate
  getTitle(): string {
    return 'CONTAGEM ESTOQUE 10 - GARRAFEIRAS';
  }

  getSubtitle(): string {
    return 'Separação por Tipo: 300ML, 600ML e 1000ML';
  }

  getColumns(): string[] {
    return [
      'PRODUTO', 'CÓDIGO',
      '300ML_CH_PBR', '300ML_CH_CX', '600ML_CH_GAJ', '600ML_CH_CX', '1000ML_CH_GAJ', '1000ML_CH_CX',
      '300ML_VZ_PBR', '300ML_VZ_CX', '600ML_VZ_GAJ', '600ML_VZ_CX', '1000ML_VZ_GAJ', '1000ML_VZ_CX',
      '300ML_GV_PBR', '300ML_GV_CX', '600ML_GV_GAJ', '600ML_GV_CX', '1000ML_GV_GAJ', '1000ML_GV_CX'
    ];
  }

  formatData(products: ProductItem[]): any[] {
    return products.map(product => [
      product.nome,
      product.codigo || 'N/A',
      // Dados formatados conforme necessidade
      0, 0, 0, 0, 0, 0, // CHÃO CHEIO
      0, 0, 0, 0, 0, 0, // CHÃO VAZIO
      0, 0, 0, 0, 0, 0  // GARRAFEIRA VAZIA
    ]);
  }

  getStyles(): ExcelStyles {
    return {
      header: {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center' }
      },
      subheader: {
        font: { bold: true },
        fill: { fgColor: { rgb: '5B9BD5' } },
        alignment: { horizontal: 'center' }
      },
      data: {
        alignment: { horizontal: 'center' },
        numFmt: '#,##0'
      },
      total: {
        font: { bold: true },
        numFmt: '#,##0'
      }
    };
  }

  createWorkbook(data: ExcelExportData): XLSX.WorkBook {
    // Converter dados para o formato ExcelJS
    const estoque10Data: Estoque10ExportData = {
      contagem: {
        id: 'temp-id',
        nome: 'Contagem Estoque 10',
        data_criacao: new Date().toISOString(),
        tipo_estoque: 10
      },
      products: data.products
    };
    
    // Dados dos produtos já estão prontos
    
    // Criar planilha com dados
    const sheetData: any[][] = [];
    
    // Inicializar todas as linhas até 50 para garantir posição do resumo
    for (let i = 0; i < 50; i++) {
      sheetData.push([]);
    }
    
    // Título (linha 1)
    sheetData[0] = ['CONTAGEM ESTOQUE 10 - GARRAFEIRAS'];
    sheetData[1] = ['Separação por Tipo: 300ML, 600ML e 1000ML'];
    sheetData[2] = [`Data: ${new Date().toLocaleDateString('pt-BR')}`];
    
    // Seção CHÃO CHEIO (linha 5)
    sheetData[4] = ['CHÃO CHEIO', '', '', '', '', '', '', 'RESUMO GERAL'];
    sheetData[5] = ['300ML', '', '600ML', '', '1000ML', '', '', 'CAIXAS:'];
    sheetData[6] = ['PBR', 'CX', 'GAJ', 'CX', 'GAJ', 'CX', '', 'TOTAL CAIXAS 600ML:'];
    
    // Calcular totais para o resumo
    const totalChaoCheio = data.products.reduce((sum, p) => sum + (p.chaoCheio || 0), 0);
    const totalChaoVazio = data.products.reduce((sum, p) => sum + (p.chaoVazio || 0), 0);
    const totalGarrafeiraCaixas = data.products.reduce((sum, p) => sum + (p.garrafeirasVazias_caixas || 0), 0);
    const totalGajPbr = data.products.reduce((sum, p) => sum + (p.chaoCheio_gajPbr || 0) + (p.chaoVazio_gajPbr || 0), 0);
    const totalGarrafeiraPallets = data.products.reduce((sum, p) => sum + (p.garrafeirasVazias_pallets || 0), 0);
    const totalGarrafeiraLastros = data.products.reduce((sum, p) => sum + (p.garrafeirasVazias_lastros || 0), 0);
    
    // Preencher RESUMO GERAL (colunas H-I)
    sheetData[6][8] = totalChaoCheio + totalChaoVazio + totalGarrafeiraCaixas; // TOTAL CAIXAS 600ML
    sheetData[7] = ['', '', '', '', '', '', '', 'TOTAL CAIXAS 300ML:', totalChaoCheio + totalChaoVazio + totalGarrafeiraCaixas];
    sheetData[8] = ['', '', '', '', '', '', '', 'TOTAL CAIXAS 1L:', totalChaoCheio + totalChaoVazio + totalGarrafeiraCaixas];
    sheetData[9] = ['', '', '', '', '', '', '', ''];
    sheetData[10] = ['', '', '', '', '', '', '', 'GARRAFAS:'];
    sheetData[11] = ['', '', '', '', '', '', '', 'TOTAL GARRAFAS 600ML:', (totalChaoCheio + totalChaoVazio) * 24];
    sheetData[12] = ['', '', '', '', '', '', '', 'TOTAL GARRAFAS 300ML:', (totalChaoCheio + totalChaoVazio) * 24];
    sheetData[13] = ['', '', '', '', '', '', '', 'TOTAL GARRAFAS 1L:', (totalChaoCheio + totalChaoVazio) * 12];
    sheetData[14] = ['', '', '', '', '', '', '', ''];
    sheetData[15] = ['', '', '', '', '', '', '', 'GAJ/PBR:'];
    sheetData[16] = ['', '', '', '', '', '', '', 'TOTAL GAJ:', totalGajPbr + totalGarrafeiraLastros];
    sheetData[17] = ['', '', '', '', '', '', '', 'TOTAL PBR:', totalGajPbr + totalGarrafeiraPallets];
    
    // Dados dos produtos CHÃO CHEIO
    let currentRow = 7;
    data.products.forEach(product => {
      if ((product.chaoCheio || 0) > 0 || (product.chaoCheio_gajPbr || 0) > 0) {
        sheetData[currentRow] = [
          product.chaoCheio_gajPbr || 0, // 300ML PBR
          product.chaoCheio || 0,        // 300ML CX
          product.chaoCheio_gajPbr || 0, // 600ML GAJ
          product.chaoCheio || 0,        // 600ML CX
          product.chaoCheio_gajPbr || 0, // 1000ML GAJ
          product.chaoCheio || 0         // 1000ML CX
        ];
        currentRow++;
      }
    });
    
    // Totais CHÃO CHEIO
    sheetData[currentRow] = ['TOTAL (CX)', totalChaoCheio, 'TOTAL (CX)', totalChaoCheio, 'TOTAL (CX)', totalChaoCheio];
    sheetData[currentRow + 1] = ['TOTAL (GRF)', totalChaoCheio * 24, 'TOTAL (GRF)', totalChaoCheio * 24, 'TOTAL (GRF)', totalChaoCheio * 12];
    sheetData[currentRow + 2] = ['TOTAL PBR', totalGajPbr, 'TOTAL GAJ', totalGajPbr, 'TOTAL GAJ', totalGajPbr];
    currentRow += 4; // Pula linha
    
    // Seção CHÃO VAZIO
    sheetData[currentRow] = ['CHÃO VAZIO'];
    sheetData[currentRow + 1] = ['300ML', '', '600ML', '', '1000ML', ''];
    sheetData[currentRow + 2] = ['PBR', 'CX', 'GAJ', 'CX', 'GAJ', 'CX'];
    currentRow += 3;
    
    // Dados CHÃO VAZIO
    data.products.forEach(product => {
      if ((product.chaoVazio || 0) > 0 || (product.chaoVazio_gajPbr || 0) > 0) {
        sheetData[currentRow] = [
          product.chaoVazio_gajPbr || 0,
          product.chaoVazio || 0,
          product.chaoVazio_gajPbr || 0,
          product.chaoVazio || 0,
          product.chaoVazio_gajPbr || 0,
          product.chaoVazio || 0
        ];
        currentRow++;
      }
    });
    
    const totalChaoVazioGaj = data.products.reduce((sum, p) => sum + (p.chaoVazio_gajPbr || 0), 0);
    
    // Totais CHÃO VAZIO
    sheetData[currentRow] = ['TOTAL (CX)', totalChaoVazio, 'TOTAL (CX)', totalChaoVazio, 'TOTAL (CX)', totalChaoVazio];
    sheetData[currentRow + 1] = ['TOTAL (GRF)', totalChaoVazio * 24, 'TOTAL (GRF)', totalChaoVazio * 24, 'TOTAL (GRF)', totalChaoVazio * 12];
    sheetData[currentRow + 2] = ['TOTAL PBR', totalChaoVazioGaj, 'TOTAL GAJ', totalChaoVazioGaj, 'TOTAL GAJ', totalChaoVazioGaj];
    currentRow += 4; // Pula linha
    
    // Seção GARRAFEIRA VAZIA
    sheetData[currentRow] = ['GARRAFEIRA VAZIA'];
    sheetData[currentRow + 1] = ['300ML', '', '600ML', '', '1000ML', ''];
    sheetData[currentRow + 2] = ['PBR', 'CX', 'GAJ', 'CX', 'GAJ', 'CX'];
    currentRow += 3;
    
    // Dados GARRAFEIRA VAZIA
    data.products.forEach(product => {
      const pallets = product.garrafeirasVazias_pallets || 0;
      const lastros = product.garrafeirasVazias_lastros || 0;
      const caixas = product.garrafeirasVazias_caixas || 0;
      
      if (pallets > 0 || lastros > 0 || caixas > 0) {
        sheetData[currentRow] = [
          pallets,
          caixas,
          lastros,
          caixas,
          lastros,
          caixas
        ];
        currentRow++;
      }
    });
    
    // Totais GARRAFEIRA VAZIA (SEM TOTAL GRF)
    sheetData[currentRow] = ['TOTAL (CX)', totalGarrafeiraCaixas, 'TOTAL (CX)', totalGarrafeiraCaixas, 'TOTAL (CX)', totalGarrafeiraCaixas];
    sheetData[currentRow + 1] = ['TOTAL PBR', totalGarrafeiraPallets, 'TOTAL GAJ', totalGarrafeiraLastros, 'TOTAL GAJ', totalGarrafeiraLastros];
    
    // Garantir que chegamos na linha 37 para CÓDIGOS
    while (sheetData.length < 36) {
      sheetData.push([]);
    }
    
    // Seção CÓDIGOS na linha 37 (índice 36)
    sheetData[36] = ['CÓDIGOS'];
    
    const fixedCodes = [
      '(1022893) GARRAFEIRA PLAST 1L',
      '(1022894) GARRAFEIRA PLAST 300ML',
      '(1022895) GARRAFEIRA PLAST 600ML',
      '(1155350) GARRAFA VERDE 600ML',
      '(1023392) GARRAFA 1L',
      '(1023384) GARRAFA 300ML',
      '(1023393) GARRAFA 600ML'
    ];
    
    fixedCodes.forEach((code, index) => {
      sheetData[37 + index] = [code];
    });
    
    // Criar workbook XLSX
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque 10');
    
    return wb;
  }
  
  /**
   * Gera arquivo Excel com formatação completa usando ExcelJS
   */
  async generateExcel(data: Estoque10ExportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Estoque 10');
    
    let currentRow = 1;
    
    // TÍTULO
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'CONTAGEM ESTOQUE 10 - GARRAFEIRAS';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };
    this.addBorders(titleCell, 'thick');
    currentRow += 2;
    
    // Calcular totais para o resumo
    const totals = this.calculateTotals(data.products);
    
    // SEÇÃO CHÃO CHEIO
    currentRow = this.addMainSection(worksheet, 'CHÃO CHEIO', data.products, currentRow, 'chaoCheio');
    
    // SEÇÃO CHÃO VAZIO
    currentRow = this.addMainSection(worksheet, 'CHÃO VAZIO', data.products, currentRow, 'chaoVazio');
    
    // SEÇÃO GARRAFEIRA VAZIA
    currentRow = this.addMainSection(worksheet, 'GARRAFEIRA VAZIA', data.products, currentRow, 'garrafeiraVazia');
    
    // RESUMO GERAL (lado direito)
    this.addResumoGeral(worksheet, totals);
    
    // CÓDIGOS (linha 37)
    this.addCodigosSection(worksheet, 37);
    
    // Ajustar colunas
    this.adjustColumnWidths(worksheet);
    
    return await workbook.xlsx.writeBuffer() as Buffer;
  }
  
  /**
   * Calcular totais para o resumo
   */
  private calculateTotals(products: any[]) {
    const totals = {
      caixas_300ml: 0,
      caixas_600ml: 0,
      caixas_1l: 0,
      garrafas_300ml: 0,
      garrafas_600ml: 0,
      garrafas_1l: 0,
      total_gaj: 0,
      total_pbr: 0
    };
    
    products.forEach(product => {
      // Identificar tipo do produto pelo nome
      const nome = product.nome.toLowerCase();
      const is300ml = nome.includes('300ml') || nome.includes('300');
      const is600ml = nome.includes('600ml') || nome.includes('600');
      const is1l = nome.includes('1l') || nome.includes('1000ml') || nome.includes('1000');
      
      // Somar caixas por tipo
      const totalCaixasProduto = (product.chaoCheio || 0) + (product.chaoVazio || 0) + (product.garrafeirasVazias_caixas || 0);
      
      if (is300ml) {
        totals.caixas_300ml += totalCaixasProduto;
        // Garrafas 300ML (apenas chão cheio e vazio)
        const caixasGarrafas = (product.chaoCheio || 0) + (product.chaoVazio || 0);
        totals.garrafas_300ml += caixasGarrafas * 24;
      } else if (is600ml) {
        totals.caixas_600ml += totalCaixasProduto;
        // Garrafas 600ML (apenas chão cheio e vazio)
        const caixasGarrafas = (product.chaoCheio || 0) + (product.chaoVazio || 0);
        totals.garrafas_600ml += caixasGarrafas * 24;
      } else if (is1l) {
        totals.caixas_1l += totalCaixasProduto;
        // Garrafas 1L (apenas chão cheio e vazio)
        const caixasGarrafas = (product.chaoCheio || 0) + (product.chaoVazio || 0);
        totals.garrafas_1l += caixasGarrafas * 12;
      }
      
      // Somar GAJ/PBR
      totals.total_gaj += (product.chaoCheio_gajPbr || 0) + (product.chaoVazio_gajPbr || 0) + (product.garrafeirasVazias_lastros || 0);
      totals.total_pbr += (product.chaoCheio_gajPbr || 0) + (product.chaoVazio_gajPbr || 0) + (product.garrafeirasVazias_pallets || 0);
    });
    
    return totals;
  }
  
  /**
   * Adicionar seção principal (CHÃO CHEIO, CHÃO VAZIO, GARRAFEIRA VAZIA)
   */
  private addMainSection(worksheet: ExcelJS.Worksheet, title: string, products: any[], startRow: number, section: string): number {
    let currentRow = startRow;
    
    // Título da seção
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };
    this.addBorders(titleCell, 'thick');
    currentRow++;
    
    // Cabeçalhos das colunas
    const headers = ['300ML', '', '600ML', '', '1000ML', ''];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      this.addBorders(cell, 'medium');
    });
    currentRow++;
    
    // Subcabeçalhos
    const subHeaders = ['PBR', 'CX', 'GAJ', 'CX', 'GAJ', 'CX'];
    subHeaders.forEach((subHeader, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = subHeader;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      this.addBorders(cell, 'thin');
    });
    currentRow++;
    
    // Dados dos produtos
    let totalCx = 0;
    let totalGaj = 0;
    let totalPbr = 0;
    
    products.forEach(product => {
      const values = this.getProductValues(product, section);
      if (values.some(v => v > 0)) {
        values.forEach((value, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center' };
          this.addBorders(cell, 'thin');
        });
        
        // Acumular totais
        totalCx += values[1] + values[3] + values[5]; // CX columns
        totalGaj += values[2] + values[4]; // GAJ columns
        totalPbr += values[0]; // PBR column
        
        currentRow++;
      }
    });
    
    // Totais
    this.addSectionTotals(worksheet, currentRow, totalCx, totalGaj, totalPbr, section !== 'garrafeiraVazia');
    
    return currentRow + 5; // Espaço para próxima seção
  }
  
  /**
   * Obter valores do produto para uma seção
   */
  private getProductValues(product: any, section: string): number[] {
    // Identificar tipo do produto pelo nome
    const nome = product.nome.toLowerCase();
    const is300ml = nome.includes('300ml') || nome.includes('300');
    const is600ml = nome.includes('600ml') || nome.includes('600');
    const is1l = nome.includes('1l') || nome.includes('1000ml') || nome.includes('1000');
    
    switch (section) {
      case 'chaoCheio':
        if (is300ml) {
          // Produto 300ML - valores apenas na coluna 300ML
          return [
            product.chaoCheio_gajPbr || 0, // 300ML PBR
            product.chaoCheio || 0,        // 300ML CX
            0, 0, 0, 0                     // 600ML e 1000ML = 0
          ];
        } else if (is600ml) {
          // Produto 600ML - valores apenas na coluna 600ML
          return [
            0, 0,                          // 300ML = 0
            product.chaoCheio_gajPbr || 0, // 600ML GAJ
            product.chaoCheio || 0,        // 600ML CX
            0, 0                           // 1000ML = 0
          ];
        } else if (is1l) {
          // Produto 1L - valores apenas na coluna 1000ML
          return [
            0, 0, 0, 0,                    // 300ML e 600ML = 0
            product.chaoCheio_gajPbr || 0, // 1000ML GAJ
            product.chaoCheio || 0         // 1000ML CX
          ];
        }
        break;
        
      case 'chaoVazio':
        if (is300ml) {
          // Produto 300ML - valores apenas na coluna 300ML
          return [
            product.chaoVazio_gajPbr || 0, // 300ML PBR
            product.chaoVazio || 0,        // 300ML CX
            0, 0, 0, 0                     // 600ML e 1000ML = 0
          ];
        } else if (is600ml) {
          // Produto 600ML - valores apenas na coluna 600ML
          return [
            0, 0,                          // 300ML = 0
            product.chaoVazio_gajPbr || 0, // 600ML GAJ
            product.chaoVazio || 0,        // 600ML CX
            0, 0                           // 1000ML = 0
          ];
        } else if (is1l) {
          // Produto 1L - valores apenas na coluna 1000ML
          return [
            0, 0, 0, 0,                    // 300ML e 600ML = 0
            product.chaoVazio_gajPbr || 0, // 1000ML GAJ
            product.chaoVazio || 0         // 1000ML CX
          ];
        }
        break;
        
      case 'garrafeiraVazia':
        if (is300ml) {
          // Produto 300ML - valores apenas na coluna 300ML
          return [
            product.garrafeirasVazias_pallets || 0, // 300ML PBR
            product.garrafeirasVazias_caixas || 0,  // 300ML CX
            0, 0, 0, 0                              // 600ML e 1000ML = 0
          ];
        } else if (is600ml) {
          // Produto 600ML - valores apenas na coluna 600ML
          return [
            0, 0,                                   // 300ML = 0
            product.garrafeirasVazias_lastros || 0, // 600ML GAJ
            product.garrafeirasVazias_caixas || 0,  // 600ML CX
            0, 0                                    // 1000ML = 0
          ];
        } else if (is1l) {
          // Produto 1L - valores apenas na coluna 1000ML
          return [
            0, 0, 0, 0,                             // 300ML e 600ML = 0
            product.garrafeirasVazias_lastros || 0, // 1000ML GAJ
            product.garrafeirasVazias_caixas || 0   // 1000ML CX
          ];
        }
        break;
    }
    
    // Se não identificou o tipo, retorna zeros
    return [0, 0, 0, 0, 0, 0];
  }
  
  /**
   * Adicionar totais da seção
   */
  private addSectionTotals(worksheet: ExcelJS.Worksheet, startRow: number, totalCx: number, totalGaj: number, totalPbr: number, includeGarrafas: boolean) {
    let currentRow = startRow;
    
    // TOTAL (CX)
    const totalCxLabels = ['TOTAL (CX)', totalCx, 'TOTAL (CX)', totalCx, 'TOTAL (CX)', totalCx];
    totalCxLabels.forEach((value, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = value;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      this.addBorders(cell, 'medium');
    });
    currentRow++;
    
    // TOTAL (GRF) - apenas se includeGarrafas for true
    if (includeGarrafas) {
      const totalGrfLabels = ['TOTAL (GRF)', totalCx * 24, 'TOTAL (GRF)', totalCx * 24, 'TOTAL (GRF)', totalCx * 12];
      totalGrfLabels.forEach((value, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = value;
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        this.addBorders(cell, 'medium');
      });
      currentRow++;
    }
    
    // TOTAL PBR/GAJ
    const totalPbrGajLabels = ['TOTAL PBR', totalPbr, 'TOTAL GAJ', totalGaj, 'TOTAL GAJ', totalGaj];
    totalPbrGajLabels.forEach((value, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = value;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      this.addBorders(cell, 'medium');
    });
  }
  
  /**
   * Adicionar RESUMO GERAL
   */
  private addResumoGeral(worksheet: ExcelJS.Worksheet, totals: any) {
    let currentRow = 6; // Começar na linha 6 como na foto
    
    // Título RESUMO GERAL
    const resumoCell = worksheet.getCell(`H${currentRow}`);
    resumoCell.value = 'RESUMO GERAL';
    resumoCell.font = { bold: true, size: 12 };
    resumoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
    this.addBorders(resumoCell, 'thick');
    currentRow++;
    
    // CAIXAS:
    const caixasCell = worksheet.getCell(`H${currentRow}`);
    caixasCell.value = 'CAIXAS:';
    caixasCell.font = { bold: true };
    this.addBorders(caixasCell, 'medium');
    currentRow++;
    
    // TOTAL CAIXAS 600ML:
    let labelCell = worksheet.getCell(`H${currentRow}`);
    let valueCell = worksheet.getCell(`I${currentRow}`);
    labelCell.value = 'TOTAL CAIXAS 600ML:';
    valueCell.value = totals.caixas_600ml;
    labelCell.alignment = { horizontal: 'left' };
    valueCell.alignment = { horizontal: 'right' };
    this.addBorders(labelCell, 'thin');
    this.addBorders(valueCell, 'thin');
    currentRow++;
    
    // TOTAL CAIXAS 300ML:
    labelCell = worksheet.getCell(`H${currentRow}`);
    valueCell = worksheet.getCell(`I${currentRow}`);
    labelCell.value = 'TOTAL CAIXAS 300ML:';
    valueCell.value = totals.caixas_300ml;
    labelCell.alignment = { horizontal: 'left' };
    valueCell.alignment = { horizontal: 'right' };
    this.addBorders(labelCell, 'thin');
    this.addBorders(valueCell, 'thin');
    currentRow++;
    
    // TOTAL CAIXAS 1L:
    labelCell = worksheet.getCell(`H${currentRow}`);
    valueCell = worksheet.getCell(`I${currentRow}`);
    labelCell.value = 'TOTAL CAIXAS 1L:';
    valueCell.value = totals.caixas_1l;
    labelCell.alignment = { horizontal: 'left' };
    valueCell.alignment = { horizontal: 'right' };
    this.addBorders(labelCell, 'thin');
    this.addBorders(valueCell, 'thin');
    currentRow += 2; // Espaço
    
    // TOTAL GARRAFAS 600ML
    labelCell = worksheet.getCell(`H${currentRow}`);
    valueCell = worksheet.getCell(`I${currentRow}`);
    labelCell.value = 'TOTAL GARRAFAS 600ML';
    valueCell.value = totals.garrafas_600ml;
    labelCell.alignment = { horizontal: 'left' };
    valueCell.alignment = { horizontal: 'right' };
    this.addBorders(labelCell, 'thin');
    this.addBorders(valueCell, 'thin');
    currentRow++;
    
    // TOTAL GARRAFAS 300ML
    labelCell = worksheet.getCell(`H${currentRow}`);
    valueCell = worksheet.getCell(`I${currentRow}`);
    labelCell.value = 'TOTAL GARRAFAS 300ML';
    valueCell.value = totals.garrafas_300ml;
    labelCell.alignment = { horizontal: 'left' };
    valueCell.alignment = { horizontal: 'right' };
    this.addBorders(labelCell, 'thin');
    this.addBorders(valueCell, 'thin');
    currentRow++;
    
    // TOTAL GARRAFAS 1L:
    labelCell = worksheet.getCell(`H${currentRow}`);
    valueCell = worksheet.getCell(`I${currentRow}`);
    labelCell.value = 'TOTAL GARRAFAS 1L:';
    valueCell.value = totals.garrafas_1l;
    labelCell.alignment = { horizontal: 'left' };
    valueCell.alignment = { horizontal: 'right' };
    this.addBorders(labelCell, 'thin');
    this.addBorders(valueCell, 'thin');
    currentRow += 2; // Espaço
    
    // GAJ/PBR:
    const gajPbrCell = worksheet.getCell(`H${currentRow}`);
    gajPbrCell.value = 'GAJ/PBR:';
    gajPbrCell.font = { bold: true };
    this.addBorders(gajPbrCell, 'medium');
    currentRow++;
    
    // TOTAL GAJ:
    labelCell = worksheet.getCell(`H${currentRow}`);
    valueCell = worksheet.getCell(`I${currentRow}`);
    labelCell.value = 'TOTAL GAJ:';
    valueCell.value = totals.total_gaj;
    labelCell.alignment = { horizontal: 'left' };
    valueCell.alignment = { horizontal: 'right' };
    this.addBorders(labelCell, 'thin');
    this.addBorders(valueCell, 'thin');
    currentRow++;
    
    // TOTAL PBR:
    labelCell = worksheet.getCell(`H${currentRow}`);
    valueCell = worksheet.getCell(`I${currentRow}`);
    labelCell.value = 'TOTAL PBR:';
    valueCell.value = totals.total_pbr;
    labelCell.alignment = { horizontal: 'left' };
    valueCell.alignment = { horizontal: 'right' };
    this.addBorders(labelCell, 'thin');
    this.addBorders(valueCell, 'thin');
  }
  
  /**
   * Adiciona seção de códigos na linha 37
   */
  private addCodigosSection(worksheet: ExcelJS.Worksheet, startRow: number) {
    // Título CÓDIGOS
    const headerCell = worksheet.getCell(`A${startRow}`);
    headerCell.value = 'CÓDIGOS';
    headerCell.font = { bold: true, size: 12 };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    this.addBorders(headerCell, 'thick');
    
    // Códigos fixos
    const fixedCodes = [
      '(1022893) GARRAFEIRA PLAST 1L',
      '(1022894) GARRAFEIRA PLAST 300ML',
      '(1022895) GARRAFEIRA PLAST 600ML',
      '(1155350) GARRAFA VERDE 600ML',
      '(1023392) GARRAFA 1L',
      '(1023384) GARRAFA 300ML',
      '(1023393) GARRAFA 600ML'
    ];
    
    fixedCodes.forEach((code, index) => {
      const codeCell = worksheet.getCell(`A${startRow + 1 + index}`);
      codeCell.value = code;
      codeCell.alignment = { horizontal: 'left' };
      this.addBorders(codeCell, 'thin');
    });
  }
  
  /**
   * Adiciona bordas a uma célula
   */
  private addBorders(cell: ExcelJS.Cell, style: 'thin' | 'medium' | 'thick') {
    cell.border = {
      top: { style },
      left: { style },
      bottom: { style },
      right: { style }
    };
  }
  
  /**
   * Ajusta larguras das colunas
   */
  private adjustColumnWidths(worksheet: ExcelJS.Worksheet) {
    const widths = [15, 10, 15, 10, 15, 10, 5, 20, 15];
    widths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });
  }
  

}
