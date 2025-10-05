/**
 * Tipos de estoque suportados no sistema
 * - '11': Estoque padrão com pallets, lastros, pacotes, unidades
 * - '10': Estoque com campos de status (Chão Cheio, Vazio, Refugo, etc)
 * - '23': Estoque simplificado com apenas UN
 */
export type StockType = '10' | '11' | '23';

/**
 * Tipo de campo suportado no formulário dinâmico
 */
export type FieldType = 'number' | 'text' | 'select';

/**
 * Configuração individual de um campo no formulário
 */
export interface FieldConfig {
  /** Nome do campo (deve corresponder a uma propriedade em ProductFormData) */
  name: string;
  
  /** Label exibido no formulário */
  label: string;
  
  /** Tipo do campo */
  type: FieldType;
  
  /** Se o campo é obrigatório */
  required?: boolean;
  
  /** Valor mínimo (para campos numéricos) */
  min?: number;
  
  /** Valor máximo (para campos numéricos) */
  max?: number;
  
  /** Placeholder do campo */
  placeholder?: string;
  
  /** Opções para campos select */
  options?: Array<{ value: string; label: string }>;
}

/**
 * Configuração completa de um tipo de estoque
 */
export interface StockConfig {
  /** ID do estoque */
  id: StockType;
  
  /** Nome legível do estoque */
  name: string;
  
  /** Descrição do estoque */
  description: string;
  
  /** Lista de campos que devem ser exibidos */
  fields: FieldConfig[];
}

/**
 * Dados do formulário - Estoque 11 (Padrão)
 */
export interface Estoque11FormData {
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
}

/**
 * Dados do formulário - Estoque 10 (Status)
 */
export interface Estoque10FormData {
  chaoCheio: number;
  chaoVazio: number;
  refugo: number;
  sucata: number;
  avaria: number;
  manutencao: number;
  novo: number;
  bloqueado: number;
}

/**
 * Dados do formulário - Estoque 23 (Simplificado)
 */
export interface Estoque23FormData {
  un: number;
}

/**
 * União de todos os dados possíveis de formulário
 * Todos os campos são opcionais para permitir flexibilidade
 */
export type ProductFormData = Partial<Estoque11FormData & Estoque10FormData & Estoque23FormData> & {
  // Campos comuns a todos os estoques
  totalPacotes?: number;
  unidadesPorPacote?: number;
  pacotesPorLastro?: number;
  lastrosPorPallet?: number;
  quantidadePacsPorPallet?: number;
  quantidadeSistema?: number;
};
