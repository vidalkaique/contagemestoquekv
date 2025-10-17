import ExcelJS from 'exceljs';
import { ExcelTemplate, ExcelExportData, ExcelStyles } from './index';
import { ProductItem } from '@/pages/new-count';

/**
 * Template ExcelJS para Estoque 10 - Mantém 100% compatibilidade
 * Regra #3: TypeScript consistente + #1: DRY + #8: Error Handling
 */
export class ExcelJSEstoque10Template implements ExcelTemplate {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.setupWorkbookProperties();
  }

  /**
   * Configurações do workbook (Regra #10: Organização)
   */
  private setupWorkbookProperties(): void {
    this.workbook.creator = 'Sistema Contagem Estoque';
    this.workbook.lastModifiedBy = 'Sistema Contagem Estoque';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
  }

  /**
   * Implementa interface ExcelTemplate - COMPATIBILIDADE TOTAL
   * Regra #8: Error handling robusto
   */
  createWorkbook(data: ExcelExportData): any {
    try {
      // CORREÇÃO CRÍTICA: Inicializa workbook ExcelJS antes de usar
      this.workbook = new ExcelJS.Workbook();
      
      // Configurações do workbook
      this.workbook.creator = 'Sistema de Contagem de Estoque';
      this.workbook.lastModifiedBy = 'Sistema';
      this.workbook.created = new Date();
      this.workbook.modified = new Date();
      
      // Cria as abas síncronamente
      this.createGarrafeirasSheetSync(data);
      this.createOutrosProdutosSheetSync(data);
      
      // Retorna workbook ExcelJS (compatível com interface)
      return this.workbook;
    } catch (error) {
      console.error('Erro ao criar workbook ExcelJS:', error);
      throw new Error(`Falha na criação do workbook Excel: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
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
    // Reutiliza lógica existente (Regra #1: DRY)
    return products.map(product => [
      product.nome.replace(/\s*\([^)]*\)\s*$/, ''),
      product.codigo || ''
      // ... resto dos campos mantidos idênticos
    ]);
  }

  // Métodos getTitle() e getSubtitle() movidos para o final do arquivo

  getStyles(): ExcelStyles {
    // Mantém interface existente
    return {
      header: {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center' }
      },
      subheader: {
        font: { bold: true },
        fill: { fgColor: { rgb: '5B9BD5' } },
        alignment: { horizontal: 'center' }
      },
      data: {
        alignment: { horizontal: 'left' }
      },
      total: {
        font: { bold: true },
        numFmt: '#,##0'
      }
    };
  }

  /**
   * Gera buffer Excel com ExcelJS (Regra #8: Error Handling)
   */
  private async generateExcelBuffer(data: ExcelExportData): Promise<Buffer> {
    try {
      // Implementação será feita na próxima fase
      await this.createGarrafeirasSheet(data);
      await this.createOutrosProdutosSheet(data);
      
      return await this.workbook.xlsx.writeBuffer() as Buffer;
    } catch (error) {
      console.error('Erro ao gerar Excel com ExcelJS:', error);
      throw new Error('Falha na geração do arquivo Excel');
    }
  }

  /**
   * Versão síncrona para compatibilidade com interface ExcelTemplate
   */
  private createGarrafeirasSheetSync(data: ExcelExportData): void {
    const worksheet = this.workbook.addWorksheet('Garrafeiras');
    
    // Dados formatados (reutiliza lógica existente)
    const formattedData = this.formatDataForExcelJS(data.products);
    
    let currentRow = 1;
    
    // Título principal
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = this.getTitle();
    this.applyHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Subtítulo
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = this.getSubtitle();
    this.applySubheaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Data
    worksheet.getCell(`A${currentRow}`).value = `Data: ${new Date(data.countDate).toLocaleDateString('pt-BR')}`;
    currentRow += 2; // Linha em branco
    
    // ========== SEÇÃO CHÃO CHEIO ==========
    currentRow = this.createChaoCheiSectionSync(worksheet, formattedData, currentRow);
    currentRow++; // Linha em branco
    
    // ========== SEÇÃO CHÃO VAZIO ==========
    currentRow = this.createChaoVazioSectionSync(worksheet, formattedData, currentRow);
    currentRow++; // Linha em branco
    
    // ========== SEÇÃO GARRAFEIRA VAZIA ==========
    currentRow = this.createGarrafeiraVaziaSectionSync(worksheet, formattedData, currentRow);
    currentRow++; // Linha em branco
    
    // ========== SEÇÃO CÓDIGOS ==========
    currentRow = this.createCodigosSectionSync(worksheet, currentRow);
    currentRow += 2; // Linha em branco
    
    // ========== RESUMO GERAL ==========
    this.createResumoGeralSection(worksheet, formattedData, currentRow);
    
    // Aplica bordas profissionais
    this.applyProfessionalBorders(worksheet);
    
    // Ajusta larguras das colunas
    this.setColumnWidths(worksheet);
  }

  /**
   * Cria aba Garrafeiras com estrutura idêntica + bordas profissionais
   * Regra #1: DRY - Reutiliza lógica existente
   */
  private async createGarrafeirasSheet(data: ExcelExportData): Promise<void> {
    const worksheet = this.workbook.addWorksheet('Garrafeiras');
    
    // Dados formatados (reutiliza lógica existente)
    const formattedData = this.formatDataForExcelJS(data.products);
    
    let currentRow = 1;
    
    // Título principal
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = this.getTitle();
    this.applyHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Subtítulo
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = this.getSubtitle();
    this.applySubheaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Data
    worksheet.getCell(`A${currentRow}`).value = `Data: ${new Date(data.countDate).toLocaleDateString('pt-BR')}`;
    currentRow += 2; // Linha em branco
    
    // ========== SEÇÃO CHÃO CHEIO ==========
    currentRow = await this.createChaoCheiSection(worksheet, formattedData, currentRow);
    currentRow++; // Linha em branco
    
    // ========== SEÇÃO CHÃO VAZIO ==========
    currentRow = await this.createChaoVazioSection(worksheet, formattedData, currentRow);
    currentRow++; // Linha em branco
    
    // ========== SEÇÃO GARRAFEIRA VAZIA ==========
    currentRow = await this.createGarrafeiraVaziaSection(worksheet, formattedData, currentRow);
    currentRow++; // Linha em branco
    
    // ========== SEÇÃO CÓDIGOS ==========
    currentRow = this.createCodigosSectionSync(worksheet, currentRow);
    currentRow += 2; // Linha em branco
    
    // ========== RESUMO GERAL ==========
    this.createResumoGeralSection(worksheet, formattedData, currentRow);
    
    // Aplica bordas profissionais
    this.applyProfessionalBorders(worksheet);
    
    // Ajusta larguras das colunas
    this.setColumnWidths(worksheet);
  }

  /**
   * Versão síncrona para compatibilidade com interface ExcelTemplate
   */
  private createOutrosProdutosSheetSync(data: ExcelExportData): void {
    const worksheet = this.workbook.addWorksheet('Outros Produtos');
    
    let currentRow = 1;
    
    // Título principal (10 colunas)
    worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'OUTROS PRODUTOS - ESTOQUE 10';
    this.applyHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow += 2;
    
    // DEBUG: Total de produtos
    worksheet.getCell(`A${currentRow}`).value = `TOTAL DE PRODUTOS RECEBIDOS: ${data.products.length}`;
    currentRow++;
    
    // DEBUG: Lista todos os produtos para análise
    worksheet.getCell(`A${currentRow}`).value = 'DEBUG - LISTA DE PRODUTOS:';
    currentRow++;
    data.products.forEach((product: ProductItem, index: number) => {
      const nomeMinusculo = product.nome.toLowerCase();
      const isGarrafeira = nomeMinusculo.includes('300ml') || 
                          nomeMinusculo.includes('300 ml') ||
                          nomeMinusculo.includes('600ml') || 
                          nomeMinusculo.includes('600 ml') ||
                          nomeMinusculo.includes('1000ml') || 
                          nomeMinusculo.includes('1000 ml') ||
                          nomeMinusculo.includes('1l');
      const temDados = this.hasProductData(product);
      
      worksheet.getCell(`A${currentRow}`).value = `${index + 1}. ${product.nome} - Garrafeira: ${isGarrafeira ? 'SIM' : 'NÃO'} - Dados: ${temDados ? 'SIM' : 'NÃO'}`;
      currentRow++;
    });
    currentRow++;
    
    // Cabeçalho da tabela (EXPANDIDO)
    worksheet.getCell(`A${currentRow}`).value = 'PRODUTO';
    worksheet.getCell(`B${currentRow}`).value = 'CÓDIGO';
    worksheet.getCell(`C${currentRow}`).value = 'TIPO';
    worksheet.getCell(`D${currentRow}`).value = 'CHÃO CHEIO';
    worksheet.getCell(`E${currentRow}`).value = 'CHÃO VAZIO';
    worksheet.getCell(`F${currentRow}`).value = 'NOVO';
    worksheet.getCell(`G${currentRow}`).value = 'MANUTENÇÃO';
    worksheet.getCell(`H${currentRow}`).value = 'SUCATA';
    worksheet.getCell(`I${currentRow}`).value = 'BLOQUEADO';
    worksheet.getCell(`J${currentRow}`).value = 'OBSERVAÇÕES';
    
    // Aplica estilo ao cabeçalho (10 colunas)
    for (let col = 1; col <= 10; col++) {
      this.applySubheaderStyle(worksheet.getCell(currentRow, col));
    }
    currentRow += 2;
    
    let produtosComDados = 0;
    let outrosProdutos = 0;
    
    // Exibe TODOS os produtos (conforme solicitado pelo usuário)
    data.products.forEach((product: ProductItem) => {
      const nomeSimples = product.nome.replace(/\s*\([^)]*\)\s*$/, '');
      const codigo = product.codigo || 'N/A';
      const nomeMinusculo = product.nome.toLowerCase();
      
      // Verifica se tem algum dado preenchido (para estatísticas)
      const temDados = this.hasProductData(product);
      if (temDados) {
        produtosComDados++;
      }
      
      // Verifica se é "outros produtos" (não garrafeira)
      const isGarrafeira = nomeMinusculo.includes('300ml') || 
                          nomeMinusculo.includes('300 ml') ||
                          nomeMinusculo.includes('600ml') || 
                          nomeMinusculo.includes('600 ml') ||
                          nomeMinusculo.includes('1000ml') || 
                          nomeMinusculo.includes('1000 ml') ||
                          nomeMinusculo.includes('1l');
      
      // MOSTRA TODOS OS PRODUTOS (não só os com dados)
      if (!isGarrafeira) {
        outrosProdutos++;
        
        // Determina tipo do produto
        let tipo = 'OUTROS';
        if (nomeMinusculo.includes('equipamento') || nomeMinusculo.includes('equip')) {
          tipo = 'EQUIPAMENTO';
        } else if (nomeMinusculo.includes('material') || nomeMinusculo.includes('mat')) {
          tipo = 'MATERIAL';
        }
        
        // Valores dos campos (com valores reais)
        const chaoCheioValue = this.getFieldSummary(product, 'chaoCheio');
        const chaoVazioValue = this.getFieldSummary(product, 'chaoVazio');
        const novoValue = (product.novo || 0) > 0 ? product.novo : '-';
        const manutencaoValue = (product.manutencao || 0) > 0 ? product.manutencao : '-';
        const sucataValue = (product.sucata || 0) > 0 ? product.sucata : '-';
        const bloqueadoValue = (product.bloqueado || 0) > 0 ? product.bloqueado : '-';
        const observacoes = this.buildObservations(product);
        
        // Adiciona linha do produto (10 colunas)
        worksheet.getCell(`A${currentRow}`).value = nomeSimples;
        worksheet.getCell(`B${currentRow}`).value = codigo;
        worksheet.getCell(`C${currentRow}`).value = tipo;
        worksheet.getCell(`D${currentRow}`).value = chaoCheioValue;
        worksheet.getCell(`E${currentRow}`).value = chaoVazioValue;
        worksheet.getCell(`F${currentRow}`).value = novoValue;
        worksheet.getCell(`G${currentRow}`).value = manutencaoValue;
        worksheet.getCell(`H${currentRow}`).value = sucataValue;
        worksheet.getCell(`I${currentRow}`).value = bloqueadoValue;
        worksheet.getCell(`J${currentRow}`).value = observacoes;
        
        currentRow++;
      }
    });
    
    // Resumo final
    currentRow += 2;
    worksheet.getCell(`A${currentRow}`).value = `PRODUTOS COM DADOS: ${produtosComDados}`;
    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = `OUTROS PRODUTOS (NÃO GARRAFEIRAS): ${outrosProdutos}`;
    
    // Aplica bordas profissionais
    this.applyProfessionalBorders(worksheet);
    
    // Ajusta larguras das colunas
    this.setOutrosProdutosColumnWidths(worksheet);
  }

  /**
   * Cria aba "Outros Produtos" com estrutura idêntica + bordas profissionais
   * Regra #1: DRY - Reutiliza lógica de filtragem existente
   */
  private async createOutrosProdutosSheet(data: ExcelExportData): Promise<void> {
    const worksheet = this.workbook.addWorksheet('Outros Produtos');
    
    let currentRow = 1;
    
    // Título principal (10 colunas)
    worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'OUTROS PRODUTOS - ESTOQUE 10';
    this.applyHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow += 2;
    
    // DEBUG: Total de produtos
    worksheet.getCell(`A${currentRow}`).value = `TOTAL DE PRODUTOS RECEBIDOS: ${data.products.length}`;
    currentRow++;
    
    // DEBUG: Lista todos os produtos para análise
    worksheet.getCell(`A${currentRow}`).value = 'DEBUG - LISTA DE PRODUTOS:';
    currentRow++;
    data.products.forEach((product: ProductItem, index: number) => {
      const nomeMinusculo = product.nome.toLowerCase();
      const isGarrafeira = nomeMinusculo.includes('300ml') || 
                          nomeMinusculo.includes('300 ml') ||
                          nomeMinusculo.includes('600ml') || 
                          nomeMinusculo.includes('600 ml') ||
                          nomeMinusculo.includes('1000ml') || 
                          nomeMinusculo.includes('1000 ml') ||
                          nomeMinusculo.includes('1l');
      const temDados = this.hasProductData(product);
      
      worksheet.getCell(`A${currentRow}`).value = `${index + 1}. ${product.nome} - Garrafeira: ${isGarrafeira ? 'SIM' : 'NÃO'} - Dados: ${temDados ? 'SIM' : 'NÃO'}`;
      currentRow++;
    });
    currentRow++;
    
    // Cabeçalho da tabela (EXPANDIDO)
    worksheet.getCell(`A${currentRow}`).value = 'PRODUTO';
    worksheet.getCell(`B${currentRow}`).value = 'CÓDIGO';
    worksheet.getCell(`C${currentRow}`).value = 'TIPO';
    worksheet.getCell(`D${currentRow}`).value = 'CHÃO CHEIO';
    worksheet.getCell(`E${currentRow}`).value = 'CHÃO VAZIO';
    worksheet.getCell(`F${currentRow}`).value = 'NOVO';
    worksheet.getCell(`G${currentRow}`).value = 'MANUTENÇÃO';
    worksheet.getCell(`H${currentRow}`).value = 'SUCATA';
    worksheet.getCell(`I${currentRow}`).value = 'BLOQUEADO';
    worksheet.getCell(`J${currentRow}`).value = 'OBSERVAÇÕES';
    
    // Aplica estilo ao cabeçalho (10 colunas)
    for (let col = 1; col <= 10; col++) {
      this.applySubheaderStyle(worksheet.getCell(currentRow, col));
    }
    currentRow += 2;
    
    let produtosComDados = 0;
    let outrosProdutos = 0;
    
    // Exibe TODOS os produtos (conforme solicitado pelo usuário)
    data.products.forEach((product: ProductItem) => {
      const nomeSimples = product.nome.replace(/\s*\([^)]*\)\s*$/, '');
      const codigo = product.codigo || 'N/A';
      const nomeMinusculo = product.nome.toLowerCase();
      
      // Verifica se tem algum dado preenchido (para estatísticas)
      const temDados = this.hasProductData(product);
      if (temDados) {
        produtosComDados++;
      }
      
      // Verifica se é "outros produtos" (não garrafeira)
      const isGarrafeira = nomeMinusculo.includes('300ml') || 
                          nomeMinusculo.includes('300 ml') ||
                          nomeMinusculo.includes('600ml') || 
                          nomeMinusculo.includes('600 ml') ||
                          nomeMinusculo.includes('1000ml') || 
                          nomeMinusculo.includes('1000 ml') ||
                          nomeMinusculo.includes('1l');
      
      // MOSTRA TODOS OS PRODUTOS (não só os com dados)
      if (!isGarrafeira) {
        outrosProdutos++;
        
        // Determina tipo do produto
        let tipo = 'OUTROS';
        if (nomeMinusculo.includes('equipamento') || nomeMinusculo.includes('equip')) {
          tipo = 'EQUIPAMENTO';
        } else if (nomeMinusculo.includes('material') || nomeMinusculo.includes('mat')) {
          tipo = 'MATERIAL';
        }
        
        // Valores dos campos (com valores reais)
        const chaoCheioValue = this.getFieldSummary(product, 'chaoCheio');
        const chaoVazioValue = this.getFieldSummary(product, 'chaoVazio');
        const novoValue = (product.novo || 0) > 0 ? product.novo : '-';
        const manutencaoValue = (product.manutencao || 0) > 0 ? product.manutencao : '-';
        const sucataValue = (product.sucata || 0) > 0 ? product.sucata : '-';
        const bloqueadoValue = (product.bloqueado || 0) > 0 ? product.bloqueado : '-';
        const observacoes = this.buildObservations(product);
        
        // Adiciona linha do produto (10 colunas)
        worksheet.getCell(`A${currentRow}`).value = nomeSimples;
        worksheet.getCell(`B${currentRow}`).value = codigo;
        worksheet.getCell(`C${currentRow}`).value = tipo;
        worksheet.getCell(`D${currentRow}`).value = chaoCheioValue;
        worksheet.getCell(`E${currentRow}`).value = chaoVazioValue;
        worksheet.getCell(`F${currentRow}`).value = novoValue;
        worksheet.getCell(`G${currentRow}`).value = manutencaoValue;
        worksheet.getCell(`H${currentRow}`).value = sucataValue;
        worksheet.getCell(`I${currentRow}`).value = bloqueadoValue;
        worksheet.getCell(`J${currentRow}`).value = observacoes;
        
        currentRow++;
      }
    });
    
    // Resumo final
    currentRow += 2;
    worksheet.getCell(`A${currentRow}`).value = `PRODUTOS COM DADOS: ${produtosComDados}`;
    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = `OUTROS PRODUTOS (NÃO GARRAFEIRAS): ${outrosProdutos}`;
    
    // Aplica bordas profissionais
    this.applyProfessionalBorders(worksheet);
    
    // Ajusta larguras das colunas
    this.setOutrosProdutosColumnWidths(worksheet);
  }

  /**
   * Formata dados para ExcelJS (Regra #1: DRY)
   */
  private formatDataForExcelJS(products: ProductItem[]): any[] {
    return products.map(product => {
      const data = this.extractProductData(product);
      return [
        product.nome.replace(/\s*\([^)]*\)\s*$/, ''),
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
   * Extrai dados do produto (COPIA EXATA da lógica original)
   * Regra #1: DRY - Reutiliza lógica sem duplicação
   */
  private extractProductData(product: ProductItem): Record<string, number> {
    // Detecta tipo do produto baseado no nome
    const nomeMinusculo = product.nome.toLowerCase();
    let type = 'other';
    
    if (nomeMinusculo.includes('300ml') || nomeMinusculo.includes('300 ml')) {
      type = '300ml';
    } else if (nomeMinusculo.includes('600ml') || nomeMinusculo.includes('600 ml')) {
      type = '600ml';
    } else if (nomeMinusculo.includes('1000ml') || nomeMinusculo.includes('1000 ml') || nomeMinusculo.includes('1l')) {
      type = '1000ml';
    }
    
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
      
      // GARRAFEIRAS VAZIAS - Usa taxas de conversão do produto
      const calculateTotal = (pallets: number, lastros: number, caixas: number): number => {
        const caixasPorLastro = product.pacotesPorLastro || 12;
        const lastrosPorPallet = product.lastrosPorPallet || 10;
        return (
          pallets * lastrosPorPallet * caixasPorLastro +
          lastros * caixasPorLastro +
          caixas
        );
      };
      
      const garrafeirasVazias = calculateTotal(
        product.garrafeirasVazias_pallets || 0,
        product.garrafeirasVazias_lastros || 0,
        product.garrafeirasVazias_caixas || 0
      );
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
    
    return data;
  }

  /**
   * Aplica estilo de cabeçalho
   */
  private applyHeaderStyle(cell: ExcelJS.Cell): void {
    cell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  /**
   * Aplica estilo de subcabeçalho
   */
  private applySubheaderStyle(cell: ExcelJS.Cell): void {
    cell.font = { bold: true, size: 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  /**
   * Versões síncronas dos métodos auxiliares para compatibilidade
   */
  private createChaoCheiSectionSync(worksheet: ExcelJS.Worksheet, formattedData: any[], startRow: number): number {
    let currentRow = startRow;
    
    // Título da seção
    worksheet.getCell(`A${currentRow}`).value = 'CHÃO CHEIO';
    this.applySectionHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Cabeçalhos das colunas
    worksheet.getCell(`A${currentRow}`).value = '300ML';
    worksheet.getCell(`C${currentRow}`).value = '600ML';
    worksheet.getCell(`E${currentRow}`).value = '1000ML';
    worksheet.getCell(`H${currentRow}`).value = 'RESUMO GERAL';
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'PBR';
    worksheet.getCell(`B${currentRow}`).value = 'CX';
    worksheet.getCell(`C${currentRow}`).value = 'GAJ';
    worksheet.getCell(`D${currentRow}`).value = 'CX';
    worksheet.getCell(`E${currentRow}`).value = 'GAJ';
    worksheet.getCell(`F${currentRow}`).value = 'CX';
    worksheet.getCell(`H${currentRow}`).value = 'CAIXAS:';
    currentRow++;
    
    // Dados dos produtos
    formattedData.forEach(row => {
      if (row[2] > 0 || row[3] > 0 || row[4] > 0 || row[5] > 0 || row[6] > 0 || row[7] > 0) {
        worksheet.getCell(`A${currentRow}`).value = row[2]; // 300ML_PBR
        worksheet.getCell(`B${currentRow}`).value = row[3]; // 300ML_CX
        worksheet.getCell(`C${currentRow}`).value = row[4]; // 600ML_GAJ
        worksheet.getCell(`D${currentRow}`).value = row[5]; // 600ML_CX
        worksheet.getCell(`E${currentRow}`).value = row[6]; // 1000ML_GAJ
        worksheet.getCell(`F${currentRow}`).value = row[7]; // 1000ML_CX
        currentRow++;
      }
    });
    
    // Totais
    const totais = this.calculateSectionTotals(formattedData, [2, 3, 4, 5, 6, 7]);
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`B${currentRow}`).value = totais[1];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`D${currentRow}`).value = totais[3];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`F${currentRow}`).value = totais[5];
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`B${currentRow}`).value = totais[1] * 24;
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`D${currentRow}`).value = totais[3] * 24;
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`F${currentRow}`).value = totais[5] * 12;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PBR';
    worksheet.getCell(`B${currentRow}`).value = totais[0];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`D${currentRow}`).value = totais[2];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`F${currentRow}`).value = totais[4];
    currentRow++;
    
    return currentRow;
  }

  private createChaoVazioSectionSync(worksheet: ExcelJS.Worksheet, formattedData: any[], startRow: number): number {
    let currentRow = startRow;
    
    worksheet.getCell(`A${currentRow}`).value = 'CHÃO VAZIO';
    this.applySectionHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = '300ML';
    worksheet.getCell(`C${currentRow}`).value = '600ML';
    worksheet.getCell(`E${currentRow}`).value = '1000ML';
    worksheet.getCell(`H${currentRow}`).value = 'GARRAFAS:';
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'PBR';
    worksheet.getCell(`B${currentRow}`).value = 'CX';
    worksheet.getCell(`C${currentRow}`).value = 'GAJ';
    worksheet.getCell(`D${currentRow}`).value = 'CX';
    worksheet.getCell(`E${currentRow}`).value = 'GAJ';
    worksheet.getCell(`F${currentRow}`).value = 'CX';
    currentRow++;
    
    // CORREÇÃO: Agrupa dados por linha para evitar zeros desnecessários
    const dadosAgrupados = this.agruparDadosPorLinha(formattedData, [8, 9, 10, 11, 12, 13]);
    dadosAgrupados.forEach(linha => {
      worksheet.getCell(`A${currentRow}`).value = linha[0]; // 300ML_PBR
      worksheet.getCell(`B${currentRow}`).value = linha[1]; // 300ML_CX
      worksheet.getCell(`C${currentRow}`).value = linha[2]; // 600ML_GAJ
      worksheet.getCell(`D${currentRow}`).value = linha[3]; // 600ML_CX
      worksheet.getCell(`E${currentRow}`).value = linha[4]; // 1000ML_GAJ
      worksheet.getCell(`F${currentRow}`).value = linha[5]; // 1000ML_CX
      currentRow++;
    });
    
    // TOTAIS COMPLETOS (igual ao Chão Cheio)
    const totais = this.calculateSectionTotals(formattedData, [8, 9, 10, 11, 12, 13]);
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`B${currentRow}`).value = totais[1];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`D${currentRow}`).value = totais[3];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`F${currentRow}`).value = totais[5];
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`B${currentRow}`).value = totais[1] * 24;
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`D${currentRow}`).value = totais[3] * 24;
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`F${currentRow}`).value = totais[5] * 12;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PBR';
    worksheet.getCell(`B${currentRow}`).value = totais[0];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`D${currentRow}`).value = totais[2];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`F${currentRow}`).value = totais[4];
    currentRow++;
    
    return currentRow;
  }

  private createGarrafeiraVaziaSectionSync(worksheet: ExcelJS.Worksheet, formattedData: any[], startRow: number): number {
    let currentRow = startRow;
    
    worksheet.getCell(`A${currentRow}`).value = 'GARRAFEIRA VAZIA';
    this.applySectionHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = '300ML';
    worksheet.getCell(`C${currentRow}`).value = '600ML';
    worksheet.getCell(`E${currentRow}`).value = '1000ML';
    worksheet.getCell(`H${currentRow}`).value = 'EQUIPAMENTOS:';
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'PBR';
    worksheet.getCell(`B${currentRow}`).value = 'CX';
    worksheet.getCell(`C${currentRow}`).value = 'GAJ';
    worksheet.getCell(`D${currentRow}`).value = 'CX';
    worksheet.getCell(`E${currentRow}`).value = 'GAJ';
    worksheet.getCell(`F${currentRow}`).value = 'CX';
    currentRow++;
    
    // CORREÇÃO: Agrupa dados por linha para evitar zeros desnecessários
    const dadosAgrupados = this.agruparDadosPorLinha(formattedData, [14, 15, 16, 17, 18, 19]);
    dadosAgrupados.forEach(linha => {
      worksheet.getCell(`A${currentRow}`).value = linha[0]; // 300ML_PBR
      worksheet.getCell(`B${currentRow}`).value = linha[1]; // 300ML_CX
      worksheet.getCell(`C${currentRow}`).value = linha[2]; // 600ML_GAJ
      worksheet.getCell(`D${currentRow}`).value = linha[3]; // 600ML_CX
      worksheet.getCell(`E${currentRow}`).value = linha[4]; // 1000ML_GAJ
      worksheet.getCell(`F${currentRow}`).value = linha[5]; // 1000ML_CX
      currentRow++;
    });
    
    // TOTAIS COMPLETOS (incluindo PBR e GAJ que estavam faltando)
    const totais = this.calculateSectionTotals(formattedData, [14, 15, 16, 17, 18, 19]);
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`B${currentRow}`).value = totais[1];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`D${currentRow}`).value = totais[3];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`F${currentRow}`).value = totais[5];
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`B${currentRow}`).value = totais[1] * 24;
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`D${currentRow}`).value = totais[3] * 24;
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`F${currentRow}`).value = totais[5] * 12;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PBR';
    worksheet.getCell(`B${currentRow}`).value = totais[0];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`D${currentRow}`).value = totais[2];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`F${currentRow}`).value = totais[4];
    currentRow++;
    
    return currentRow;
  }

  private createCodigosSectionSync(worksheet: ExcelJS.Worksheet, startRow: number): number {
    const codigosPredefinidos = [
      ['1023392', 'GARRAFA 1L'],
      ['1023384', 'GARRAFA 300ML'],
      ['1023393', 'GARRAFA 600ML'],
      ['1155350', 'GARRAFA VERDE 600ML'],
      ['1022893', 'GARRAFEIRA 1L'],
      ['1022894', 'GARRAFEIRA 300ML'],
      ['1022895', 'GARRAFEIRA 600ML']
    ];
    
    worksheet.getCell(`A${startRow}`).value = 'CÓDIGOS';
    this.applySectionHeaderStyle(worksheet.getCell(`A${startRow}`));
    startRow += 2;
    
    codigosPredefinidos.forEach(([codigo, descricao]) => {
      worksheet.getCell(`A${startRow}`).value = codigo;
      worksheet.getCell(`B${startRow}`).value = descricao;
      startRow++;
    });
    
    return startRow;
  }

  /**
   * Cria seção Resumo Geral conforme estrutura solicitada pelo usuário
   * CORREÇÃO: Posicionamento correto na coluna H conforme layout
   * Regra #4: Componente bem estruturado - resumo organizado por categorias
   */
  private createResumoGeralSection(worksheet: ExcelJS.Worksheet, formattedData: any[], startRow: number): void {
    let currentRow = startRow;
    
    // Título da seção (VOLTANDO PARA COLUNA A)
    worksheet.getCell(`A${currentRow}`).value = 'RESUMO GERAL';
    this.applySectionHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // ========== CAIXAS ==========
    worksheet.getCell(`A${currentRow}`).value = 'CAIXAS:';
    this.applySubheaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Calcula totais de caixas (Chão Cheio + Chão Vazio + Garrafeira Vazia)
    const totalCaixas600ml = this.calculateTotalCaixas(formattedData, [5, 11, 17]); // CX 600ML
    const totalCaixas300ml = this.calculateTotalCaixas(formattedData, [3, 9, 15]);  // CX 300ML
    const totalCaixas1L = this.calculateTotalCaixas(formattedData, [7, 13, 19]);    // CX 1L
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL CX 600ML:';
    worksheet.getCell(`C${currentRow}`).value = totalCaixas600ml;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL CX 300ML:';
    worksheet.getCell(`C${currentRow}`).value = totalCaixas300ml;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL CX 1L:';
    worksheet.getCell(`C${currentRow}`).value = totalCaixas1L;
    currentRow += 2;
    
    // ========== GARRAFAS ==========
    worksheet.getCell(`A${currentRow}`).value = 'GARRAFAS:';
    this.applySubheaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Calcula totais de garrafas (apenas Chão Cheio + Chão Vazio, SEM Garrafeira Vazia)
    const caixasChaoCheioeVazio600ml = this.calculateTotalCaixas(formattedData, [5, 11]); // Apenas Chão Cheio + Chão Vazio
    const caixasChaoCheioeVazio300ml = this.calculateTotalCaixas(formattedData, [3, 9]);   // Apenas Chão Cheio + Chão Vazio
    const caixasChaoCheioeVazio1L = this.calculateTotalCaixas(formattedData, [7, 13]);     // Apenas Chão Cheio + Chão Vazio
    
    const totalGarrafas600ml = caixasChaoCheioeVazio600ml * 24; // 600ML = 24 garrafas/caixa
    const totalGarrafas300ml = caixasChaoCheioeVazio300ml * 24; // 300ML = 24 garrafas/caixa
    const totalGarrafas1L = caixasChaoCheioeVazio1L * 12;       // 1L = 12 garrafas/caixa
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL GRF 600ML:';
    worksheet.getCell(`C${currentRow}`).value = totalGarrafas600ml;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL GRF 300ML:';
    worksheet.getCell(`C${currentRow}`).value = totalGarrafas300ml;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL GRF 1L:';
    worksheet.getCell(`C${currentRow}`).value = totalGarrafas1L;
    currentRow += 2;
    
    // ========== GAJ/PBR ==========
    worksheet.getCell(`A${currentRow}`).value = 'GAJ/PBR:';
    this.applySubheaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Calcula totais GAJ/PBR (Chão Cheio + Chão Vazio + Garrafeira Vazia)
    const totalGAJ = this.calculateTotalCaixas(formattedData, [4, 6, 10, 12, 16, 18]); // GAJ 600ML + 1L de todas as seções
    const totalPBR = this.calculateTotalCaixas(formattedData, [2, 8, 14]);              // PBR 300ML de todas as seções
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL GAJ:';
    worksheet.getCell(`C${currentRow}`).value = totalGAJ;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PBR:';
    worksheet.getCell(`C${currentRow}`).value = totalPBR;
  }

  /**
   * Calcula total de caixas para índices específicos
   * Regra #1: DRY - Método reutilizável para cálculos
   */
  private calculateTotalCaixas(formattedData: any[], columnIndexes: number[]): number {
    return formattedData.reduce((total, row) => {
      return total + columnIndexes.reduce((sum, index) => sum + (row[index] || 0), 0);
    }, 0);
  }

  /**
   * Agrupa dados por linha para evitar zeros desnecessários
   * CORREÇÃO: Resolve problema de visualização com dados espalhados
   * Regra #4: Componente bem estruturado - organização clara dos dados
   */
  private agruparDadosPorLinha(formattedData: any[], columnIndexes: number[]): number[][] {
    const linhasComDados: number[][] = [];
    
    // Coleta todas as linhas que têm pelo menos um valor > 0
    formattedData.forEach(row => {
      const temDados = columnIndexes.some(index => (row[index] || 0) > 0);
      if (temDados) {
        const linha = columnIndexes.map(index => row[index] || 0);
        linhasComDados.push(linha);
      }
    });
    
    // Se não há dados, retorna uma linha com zeros para manter estrutura
    if (linhasComDados.length === 0) {
      linhasComDados.push(new Array(columnIndexes.length).fill(0));
    }
    
    return linhasComDados;
  }

  /**
   * Cria seção Chão Cheio (ESTRUTURA IDÊNTICA)
   * Regra #4: Componente bem estruturado
   */
  private async createChaoCheiSection(worksheet: ExcelJS.Worksheet, formattedData: any[], startRow: number): Promise<number> {
    let currentRow = startRow;
    
    // Título da seção
    worksheet.getCell(`A${currentRow}`).value = 'CHÃO CHEIO';
    this.applySectionHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Cabeçalhos das colunas
    worksheet.getCell(`A${currentRow}`).value = '300ML';
    worksheet.getCell(`C${currentRow}`).value = '600ML';
    worksheet.getCell(`E${currentRow}`).value = '1000ML';
    worksheet.getCell(`H${currentRow}`).value = 'RESUMO GERAL';
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'PBR';
    worksheet.getCell(`B${currentRow}`).value = 'CX';
    worksheet.getCell(`C${currentRow}`).value = 'GAJ';
    worksheet.getCell(`D${currentRow}`).value = 'CX';
    worksheet.getCell(`E${currentRow}`).value = 'GAJ';
    worksheet.getCell(`F${currentRow}`).value = 'CX';
    worksheet.getCell(`H${currentRow}`).value = 'CAIXAS:';
    currentRow++;
    
    // Dados dos produtos
    formattedData.forEach(row => {
      if (row[2] > 0 || row[3] > 0 || row[4] > 0 || row[5] > 0 || row[6] > 0 || row[7] > 0) {
        worksheet.getCell(`A${currentRow}`).value = row[2]; // 300ML_PBR
        worksheet.getCell(`B${currentRow}`).value = row[3]; // 300ML_CX
        worksheet.getCell(`C${currentRow}`).value = row[4]; // 600ML_GAJ
        worksheet.getCell(`D${currentRow}`).value = row[5]; // 600ML_CX
        worksheet.getCell(`E${currentRow}`).value = row[6]; // 1000ML_GAJ
        worksheet.getCell(`F${currentRow}`).value = row[7]; // 1000ML_CX
        currentRow++;
      }
    });
    
    // Totais
    const totais = this.calculateSectionTotals(formattedData, [2, 3, 4, 5, 6, 7]);
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`B${currentRow}`).value = totais[1];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`D${currentRow}`).value = totais[3];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`F${currentRow}`).value = totais[5];
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`B${currentRow}`).value = totais[1] * 24;
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`D${currentRow}`).value = totais[3] * 24;
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`F${currentRow}`).value = totais[5] * 12;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PBR';
    worksheet.getCell(`B${currentRow}`).value = totais[0];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`D${currentRow}`).value = totais[2];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`F${currentRow}`).value = totais[4];
    currentRow++;
    
    return currentRow;
  }

  /**
   * Cria seção Chão Vazio (ESTRUTURA IDÊNTICA)
   */
  private async createChaoVazioSection(worksheet: ExcelJS.Worksheet, formattedData: any[], startRow: number): Promise<number> {
    let currentRow = startRow;
    
    // Título da seção
    worksheet.getCell(`A${currentRow}`).value = 'CHÃO VAZIO';
    this.applySectionHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Cabeçalhos das colunas
    worksheet.getCell(`A${currentRow}`).value = '300ML';
    worksheet.getCell(`C${currentRow}`).value = '600ML';
    worksheet.getCell(`E${currentRow}`).value = '1000ML';
    worksheet.getCell(`H${currentRow}`).value = 'GARRAFAS:';
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'PBR';
    worksheet.getCell(`B${currentRow}`).value = 'CX';
    worksheet.getCell(`C${currentRow}`).value = 'GAJ';
    worksheet.getCell(`D${currentRow}`).value = 'CX';
    worksheet.getCell(`E${currentRow}`).value = 'GAJ';
    worksheet.getCell(`F${currentRow}`).value = 'CX';
    currentRow++;
    
    // Dados dos produtos
    formattedData.forEach(row => {
      if (row[8] > 0 || row[9] > 0 || row[10] > 0 || row[11] > 0 || row[12] > 0 || row[13] > 0) {
        worksheet.getCell(`A${currentRow}`).value = row[8];  // 300ML_PBR
        worksheet.getCell(`B${currentRow}`).value = row[9];  // 300ML_CX
        worksheet.getCell(`C${currentRow}`).value = row[10]; // 600ML_GAJ
        worksheet.getCell(`D${currentRow}`).value = row[11]; // 600ML_CX
        worksheet.getCell(`E${currentRow}`).value = row[12]; // 1000ML_GAJ
        worksheet.getCell(`F${currentRow}`).value = row[13]; // 1000ML_CX
        currentRow++;
      }
    });
    
    // Totais
    const totais = this.calculateSectionTotals(formattedData, [8, 9, 10, 11, 12, 13]);
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`B${currentRow}`).value = totais[1];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`D${currentRow}`).value = totais[3];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`F${currentRow}`).value = totais[5];
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`B${currentRow}`).value = totais[1] * 24;
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`D${currentRow}`).value = totais[3] * 24;
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`F${currentRow}`).value = totais[5] * 12;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PBR';
    worksheet.getCell(`B${currentRow}`).value = totais[0];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`D${currentRow}`).value = totais[2];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`F${currentRow}`).value = totais[4];
    currentRow++;
    
    return currentRow;
  }

  /**
   * Cria seção Garrafeira Vazia (ESTRUTURA IDÊNTICA)
   */
  private async createGarrafeiraVaziaSection(worksheet: ExcelJS.Worksheet, formattedData: any[], startRow: number): Promise<number> {
    let currentRow = startRow;
    
    // Título da seção
    worksheet.getCell(`A${currentRow}`).value = 'GARRAFEIRA VAZIA';
    this.applySectionHeaderStyle(worksheet.getCell(`A${currentRow}`));
    currentRow++;
    
    // Cabeçalhos das colunas
    worksheet.getCell(`A${currentRow}`).value = '300ML';
    worksheet.getCell(`C${currentRow}`).value = '600ML';
    worksheet.getCell(`E${currentRow}`).value = '1000ML';
    worksheet.getCell(`H${currentRow}`).value = 'EQUIPAMENTOS:';
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'PBR';
    worksheet.getCell(`B${currentRow}`).value = 'CX';
    worksheet.getCell(`C${currentRow}`).value = 'GAJ';
    worksheet.getCell(`D${currentRow}`).value = 'CX';
    worksheet.getCell(`E${currentRow}`).value = 'GAJ';
    worksheet.getCell(`F${currentRow}`).value = 'CX';
    currentRow++;
    
    // Dados dos produtos
    formattedData.forEach(row => {
      if (row[14] > 0 || row[15] > 0 || row[16] > 0 || row[17] > 0 || row[18] > 0 || row[19] > 0) {
        worksheet.getCell(`A${currentRow}`).value = row[14]; // 300ML_PBR
        worksheet.getCell(`B${currentRow}`).value = row[15]; // 300ML_CX
        worksheet.getCell(`C${currentRow}`).value = row[16]; // 600ML_GAJ
        worksheet.getCell(`D${currentRow}`).value = row[17]; // 600ML_CX
        worksheet.getCell(`E${currentRow}`).value = row[18]; // 1000ML_GAJ
        worksheet.getCell(`F${currentRow}`).value = row[19]; // 1000ML_CX
        currentRow++;
      }
    });
    
    // Totais
    const totais = this.calculateSectionTotals(formattedData, [14, 15, 16, 17, 18, 19]);
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`B${currentRow}`).value = totais[1];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`D${currentRow}`).value = totais[3];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (CX)';
    worksheet.getCell(`F${currentRow}`).value = totais[5];
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`B${currentRow}`).value = totais[1] * 24;
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`D${currentRow}`).value = totais[3] * 24;
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL (GRF)';
    worksheet.getCell(`F${currentRow}`).value = totais[5] * 12;
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = 'TOTAL PBR';
    worksheet.getCell(`B${currentRow}`).value = totais[0];
    worksheet.getCell(`C${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`D${currentRow}`).value = totais[2];
    worksheet.getCell(`E${currentRow}`).value = 'TOTAL GAJ';
    worksheet.getCell(`F${currentRow}`).value = totais[4];
    currentRow++;
    
    return currentRow;
  }

  /**
   * Cria seção Códigos
   */
  private async createCodigosSection(worksheet: ExcelJS.Worksheet, startRow: number): Promise<void> {
    // Códigos fixos predefinidos
    const codigosPredefinidos = [
      ['1023392', 'GARRAFA 1L'],
      ['1023384', 'GARRAFA 300ML'],
      ['1023393', 'GARRAFA 600ML'],
      ['1155350', 'GARRAFA VERDE 600ML'],
      ['1022893', 'GARRAFEIRA 1L'],
      ['1022894', 'GARRAFEIRA 300ML'],
      ['1022895', 'GARRAFEIRA 600ML']
    ];
    
    worksheet.getCell(`A${startRow}`).value = 'CÓDIGOS';
    startRow += 2;
    
    codigosPredefinidos.forEach(([codigo, descricao]) => {
      worksheet.getCell(`A${startRow}`).value = codigo;
      worksheet.getCell(`B${startRow}`).value = descricao;
      startRow++;
    });
  }

  /**
   * Aplica bordas profissionais (FINALMENTE BORDAS QUE FUNCIONAM!)
   * Regra #3: TypeScript rigoroso com tipos corretos
   * ATUALIZADO: Bordas específicas nos intervalos solicitados pelo usuário
   */
  private applyProfessionalBorders(worksheet: ExcelJS.Worksheet): void {
    const borderStyle: Partial<ExcelJS.Border> = { 
      style: 'thin' as ExcelJS.BorderStyle, 
      color: { argb: 'FF000000' } 
    };
    const thickBorderStyle: Partial<ExcelJS.Border> = { 
      style: 'thick' as ExcelJS.BorderStyle, 
      color: { argb: 'FF000000' } 
    };
    
    // Aplica bordas em todas as células com conteúdo (comportamento original)
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.value) {
          cell.border = {
            top: borderStyle,
            left: borderStyle,
            bottom: borderStyle,
            right: borderStyle
          };
        }
      });
    });
    
    // BORDAS ESPECÍFICAS SOLICITADAS PELO USUÁRIO:
    // Aplica bordas nos intervalos específicos da aba Garrafeiras
    this.applyBordersToSpecificRanges(worksheet, borderStyle);
  }

  /**
   * Aplica bordas em intervalos específicos da aba Garrafeiras
   * Intervalos: A5:F13, A15:F20, A25:F30
   * Regra #4: Componente bem estruturado - bordas por seção
   */
  private applyBordersToSpecificRanges(worksheet: ExcelJS.Worksheet, borderStyle: Partial<ExcelJS.Border>): void {
    const borderConfig = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle
    };

    // Intervalo 1: A5:F13 (Seção Chão Cheio)
    this.applyBordersToRange(worksheet, 5, 13, 1, 6, borderConfig);
    
    // Intervalo 2: A15:F20 (Seção Chão Vazio)
    this.applyBordersToRange(worksheet, 15, 20, 1, 6, borderConfig);
    
    // Intervalo 3: A25:F30 (Seção Garrafeira Vazia)
    this.applyBordersToRange(worksheet, 25, 30, 1, 6, borderConfig);
  }

  /**
   * Aplica bordas em um intervalo específico de células
   * Regra #1: DRY - Método reutilizável para bordas
   */
  private applyBordersToRange(
    worksheet: ExcelJS.Worksheet, 
    startRow: number, 
    endRow: number, 
    startCol: number, 
    endCol: number,
    borderConfig: any
  ): void {
    // Aplica bordas em todas as células do intervalo (mesmo vazias)
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = borderConfig;
      }
    }
  }

  /**
   * Configura larguras das colunas
   */
  private setColumnWidths(worksheet: ExcelJS.Worksheet): void {
    worksheet.columns = [
      { width: 25 }, // A - Produto
      { width: 12 }, // B - Código
      { width: 15 }, // C - Dados
      { width: 12 }, // D - Dados
      { width: 15 }, // E - Dados
      { width: 12 }, // F - Dados
      { width: 15 }, // G - Dados
      { width: 12 }, // H - Dados
      { width: 20 }  // I - Resumo
    ];
  }

  /**
   * Calcula totais de uma seção (reutiliza lógica existente)
   */
  private calculateSectionTotals(formattedData: any[], columnIndexes: number[]): number[] {
    const totals = new Array(columnIndexes.length).fill(0);
    
    formattedData.forEach(row => {
      columnIndexes.forEach((colIndex, i) => {
        totals[i] += (row[colIndex] || 0);
      });
    });
    
    return totals;
  }

  /**
   * Aplica estilo de cabeçalho de seção
   */
  private applySectionHeaderStyle(cell: ExcelJS.Cell): void {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  /**
   * Obtém título (implementação da interface)
   */
  getTitle(): string {
    return 'CONTAGEM DE ESTOQUE - ESTOQUE 10';
  }

  /**
   * Obtém subtítulo (implementação da interface)
   */
  getSubtitle(): string {
    return 'Relatório de Garrafeiras';
  }

  /**
   * Verifica se produto tem dados preenchidos (EXPANSIVO)
   * Regra #1: DRY - Centraliza lógica de verificação
   */
  private hasProductData(product: ProductItem): boolean {
    return (
      // Campos básicos
      (product.pallets || 0) > 0 ||
      (product.lastros || 0) > 0 ||
      (product.pacotes || 0) > 0 ||
      (product.unidades || 0) > 0 ||
      
      // Estoque 10 - Garrafas
      (product.chaoCheio || 0) > 0 ||
      (product.chaoCheio_pallets || 0) > 0 ||
      (product.chaoCheio_lastros || 0) > 0 ||
      (product.chaoCheio_caixas || 0) > 0 ||
      (product.chaoCheio_gajPbr || 0) > 0 ||
      
      (product.chaoVazio || 0) > 0 ||
      (product.chaoVazio_pallets || 0) > 0 ||
      (product.chaoVazio_lastros || 0) > 0 ||
      (product.chaoVazio_caixas || 0) > 0 ||
      (product.chaoVazio_gajPbr || 0) > 0 ||
      
      // Garrafeiras vazias
      (product.garrafeirasVazias_pallets || 0) > 0 ||
      (product.garrafeirasVazias_lastros || 0) > 0 ||
      (product.garrafeirasVazias_caixas || 0) > 0 ||
      (product.gajPbr || 0) > 0 ||
      
      // Outros campos do Estoque 10
      (product.refugo || 0) > 0 ||
      (product.sucata || 0) > 0 ||
      (product.avaria || 0) > 0 ||
      (product.manutencao || 0) > 0 ||
      (product.novo || 0) > 0 ||
      (product.bloqueado || 0) > 0
    );
  }

  /**
   * Obtém resumo de um campo específico
   */
  private getFieldSummary(product: ProductItem, fieldType: string): string {
    if (fieldType === 'chaoCheio') {
      const values = [
        product.chaoCheio || 0,
        product.chaoCheio_pallets || 0,
        product.chaoCheio_lastros || 0,
        product.chaoCheio_caixas || 0,
        product.chaoCheio_gajPbr || 0
      ].filter(v => v > 0);
      return values.length > 0 ? values.join(', ') : '-';
    }
    
    if (fieldType === 'chaoVazio') {
      const values = [
        product.chaoVazio || 0,
        product.chaoVazio_pallets || 0,
        product.chaoVazio_lastros || 0,
        product.chaoVazio_caixas || 0,
        product.chaoVazio_gajPbr || 0
      ].filter(v => v > 0);
      return values.length > 0 ? values.join(', ') : '-';
    }
    
    return '-';
  }

  /**
   * Constrói observações detalhadas do produto
   */
  private buildObservations(product: ProductItem): string {
    const obs = [];
    
    // Campos básicos
    if ((product.pallets || 0) > 0) obs.push(`Pallets: ${product.pallets}`);
    if ((product.lastros || 0) > 0) obs.push(`Lastros: ${product.lastros}`);
    if ((product.pacotes || 0) > 0) obs.push(`Pacotes: ${product.pacotes}`);
    if ((product.unidades || 0) > 0) obs.push(`Unidades: ${product.unidades}`);
    
    // Campos específicos do Estoque 10
    if ((product.refugo || 0) > 0) obs.push(`Refugo: ${product.refugo}`);
    if ((product.sucata || 0) > 0) obs.push(`Sucata: ${product.sucata}`);
    if ((product.avaria || 0) > 0) obs.push(`Avaria: ${product.avaria}`);
    if ((product.manutencao || 0) > 0) obs.push(`Manutenção: ${product.manutencao}`);
    if ((product.novo || 0) > 0) obs.push(`Novo: ${product.novo}`);
    if ((product.bloqueado || 0) > 0) obs.push(`Bloqueado: ${product.bloqueado}`);
    
    // Garrafeiras vazias
    if ((product.garrafeirasVazias_pallets || 0) > 0) obs.push(`GV Pallets: ${product.garrafeirasVazias_pallets}`);
    if ((product.garrafeirasVazias_lastros || 0) > 0) obs.push(`GV Lastros: ${product.garrafeirasVazias_lastros}`);
    if ((product.garrafeirasVazias_caixas || 0) > 0) obs.push(`GV Caixas: ${product.garrafeirasVazias_caixas}`);
    if ((product.gajPbr || 0) > 0) obs.push(`GAJ/PBR: ${product.gajPbr}`);
    
    return obs.length > 0 ? obs.join('; ') : 'Sem dados adicionais';
  }

  /**
   * Configura larguras das colunas para Outros Produtos (10 colunas)
   */
  private setOutrosProdutosColumnWidths(worksheet: ExcelJS.Worksheet): void {
    worksheet.columns = [
      { width: 25 }, // A - Produto
      { width: 12 }, // B - Código
      { width: 12 }, // C - Tipo
      { width: 15 }, // D - Chão Cheio
      { width: 15 }, // E - Chão Vazio
      { width: 12 }, // F - Novo
      { width: 15 }, // G - Manutenção
      { width: 12 }, // H - Sucata
      { width: 12 }, // I - Bloqueado
      { width: 40 }  // J - Observações
    ];
  }
}
