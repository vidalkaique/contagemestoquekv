// lib/stock-configs.ts
import type { StockConfig } from '@/types/stock-config';

export const STOCK_CONFIGS: Record<string, StockConfig> = {
  '11': {
    id: '11',
    name: 'Estoque 11',
    description: 'Contagem tradicional com pallets, lastros, pacotes e unidades',
    fields: [
      {
        name: 'pallets',
        label: 'Pallets',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'lastros',
        label: 'Lastros',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'pacotes',
        label: 'Pacotes',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'unidades',
        label: 'Unidades',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      }
    ]
  },
  '10': {
    id: '10',
    name: 'Estoque 10',
    description: 'Contagem específica com campos de qualidade e status',
    fields: [
      {
        name: 'chaoCheio',
        label: 'Chão Cheio',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'chaoVazio',
        label: 'Chão Vazio',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'refugo',
        label: 'Refugo',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'sucata',
        label: 'Sucata',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'avaria',
        label: 'Avaria',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'manutencao',
        label: 'Manutenção',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'novo',
        label: 'Novo',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      },
      {
        name: 'bloqueado',
        label: 'Bloqueado',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '0'
      }
    ]
  },
  '23': {
    id: '23',
    name: 'Estoque 23',
    description: 'Contagem simplificada com unidade única',
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
  }
};

// Utility functions para trabalhar com configurações
export const getStockConfig = (stockType: string): StockConfig | null => {
  return STOCK_CONFIGS[stockType] || null;
};

export const getAllStockTypes = (): string[] => {
  return Object.keys(STOCK_CONFIGS);
};

export const getStockFieldNames = (stockType: string): string[] => {
  const config = getStockConfig(stockType);
  return config ? config.fields.map(field => field.name) : [];
};

export const isValidStockType = (stockType: string): stockType is keyof typeof STOCK_CONFIGS => {
  return stockType in STOCK_CONFIGS;
};
