import * as XLSX from 'xlsx';
import { ExcelTemplate, ExcelExportData, ExcelStyles } from './index';
import { ProductItem } from '@/pages/new-count';

/**
 * Template específico para Estoque 10 - Layout por Tipo de Garrafeira
 * Regra #3: TypeScript consistente com interfaces bem definidas
 */
export class Estoque10Template implements ExcelTemplate {
  
  getTitle(): string {
    return 'CONTAGEM ESTOQUE 10 - GARRAFEIRAS';
  }

  getSubtitle(): string {
    return 'Separação por Tipo: 300ML, 600ML e 1000ML';
  }

  getColumns(): string[] {
    // Colunas principais para o layout
    return [
      'PRODUTO', 'CÓDIGO',
      // CHÃO CHEIO
      '300ML_CH_PBR', '300ML_CH_CX', '600ML_CH_GAJ', '600ML_CH_CX', '1000ML_CH_GAJ', '1000ML_CH_CX',
      // CHÃO VAZIO  
      '300ML_VZ_PBR', '300ML_VZ_CX', '600ML_VZ_GAJ', '600ML_VZ_CX', '1000ML_VZ_GAJ', '1000ML_VZ_CX',
      // GARRAFEIRA VAZIA
      '300ML_GV_PBR', '300ML_GV_CX', '600ML_GV_GAJ', '600ML_GV_CX', '1000ML_GV_GAJ', '1000ML_GV_CX'
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
   * Detecta o tipo de garrafeira baseado no nome do produto
   */
  private detectGarrafeiraType(productName: string): '300ml' | '600ml' | '1000ml' | 'other' {
    const nameUpper = productName.toUpperCase();
    if (nameUpper.includes('300ML') || nameUpper.includes('300')) return '300ml';
    if (nameUpper.includes('600ML') || nameUpper.includes('600')) return '600ml';
    if (nameUpper.includes('1L') || nameUpper.includes('1000ML')) return '1000ml';
    return 'other';
  }

  /**
   * Regra #7: Separação de lógica e apresentação
   */
  formatData(products: ProductItem[]): any[] {
    return products.map(product => {
      const type = this.detectGarrafeiraType(product.nome || '');
      
      // Inicializa todos os valores como 0
      const data = {
        // CHÃO CHEIO
        '300ml_ch_pbr': 0, '300ml_ch_cx': 0,
        '600ml_ch_gaj': 0, '600ml_ch_cx': 0,
        '1000ml_ch_gaj': 0, '1000ml_ch_cx': 0,
        // CHÃO VAZIO
        '300ml_vz_pbr': 0, '300ml_vz_cx': 0,
        '600ml_vz_gaj': 0, '600ml_vz_cx': 0,
        '1000ml_vz_gaj': 0, '1000ml_vz_cx': 0,
        // GARRAFEIRA VAZIA
        '300ml_gv_pbr': 0, '300ml_gv_cx': 0,
        '600ml_gv_gaj': 0, '600ml_gv_cx': 0,
        '1000ml_gv_gaj': 0, '1000ml_gv_cx': 0
      };

      // Preenche dados baseado no tipo detectado
      if (type !== 'other') {
        // CHÃO CHEIO
        const chaoCheioTotal = (product.chaoCheio || 0);
        const chaoCheioGaj = (product.chaoCheio_gajPbr || 0);
        
        // CHÃO VAZIO
        const chaoVazioTotal = (product.chaoVazio || 0);
        const chaoVazioGaj = (product.chaoVazio_gajPbr || 0);
        
        // GARRAFEIRAS VAZIAS - Correção: 1 pallet = 60 cx (não 288)
        const garrafeirasVazias = (product.garrafeirasVazias_pallets || 0) * 60 + 
                                (product.garrafeirasVazias_lastros || 0) * 24 + 
                                (product.garrafeirasVazias_caixas || 0);
        const garrafeirasVaziasGaj = (product.gajPbr || 0);

        // Atribui valores baseado no tipo
        if (type === '300ml') {
          data['300ml_ch_pbr'] = chaoCheioGaj;
          data['300ml_ch_cx'] = chaoCheioTotal;
          data['300ml_vz_pbr'] = chaoVazioGaj;
          data['300ml_vz_cx'] = chaoVazioTotal;
          data['300ml_gv_pbr'] = garrafeirasVaziasGaj;
          data['300ml_gv_cx'] = garrafeirasVazias;
        } else if (type === '600ml') {
          data['600ml_ch_gaj'] = chaoCheioGaj;
          data['600ml_ch_cx'] = chaoCheioTotal;
          data['600ml_vz_gaj'] = chaoVazioGaj;
          data['600ml_vz_cx'] = chaoVazioTotal;
          data['600ml_gv_gaj'] = garrafeirasVaziasGaj;
          data['600ml_gv_cx'] = garrafeirasVazias;
        } else if (type === '1000ml') {
          data['1000ml_ch_gaj'] = chaoCheioGaj;
          data['1000ml_ch_cx'] = chaoCheioTotal;
          data['1000ml_vz_gaj'] = chaoVazioGaj;
          data['1000ml_vz_cx'] = chaoVazioTotal;
          data['1000ml_gv_gaj'] = garrafeirasVaziasGaj;
          data['1000ml_gv_cx'] = garrafeirasVazias;
        }
      }

      return [
        product.nome.replace(/\s*\([^)]*\)\s*$/, ''), // Remove código do nome
        product.codigo || 'N/A',
        // CHÃO CHEIO
        data['300ml_ch_pbr'], data['300ml_ch_cx'], data['600ml_ch_gaj'], data['600ml_ch_cx'], data['1000ml_ch_gaj'], data['1000ml_ch_cx'],
        // CHÃO VAZIO
        data['300ml_vz_pbr'], data['300ml_vz_cx'], data['600ml_vz_gaj'], data['600ml_vz_cx'], data['1000ml_vz_gaj'], data['1000ml_vz_cx'],
        // GARRAFEIRA VAZIA
        data['300ml_gv_pbr'], data['300ml_gv_cx'], data['600ml_gv_gaj'], data['600ml_gv_cx'], data['1000ml_gv_gaj'], data['1000ml_gv_cx']
      ];
    });
  }

  /**
   * Regra #4: Componente bem estruturado com responsabilidade única
   */
  createWorkbook(data: ExcelExportData): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();
    
    // Dados formatados
    const formattedData = this.formatData(data.products);
    
    // Criação do layout completo
    const sheetData: any[][] = [];
    
    // Título principal
    sheetData.push([this.getTitle()]);
    sheetData.push([this.getSubtitle()]);
    sheetData.push([`Data: ${new Date(data.countDate).toLocaleDateString('pt-BR')}`]);
    sheetData.push([]); // Linha em branco
    
    // ========== SEÇÃO CHÃO CHEIO ==========
    sheetData.push(['CHÃO CHEIO']);
    sheetData.push(['300ML', '', '600ML', '', '1000ML', '', '', 'RESUMO GERAL']);
    sheetData.push(['PBR', 'CX', 'GAJ', 'CX', 'GAJ', 'CX', '', 'CAIXAS:']);
    
    // Dados dos produtos para Chão Cheio
    formattedData.forEach(row => {
      if (row[2] > 0 || row[3] > 0 || row[4] > 0 || row[5] > 0 || row[6] > 0 || row[7] > 0) {
        sheetData.push([
          row[2], row[3], row[4], row[5], row[6], row[7], // 300ML_PBR, 300ML_CX, 600ML_GAJ, 600ML_CX, 1000ML_GAJ, 1000ML_CX
          '', `${row[0]} (${row[1]})` // Nome e código do produto
        ]);
      }
    });
    
    // Totais Chão Cheio
    const totaisChaoCheio = this.calculateSectionTotals(formattedData, [2, 3, 4, 5, 6, 7]);
    sheetData.push(['TOTAL (CX)', totaisChaoCheio[1], 'TOTAL (CX)', totaisChaoCheio[3], 'TOTAL (CX)', totaisChaoCheio[5]]);
    sheetData.push(['TOTAL (GRF)', totaisChaoCheio[1] * 24, 'TOTAL (GRF)', totaisChaoCheio[3] * 24, 'TOTAL (GRF)', totaisChaoCheio[5] * 12]);
    sheetData.push(['TOTAL PBR', totaisChaoCheio[0], 'TOTAL GAJ', totaisChaoCheio[2], 'TOTAL GAJ', totaisChaoCheio[4]]);
    
    sheetData.push([]); // Linha em branco
    
    // ========== SEÇÃO CHÃO VAZIO ==========
    sheetData.push(['CHÃO VAZIO']);
    sheetData.push(['300ML', '', '600ML', '', '1000ML', '', '', 'GARRAFAS:']);
    sheetData.push(['PBR', 'CX', 'GAJ', 'CX', 'GAJ', 'CX']);
    
    // Dados dos produtos para Chão Vazio
    formattedData.forEach(row => {
      if (row[8] > 0 || row[9] > 0 || row[10] > 0 || row[11] > 0 || row[12] > 0 || row[13] > 0) {
        sheetData.push([
          row[8], row[9], row[10], row[11], row[12], row[13], // 300ML_PBR, 300ML_CX, 600ML_GAJ, 600ML_CX, 1000ML_GAJ, 1000ML_CX
          '', `${row[0]} (${row[1]})` // Nome e código do produto
        ]);
      }
    });
    
    // Totais Chão Vazio
    const totaisChaoVazio = this.calculateSectionTotals(formattedData, [8, 9, 10, 11, 12, 13]);
    sheetData.push(['TOTAL (CX)', totaisChaoVazio[1], 'TOTAL (CX)', totaisChaoVazio[3], 'TOTAL (CX)', totaisChaoVazio[5]]);
    sheetData.push(['TOTAL (GRF)', totaisChaoVazio[1] * 24, 'TOTAL (GRF)', totaisChaoVazio[3] * 24, 'TOTAL (GRF)', totaisChaoVazio[5] * 12]);
    sheetData.push(['TOTAL PBR', totaisChaoVazio[0], 'TOTAL GAJ', totaisChaoVazio[2], 'TOTAL GAJ', totaisChaoVazio[4]]);
    
    sheetData.push([]); // Linha em branco
    
    // ========== SEÇÃO GARRAFEIRA VAZIA ==========
    sheetData.push(['GARRAFEIRA VAZIA']);
    sheetData.push(['300ML', '', '600ML', '', '1000ML', '', '', 'GAJ/PBR:']);
    sheetData.push(['PBR', 'CX', 'GAJ', 'CX', 'GAJ', 'CX']);
    
    // Dados dos produtos para Garrafeira Vazia
    formattedData.forEach(row => {
      if (row[14] > 0 || row[15] > 0 || row[16] > 0 || row[17] > 0 || row[18] > 0 || row[19] > 0) {
        sheetData.push([
          row[14], row[15], row[16], row[17], row[18], row[19], // 300ML_PBR, 300ML_CX, 600ML_GAJ, 600ML_CX, 1000ML_GAJ, 1000ML_CX
          '', `${row[0]} (${row[1]})` // Nome e código do produto
        ]);
      }
    });
    
    // Totais Garrafeira Vazia (sem TOTAL GRF)
    const totaisGarrafeiraVazia = this.calculateSectionTotals(formattedData, [14, 15, 16, 17, 18, 19]);
    sheetData.push(['TOTAL (CX)', totaisGarrafeiraVazia[1], 'TOTAL (CX)', totaisGarrafeiraVazia[3], 'TOTAL (CX)', totaisGarrafeiraVazia[5]]);
    sheetData.push(['TOTAL PBR', totaisGarrafeiraVazia[0], 'TOTAL GAJ', totaisGarrafeiraVazia[2], 'TOTAL GAJ', totaisGarrafeiraVazia[4]]);
    
    sheetData.push([]); // Linha em branco
    
    // ========== RESUMO GERAL ==========
    const resumoGeral = this.calculateResumoGeral(totaisChaoCheio, totaisChaoVazio, totaisGarrafeiraVazia);
    
    // Posiciona o resumo geral na coluna H (lado direito)
    const resumoStartRow = 7; // Começa na linha do primeiro cabeçalho
    
    // Adiciona resumo geral nas linhas existentes
    if (sheetData[resumoStartRow]) sheetData[resumoStartRow][7] = 'TOTAL CAIXAS 600ML:';
    if (sheetData[resumoStartRow]) sheetData[resumoStartRow][8] = resumoGeral.totalCaixas600;
    
    if (sheetData[resumoStartRow + 1]) sheetData[resumoStartRow + 1][7] = 'TOTAL CAIXAS 300ML:';
    if (sheetData[resumoStartRow + 1]) sheetData[resumoStartRow + 1][8] = resumoGeral.totalCaixas300;
    
    if (sheetData[resumoStartRow + 2]) sheetData[resumoStartRow + 2][7] = 'TOTAL CAIXAS 1L:';
    if (sheetData[resumoStartRow + 2]) sheetData[resumoStartRow + 2][8] = resumoGeral.totalCaixas1L;
    
    if (sheetData[resumoStartRow + 4]) sheetData[resumoStartRow + 4][7] = 'TOTAL GARRAFAS 600ML:';
    if (sheetData[resumoStartRow + 4]) sheetData[resumoStartRow + 4][8] = resumoGeral.totalGarrafas600;
    
    if (sheetData[resumoStartRow + 5]) sheetData[resumoStartRow + 5][7] = 'TOTAL GARRAFAS 300ML:';
    if (sheetData[resumoStartRow + 5]) sheetData[resumoStartRow + 5][8] = resumoGeral.totalGarrafas300;
    
    if (sheetData[resumoStartRow + 6]) sheetData[resumoStartRow + 6][7] = 'TOTAL GARRAFAS 1L:';
    if (sheetData[resumoStartRow + 6]) sheetData[resumoStartRow + 6][8] = resumoGeral.totalGarrafas1L;
    
    if (sheetData[resumoStartRow + 8]) sheetData[resumoStartRow + 8][7] = 'TOTAL GAJ:';
    if (sheetData[resumoStartRow + 8]) sheetData[resumoStartRow + 8][8] = resumoGeral.totalGAJ;
    
    if (sheetData[resumoStartRow + 9]) sheetData[resumoStartRow + 9][7] = 'TOTAL PBR:';
    if (sheetData[resumoStartRow + 9]) sheetData[resumoStartRow + 9][8] = resumoGeral.totalPBR;
    
    // ========== SEÇÃO CÓDIGOS ==========
    // Adiciona seção de códigos a partir da linha 37
    while (sheetData.length < 37) {
      sheetData.push([]);
    }
    
    sheetData.push(['CÓDIGOS']);
    sheetData.push([]);
    
    // Adiciona produtos com códigos (apenas produtos que têm dados)
    const produtosComDados = data.products.filter(product => {
      const hasChaoCheioDados = (product.chaoCheio || 0) > 0 || (product.chaoCheio_gajPbr || 0) > 0;
      const hasChaoVazioDados = (product.chaoVazio || 0) > 0 || (product.chaoVazio_gajPbr || 0) > 0;
      const hasGarrafeiraVaziaDados = (
        (product.garrafeirasVazias_pallets || 0) > 0 || 
        (product.garrafeirasVazias_lastros || 0) > 0 || 
        (product.garrafeirasVazias_caixas || 0) > 0 || 
        (product.gajPbr || 0) > 0
      );
      
      return hasChaoCheioDados || hasChaoVazioDados || hasGarrafeiraVaziaDados;
    });
    
    produtosComDados.forEach(product => {
      const nomeSimples = product.nome.replace(/\s*\([^)]*\)\s*$/, '');
      const codigo = product.codigo || 'N/A';
      sheetData.push([`${nomeSimples}`, `(${codigo})`]);
    });
    
    // Cria planilha
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Aplica formatação
    this.applyAdvancedFormatting(ws, sheetData.length);
    
    // Ajusta larguras das colunas
    ws['!cols'] = [
      { width: 15 }, // A - Dados
      { width: 10 }, // B - Dados
      { width: 15 }, // C - Dados
      { width: 10 }, // D - Dados
      { width: 15 }, // E - Dados
      { width: 10 }, // F - Dados
      { width: 5 },  // G - Espaço
      { width: 20 }, // H - Resumo
      { width: 15 }  // I - Valores resumo
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque 10');
    return wb;
  }

  /**
   * Calcula totais para uma seção específica
   */
  private calculateSectionTotals(data: any[][], columnIndexes: number[]): number[] {
    const totals: number[] = [];
    
    columnIndexes.forEach(colIndex => {
      const sum = data.reduce((acc, row) => acc + (row[colIndex] || 0), 0);
      totals.push(sum);
    });
    
    return totals;
  }

  /**
   * Calcula resumo geral combinando todas as seções
   */
  private calculateResumoGeral(totaisChaoCheio: number[], totaisChaoVazio: number[], totaisGarrafeiraVazia: number[]) {
    return {
      // CAIXAS
      totalCaixas300: (totaisChaoCheio[1] || 0) + (totaisChaoVazio[1] || 0) + (totaisGarrafeiraVazia[1] || 0),
      totalCaixas600: (totaisChaoCheio[3] || 0) + (totaisChaoVazio[3] || 0) + (totaisGarrafeiraVazia[3] || 0),
      totalCaixas1L: (totaisChaoCheio[5] || 0) + (totaisChaoVazio[5] || 0) + (totaisGarrafeiraVazia[5] || 0),
      
      // GARRAFAS (caixas * garrafas por caixa) - Garrafeiras Vazias NÃO multiplicam
      totalGarrafas300: ((totaisChaoCheio[1] || 0) + (totaisChaoVazio[1] || 0)) * 24 + (totaisGarrafeiraVazia[1] || 0),
      totalGarrafas600: ((totaisChaoCheio[3] || 0) + (totaisChaoVazio[3] || 0)) * 24 + (totaisGarrafeiraVazia[3] || 0),
      totalGarrafas1L: ((totaisChaoCheio[5] || 0) + (totaisChaoVazio[5] || 0)) * 12 + (totaisGarrafeiraVazia[5] || 0),
      
      // GAJ/PBR
      totalGAJ: (totaisChaoCheio[2] || 0) + (totaisChaoVazio[2] || 0) + (totaisGarrafeiraVazia[2] || 0) + 
                (totaisChaoCheio[4] || 0) + (totaisChaoVazio[4] || 0) + (totaisGarrafeiraVazia[4] || 0),
      totalPBR: (totaisChaoCheio[0] || 0) + (totaisChaoVazio[0] || 0) + (totaisGarrafeiraVazia[0] || 0)
    };
  }

  /**
   * Aplica formatação avançada para o novo layout
   */
  private applyAdvancedFormatting(ws: XLSX.WorkSheet, rowCount: number): void {
    const styles = this.getStyles();
    
    // Define estilo de borda padrão (como na imagem)
    const borderStyle = {
      style: 'thin',
      color: { rgb: '000000' }
    };
    
    const defaultBorder = {
      top: borderStyle,
      bottom: borderStyle,
      left: borderStyle,
      right: borderStyle
    };
    
    // Aplica bordas em todas as células com conteúdo
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < 9; col++) { // Colunas A-I
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[cellAddress];
        
        if (cell && cell.v !== undefined && cell.v !== '') {
          if (!cell.s) cell.s = {};
          cell.s.border = defaultBorder;
        }
      }
    }
    
    // Formata título principal (A1)
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, size: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center' },
        border: defaultBorder
      };
    }
    
    // Formata subtítulo (A2)
    if (ws['A2']) {
      ws['A2'].s = {
        font: { bold: true, size: 12 },
        fill: { fgColor: { rgb: '5B9BD5' } },
        alignment: { horizontal: 'center' },
        border: defaultBorder
      };
    }
    
    // Formata data (A3)
    if (ws['A3']) {
      ws['A3'].s = {
        font: { italic: true },
        alignment: { horizontal: 'left' },
        border: defaultBorder
      };
    }
    
    // Formata cabeçalhos das seções e aplica bordas
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < 9; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[cellAddress];
        
        if (cell && typeof cell.v === 'string') {
          // Cabeçalhos das seções (CHÃO CHEIO, CHÃO VAZIO, etc.)
          if (cell.v.includes('CHÃO CHEIO') || cell.v.includes('CHÃO VAZIO') || cell.v.includes('GARRAFEIRA VAZIA')) {
            cell.s = {
              font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '2F5597' } },
              alignment: { horizontal: 'center' },
              border: {
                top: { style: 'thick', color: { rgb: '000000' } },
                bottom: { style: 'thick', color: { rgb: '000000' } },
                left: { style: 'thick', color: { rgb: '000000' } },
                right: { style: 'thick', color: { rgb: '000000' } }
              }
            };
          }
          
          // Subcabeçalhos (300ML, 600ML, 1000ML)
          else if (cell.v === '300ML' || cell.v === '600ML' || cell.v === '1000ML') {
            cell.s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'D9E2F3' } },
              alignment: { horizontal: 'center' },
              border: defaultBorder
            };
          }
          
          // Labels (PBR, CX, GAJ)
          else if (cell.v === 'PBR' || cell.v === 'CX' || cell.v === 'GAJ') {
            cell.s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'E7E6E6' } },
              alignment: { horizontal: 'center' },
              border: defaultBorder
            };
          }
          
          // Linhas de totais
          else if (cell.v.includes('TOTAL')) {
            cell.s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FFF2CC' } },
              alignment: { horizontal: 'center' },
              border: {
                top: { style: 'medium', color: { rgb: '000000' } },
                bottom: { style: 'medium', color: { rgb: '000000' } },
                left: borderStyle,
                right: borderStyle
              }
            };
          }
          
          // Seção CÓDIGOS
          else if (cell.v === 'CÓDIGOS') {
            cell.s = {
              font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '70AD47' } },
              alignment: { horizontal: 'center' },
              border: {
                top: { style: 'thick', color: { rgb: '000000' } },
                bottom: { style: 'thick', color: { rgb: '000000' } },
                left: { style: 'thick', color: { rgb: '000000' } },
                right: { style: 'thick', color: { rgb: '000000' } }
              }
            };
          }
          
          // Resumo geral (coluna H)
          else if (col === 7 && cell.v.includes('TOTAL')) {
            cell.s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'E2EFDA' } },
              alignment: { horizontal: 'left' },
              border: defaultBorder
            };
          }
        }
        
        // Formata valores numéricos
        if (cell && typeof cell.v === 'number') {
          if (!cell.s) cell.s = {};
          cell.s.numFmt = '#,##0';
          cell.s.alignment = { horizontal: 'center' };
          cell.s.border = defaultBorder;
          
          // Valores do resumo (coluna I)
          if (col === 8) {
            cell.s.font = { bold: true };
            cell.s.alignment = { horizontal: 'right' };
          }
        }
      }
    }
    
    // Adiciona bordas extras para delimitar seções (como na imagem)
    this.addSectionBorders(ws, rowCount);
  }
  
  /**
   * Adiciona bordas especiais para delimitar seções
   */
  private addSectionBorders(ws: XLSX.WorkSheet, rowCount: number): void {
    const thickBorder = {
      style: 'thick',
      color: { rgb: '000000' }
    };
    
    // Encontra linhas de seção e adiciona bordas grossas
    for (let row = 0; row < rowCount; row++) {
      const cellA = ws[XLSX.utils.encode_cell({ r: row, c: 0 })];
      
      if (cellA && typeof cellA.v === 'string') {
        // Borda grossa ao redor de cada seção
        if (cellA.v.includes('CHÃO CHEIO') || cellA.v.includes('CHÃO VAZIO') || cellA.v.includes('GARRAFEIRA VAZIA')) {
          // Aplica borda grossa na linha da seção (colunas A-F)
          for (let col = 0; col < 6; col++) {
            const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = ws[cellAddr];
            if (cell) {
              if (!cell.s) cell.s = {};
              if (!cell.s.border) cell.s.border = {};
              cell.s.border.top = thickBorder;
              cell.s.border.bottom = thickBorder;
              if (col === 0) cell.s.border.left = thickBorder;
              if (col === 5) cell.s.border.right = thickBorder;
            }
          }
        }
      }
    }
  }

  /**
   * Regra #10: Organização - Configuração centralizada
   */
  private getColumnWidths(): XLSX.ColInfo[] {
    return [
      { wch: 15 }, // A - Dados
      { wch: 10 }, // B - Dados  
      { wch: 15 }, // C - Dados
      { wch: 10 }, // D - Dados
      { wch: 15 }, // E - Dados
      { wch: 10 }, // F - Dados
      { wch: 5 },  // G - Espaço
      { wch: 20 }, // H - Resumo
      { wch: 15 }  // I - Valores resumo
    ];
  }
}
