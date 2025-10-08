import * as XLSX from 'xlsx';
import { ExcelTemplate, ExcelExportData, ExcelStyles } from './index';
import { ProductItem } from '@/pages/new-count';

/**
 * Template específico para Estoque 10 - Status de Garrafas/Equipamentos
 * Regra #3: TypeScript consistente com interfaces bem definidas
 */
export class Estoque10Template implements ExcelTemplate {
  
  getTitle(): string {
    return 'CONTAGEM ESTOQUE 10';
  }

  getSubtitle(): string {
    return 'Status de Garrafas/Equipamentos';
  }

  getColumns(): string[] {
    return [
      'Código',
      'Produto',
      'Ch', 'Vz', 'Rf', 'Av', // Garrafas (removido G.Ch, G.Vz, G.Rf, G.Av)
      'Nv', 'Mn', 'Sc', 'Bl', // Equipamentos
      'Total'
    ];
  }

  getStyles(): ExcelStyles {
    return {
      header: {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } }, // Azul
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

  /**
   * Regra #7: Separação de lógica e apresentação
   */
  formatData(products: ProductItem[]): any[] {
    return products.map(product => {
      // Calcula totais (Regra #8: Tratamento correto de dados)
      const totalGarrafas = (product.chaoCheio || 0) + (product.chaoVazio || 0) + 
                           (product.refugo || 0) + (product.avaria || 0);
      const totalEquipamentos = (product.novo || 0) + (product.manutencao || 0) + 
                               (product.sucata || 0) + (product.bloqueado || 0);
      // Removido totalGarrafeiras conforme solicitado
      const total = totalGarrafas + totalEquipamentos;

      return [
        product.codigo || 'N/A', // Código do produto
        product.nome,
        // Garrafas (removido campos das garrafeiras)
        product.chaoCheio || 0,
        product.chaoVazio || 0,
        product.refugo || 0,
        product.avaria || 0,
        // Equipamentos
        product.novo || 0,
        product.manutencao || 0,
        product.sucata || 0,
        product.bloqueado || 0,
        // Total
        total
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
      // Cabeçalhos com agrupamento
      ['', 'Garrafas/Garrafeiras', '', '', '', '', '', '', '', 'Equipamentos', '', '', '', ''],
      this.getColumns()
    ];

    // Dados formatados
    const formattedData = this.formatData(data.products);
    
    // Calcula totais (Regra #8: Tratamento correto de dados)
    const totals = this.calculateTotals(formattedData);
    
    // Combina tudo (removido linha de totais conforme solicitado)
    const sheetData = [
      ...header,
      ...formattedData
      // Removido: ['TOTAL', ...totals.slice(1)]
    ];

    // Cria planilha
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Aplica formatação (Regra #9: Performance otimizada)
    this.applyFormatting(ws, sheetData.length);
    
    // Ajusta larguras das colunas
    ws['!cols'] = this.getColumnWidths();
    
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque 10');
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

    // Formata cabeçalhos das colunas (linha 5)
    const columns = this.getColumns();
    for (let col = 0; col < columns.length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 5, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = styles.subheader;
      }
    }

    // Removido: Formatação da linha de totais (não existe mais)
  }

  /**
   * Regra #10: Organização - Configuração centralizada
   */
  private getColumnWidths(): XLSX.ColInfo[] {
    return [
      { wch: 15 }, // Código
      { wch: 25 }, // Produto
      { wch: 8 },  // Ch
      { wch: 8 },  // Vz
      { wch: 8 },  // Rf
      { wch: 8 },  // Av
      // Removido: G.Ch, G.Vz, G.Rf, G.Av
      { wch: 8 },  // Nv
      { wch: 8 },  // Mn
      { wch: 8 },  // Sc
      { wch: 8 },  // Bl
      { wch: 12 }  // Total
    ];
  }
}
