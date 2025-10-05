import { useMemo } from 'react';
import type { StockType, StockConfig, FieldConfig } from '@/types/stock-types';
import { 
  STOCK_CONFIGS, 
  getStockConfig, 
  isValidStockType, 
  getStockFieldNames,
  calculateStockTotal 
} from '@/lib/stock-configs';

/**
 * Hook para obter a configuração de um tipo de estoque
 * @param stockType - Tipo do estoque ('10', '11' ou '23')
 * @returns Configuração do estoque ou undefined
 */
export function useStockConfig(stockType: string): StockConfig | undefined {
  return useMemo(() => {
    if (!isValidStockType(stockType)) {
      console.warn(`Tipo de estoque inválido: ${stockType}. Usando estoque 11 como padrão.`);
      return STOCK_CONFIGS['11'];
    }
    return getStockConfig(stockType);
  }, [stockType]);
}

/**
 * Hook para obter os nomes dos campos de um estoque
 * @param stockType - Tipo do estoque
 * @returns Array com os nomes dos campos
 */
export function useStockFieldNames(stockType: string): string[] {
  return useMemo(() => {
    if (!isValidStockType(stockType)) {
      return getStockFieldNames('11');
    }
    return getStockFieldNames(stockType as StockType);
  }, [stockType]);
}

/**
 * Hook para verificar se um tipo de estoque é válido
 * @param stockType - Tipo do estoque a verificar
 * @returns true se o estoque é válido
 */
export function useIsValidStockType(stockType: string): boolean {
  return useMemo(() => isValidStockType(stockType), [stockType]);
}

/**
 * Hook para obter uma configuração de campo específico
 * @param stockType - Tipo do estoque
 * @param fieldName - Nome do campo
 * @returns Configuração do campo ou undefined
 */
export function useFieldConfig(stockType: string, fieldName: string): FieldConfig | undefined {
  const config = useStockConfig(stockType);
  
  return useMemo(() => {
    if (!config) return undefined;
    return config.fields.find(field => field.name === fieldName);
  }, [config, fieldName]);
}

/**
 * Hook para calcular o total de unidades baseado no tipo de estoque
 * @param stockType - Tipo do estoque
 * @param data - Dados do formulário
 * @param params - Parâmetros adicionais (usado no estoque 11)
 * @returns Total de unidades calculado
 */
export function useStockTotal(
  stockType: string,
  data: Record<string, number>,
  params?: { unidadesPorPacote?: number; pacotesPorLastro?: number; lastrosPorPallet?: number }
): number {
  return useMemo(() => {
    if (!isValidStockType(stockType)) {
      return 0;
    }
    return calculateStockTotal(stockType as StockType, data, params);
  }, [stockType, data, params]);
}
