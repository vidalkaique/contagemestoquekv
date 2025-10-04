// hooks/use-stock-config.tsx
import { useMemo } from 'react';
import { STOCK_CONFIGS, getStockConfig, getStockFieldNames, isValidStockType } from '@/lib/stock-configs';
import type { StockConfig, StockType, FieldConfig } from '@/types/stock-config';

/**
 * Hook customizado para trabalhar com configurações de estoque
 * Segue as regras do projeto: DRY, componentes bem estruturados, hooks adequados
 */
export const useStockConfig = (stockType: string) => {
  return useMemo(() => {
    if (!isValidStockType(stockType)) {
      console.warn(`Tipo de estoque inválido: ${stockType}. Usando configuração padrão.`);
      return STOCK_CONFIGS['11']; // fallback para estoque 11
    }

    return STOCK_CONFIGS[stockType];
  }, [stockType]);
};

/**
 * Hook para obter apenas os nomes dos campos de um estoque específico
 */
export const useStockFieldNames = (stockType: string): string[] => {
  return useMemo(() => {
    return getStockFieldNames(stockType);
  }, [stockType]);
};

/**
 * Hook para validar se um tipo de estoque é válido
 */
export const useIsValidStockType = (stockType: string): stockType is StockType => {
  return useMemo(() => {
    return isValidStockType(stockType);
  }, [stockType]);
};

/**
 * Hook para obter configuração de um campo específico
 */
export const useFieldConfig = (stockType: string, fieldName: string): FieldConfig | null => {
  return useMemo(() => {
    const config = getStockConfig(stockType);
    if (!config) return null;

    return config.fields.find(field => field.name === fieldName) || null;
  }, [stockType, fieldName]);
};

/**
 * Hook para obter todos os tipos de estoque disponíveis
 */
export const useAllStockTypes = () => {
  return useMemo(() => {
    return Object.keys(STOCK_CONFIGS) as StockType[];
  }, []);
};

/**
 * Hook para verificar se um campo é requerido para um estoque específico
 */
export const useIsFieldRequired = (stockType: string, fieldName: string): boolean => {
  return useMemo(() => {
    const fieldConfig = useFieldConfig(stockType, fieldName);
    return fieldConfig?.required || false;
  }, [stockType, fieldName]);
};
