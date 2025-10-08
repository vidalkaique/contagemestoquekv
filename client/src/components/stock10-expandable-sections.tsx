import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ExpandableStockField } from "./expandable-stock-field";

interface Stock10Data {
  // GARRAFAS
  chaoCheio: number;
  chaoCheio_pallets: number;
  chaoCheio_lastros: number;
  chaoCheio_caixas: number;
  
  chaoVazio: number;
  chaoVazio_pallets: number;
  chaoVazio_lastros: number;
  chaoVazio_caixas: number;
  
  avaria: number;
  avaria_pallets: number;
  avaria_lastros: number;
  avaria_caixas: number;
  
  refugo: number;
  refugo_pallets: number;
  refugo_lastros: number;
  refugo_caixas: number;
  
  // GARRAFEIRAS
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
  conversionRates = { caixasPorLastro: 12, lastrosPorPallet: 10 }
}: Stock10ExpandableSectionsProps) {
  const [expandedSections, setExpandedSections] = useState({
    garrafas: true,
    equipamentos: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
          caixas: data.chaoCheio_caixas || 0
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
          caixas: data.chaoVazio_caixas || 0
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
      {renderSection("GARRAFAS", "garrafas", "")}
      {renderSection("EQUIPAMENTOS", "equipamentos", "")}
    </div>
  );
}
