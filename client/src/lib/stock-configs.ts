import type { StockConfig, StockType } from '@/types/stock-types';

/**
 * Configuração do Estoque 11 (Padrão)
 * Campos: Pallets, Lastros, Pacotes, Unidades
 */
const ESTOQUE_11_CONFIG: StockConfig = {
  id: '11',
  name: 'Estoque 11',
  description: 'Estoque padrão com contagem por pallets, lastros, pacotes e unidades',
  fields: [
    {
      name: 'pallets',
      label: 'Pallets',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'lastros',
      label: 'Lastros',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'pacotes',
      label: 'Pacotes',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'unidades',
      label: 'Unidades',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    }
  ]
};

/**
 * Configuração do Estoque 10 (Status)
 * Campos: Chão Cheio, Chão Vazio, Refugo, Sucata, Avaria, Manutenção, Novo, Bloqueado
 */
const ESTOQUE_10_CONFIG: StockConfig = {
  id: '10',
  name: 'Estoque 10',
  description: 'Estoque com contagem por status de material',
  fields: [
    {
      name: 'chaoCheio',
      label: 'Chão Cheio',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'chaoVazio',
      label: 'Chão Vazio',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'refugo',
      label: 'Refugo',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'sucata',
      label: 'Sucata',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'avaria',
      label: 'Avaria',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'manutencao',
      label: 'Manutenção',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'novo',
      label: 'Novo',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    },
    {
      name: 'bloqueado',
      label: 'Bloqueado',
      type: 'number',
      required: false,
      min: 0,
      placeholder: '0'
    }
  ]
};

/**
 * Configuração do Estoque 23 (Simplificado)
 * Campo: UN (Unidade)
 */
const ESTOQUE_23_CONFIG: StockConfig = {
  id: '23',
  name: 'Estoque 23',
  description: 'Estoque simplificado com contagem apenas por unidade',
  fields: [
    {
      name: 'un',
      label: 'UN',
      type: 'number',
      required: true,
      min: 0,
      placeholder: '0'
    }
  ]
};

/**
 * Mapa com todas as configurações de estoque
 */
export const STOCK_CONFIGS: Record<StockType, StockConfig> = {
  '10': ESTOQUE_10_CONFIG,
  '11': ESTOQUE_11_CONFIG,
  '23': ESTOQUE_23_CONFIG
};

/**
 * Obtém a configuração de um estoque específico
 * @param stockType - Tipo do estoque ('10', '11' ou '23')
 * @returns Configuração do estoque ou undefined se não encontrado
 */
export function getStockConfig(stockType: string): StockConfig | undefined {
  return STOCK_CONFIGS[stockType as StockType];
}

/**
 * Verifica se um tipo de estoque é válido
 * @param stockType - Tipo do estoque a verificar
 * @returns true se o estoque é válido, false caso contrário
 */
export function isValidStockType(stockType: string): stockType is StockType {
  return stockType === '10' || stockType === '11' || stockType === '23';
}

/**
 * Obtém os nomes de todos os campos de um estoque
 * @param stockType - Tipo do estoque
 * @returns Array com os nomes dos campos
 */
export function getStockFieldNames(stockType: StockType): string[] {
  const config = STOCK_CONFIGS[stockType];
  return config ? config.fields.map(field => field.name) : [];
}

/**
 * Calcula o total de unidades baseado no tipo de estoque
 * @param stockType - Tipo do estoque
 * @param data - Dados do formulário
 * @param params - Parâmetros adicionais para cálculo (usado no estoque 11)
 * @returns Total de unidades calculado
 */
export function calculateStockTotal(
  stockType: StockType,
  data: Record<string, number>,
  params?: { unidadesPorPacote?: number; pacotesPorLastro?: number; lastrosPorPallet?: number }
): number {
  switch (stockType) {
    case '11': {
      // Estoque 11: Cálculo complexo com pallets, lastros, pacotes e unidades
      const { pallets = 0, lastros = 0, pacotes = 0, unidades = 0 } = data;
      const { unidadesPorPacote = 1, pacotesPorLastro = 0, lastrosPorPallet = 0 } = params || {};
      
      const totalFromPallets = pallets * lastrosPorPallet * pacotesPorLastro * unidadesPorPacote;
      const totalFromLastros = lastros * pacotesPorLastro * unidadesPorPacote;
      const totalFromPacotes = pacotes * unidadesPorPacote;
      
      return totalFromPallets + totalFromLastros + totalFromPacotes + unidades;
    }
    
    case '10': {
      // Estoque 10: Soma de todos os campos de status
      const { 
        chaoCheio = 0, 
        chaoVazio = 0, 
        refugo = 0, 
        sucata = 0, 
        avaria = 0, 
        manutencao = 0, 
        novo = 0, 
        bloqueado = 0 
      } = data;
      
      return chaoCheio + chaoVazio + refugo + sucata + avaria + manutencao + novo + bloqueado;
    }
    
    case '23': {
      // Estoque 23: Apenas o campo UN
      return data.un || 0;
    }
    
    default:
      return 0;
  }
}
