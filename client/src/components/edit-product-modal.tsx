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
        // Estoque 10
        chaoCheio: product.chaoCheio || 0,
        chaoVazio: product.chaoVazio || 0,
        refugo: product.refugo || 0,
        sucata: product.sucata || 0,
        avaria: product.avaria || 0,
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
    
    // Função auxiliar para calcular total com conversão (DRY - Regra #1)
    const calcularTotal = (pallets: number, lastros: number, caixas: number): number => {
      const params = useCustomParams ? customParams : {
        unidadesPorPacote: formData.unidadesPorPacote || 1,
        pacotesPorLastro: formData.pacotesPorLastro || 1,
        lastrosPorPallet: formData.lastrosPorPallet || 1
      };
      
      return (
        pallets * params.lastrosPorPallet * params.pacotesPorLastro * params.unidadesPorPacote +
        lastros * params.pacotesPorLastro * params.unidadesPorPacote +
        caixas * params.unidadesPorPacote
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
            /* Seções expansíveis para Estoque 10 (Ativos) */
            <Stock10ExpandableSections
              data={formData}
              onChange={handleFieldChange}
              conversionRates={{
                caixasPorLastro: useCustomParams ? customParams.pacotesPorLastro : (formData.pacotesPorLastro || 12),
                lastrosPorPallet: useCustomParams ? customParams.lastrosPorPallet : (formData.lastrosPorPallet || 10)
              }}
            />
          ) : (
            /* Grid padrão para outros estoques (11 e 23) */
            stockConfig && (
              <StockFieldsGrid
                fields={stockConfig.fields}
                values={formData}
                onChange={handleFieldChange}
                columns={2}
                className="mb-4"
              />
            )
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Total de Pacotes (somente leitura) */}
            <div className="space-y-2">
              <Label>Total de Pacotes</Label>
              <Input
                value={formData.totalPacotes}
                readOnly
                className="bg-gray-100"
              />
            </div>
            
            {/* Quantidade no Sistema (se disponível) */}
            {formData.quantidadeSistema !== undefined && (
              <>
                <div className="space-y-2">
                  <Label>Quantidade no Sistema</Label>
                  <Input
                    value={formData.quantidadeSistema.toLocaleString()}
                    readOnly
                    className="bg-gray-100 font-medium"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Total Contado (Unidades)</Label>
                  <Input
                    value={calculateTotalUnidades().toLocaleString()}
                    readOnly
                    className="bg-gray-100 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Diferença (Pacotes)</Label>
                  <div className={cn(
                    "p-2 rounded font-bold text-center flex items-center justify-center gap-2",
                    formData.totalPacotes > formData.quantidadeSistema
                      ? "text-green-700 bg-green-50"
                      : formData.totalPacotes < formData.quantidadeSistema
                        ? "text-red-700 bg-red-50"
                        : "text-gray-700 bg-gray-100"
                  )}>
                    {formData.totalPacotes > formData.quantidadeSistema && (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {formData.totalPacotes < formData.quantidadeSistema && (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {formData.totalPacotes === formData.quantidadeSistema && (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {(formData.totalPacotes - formData.quantidadeSistema) > 0
                      ? `+${(formData.totalPacotes - formData.quantidadeSistema).toLocaleString()}`
                      : (formData.totalPacotes - formData.quantidadeSistema).toLocaleString()}
                  </div>
                </div>
              </>
            )}
          </div>
          
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
