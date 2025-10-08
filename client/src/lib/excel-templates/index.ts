import * as XLSX from 'xlsx';
import { ProductItem } from '@/pages/new-count';

/**
 * Interface base para templates de Excel
 */
export interface ExcelTemplate {
  createWorkbook(data: ExcelExportData): XLSX.WorkBook;
  getColumns(): string[];
  formatData(products: ProductItem[]): any[];
  getTitle(): string;
  getSubtitle(): string;
  getStyles(): ExcelStyles;
}

/**
 * Dados para exportação
 */
export interface ExcelExportData {
  products: ProductItem[];
  countDate: string;
  userInfo?: {
    nome?: string;
    matricula?: string;
  };
  totalItems: number;
  totalProducts: number;
}

/**
 * Estilos para Excel
 */
export interface ExcelStyles {
  header: {
    font: { bold: boolean; color: { rgb: string } };
    fill: { fgColor: { rgb: string } };
    alignment: { horizontal: string };
  };
  subheader: {
    font: { bold: boolean };
    fill: { fgColor: { rgb: string } };
    alignment: { horizontal: string };
  };
  data: {
    alignment: { horizontal: string };
    numFmt?: string;
  };
  total: {
    font: { bold: boolean };
    numFmt: string;
  };
}

/**
 * Factory para criar templates baseado no tipo de estoque
 */
// Imports dos templates (Regra #3: TypeScript consistente)
import { Estoque10Template } from './estoque-10-template';
import { Estoque11Template } from './estoque-11-template';
import { Estoque23Template } from './estoque-23-template';

export class ExcelTemplateFactory {
  static create(tipoEstoque: string): ExcelTemplate {
    switch (tipoEstoque) {
      case '10':
        return new Estoque10Template();
      case '11':
        return new Estoque11Template();
      case '23':
        return new Estoque23Template();
      default:
        return new Estoque11Template();
    }
  }
}

/**
 * Função principal para exportar Excel com template específico
 */
export function exportToExcelWithTemplate(
  tipoEstoque: string,
  data: ExcelExportData
): void {
  const template = ExcelTemplateFactory.create(tipoEstoque);
  const workbook = template.createWorkbook(data);
  
  const fileName = `contagem_estoque_${tipoEstoque}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
