// types/stock-config.ts
export type StockType = '10' | '11' | '23';

export type FieldType = 'number' | 'text' | 'select';

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
}

export interface StockConfig {
  id: StockType;
  name: string;
  fields: FieldConfig[];
  description?: string;
}

export interface StockFormData {
  // Estoque 11 - Campos tradicionais
  pallets?: number;
  lastros?: number;
  pacotes?: number;
  unidades?: number;

  // Estoque 10 - Campos específicos
  chaoCheio?: number;
  chaoVazio?: number;
  refugo?: number;
  sucata?: number;
  avaria?: number;
  manutencao?: number;
  novo?: number;
  bloqueado?: number;

  // Estoque 23 - Campo único
  un?: number;

  // Campos comuns
  totalPacotes?: number;
  unidadesPorPacote?: number;
  pacotesPorLastro?: number;
  lastrosPorPallet?: number;
  quantidadePacsPorPallet?: number;
  quantidadeSistema?: number;
}

export type StockFieldName = keyof StockFormData;
