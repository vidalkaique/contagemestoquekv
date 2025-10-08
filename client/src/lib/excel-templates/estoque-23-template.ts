import * as XLSX from 'xlsx';
import { ExcelTemplate, ExcelExportData, ExcelStyles } from './index';
import { ProductItem } from '@/pages/new-count';

/**
 * Template específico para Estoque 23 - Contagem Simplificada
 * Regra #3: TypeScript consistente com interfaces bem definidas
 */
export class Estoque23Template implements ExcelTemplate {
  
  getTitle(): string {
    return 'CONTAGEM ESTOQUE 23';
  }

  getSubtitle(): string {
    return 'Contagem Simplificada';
  }

  getColumns(): string[] {
    return [
      'Código',
      'Produto',
      'UN',
      'Total'
    ];
  }

  getStyles(): ExcelStyles {
    return {
      header: {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: 'FFC000' } }, // Amarelo
        alignment: { horizontal: 'center' }
      },
      subheader: {
        font: { bold: true },
        fill: { fgColor: { rgb: 'FFEB9C' } },
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

  /**
   * Regra #7: Separação de lógica e apresentação
   * Layout minimalista para Estoque 23
   */
  formatData(products: ProductItem[]): any[] {
    return products.map(product => {
      // Regra #8: Tratamento correto de dados com fallbacks
      const un = product.un || 0;

      return [
        product.codigo || 'N/A', // Código do produto
        product.nome,
        un,
        un // Total é igual ao UN no Estoque 23
      ];
    });
  }

  /**
   * Regra #4: Componente bem estruturado com responsabilidade única
   */
  createWorkbook(data: ExcelExportData): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();
    
    // Cabeçalho principal
    const header = [
      [this.getTitle()],
      [this.getSubtitle()],
      [`Data: ${new Date(data.countDate).toLocaleDateString('pt-BR')}`],
      [], // Linha em branco
      this.getColumns()
    ];

    // Dados formatados
    const formattedData = this.formatData(data.products);
    
    // Calcula totais (Regra #8: Tratamento correto de dados)
    const totals = this.calculateTotals(formattedData);
    
    // Combina tudo
    const sheetData = [
      ...header,
      ...formattedData,
      ['TOTAL', ...totals.slice(1)] // Remove primeiro elemento (nome do produto)
    ];

    // Cria planilha
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Aplica formatação (Regra #9: Performance otimizada)
    this.applyFormatting(ws, sheetData.length);
    
    // Ajusta larguras das colunas
    ws['!cols'] = this.getColumnWidths();
    
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque 23');
    return wb;
  }

  /**
   * Regra #1: DRY - Função reutilizável para cálculos
   */
  private calculateTotals(data: any[]): any[] {
    const totals = ['TOTAL'];
    
    // Calcula soma de cada coluna numérica
    for (let col = 1; col < this.getColumns().length; col++) {
      const sum = data.reduce((acc, row) => acc + (row[col] || 0), 0);
      totals.push(sum);
    }
    
    return totals;
  }

  /**
   * Regra #9: Performance - Formatação otimizada
   */
  private applyFormatting(ws: XLSX.WorkSheet, rowCount: number): void {
    const styles = this.getStyles();
    
    // Formata cabeçalho principal (linha 0)
    const headerCell = ws['A1'];
    if (headerCell) {
      headerCell.s = styles.header;
    }

    // Formata cabeçalhos das colunas (linha 4)
    const columns = this.getColumns();
    for (let col = 0; col < columns.length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 4, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = styles.subheader;
      }
    }

    // Formata linha de totais
    const totalRowIndex = rowCount - 1;
    for (let col = 0; col < columns.length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = styles.total;
      }
    }
  }

  /**
   * Regra #10: Organização - Configuração centralizada
   */
  private getColumnWidths(): XLSX.ColInfo[] {
    return [
      { wch: 15 }, // Código
      { wch: 35 }, // Produto
      { wch: 15 }, // UN
      { wch: 15 }  // Total
    ];
  }
}
