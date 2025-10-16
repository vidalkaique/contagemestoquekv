import { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInputWithButtons } from "@/components/ui/number-input-with-buttons";
import { RoundingSuggestion } from "@/components/rounding-suggestion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ProductItem } from "@/pages/new-count";
import { StockFieldsGrid } from "@/components/stock-field-renderer";
import { Stock10ExpandableSections } from "@/components/stock10-expandable-sections";
import { useStockConfig } from "@/hooks/use-stock-config";
import { calculateStockTotal } from "@/lib/stock-configs";
import type { StockType, ProductFormData } from "@/types/stock-types";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onSave: (product: ProductItem) => void;
  tipoEstoque: StockType;
}

export default function EditProductModal({ isOpen, onClose, product, onSave, tipoEstoque }: EditProductModalProps) {
  const { toast } = useToast();
  
  // Obtém a configuração do estoque selecionado
  const stockConfig = useStockConfig(tipoEstoque);
  const [formData, setFormData] = useState<Omit<ProductItem, 'id' | 'nome' | 'codigo'>>({
    // Estoque 11
    pallets: 0,
    lastros: 0,
    pacotes: 0,
    unidades: 0,
    // Estoque 10
    chaoCheio: 0,
    chaoVazio: 0,
    refugo: 0,
    sucata: 0,
    avaria: 0,
    manutencao: 0,
    novo: 0,
    bloqueado: 0,
    // Estoque 23
    un: 0,
    // Campos comuns
    totalPacotes: 0,
    unidadesPorPacote: 0,
    pacotesPorLastro: 0,
    lastrosPorPallet: 0,
    quantidadePacsPorPallet: 0,
    quantidadeSistema: 0
  });

  // Estado para controlar override dos parâmetros do produto (Solução 1: ajuste por CD)
  const [useCustomParams, setUseCustomParams] = useState(false);
  const [customParams, setCustomParams] = useState({
    unidadesPorPacote: 0,
    pacotesPorLastro: 0,
    lastrosPorPallet: 0,
  });
  // Valores padrão originais do produto (para fallback)
  const [originalParams, setOriginalParams] = useState({
    unidadesPorPacote: 0,
    pacotesPorLastro: 0,
    lastrosPorPallet: 0,
  });

  // Função para calcular o total de unidades (dinâmica baseada no tipo de estoque)
  const calculateTotalUnidades = useCallback((): number => {
    // Prepara os parâmetros para o cálculo (usado apenas no estoque 11)
    const params = {
      unidadesPorPacote: useCustomParams ? customParams.unidadesPorPacote : (formData.unidadesPorPacote || 1),
      pacotesPorLastro: useCustomParams ? customParams.pacotesPorLastro : (formData.pacotesPorLastro || 0),
      lastrosPorPallet: useCustomParams ? customParams.lastrosPorPallet : (formData.lastrosPorPallet || 0)
    };
    
    // Usa a função de cálculo dinâmica baseada no tipo de estoque
    return calculateStockTotal(tipoEstoque, formData as Record<string, number>, params);
  }, [formData, useCustomParams, customParams, tipoEstoque]);

  // Atualiza o formulário quando o produto muda
  useEffect(() => {
    if (product) {
      setFormData({
        // Estoque 11
        pallets: product.pallets || 0,
        lastros: product.lastros || 0,
        pacotes: product.pacotes || 0,
        unidades: product.unidades || 0,
        // Estoque 10 - GARRAFAS (com subcampos)
        chaoCheio: product.chaoCheio || 0,
        chaoCheio_pallets: product.chaoCheio_pallets || 0,
        chaoCheio_lastros: product.chaoCheio_lastros || 0,
        chaoCheio_caixas: product.chaoCheio_caixas || 0,
        
        chaoVazio: product.chaoVazio || 0,
        chaoVazio_pallets: product.chaoVazio_pallets || 0,
        chaoVazio_lastros: product.chaoVazio_lastros || 0,
        chaoVazio_caixas: product.chaoVazio_caixas || 0,
        
        refugo: product.refugo || 0,
        refugo_pallets: product.refugo_pallets || 0,
        refugo_lastros: product.refugo_lastros || 0,
        refugo_caixas: product.refugo_caixas || 0,
        
        avaria: product.avaria || 0,
        avaria_pallets: product.avaria_pallets || 0,
        avaria_lastros: product.avaria_lastros || 0,
        avaria_caixas: product.avaria_caixas || 0,
        
        // Estoque 10 - GARRAFEIRAS (com subcampos)
        garrafeiras_chaoCheio: product.garrafeiras_chaoCheio || 0,
        garrafeiras_chaoCheio_pallets: product.garrafeiras_chaoCheio_pallets || 0,
        garrafeiras_chaoCheio_lastros: product.garrafeiras_chaoCheio_lastros || 0,
        garrafeiras_chaoCheio_caixas: product.garrafeiras_chaoCheio_caixas || 0,
        
        garrafeiras_chaoVazio: product.garrafeiras_chaoVazio || 0,
        garrafeiras_chaoVazio_pallets: product.garrafeiras_chaoVazio_pallets || 0,
        garrafeiras_chaoVazio_lastros: product.garrafeiras_chaoVazio_lastros || 0,
        garrafeiras_chaoVazio_caixas: product.garrafeiras_chaoVazio_caixas || 0,
        
        garrafeiras_avaria: product.garrafeiras_avaria || 0,
        garrafeiras_avaria_pallets: product.garrafeiras_avaria_pallets || 0,
        garrafeiras_avaria_lastros: product.garrafeiras_avaria_lastros || 0,
        garrafeiras_avaria_caixas: product.garrafeiras_avaria_caixas || 0,
        
        garrafeiras_refugo: product.garrafeiras_refugo || 0,
        garrafeiras_refugo_pallets: product.garrafeiras_refugo_pallets || 0,
        garrafeiras_refugo_lastros: product.garrafeiras_refugo_lastros || 0,
        garrafeiras_refugo_caixas: product.garrafeiras_refugo_caixas || 0,
        
        // Estoque 10 - EQUIPAMENTOS (apenas UN)
        sucata: product.sucata || 0,
        manutencao: product.manutencao || 0,
        novo: product.novo || 0,
        bloqueado: product.bloqueado || 0,
        // Estoque 23
        un: product.un || 0,
        // Campos comuns
        totalPacotes: product.totalPacotes || 0,
        unidadesPorPacote: product.unidadesPorPacote || 0,
        pacotesPorLastro: product.pacotesPorLastro || 0,
        lastrosPorPallet: product.lastrosPorPallet || 0,
        quantidadePacsPorPallet: product.quantidadePacsPorPallet || 0,
        quantidadeSistema: product.quantidadeSistema || 0
      });
      
      // Inicializa os parâmetros originais e customizados
      const originalValues = {
        unidadesPorPacote: product.unidadesPorPacote || 1,
        pacotesPorLastro: product.pacotesPorLastro || 1,
        lastrosPorPallet: product.lastrosPorPallet || 1,
      };
      
      setOriginalParams(originalValues);
      setCustomParams(originalValues);
      setUseCustomParams(false); // Sempre inicia com valores padrão
    }
  }, [product]);

  // Calcula o total de pacotes com base nos valores atuais
  const calculateTotalPacotes = (): number => {
    const { pallets = 0, lastros = 0, pacotes = 0, pacotesPorLastro = 0, lastrosPorPallet = 0 } = formData;
    const totalFromPallets = pallets * (lastrosPorPallet || 0) * (pacotesPorLastro || 0);
    const totalFromLastros = lastros * (pacotesPorLastro || 0);
    return totalFromPallets + totalFromLastros + (pacotes || 0);
  };

  // Atualiza um campo do formulário
  const handleFieldChange = (field: string, value: number | string) => {
    // Cria uma cópia atualizada dos dados do formulário
    const updatedFormData = { ...formData, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value };

    // Usa parâmetros customizados se ativados, senão usa valores do formData
    const pacotesPorLastroAtual = useCustomParams ? customParams.pacotesPorLastro : (updatedFormData.pacotesPorLastro || 0);
    const lastrosPorPalletAtual = useCustomParams ? customParams.lastrosPorPallet : (updatedFormData.lastrosPorPallet || 0);
    
    // Calcula o total de pacotes com base nos dados atualizados
    const { pallets = 0, lastros = 0, pacotes = 0 } = updatedFormData;
    const totalFromPallets = pallets * (lastrosPorPalletAtual || 0) * (pacotesPorLastroAtual || 0);
    const totalFromLastros = lastros * (pacotesPorLastroAtual || 0);
    const newTotalPacotes = totalFromPallets + totalFromLastros + (pacotes || 0);

    // Atualiza o estado com os novos valores
    setFormData({ ...updatedFormData, totalPacotes: newTotalPacotes });
  };

  // Submete o formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    // Função auxiliar para calcular total em CAIXAS (DRY - Regra #1)
    const calcularTotal = (pallets: number, lastros: number, caixas: number): number => {
      const params = useCustomParams ? customParams : {
        pacotesPorLastro: formData.pacotesPorLastro || 1,
        lastrosPorPallet: formData.lastrosPorPallet || 1
      };
      
      // Calcula total em CAIXAS/PACOTES (não em unidades)
      return (
        pallets * params.lastrosPorPallet * params.pacotesPorLastro +
        lastros * params.pacotesPorLastro +
        caixas
      );
    };
    
    // Calcula totais do Estoque 10 (GARRAFAS)
    const chaoCheio = calcularTotal(
      formData.chaoCheio_pallets || 0,
      formData.chaoCheio_lastros || 0,
      formData.chaoCheio_caixas || 0
    );
    
    const chaoVazio = calcularTotal(
      formData.chaoVazio_pallets || 0,
      formData.chaoVazio_lastros || 0,
      formData.chaoVazio_caixas || 0
    );
    
    const refugo = calcularTotal(
      formData.refugo_pallets || 0,
      formData.refugo_lastros || 0,
      formData.refugo_caixas || 0
    );
    
    const avaria = calcularTotal(
      formData.avaria_pallets || 0,
      formData.avaria_lastros || 0,
      formData.avaria_caixas || 0
    );
    
    // Calcula totais do Estoque 10 (GARRAFEIRAS)
    const garrafeiras_chaoCheio = calcularTotal(
      formData.garrafeiras_chaoCheio_pallets || 0,
      formData.garrafeiras_chaoCheio_lastros || 0,
      formData.garrafeiras_chaoCheio_caixas || 0
    );
    
    const garrafeiras_chaoVazio = calcularTotal(
      formData.garrafeiras_chaoVazio_pallets || 0,
      formData.garrafeiras_chaoVazio_lastros || 0,
      formData.garrafeiras_chaoVazio_caixas || 0
    );
    
    const garrafeiras_avaria = calcularTotal(
      formData.garrafeiras_avaria_pallets || 0,
      formData.garrafeiras_avaria_lastros || 0,
      formData.garrafeiras_avaria_caixas || 0
    );
    
    const garrafeiras_refugo = calcularTotal(
      formData.garrafeiras_refugo_pallets || 0,
      formData.garrafeiras_refugo_lastros || 0,
      formData.garrafeiras_refugo_caixas || 0
    );
    
    // Atualiza o produto com os novos valores, incluindo parâmetros customizados se ativados
    const updatedProduct: ProductItem = {
      ...product,
      ...formData,
      // Usa parâmetros customizados se ativados, senão mantém os valores originais
      unidadesPorPacote: useCustomParams ? customParams.unidadesPorPacote : formData.unidadesPorPacote,
      pacotesPorLastro: useCustomParams ? customParams.pacotesPorLastro : formData.pacotesPorLastro,
      lastrosPorPallet: useCustomParams ? customParams.lastrosPorPallet : formData.lastrosPorPallet,
      totalPacotes: calculateTotalPacotes(),
      // Campos calculados do Estoque 10 (GARRAFAS)
      chaoCheio,
      chaoVazio,
      refugo,
      avaria,
      // Campos calculados do Estoque 10 (GARRAFEIRAS)
      garrafeiras_chaoCheio,
      garrafeiras_chaoVazio,
      garrafeiras_avaria,
      garrafeiras_refugo
    };
    
    onSave(updatedProduct);
    onClose();
    
    toast({
      title: "Produto atualizado",
      description: `As alterações em ${product.nome} foram salvas.`,
    });
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Editar Produto</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium">{product.nome}</h3>
          {product.codigo && (
            <p className="text-sm text-gray-500">Código: {product.codigo}</p>
          )}
        </div>
        
        {/* Seção de Parâmetros do Produto com Override para CD */}
        <div className="mb-6 space-y-4">
          {!useCustomParams && (
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Valores da Fábrica</strong> - Ajuste para seu CD se necessário
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUseCustomParams(true)}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                Ajustar para este CD
              </Button>
            </div>
          )}
          
          {useCustomParams && (
            <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-orange-800">
                <strong>Valores Ajustados para CD</strong> - Usando parâmetros personalizados
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUseCustomParams(false)}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Voltar aos valores da fábrica
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-base">
            <div>
              <Label>Unidades por Pacote</Label>
              {!useCustomParams ? (
                <div className="font-medium text-lg">{originalParams.unidadesPorPacote}</div>
              ) : (
                <Input
                  type="number"
                  value={customParams.unidadesPorPacote}
                  onChange={(e) => setCustomParams(prev => ({ ...prev, unidadesPorPacote: parseInt(e.target.value) || 1 }))}
                  min={1}
                  className="font-medium text-lg"
                />
              )}
            </div>
            <div>
              <Label>Pacotes por Lastro</Label>
              {!useCustomParams ? (
                <div className="font-medium text-lg">{originalParams.pacotesPorLastro}</div>
              ) : (
                <Input
                  type="number"
                  value={customParams.pacotesPorLastro}
                  onChange={(e) => setCustomParams(prev => ({ ...prev, pacotesPorLastro: parseInt(e.target.value) || 1 }))}
                  min={1}
                  className="font-medium text-lg"
                />
              )}
            </div>
            <div>
              <Label>Lastros por Pallet</Label>
              {!useCustomParams ? (
                <div className="font-medium text-lg">{originalParams.lastrosPorPallet}</div>
              ) : (
                <Input
                  type="number"
                  value={customParams.lastrosPorPallet}
                  onChange={(e) => setCustomParams(prev => ({ ...prev, lastrosPorPallet: parseInt(e.target.value) || 1 }))}
                  min={1}
                  className="font-medium text-lg"
                />
              )}
            </div>
            <div>
              <Label>Total por Pallet</Label>
              <div className="font-medium text-lg text-emerald-600">
                {useCustomParams
                  ? (customParams.unidadesPorPacote * customParams.pacotesPorLastro * customParams.lastrosPorPallet)
                  : (originalParams.unidadesPorPacote * originalParams.pacotesPorLastro * originalParams.lastrosPorPallet)
                }
              </div>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campos dinâmicos baseados no tipo de estoque */}
          {tipoEstoque === '10' ? (
            <>
              {/* Seções expansíveis para Estoque 10 (Ativos) */}
              <Stock10ExpandableSections
                data={formData}
                onChange={handleFieldChange}
                productName={product?.nome || ''}
                conversionRates={{
                  caixasPorLastro: useCustomParams ? customParams.pacotesPorLastro : (formData.pacotesPorLastro || 12),
                  lastrosPorPallet: useCustomParams ? customParams.lastrosPorPallet : (formData.lastrosPorPallet || 10)
                }}
              />
              
              {/* Resumo dos totais calculados (Estoque 10) */}
              {(() => {
                const params = useCustomParams ? customParams : {
                  pacotesPorLastro: formData.pacotesPorLastro || 1,
                  lastrosPorPallet: formData.lastrosPorPallet || 1
                };
                
                // Detecta o tipo de garrafeira baseado no nome do produto
                const detectGarrafeiraType = (productName: string): '600ml' | '300ml' | '1l' | 'other' => {
                  const nameUpper = productName.toUpperCase();
                  if (nameUpper.includes('600ML') || nameUpper.includes('600')) return '600ml';
                  if (nameUpper.includes('300ML') || nameUpper.includes('300')) return '300ml';
                  if (nameUpper.includes('1L') || nameUpper.includes('1000ML')) return '1l';
                  return 'other';
                };
                
                // Calcula garrafas baseado no tipo e quantidade de caixas
                const calculateGarrafas = (caixas: number): number => {
                  const type = detectGarrafeiraType(product?.nome || '');
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
                
                const calcTotal = (pallets: number, lastros: number, caixas: number): number => {
                  return (
                    pallets * params.lastrosPorPallet * params.pacotesPorLastro +
                    lastros * params.pacotesPorLastro +
                    caixas
                  );
                };
                
                const chaoCheio = calcTotal(
                  formData.chaoCheio_pallets || 0,
                  formData.chaoCheio_lastros || 0,
                  formData.chaoCheio_caixas || 0
                );
                
                const chaoVazio = calcTotal(
                  formData.chaoVazio_pallets || 0,
                  formData.chaoVazio_lastros || 0,
                  formData.chaoVazio_caixas || 0
                );
                
                const refugo = calcTotal(
                  formData.refugo_pallets || 0,
                  formData.refugo_lastros || 0,
                  formData.refugo_caixas || 0
                );
                
                const avaria = calcTotal(
                  formData.avaria_pallets || 0,
                  formData.avaria_lastros || 0,
                  formData.avaria_caixas || 0
                );
                
                // Cálculos de garrafas convertidas
                const chaoCheioGarrafas = calculateGarrafas(chaoCheio);
                const chaoVazioGarrafas = calculateGarrafas(chaoVazio);
                const gajPbrChaoCheio = formData.chaoCheio_gajPbr || 0;
                const gajPbrChaoVazio = formData.chaoVazio_gajPbr || 0;
                
                const totalGarrafas = chaoCheio + chaoVazio + refugo + avaria;
                const totalEquipamentos = (formData.novo || 0) + (formData.manutencao || 0) + (formData.sucata || 0) + (formData.bloqueado || 0);
                
                // Cálculos de Garrafeiras Vazias - Detecta tipo do produto
                const productName = formData.nome?.toLowerCase() || '';
                let palletMultiplier = 60; // Padrão para 1L
                
                if (productName.includes('300ml') || productName.includes('300')) {
                  palletMultiplier = 49; // 300ML: 1 pallet = 49 cx
                } else if (productName.includes('600ml') || productName.includes('600')) {
                  palletMultiplier = 49; // 600ML: 1 pallet = 49 cx
                } else if (productName.includes('1l') || productName.includes('1000ml') || productName.includes('1000')) {
                  palletMultiplier = 60; // 1L: 1 pallet = 60 cx
                }
                
                const garrafeirasVazias = (formData.garrafeirasVazias_pallets || 0) * palletMultiplier + 
                                        (formData.garrafeirasVazias_lastros || 0) * 24 + 
                                        (formData.garrafeirasVazias_caixas || 0);
                const gajPbrGarrafeirasVazias = formData.gajPbr || 0;
                
                if (totalGarrafas === 0 && totalEquipamentos === 0 && garrafeirasVazias === 0 && gajPbrChaoCheio === 0 && gajPbrChaoVazio === 0 && gajPbrGarrafeirasVazias === 0) return null;
                
                return (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-gray-800 mb-3 text-sm">Resumo da Contagem</h4>
                    
                    {/* Resumos de Garrafeiras com conversões */}
                    {(chaoCheioGarrafas > 0 || chaoVazioGarrafas > 0) && (
                      <div className="space-y-3 mb-4">
                        {/* Resumo Chão Cheio */}
                        {chaoCheioGarrafas > 0 && (
                          <div className="bg-green-50 p-3 rounded border border-green-200">
                            <div className="text-xs font-bold text-green-800 mb-1">📊 RESUMO CHÃO CHEIO</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-green-700">Total Garrafas Ch.Cheio:</span>
                                <span className="font-bold text-green-800">{chaoCheioGarrafas} un</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-700">Total Garrafeiras Ch.Cheio:</span>
                                <span className="font-bold text-green-800">{chaoCheio} cx</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-700">Total GAJ/PBR Ch.Cheio:</span>
                                <span className="font-bold text-green-800">{gajPbrChaoCheio}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Resumo Chão Vazio */}
                        {chaoVazioGarrafas > 0 && (
                          <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <div className="text-xs font-bold text-blue-800 mb-1">📊 RESUMO CHÃO VAZIO</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-blue-700">Total Garrafas Ch.Vazio:</span>
                                <span className="font-bold text-blue-800">{chaoVazioGarrafas} un</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Total Garrafeiras Ch.Vazio:</span>
                                <span className="font-bold text-blue-800">{chaoVazio} cx</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Total GAJ/PBR Ch.Vazio:</span>
                                <span className="font-bold text-blue-800">{gajPbrChaoVazio}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Garrafeiras Vazias */}
                    {garrafeirasVazias > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                          📦 Garrafeiras Vazias
                        </h4>
                        <div className="space-y-2">
                          <div className="bg-white rounded-lg p-3">
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-purple-700">Total (CX):</span>
                                <span className="font-bold text-purple-800">{garrafeirasVazias} cx</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-700">GAJ/PBR:</span>
                                <span className="font-bold text-purple-800">{gajPbrGarrafeirasVazias} un</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Resumo tradicional para outros campos */}
                    {(refugo > 0 || avaria > 0) && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-600 mb-2">Outros:</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {refugo > 0 && (
                            <div><span className="font-medium">Refugo:</span> <span className="text-blue-600 font-bold">{refugo} cx</span></div>
                          )}
                          {avaria > 0 && (
                            <div><span className="font-medium">Avaria:</span> <span className="text-blue-600 font-bold">{avaria} cx</span></div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {totalEquipamentos > 0 && (
                      <div className="border-t border-blue-300 pt-3">
                        <div className="text-xs font-medium text-gray-600 mb-2">EQUIPAMENTOS:</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {(formData.novo || 0) > 0 && (
                            <div><span className="font-medium">Novo:</span> <span className="text-blue-600 font-bold">{formData.novo} un</span></div>
                          )}
                          {(formData.manutencao || 0) > 0 && (
                            <div><span className="font-medium">Manutenção:</span> <span className="text-blue-600 font-bold">{formData.manutencao} un</span></div>
                          )}
                          {(formData.sucata || 0) > 0 && (
                            <div><span className="font-medium">Sucata:</span> <span className="text-blue-600 font-bold">{formData.sucata} un</span></div>
                          )}
                          {(formData.bloqueado || 0) > 0 && (
                            <div><span className="font-medium">Bloqueado:</span> <span className="text-blue-600 font-bold">{formData.bloqueado} un</span></div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-blue-300 text-right">
                      <span className="text-sm font-semibold text-gray-700">Total Geral: </span>
                      <span className="text-lg font-bold text-blue-700">{totalGarrafas + totalEquipamentos}</span>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <>
              {/* Grid padrão para outros estoques (11 e 23) */}
              {stockConfig && (
                <StockFieldsGrid
                  fields={stockConfig.fields}
                  values={formData}
                  onChange={handleFieldChange}
                  columns={2}
                  className="mb-4"
                />
              )}
              
              {/* Resumo para Estoque 11 */}
              {tipoEstoque === '11' && (() => {
                // Calcula total de pacotes (pallets → lastros → pacotes)
                const params = {
                  pacotesPorLastro: useCustomParams ? customParams.pacotesPorLastro : (formData.pacotesPorLastro || 1),
                  lastrosPorPallet: useCustomParams ? customParams.lastrosPorPallet : (formData.lastrosPorPallet || 1),
                  unidadesPorPacote: useCustomParams ? customParams.unidadesPorPacote : (formData.unidadesPorPacote || 1)
                };
                
                const totalPacotes = (
                  (formData.pallets || 0) * params.lastrosPorPallet * params.pacotesPorLastro +
                  (formData.lastros || 0) * params.pacotesPorLastro +
                  (formData.pacotes || 0)
                );
                
                const totalUnidades = totalPacotes * params.unidadesPorPacote + (formData.unidades || 0);
                
                // Só mostra o resumo se houver valores
                if (totalPacotes === 0 && (formData.unidades || 0) === 0) return null;
                
                return (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Resumo da Contagem
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {/* Breakdown dos valores inseridos */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-600 mb-2">Valores Inseridos:</div>
                        {(formData.pallets || 0) > 0 && (
                          <div className="flex justify-between">
                            <span>Pallets:</span>
                            <span className="font-medium">{formData.pallets}</span>
                          </div>
                        )}
                        {(formData.lastros || 0) > 0 && (
                          <div className="flex justify-between">
                            <span>Lastros:</span>
                            <span className="font-medium">{formData.lastros}</span>
                          </div>
                        )}
                        {(formData.pacotes || 0) > 0 && (
                          <div className="flex justify-between">
                            <span>Pacotes:</span>
                            <span className="font-medium">{formData.pacotes}</span>
                          </div>
                        )}
                        {(formData.unidades || 0) > 0 && (
                          <div className="flex justify-between">
                            <span>Unidades:</span>
                            <span className="font-medium">{formData.unidades}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Totais calculados */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-600 mb-2">Totais Calculados:</div>
                        <div className="flex justify-between">
                          <span>Total Pacotes:</span>
                          <span className="font-bold text-green-600">{totalPacotes.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Unidades:</span>
                          <span className="font-bold text-green-600">{totalUnidades.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Parâmetros de conversão */}
                    {(params.pacotesPorLastro > 1 || params.lastrosPorPallet > 1 || params.unidadesPorPacote > 1) && (
                      <div className="mt-3 pt-3 border-t border-green-300">
                        <div className="text-xs font-medium text-gray-600 mb-2">Parâmetros de Conversão:</div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                          <div>{params.pacotesPorLastro} pacs/lastro</div>
                          <div>{params.lastrosPorPallet} lastros/pallet</div>
                          <div>{params.unidadesPorPacote} un/pac</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
          
          {/* RoundingSuggestion apenas para Estoque 11 */}
          {tipoEstoque === '11' && formData.unidadesPorPacote && formData.unidades > 0 && (
            <div className="mb-4">
              <RoundingSuggestion
                currentValue={formData.unidades}
                maxValue={formData.unidadesPorPacote}
                onApply={(newPacotes, newUnidades) => {
                  handleFieldChange('pacotes', formData.pacotes + newPacotes);
                  handleFieldChange('unidades', newUnidades);
                }}
              />
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
