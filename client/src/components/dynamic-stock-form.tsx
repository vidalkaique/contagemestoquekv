import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumberInputWithButtons } from '@/components/ui/number-input-with-buttons';
import { cn } from '@/lib/utils';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'number' | 'text' | 'select';
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

interface DynamicStockFormProps {
  fields: FieldConfig[];
  values: Record<string, any>;
  onChange: (fieldName: string | number | symbol, value: number | string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  className?: string;
}

export function DynamicStockForm({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
  className
}: DynamicStockFormProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {fields.map((field) => {
        const fieldId = `field-${field.name}`;
        const fieldName = field.name as keyof typeof values;
        const error = errors[field.name];
        const value = values[fieldName];

        const handleFieldChange = (newValue: number | string) => {
          onChange(field.name, newValue);
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
                  id={fieldId}
                  value={Number(value || 0)}
                  onChange={handleFieldChange}
                  min={field.min}
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
                  id={fieldId}
                  value={String(value || '')}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  disabled={disabled}
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
                  id={fieldId}
                  value={String(value || '')}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  disabled={disabled}
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
      })}
    </div>
  );
}
