import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ExpandableStockField } from "./expandable-stock-field";

interface Stock10Data {
  // GARRAFAS
  chaoCheio: number;
  chaoCheio_pallets: number;
  chaoCheio_lastros: number;
  chaoCheio_caixas: number;
  chaoCheio_gajPbr: number;
  
  chaoVazio: number;
  chaoVazio_pallets: number;
  chaoVazio_lastros: number;
  chaoVazio_caixas: number;
  chaoVazio_gajPbr: number;
  
  avaria: number;
  avaria_pallets: number;
  avaria_lastros: number;
  avaria_caixas: number;
  
  refugo: number;
  refugo_pallets: number;
  refugo_lastros: number;
  refugo_caixas: number;
  
  // GAJ/PBR após refugo (novo campo)
  gajPbrRefugo: number;
  
  // GARRAFEIRAS VAZIAS (nova seção)
  garrafeirasVazias_pallets: number;
  garrafeirasVazias_lastros: number;
  garrafeirasVazias_caixas: number;
  
  // GAJ/PBR (novo campo)
  gajPbr: number;
  
  // GARRAFEIRAS (campos antigos - manter compatibilidade)
  garrafeiras_chaoCheio: number;
  garrafeiras_chaoCheio_pallets: number;
  garrafeiras_chaoCheio_lastros: number;
  garrafeiras_chaoCheio_caixas: number;
  
  garrafeiras_chaoVazio: number;
  garrafeiras_chaoVazio_pallets: number;
  garrafeiras_chaoVazio_lastros: number;
  garrafeiras_chaoVazio_caixas: number;
  
  garrafeiras_avaria: number;
  garrafeiras_avaria_pallets: number;
  garrafeiras_avaria_lastros: number;
  garrafeiras_avaria_caixas: number;
  
  garrafeiras_refugo: number;
  garrafeiras_refugo_pallets: number;
  garrafeiras_refugo_lastros: number;
  garrafeiras_refugo_caixas: number;
  
  // EQUIPAMENTOS (apenas UN - unidades simples)
  novo: number;
  manutencao: number;
  sucata: number;
  bloqueado: number;
}

interface Stock10ExpandableSectionsProps {
  data: Partial<Stock10Data>;
  onChange: (field: string, value: number) => void;
  productName?: string; // Nome do produto para detectar tipo
  conversionRates?: {
    caixasPorLastro: number;
    lastrosPorPallet: number;
  };
}

/**
 * Componente de seções expansíveis para Estoque 10
 * Organiza campos em 3 seções: GARRAFAS, GARRAFEIRAS, EQUIPAMENTOS
 */
export function Stock10ExpandableSections({
  data,
  onChange,
  productName = '',
  conversionRates = { caixasPorLastro: 12, lastrosPorPallet: 10 }
}: Stock10ExpandableSectionsProps) {
  const [expandedSections, setExpandedSections] = useState({
    garrafas: true,
    garrafeirasVazias: false,
    equipamentos: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Detecta o tipo de garrafeira baseado no nome do produto
  const detectGarrafeiraType = (productName: string): '600ml' | '300ml' | '1l' | 'other' => {
    const nameUpper = productName.toUpperCase();
    if (nameUpper.includes('600ML') || nameUpper.includes('600')) return '600ml';
    if (nameUpper.includes('300ML') || nameUpper.includes('300')) return '300ml';
    if (nameUpper.includes('1L') || nameUpper.includes('1000ML')) return '1l';
    return 'other';
  };

  // Calcula total de caixas baseado em pallets, lastros e caixas
  const calculateTotal = (pallets: number, lastros: number, caixas: number): number => {
    const { caixasPorLastro, lastrosPorPallet } = conversionRates;
    return (
      pallets * lastrosPorPallet * caixasPorLastro +
      lastros * caixasPorLastro +
      caixas
    );
  };

  // Calcula garrafas baseado no tipo e quantidade de caixas
  const calculateGarrafas = (caixas: number): number => {
    const type = detectGarrafeiraType(productName);
    switch (type) {
      case '600ml':
      case '300ml':
        return caixas * 24;
      case '1l':
        return caixas * 12;
      default:
        return 0; // Outros produtos não convertem
    }
  };

  // Handler para mudanças em subcampos
  const handleSubfieldChange = (prefix: string, field: string, value: number) => {
    const fullFieldName = `${prefix}_${field}`;
    onChange(fullFieldName, value);
  };

  // Renderiza uma seção principal
  const renderSection = (
    title: string,
    sectionKey: keyof typeof expandedSections,
    icon: string
  ) => (
    <div className="border border-gray-300 rounded-lg mb-3 overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 transition-colors"
        aria-expanded={expandedSections[sectionKey]}
      >
        <div className="flex items-center gap-3">
          {expandedSections[sectionKey] ? (
            <ChevronDown className="h-6 w-6 text-blue-600" />
          ) : (
            <ChevronRight className="h-6 w-6 text-blue-600" />
          )}
          <span className="text-lg font-bold text-gray-800">{icon} {title}</span>
        </div>
      </button>
      
      {expandedSections[sectionKey] && (
        <div className="p-4 bg-white">
          {sectionKey === 'garrafas' && renderGarrafasEGarrafeirasFields()}
          {sectionKey === 'garrafeirasVazias' && renderGarrafeirasVaziasFields()}
          {sectionKey === 'equipamentos' && renderEquipamentosFields()}
        </div>
      )}
    </div>
  );

  // Renderiza campos da seção GARRAFAS/GARRAFEIRAS (unificado)
  const renderGarrafasEGarrafeirasFields = () => (
    <>
      <ExpandableStockField
        label="Chão Cheio"
        value={calculateTotal(
          data.chaoCheio_pallets || 0,
          data.chaoCheio_lastros || 0,
          data.chaoCheio_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.chaoCheio_pallets || 0,
          lastros: data.chaoCheio_lastros || 0,
          caixas: data.chaoCheio_caixas || 0,
          gajPbr: data.chaoCheio_gajPbr || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('chaoCheio', field, value)}
        conversionRates={conversionRates}
      />
      
      <ExpandableStockField
        label="Chão Vazio"
        value={calculateTotal(
          data.chaoVazio_pallets || 0,
          data.chaoVazio_lastros || 0,
          data.chaoVazio_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.chaoVazio_pallets || 0,
          lastros: data.chaoVazio_lastros || 0,
          caixas: data.chaoVazio_caixas || 0,
          gajPbr: data.chaoVazio_gajPbr || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('chaoVazio', field, value)}
        conversionRates={conversionRates}
      />
      
      <ExpandableStockField
        label="Avaria"
        value={calculateTotal(
          data.avaria_pallets || 0,
          data.avaria_lastros || 0,
          data.avaria_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.avaria_pallets || 0,
          lastros: data.avaria_lastros || 0,
          caixas: data.avaria_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('avaria', field, value)}
        conversionRates={conversionRates}
      />
      
      <ExpandableStockField
        label="Refugo"
        value={calculateTotal(
          data.refugo_pallets || 0,
          data.refugo_lastros || 0,
          data.refugo_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.refugo_pallets || 0,
          lastros: data.refugo_lastros || 0,
          caixas: data.refugo_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('refugo', field, value)}
        conversionRates={conversionRates}
      />

    </>
  );

  // Renderiza campos da seção GARRAFEIRAS VAZIAS
  const renderGarrafeirasVaziasFields = () => (
    <>
      {/* Campos Pallets, Lastros, Cx */}
      <div className="space-y-3">
        {/* Pallets */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700 min-w-[80px]">Pallets:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const currentValue = data.garrafeirasVazias_pallets || 0;
                if (currentValue > 0) {
                  onChange('garrafeirasVazias_pallets', currentValue - 1);
                }
              }}
              className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
            >
              −
            </button>
            <input
              type="number"
              value={data.garrafeirasVazias_pallets || 0}
              onChange={(e) => onChange('garrafeirasVazias_pallets', parseInt(e.target.value) || 0)}
              className="w-16 h-10 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              min="0"
            />
            <button
              type="button"
              onClick={() => {
                const currentValue = data.garrafeirasVazias_pallets || 0;
                onChange('garrafeirasVazias_pallets', currentValue + 1);
              }}
              className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Lastros */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700 min-w-[80px]">Lastros:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const currentValue = data.garrafeirasVazias_lastros || 0;
                if (currentValue > 0) {
                  onChange('garrafeirasVazias_lastros', currentValue - 1);
                }
              }}
              className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
            >
              −
            </button>
            <input
              type="number"
              value={data.garrafeirasVazias_lastros || 0}
              onChange={(e) => onChange('garrafeirasVazias_lastros', parseInt(e.target.value) || 0)}
              className="w-16 h-10 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              min="0"
            />
            <button
              type="button"
              onClick={() => {
                const currentValue = data.garrafeirasVazias_lastros || 0;
                onChange('garrafeirasVazias_lastros', currentValue + 1);
              }}
              className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Cx */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700 min-w-[80px]">Cx:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const currentValue = data.garrafeirasVazias_caixas || 0;
                if (currentValue > 0) {
                  onChange('garrafeirasVazias_caixas', currentValue - 1);
                }
              }}
              className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
            >
              −
            </button>
            <input
              type="number"
              value={data.garrafeirasVazias_caixas || 0}
              onChange={(e) => onChange('garrafeirasVazias_caixas', parseInt(e.target.value) || 0)}
              className="w-16 h-10 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              min="0"
            />
            <button
              type="button"
              onClick={() => {
                const currentValue = data.garrafeirasVazias_caixas || 0;
                onChange('garrafeirasVazias_caixas', currentValue + 1);
              }}
              className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Total calculado */}
        <div className="flex items-center justify-between py-2 bg-blue-50 px-3 rounded border">
          <span className="text-sm font-medium text-blue-700">Total:</span>
          <span className="text-lg font-bold text-blue-800">
            {calculateTotal(
              data.garrafeirasVazias_pallets || 0,
              data.garrafeirasVazias_lastros || 0,
              data.garrafeirasVazias_caixas || 0
            )} cx
          </span>
        </div>

        {/* Separador */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* GAJ/PBR */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700 min-w-[80px]">🏷️ GAJ/PBR:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const currentValue = data.gajPbr || 0;
                if (currentValue > 0) {
                  onChange('gajPbr', currentValue - 1);
                }
              }}
              className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
            >
              −
            </button>
            <input
              type="number"
              value={data.gajPbr || 0}
              onChange={(e) => onChange('gajPbr', parseInt(e.target.value) || 0)}
              className="w-16 h-10 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              min="0"
            />
            <button
              type="button"
              onClick={() => {
                const currentValue = data.gajPbr || 0;
                onChange('gajPbr', currentValue + 1);
              }}
              className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 transition-colors font-bold text-lg shadow-sm"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Renderiza campos da seção EQUIPAMENTOS (apenas UN - unidades)
  const renderEquipamentosFields = () => (
    <>
      <ExpandableStockField
        label="Novo"
        value={data.novo || 0}
        unit="un"
        hasSubfields
        subfields={{
          quantidade: data.novo || 0
        }}
        onSubfieldChange={(field, value) => onChange('novo', value)}
      />
      
      <ExpandableStockField
        label="Manutenção"
        value={data.manutencao || 0}
        unit="un"
        hasSubfields
        subfields={{
          quantidade: data.manutencao || 0
        }}
        onSubfieldChange={(field, value) => onChange('manutencao', value)}
      />
      
      <ExpandableStockField
        label="Sucata"
        value={data.sucata || 0}
        unit="un"
        hasSubfields
        subfields={{
          quantidade: data.sucata || 0
        }}
        onSubfieldChange={(field, value) => onChange('sucata', value)}
      />
      
      <ExpandableStockField
        label="Bloqueado"
        value={data.bloqueado || 0}
        unit="un"
        hasSubfields
        subfields={{
          quantidade: data.bloqueado || 0
        }}
        onSubfieldChange={(field, value) => onChange('bloqueado', value)}
      />
    </>
  );

  return (
    <div className="space-y-3">
      {renderSection("GARRAFAS", "garrafas", "🍺")}
      {renderSection("GARRAFEIRAS VAZIAS", "garrafeirasVazias", "📦")}
      {renderSection("EQUIPAMENTOS", "equipamentos", "⚙️")}
    </div>
  );
}
