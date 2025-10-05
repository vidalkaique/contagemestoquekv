import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Tipos para os campos expansíveis
interface SubfieldConfig {
  pallets?: number;
  lastros?: number;
  caixas?: number;
  quantidade?: number;
}

interface ConversionRates {
  caixasPorLastro?: number;
  lastrosPorPallet?: number;
}

interface ExpandableStockFieldProps {
  label: string;
  value: number;
  unit: string;
  hasSubfields?: boolean;
  subfields?: SubfieldConfig;
  onSubfieldChange?: (field: string, value: number) => void;
  conversionRates?: ConversionRates;
}

/**
 * Componente de campo de estoque expansível com botões de incremento/decremento
 * Usado no Estoque 10 para campos como Chão Cheio, Chão Vazio, etc.
 */
export function ExpandableStockField({
  label,
  value,
  unit,
  hasSubfields = false,
  subfields = {},
  onSubfieldChange,
  conversionRates = {}
}: ExpandableStockFieldProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Incrementa o valor de um subcampo
  const handleIncrement = (field: string) => {
    if (onSubfieldChange) {
      const currentValue = subfields[field as keyof SubfieldConfig] || 0;
      onSubfieldChange(field, currentValue + 1);
    }
  };

  // Decrementa o valor de um subcampo (não permite valores negativos)
  const handleDecrement = (field: string) => {
    if (onSubfieldChange) {
      const currentValue = subfields[field as keyof SubfieldConfig] || 0;
      if (currentValue > 0) {
        onSubfieldChange(field, currentValue - 1);
      }
    }
  };

  // Atualiza o valor do campo via input direto
  const handleInputChange = (field: string, inputValue: string) => {
    if (onSubfieldChange) {
      const numValue = parseInt(inputValue) || 0;
      onSubfieldChange(field, Math.max(0, numValue));
    }
  };

  // Renderiza um subcampo com botões [-] input [+]
  const renderSubfield = (fieldName: string, fieldLabel: string, fieldValue: number) => (
    <div className="flex items-center justify-between py-2" key={fieldName}>
      <span className="text-sm text-gray-700 min-w-[80px]">{fieldLabel}:</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleDecrement(fieldName)}
          className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
          aria-label={`Diminuir ${fieldLabel}`}
        >
          −
        </button>
        <input
          type="number"
          value={fieldValue}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          className="w-16 h-10 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          min="0"
          aria-label={fieldLabel}
        />
        <button
          type="button"
          onClick={() => handleIncrement(fieldName)}
          className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
          aria-label={`Aumentar ${fieldLabel}`}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="border border-gray-200 rounded-lg mb-2 overflow-hidden">
      {/* Cabeçalho do campo (clicável para expandir) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} ${label}`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
          <span className="font-medium text-gray-900">{label}</span>
        </div>
        <span className="text-sm font-semibold text-blue-600">
          {value} {unit}
        </span>
      </button>

      {/* Conteúdo expansível com subcampos */}
      {isExpanded && hasSubfields && (
        <div className="px-4 pb-3 border-t border-gray-200 bg-gray-50">
          <div className="pt-3 space-y-1">
            {subfields.pallets !== undefined && renderSubfield('pallets', 'Pallets', subfields.pallets)}
            {subfields.lastros !== undefined && renderSubfield('lastros', 'Lastros', subfields.lastros)}
            {subfields.caixas !== undefined && renderSubfield('caixas', 'Caixas', subfields.caixas)}
            {subfields.quantidade !== undefined && renderSubfield('quantidade', 'Quantidade', subfields.quantidade)}
          </div>
          
          {/* Informações de conversão (opcional) */}
          {conversionRates.caixasPorLastro && conversionRates.lastrosPorPallet && (
            <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-500">
              <div>📦 Conversão: {conversionRates.lastrosPorPallet} lastros/pallet</div>
              <div>📦 {conversionRates.caixasPorLastro} caixas/lastro</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
