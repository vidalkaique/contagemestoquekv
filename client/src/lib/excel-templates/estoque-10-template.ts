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
        alignment: { horizontal: 'center' }
      }
    };
  }

  createWorkbook(data: ExcelExportData): XLSX.WorkBook {
    // Implementação básica para compatibilidade
    const ws = XLSX.utils.aoa_to_sheet([]);
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
    
    // Configurações da planilha
    worksheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
    };
    
    let currentRow = 1;
    
    // 1. TÍTULO PRINCIPAL
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'CONTAGEM ESTOQUE 10 - GARRAFEIRAS';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    this.addBorders(titleCell, 'thick');
    currentRow++;
    
    // 2. SUBTÍTULO
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const subtitleCell = worksheet.getCell(`A${currentRow}`);
    subtitleCell.value = `Separação por Tipo: 300ML, 600ML e 1000ML`;
    subtitleCell.font = { bold: true, size: 12 };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
    subtitleCell.alignment = { horizontal: 'center' };
    this.addBorders(subtitleCell, 'medium');
    currentRow++;
    
    // 3. DATA
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const dateCell = worksheet.getCell(`A${currentRow}`);
    const dataFormatada = new Date(data.contagem.data_criacao).toLocaleDateString('pt-BR');
    dateCell.value = `Data: ${dataFormatada}`;
    dateCell.font = { bold: true };
    dateCell.alignment = { horizontal: 'center' };
    this.addBorders(dateCell, 'thin');
    currentRow += 2; // Pula uma linha
    
    // Formatar dados dos produtos
    const formattedData = this.formatProductData(data.products);
    
    // 4. SEÇÃO CHÃO CHEIO
    currentRow = this.addSection(worksheet, 'CHÃO CHEIO', formattedData, currentRow, 'chaoCheio');
    
    // 5. SEÇÃO CHÃO VAZIO  
    currentRow = this.addSection(worksheet, 'CHÃO VAZIO', formattedData, currentRow, 'chaoVazio');
    
    // 6. SEÇÃO GARRAFEIRA VAZIA
    currentRow = this.addSection(worksheet, 'GARRAFEIRA VAZIA', formattedData, currentRow, 'garrafeiraVazia');
    
    // 7. RESUMO GERAL (lado direito)
    this.addResumoGeral(worksheet, formattedData);
    
    // 8. SEÇÃO CÓDIGOS (linha 37)
    this.addCodigosSection(worksheet, 37);
    
    // Ajustar larguras das colunas
    this.adjustColumnWidths(worksheet);
    
    // Gerar buffer
    return await workbook.xlsx.writeBuffer() as Buffer;
  }
  
  /**
   * Formatar dados dos produtos
   */
  private formatProductData(products: any[]) {
    return products.map(product => {
      const nomeSimples = product.nome.replace(/\s*\([^)]*\)\s*$/, '');
      
      return {
        nome: nomeSimples,
        codigo: product.codigo || 'N/A',
        
        // CHÃO CHEIO
        chaoCheio_300ml_pbr: product.chaoCheio_gajPbr || 0,
        chaoCheio_300ml_cx: product.chaoCheio || 0,
        chaoCheio_600ml_gaj: product.chaoCheio_gajPbr || 0,
        chaoCheio_600ml_cx: product.chaoCheio || 0,
        chaoCheio_1000ml_gaj: product.chaoCheio_gajPbr || 0,
        chaoCheio_1000ml_cx: product.chaoCheio || 0,
        
        // CHÃO VAZIO
        chaoVazio_300ml_pbr: product.chaoVazio_gajPbr || 0,
        chaoVazio_300ml_cx: product.chaoVazio || 0,
        chaoVazio_600ml_gaj: product.chaoVazio_gajPbr || 0,
        chaoVazio_600ml_cx: product.chaoVazio || 0,
        chaoVazio_1000ml_gaj: product.chaoVazio_gajPbr || 0,
        chaoVazio_1000ml_cx: product.chaoVazio || 0,
        
        // GARRAFEIRA VAZIA
        garrafeiraVazia_300ml_pbr: product.garrafeirasVazias_pallets || 0,
        garrafeiraVazia_300ml_cx: product.garrafeirasVazias_caixas || 0,
        garrafeiraVazia_600ml_gaj: product.garrafeirasVazias_lastros || 0,
        garrafeiraVazia_600ml_cx: product.garrafeirasVazias_caixas || 0,
        garrafeiraVazia_1000ml_gaj: product.garrafeirasVazias_lastros || 0,
        garrafeiraVazia_1000ml_cx: product.garrafeirasVazias_caixas || 0,
        
        // Para cálculos
        product: product
      };
    });
  }
  
  /**
   * Adiciona uma seção (CHÃO CHEIO, CHÃO VAZIO, GARRAFEIRA VAZIA)
   */
  private addSection(worksheet: ExcelJS.Worksheet, title: string, data: any[], startRow: number, section: string): number {
    let currentRow = startRow;
    
    // Cabeçalho da seção
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const headerCell = worksheet.getCell(`A${currentRow}`);
    headerCell.value = title;
    headerCell.font = { bold: true, size: 12 };
    
    // Cores por seção
    const colors: { [key: string]: string } = {
      'CHÃO CHEIO': 'FFE8F5E8',
      'CHÃO VAZIO': 'FFFFF2CC', 
      'GARRAFEIRA VAZIA': 'FFF2F2F2'
    };
    
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors[title] || 'FFFFFFFF' } };
    this.addBorders(headerCell, 'thick');
    currentRow++;
    
    // Cabeçalhos das colunas
    const headers = ['300ML', '', '600ML', '', '1000ML', ''];
    const subHeaders = ['PBR', 'CX', 'GAJ', 'CX', 'GAJ', 'CX'];
    
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      this.addBorders(cell, 'thin');
    });
    currentRow++;
    
    subHeaders.forEach((subHeader, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = subHeader;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      this.addBorders(cell, 'thin');
    });
    currentRow++;
    
    // Dados dos produtos
    const sectionData = this.getSectionData(data, section);
    sectionData.forEach(row => {
      if (this.hasData(row, section)) {
        const values = this.getSectionValues(row, section);
        values.forEach((value, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center' };
          this.addBorders(cell, 'thin');
        });
        currentRow++;
      }
    });
    
    // Totais
    const totals = this.calculateSectionTotals(sectionData, section);
    
    // TOTAL (CX)
    ['TOTAL (CX)', totals.cx_300ml, 'TOTAL (CX)', totals.cx_600ml, 'TOTAL (CX)', totals.cx_1000ml].forEach((value, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = value;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      cell.alignment = { horizontal: 'center' };
      this.addBorders(cell, 'medium');
    });
    currentRow++;
    
    // TOTAL (GRF) - apenas para CHÃO CHEIO e CHÃO VAZIO
    if (section !== 'garrafeiraVazia') {
      ['TOTAL (GRF)', totals.cx_300ml * 24, 'TOTAL (GRF)', totals.cx_600ml * 24, 'TOTAL (GRF)', totals.cx_1000ml * 12].forEach((value, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = value;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        cell.alignment = { horizontal: 'center' };
        this.addBorders(cell, 'medium');
      });
      currentRow++;
    }
    
    // TOTAL PBR/GAJ
    [`TOTAL ${section === 'chaoCheio' ? 'PBR' : section === 'chaoVazio' ? 'PBR' : 'PBR'}`, totals.pbr_gaj_300ml, 'TOTAL GAJ', totals.pbr_gaj_600ml, 'TOTAL GAJ', totals.pbr_gaj_1000ml].forEach((value, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = value;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      cell.alignment = { horizontal: 'center' };
      this.addBorders(cell, 'medium');
    });
    currentRow += 2; // Pula uma linha
    
    return currentRow;
  }
  
  /**
   * Adiciona resumo geral na coluna H-I
   */
  private addResumoGeral(worksheet: ExcelJS.Worksheet, data: any[]) {
    const startRow = 8;
    let currentRow = startRow;
    
    // Cabeçalho
    worksheet.mergeCells(`H${currentRow}:I${currentRow}`);
    const headerCell = worksheet.getCell(`H${currentRow}`);
    headerCell.value = 'RESUMO GERAL';
    headerCell.font = { bold: true, size: 12 };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
    headerCell.alignment = { horizontal: 'center' };
    this.addBorders(headerCell, 'thick');
    currentRow++;
    
    // Calcular totais
    const totals = this.calculateResumoGeral(data);
    
    // CAIXAS
    const caixasItems = [
      ['CAIXAS:', ''],
      ['TOTAL CAIXAS 600ML:', totals.totalCaixas600ML],
      ['TOTAL CAIXAS 300ML:', totals.totalCaixas300ML],
      ['TOTAL CAIXAS 1L:', totals.totalCaixas1L],
      ['', ''],
      ['GARRAFAS:', ''],
      ['TOTAL GARRAFAS 600ML:', totals.totalGarrafas600ML],
      ['TOTAL GARRAFAS 300ML:', totals.totalGarrafas300ML],
      ['TOTAL GARRAFAS 1L:', totals.totalGarrafas1L],
      ['', ''],
      ['GAJ/PBR:', ''],
      ['TOTAL GAJ:', totals.totalGAJ],
      ['TOTAL PBR:', totals.totalPBR]
    ];
    
    caixasItems.forEach(([label, value]) => {
      const labelCell = worksheet.getCell(`H${currentRow}`);
      const valueCell = worksheet.getCell(`I${currentRow}`);
      
      labelCell.value = label;
      valueCell.value = value;
      
      if (label.includes('TOTAL') && label !== '') {
        labelCell.font = { bold: true };
        valueCell.font = { bold: true };
      }
      
      labelCell.alignment = { horizontal: 'left' };
      valueCell.alignment = { horizontal: 'right' };
      
      this.addBorders(labelCell, 'thin');
      this.addBorders(valueCell, 'thin');
      
      currentRow++;
    });
  }
  
  /**
   * Adiciona seção de códigos na linha 37
   */
  private addCodigosSection(worksheet: ExcelJS.Worksheet, startRow: number) {
    let currentRow = startRow;
    
    // Cabeçalho
    const headerCell = worksheet.getCell(`A${currentRow}`);
    headerCell.value = 'CÓDIGOS';
    headerCell.font = { bold: true, size: 12 };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1D5E7' } };
    this.addBorders(headerCell, 'thick');
    currentRow += 2;
    
    // Códigos predefinidos
    const codigosPredefinidos = [
      ['1023392', 'GARRAFA 1L'],
      ['1023384', 'GARRAFA 300ML'],
      ['1023393', 'GARRAFA 600ML'],
      ['1155350', 'GARRAFA VERDE 600ML'],
      ['1022893', 'GARRAFEIRA 1L'],
      ['1022894', 'GARRAFEIRA 300ML'],
      ['1022895', 'GARRAFEIRA 600ML']
    ];
    
    codigosPredefinidos.forEach(([codigo, descricao]) => {
      const codigoCell = worksheet.getCell(`A${currentRow}`);
      const descricaoCell = worksheet.getCell(`B${currentRow}`);
      
      codigoCell.value = codigo;
      descricaoCell.value = descricao;
      
      codigoCell.alignment = { horizontal: 'left' };
      descricaoCell.alignment = { horizontal: 'left' };
      
      this.addBorders(codigoCell, 'thin');
      this.addBorders(descricaoCell, 'thin');
      
      currentRow++;
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
  
  // Métodos auxiliares para cálculos
  private getSectionData(data: any[], section: string) {
    return data;
  }
  
  private hasData(row: any, section: string): boolean {
    const fields = this.getSectionFields(section);
    return fields.some(field => (row[field] || 0) > 0);
  }
  
  private getSectionFields(section: string): string[] {
    const fieldMap: { [key: string]: string[] } = {
      'chaoCheio': ['chaoCheio_300ml_pbr', 'chaoCheio_300ml_cx', 'chaoCheio_600ml_gaj', 'chaoCheio_600ml_cx', 'chaoCheio_1000ml_gaj', 'chaoCheio_1000ml_cx'],
      'chaoVazio': ['chaoVazio_300ml_pbr', 'chaoVazio_300ml_cx', 'chaoVazio_600ml_gaj', 'chaoVazio_600ml_cx', 'chaoVazio_1000ml_gaj', 'chaoVazio_1000ml_cx'],
      'garrafeiraVazia': ['garrafeiraVazia_300ml_pbr', 'garrafeiraVazia_300ml_cx', 'garrafeiraVazia_600ml_gaj', 'garrafeiraVazia_600ml_cx', 'garrafeiraVazia_1000ml_gaj', 'garrafeiraVazia_1000ml_cx']
    };
    return fieldMap[section] || [];
  }
  
  private getSectionValues(row: any, section: string): number[] {
    const fields = this.getSectionFields(section);
    return fields.map(field => row[field] || 0);
  }
  
  private calculateSectionTotals(data: any[], section: string) {
    const fields = this.getSectionFields(section);
    
    return {
      pbr_gaj_300ml: data.reduce((sum, row) => sum + (row[fields[0]] || 0), 0),
      cx_300ml: data.reduce((sum, row) => sum + (row[fields[1]] || 0), 0),
      pbr_gaj_600ml: data.reduce((sum, row) => sum + (row[fields[2]] || 0), 0),
      cx_600ml: data.reduce((sum, row) => sum + (row[fields[3]] || 0), 0),
      pbr_gaj_1000ml: data.reduce((sum, row) => sum + (row[fields[4]] || 0), 0),
      cx_1000ml: data.reduce((sum, row) => sum + (row[fields[5]] || 0), 0)
    };
  }
  
  private calculateResumoGeral(data: any[]) {
    // Calcular totais de todas as seções
    const chaoCheioTotals = this.calculateSectionTotals(data, 'chaoCheio');
    const chaoVazioTotals = this.calculateSectionTotals(data, 'chaoVazio');
    const garrafeiraVaziaTotals = this.calculateSectionTotals(data, 'garrafeiraVazia');
    
    return {
      totalCaixas600ML: chaoCheioTotals.cx_600ml + chaoVazioTotals.cx_600ml + garrafeiraVaziaTotals.cx_600ml,
      totalCaixas300ML: chaoCheioTotals.cx_300ml + chaoVazioTotals.cx_300ml + garrafeiraVaziaTotals.cx_300ml,
      totalCaixas1L: chaoCheioTotals.cx_1000ml + chaoVazioTotals.cx_1000ml + garrafeiraVaziaTotals.cx_1000ml,
      
      // Garrafas (apenas CHÃO CHEIO e CHÃO VAZIO, sem garrafeira vazia)
      totalGarrafas600ML: (chaoCheioTotals.cx_600ml + chaoVazioTotals.cx_600ml) * 24,
      totalGarrafas300ML: (chaoCheioTotals.cx_300ml + chaoVazioTotals.cx_300ml) * 24,
      totalGarrafas1L: (chaoCheioTotals.cx_1000ml + chaoVazioTotals.cx_1000ml) * 12,
      
      totalGAJ: chaoCheioTotals.pbr_gaj_600ml + chaoVazioTotals.pbr_gaj_600ml + chaoCheioTotals.pbr_gaj_1000ml + chaoVazioTotals.pbr_gaj_1000ml + garrafeiraVaziaTotals.pbr_gaj_600ml + garrafeiraVaziaTotals.pbr_gaj_1000ml,
      totalPBR: chaoCheioTotals.pbr_gaj_300ml + chaoVazioTotals.pbr_gaj_300ml + garrafeiraVaziaTotals.pbr_gaj_300ml
    };
  }
}
