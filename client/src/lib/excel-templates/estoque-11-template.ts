import * as XLSX from 'xlsx';
import { ExcelTemplate, ExcelExportData, ExcelStyles } from './index';
import { ProductItem } from '@/pages/new-count';

/**
 * Template específico para Estoque 11 - Contagem Tradicional
 * Regra #3: TypeScript consistente com interfaces bem definidas
 */
export class Estoque11Template implements ExcelTemplate {
  
  getTitle(): string {
    return 'CONTAGEM ESTOQUE 11';
  }

  getSubtitle(): string {
    return 'Contagem Tradicional';
  }

  getColumns(): string[] {
    return [
      'Produto',
      'Pallets',
      'Lastros', 
      'Pacotes',
      'Total(em pacs)'
    ];
  }

  getStyles(): ExcelStyles {
    return {
      header: {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: '70AD47' } }, // Verde
        alignment: { horizontal: 'center' }
      },
      subheader: {
        font: { bold: true },
        fill: { fgColor: { rgb: '92D050' } },
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
   * Calcula total em pacotes baseado na conversão
   */
  formatData(products: ProductItem[]): any[] {
    return products.map(product => {
      // Regra #8: Tratamento correto de dados com fallbacks
      const pallets = product.pallets || 0;
      const lastros = product.lastros || 0;
      const pacotes = product.pacotes || 0;
      
      // Calcula total em pacotes
      const pacotesPorLastro = product.pacotesPorLastro || 1;
      const lastrosPorPallet = product.lastrosPorPallet || 1;
      
      const totalPacotes = (pallets * lastrosPorPallet * pacotesPorLastro) + 
                          (lastros * pacotesPorLastro) + 
                          pacotes;

      return [
        product.nome,
        pallets,
        lastros,
        pacotes,
        totalPacotes
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque 11');
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
      { wch: 30 }, // Produto
      { wch: 12 }, // Pallets
      { wch: 12 }, // Lastros
      { wch: 12 }, // Pacotes
      { wch: 18 }  // Total(em pacs)
    ];
  }
}
