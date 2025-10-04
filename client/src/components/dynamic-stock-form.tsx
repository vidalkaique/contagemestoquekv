// components/dynamic-stock-form.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInputWithButtons } from '@/components/ui/number-input-with-buttons';
import { cn } from '@/lib/utils';
import type { FieldConfig, StockFormData } from '@/types/stock-config';

interface DynamicStockFormProps {
  fields: FieldConfig[];
  values: Partial<StockFormData>;
  onChange: (fieldName: keyof StockFormData, value: number | string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  className?: string;
}

/**
 * Componente dinâmico para renderizar campos de formulário baseado na configuração do estoque
 * Segue as regras do projeto: DRY, componentes bem estruturados, TypeScript consistente
 */
export const DynamicStockForm: React.FC<DynamicStockFormProps> = ({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
  className
}) => {
  const handleFieldChange = (fieldName: keyof StockFormData, value: number | string) => {
    // Converte string vazia para 0 para campos numéricos
    const processedValue = (typeof value === 'string' && value === '' && fields.find(f => f.name === fieldName)?.type === 'number')
      ? 0
      : value;

    onChange(fieldName, processedValue);
  };

  const renderField = (field: FieldConfig) => {
    const fieldName = field.name as keyof StockFormData;
    const value = values[fieldName];
    const error = errors[field.name];
    const fieldId = `field-${field.name}`;

    const commonProps = {
      id: fieldId,
      value: value || (field.type === 'number' ? 0 : ''),
      onChange: (newValue: number | string) => handleFieldChange(fieldName, newValue),
      disabled,
      className: cn(error && 'border-red-500 focus:border-red-500')
    };

    switch (field.type) {
      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId} className={cn(error && 'text-red-600')}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <NumberInputWithButtons
              {...commonProps}
              min={field.min}
              max={field.max}
            />
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
        );

      case 'text':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId} className={cn(error && 'text-red-600')}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              {...commonProps}
              type="text"
              placeholder={field.placeholder}
            />
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={fieldId} className={cn(error && 'text-red-600')}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <select
              {...commonProps}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                error && 'border-red-500 focus:border-red-500'
              )}
            >
              <option value="">{field.placeholder || `Selecione ${field.label}`}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
        );

      default:
        console.warn(`Tipo de campo não suportado: ${field.type}`);
        return null;
    }
  };

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {fields.map(renderField)}
    </div>
  );
};
