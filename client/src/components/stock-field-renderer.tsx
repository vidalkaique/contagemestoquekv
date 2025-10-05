import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumberInputWithButtons } from '@/components/ui/number-input-with-buttons';
import { cn } from '@/lib/utils';
import type { FieldConfig } from '@/types/stock-types';

interface StockFieldRendererProps {
  /** Configuração do campo a ser renderizado */
  field: FieldConfig;
  
  /** Valor atual do campo */
  value: number | string;
  
  /** Callback chamado quando o valor muda */
  onChange: (fieldName: string, value: number | string) => void;
  
  /** Se o campo está desabilitado */
  disabled?: boolean;
  
  /** Mensagem de erro (se houver) */
  error?: string;
  
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * Componente que renderiza um campo de formulário baseado em sua configuração
 * Suporta campos numéricos, texto e select
 */
export function StockFieldRenderer({
  field,
  value,
  onChange,
  disabled = false,
  error,
  className
}: StockFieldRendererProps) {
  const fieldId = `field-${field.name}`;
  
  const handleChange = (newValue: number | string) => {
    onChange(field.name, newValue);
  };

  const renderField = () => {
    switch (field.type) {
      case 'number':
        return (
          <NumberInputWithButtons
            id={fieldId}
            value={Number(value) || 0}
            onChange={handleChange}
            min={field.min ?? 0}
            className="w-full"
            inputClassName={cn(error && 'border-red-500')}
          />
        );

      case 'text':
        return (
          <Input
            id={fieldId}
            type="text"
            value={String(value) || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder}
            className={cn(error && 'border-red-500')}
          />
        );

      case 'select':
        return (
          <select
            id={fieldId}
            value={String(value) || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500'
            )}
          >
            <option value="">{field.placeholder || `Selecione ${field.label}`}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        console.warn(`Tipo de campo não suportado: ${field.type}`);
        return null;
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label 
        htmlFor={fieldId} 
        className={cn(
          'font-medium',
          error && 'text-red-600'
        )}
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {renderField()}
      
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}

interface StockFieldsGridProps {
  /** Lista de configurações de campos */
  fields: FieldConfig[];
  
  /** Valores atuais dos campos */
  values: Record<string, number | string>;
  
  /** Callback chamado quando um valor muda */
  onChange: (fieldName: string, value: number | string) => void;
  
  /** Se os campos estão desabilitados */
  disabled?: boolean;
  
  /** Mapa de erros por campo */
  errors?: Record<string, string>;
  
  /** Número de colunas no grid (padrão: 2) */
  columns?: 1 | 2 | 3 | 4;
  
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * Componente que renderiza múltiplos campos em um grid responsivo
 */
export function StockFieldsGrid({
  fields,
  values,
  onChange,
  disabled = false,
  errors = {},
  columns = 2,
  className
}: StockFieldsGridProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
  }[columns];

  return (
    <div className={cn(gridClass, className)}>
      {fields.map((field) => (
        <StockFieldRenderer
          key={field.name}
          field={field}
          value={values[field.name] ?? (field.type === 'number' ? 0 : '')}
          onChange={onChange}
          disabled={disabled}
          error={errors[field.name]}
        />
      ))}
    </div>
  );
}
