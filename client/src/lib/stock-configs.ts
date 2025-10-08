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
      // Estoque 10: Calcula em CAIXAS baseado em parâmetros do produto
      const { pacotesPorLastro = 1, lastrosPorPallet = 1 } = params || {};
      
      // Função auxiliar para calcular total em CAIXAS (DRY - Regra #1)
      const calcularComConversao = (pallets: number, lastros: number, caixas: number): number => {
        return (
          pallets * lastrosPorPallet * pacotesPorLastro +
          lastros * pacotesPorLastro +
          caixas
        );
      };
      
      // GARRAFAS
      const chaoCheio = calcularComConversao(
        data.chaoCheio_pallets || 0,
        data.chaoCheio_lastros || 0,
        data.chaoCheio_caixas || 0
      );
      
      const chaoVazio = calcularComConversao(
        data.chaoVazio_pallets || 0,
        data.chaoVazio_lastros || 0,
        data.chaoVazio_caixas || 0
      );
      
      const avaria = calcularComConversao(
        data.avaria_pallets || 0,
        data.avaria_lastros || 0,
        data.avaria_caixas || 0
      );
      
      const refugo = calcularComConversao(
        data.refugo_pallets || 0,
        data.refugo_lastros || 0,
        data.refugo_caixas || 0
      );
      
      // GARRAFEIRAS
      const garrafeiras_chaoCheio = calcularComConversao(
        data.garrafeiras_chaoCheio_pallets || 0,
        data.garrafeiras_chaoCheio_lastros || 0,
        data.garrafeiras_chaoCheio_caixas || 0
      );
      
      const garrafeiras_chaoVazio = calcularComConversao(
        data.garrafeiras_chaoVazio_pallets || 0,
        data.garrafeiras_chaoVazio_lastros || 0,
        data.garrafeiras_chaoVazio_caixas || 0
      );
      
      const garrafeiras_avaria = calcularComConversao(
        data.garrafeiras_avaria_pallets || 0,
        data.garrafeiras_avaria_lastros || 0,
        data.garrafeiras_avaria_caixas || 0
      );
      
      const garrafeiras_refugo = calcularComConversao(
        data.garrafeiras_refugo_pallets || 0,
        data.garrafeiras_refugo_lastros || 0,
        data.garrafeiras_refugo_caixas || 0
      );
      
      // EQUIPAMENTOS (apenas UN - soma simples)
      const novo = data.novo || 0;
      const manutencao = data.manutencao || 0;
      const sucata = data.sucata || 0;
      const bloqueado = data.bloqueado || 0;
      
      // Soma todos os totais
      return chaoCheio + chaoVazio + avaria + refugo +
             garrafeiras_chaoCheio + garrafeiras_chaoVazio + garrafeiras_avaria + garrafeiras_refugo +
             novo + manutencao + sucata + bloqueado;
    }
    
    case '23': {
      // Estoque 23: Apenas o campo UN
      return data.un || 0;
    }
    
    default:
      return 0;
  }
}
