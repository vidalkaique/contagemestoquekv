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
  
  // EQUIPAMENTOS (com subcampos para conversão)
  novo: number;
  novo_pallets: number;
  novo_lastros: number;
  novo_caixas: number;
  
  manutencao: number;
  manutencao_pallets: number;
  manutencao_lastros: number;
  manutencao_caixas: number;
  
  sucata: number;
  sucata_pallets: number;
  sucata_lastros: number;
  sucata_caixas: number;
  
  bloqueado: number;
  bloqueado_pallets: number;
  bloqueado_lastros: number;
  bloqueado_caixas: number;
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
    garrafeiras: false,
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
          {sectionKey === 'garrafas' && renderGarrafasFields()}
          {sectionKey === 'garrafeiras' && renderGarrafeirasFields()}
          {sectionKey === 'equipamentos' && renderEquipamentosFields()}
        </div>
      )}
    </div>
  );

  // Renderiza campos da seção GARRAFAS
  const renderGarrafasFields = () => (
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

  // Renderiza campos da seção GARRAFEIRAS
  const renderGarrafeirasFields = () => (
    <>
      <ExpandableStockField
        label="Chão Cheio"
        value={calculateTotal(
          data.garrafeiras_chaoCheio_pallets || 0,
          data.garrafeiras_chaoCheio_lastros || 0,
          data.garrafeiras_chaoCheio_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.garrafeiras_chaoCheio_pallets || 0,
          lastros: data.garrafeiras_chaoCheio_lastros || 0,
          caixas: data.garrafeiras_chaoCheio_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('garrafeiras_chaoCheio', field, value)}
        conversionRates={conversionRates}
      />
      
      <ExpandableStockField
        label="Chão Vazio"
        value={calculateTotal(
          data.garrafeiras_chaoVazio_pallets || 0,
          data.garrafeiras_chaoVazio_lastros || 0,
          data.garrafeiras_chaoVazio_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.garrafeiras_chaoVazio_pallets || 0,
          lastros: data.garrafeiras_chaoVazio_lastros || 0,
          caixas: data.garrafeiras_chaoVazio_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('garrafeiras_chaoVazio', field, value)}
        conversionRates={conversionRates}
      />
      
      <ExpandableStockField
        label="Avaria"
        value={calculateTotal(
          data.garrafeiras_avaria_pallets || 0,
          data.garrafeiras_avaria_lastros || 0,
          data.garrafeiras_avaria_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.garrafeiras_avaria_pallets || 0,
          lastros: data.garrafeiras_avaria_lastros || 0,
          caixas: data.garrafeiras_avaria_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('garrafeiras_avaria', field, value)}
        conversionRates={conversionRates}
      />
      
      <ExpandableStockField
        label="Refugo"
        value={calculateTotal(
          data.garrafeiras_refugo_pallets || 0,
          data.garrafeiras_refugo_lastros || 0,
          data.garrafeiras_refugo_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.garrafeiras_refugo_pallets || 0,
          lastros: data.garrafeiras_refugo_lastros || 0,
          caixas: data.garrafeiras_refugo_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('garrafeiras_refugo', field, value)}
        conversionRates={conversionRates}
      />
    </>
  );

  // Renderiza campos da seção EQUIPAMENTOS (com pallets, lastros, pacotes, unidades)
  const renderEquipamentosFields = () => (
    <>
      <ExpandableStockField
        label="Novo"
        value={calculateTotal(
          data.novo_pallets || 0,
          data.novo_lastros || 0,
          data.novo_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.novo_pallets || 0,
          lastros: data.novo_lastros || 0,
          caixas: data.novo_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('novo', field, value)}
        conversionRates={conversionRates}
      />
      
      <ExpandableStockField
        label="Manutenção"
        value={calculateTotal(
          data.manutencao_pallets || 0,
          data.manutencao_lastros || 0,
          data.manutencao_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.manutencao_pallets || 0,
          lastros: data.manutencao_lastros || 0,
          caixas: data.manutencao_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('manutencao', field, value)}
        conversionRates={conversionRates}
      />
      
      <ExpandableStockField
        label="Sucata"
        value={calculateTotal(
          data.sucata_pallets || 0,
          data.sucata_lastros || 0,
          data.sucata_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.sucata_pallets || 0,
          lastros: data.sucata_lastros || 0,
          caixas: data.sucata_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('sucata', field, value)}
        conversionRates={conversionRates}
      />
      
      <ExpandableStockField
        label="Bloqueado"
        value={calculateTotal(
          data.bloqueado_pallets || 0,
          data.bloqueado_lastros || 0,
          data.bloqueado_caixas || 0
        )}
        unit="cx"
        hasSubfields
        subfields={{
          pallets: data.bloqueado_pallets || 0,
          lastros: data.bloqueado_lastros || 0,
          caixas: data.bloqueado_caixas || 0
        }}
        onSubfieldChange={(field, value) => handleSubfieldChange('bloqueado', field, value)}
        conversionRates={conversionRates}
      />
    </>
  );

  return (
    <div className="space-y-3">
      {renderSection("GARRAFAS", "garrafas", "🍾")}
      {renderSection("GARRAFEIRAS", "garrafeiras", "🏪")}
      {renderSection("EQUIPAMENTOS", "equipamentos", "🔧")}
    </div>
  );
}
