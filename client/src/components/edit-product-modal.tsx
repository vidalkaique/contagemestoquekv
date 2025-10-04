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
import { ItemFieldsEstoque11 } from "@/components/item-fields-estoque-11";
import { ItemFieldsEstoque10 } from "@/components/item-fields-estoque-10";
import { ItemFieldsEstoque23 } from "@/components/item-fields-estoque-23";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onSave: (product: ProductItem) => void;
  tipoEstoque?: '10' | '11' | '23';
}

export default function EditProductModal({ isOpen, onClose, product, onSave, tipoEstoque = '11' }: EditProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>({
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
    // Comuns
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

  // Função para calcular o total de unidades
  const calculateTotalUnidades = useCallback((): number => {
    const { pallets = 0, lastros = 0, pacotes = 0, unidades = 0 } = formData;
    
    // Usa parâmetros customizados se ativados, senão usa valores do formData
    const unidadesPorPacoteAtual = useCustomParams ? customParams.unidadesPorPacote : (formData.unidadesPorPacote || 1);
    const pacotesPorLastroAtual = useCustomParams ? customParams.pacotesPorLastro : (formData.pacotesPorLastro || 0);
    const lastrosPorPalletAtual = useCustomParams ? customParams.lastrosPorPallet : (formData.lastrosPorPallet || 0);
    
    const totalFromPallets = pallets * (lastrosPorPalletAtual || 0) * (pacotesPorLastroAtual || 0) * (unidadesPorPacoteAtual || 0);
    const totalFromLastros = lastros * (pacotesPorLastroAtual || 0) * (unidadesPorPacoteAtual || 0);
    const totalFromPacotes = pacotes * (unidadesPorPacoteAtual || 0);
    
    return totalFromPallets + totalFromLastros + totalFromPacotes + (unidades || 0);
  }, [formData, useCustomParams, customParams]);

  // Atualiza o formulário quando o produto muda
  useEffect(() => {
    if (product) {
      setFormData({
        pallets: product.pallets || 0,
        lastros: product.lastros || 0,
        pacotes: product.pacotes || 0,
        unidades: product.unidades || 0,
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
  const handleFieldChange = (field: keyof typeof formData, value: number) => {
    // Cria uma cópia atualizada dos dados do formulário
    const updatedFormData = { ...formData, [field]: value };

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
    
    // Atualiza o produto com os novos valores, incluindo parâmetros customizados se ativados
    const updatedProduct: ProductItem = {
      ...product,
      ...formData,
      // Usa parâmetros customizados se ativados, senão mantém os valores originais
      unidadesPorPacote: useCustomParams ? customParams.unidadesPorPacote : formData.unidadesPorPacote,
      pacotesPorLastro: useCustomParams ? customParams.pacotesPorLastro : formData.pacotesPorLastro,
      lastrosPorPallet: useCustomParams ? customParams.lastrosPorPallet : formData.lastrosPorPallet,
      totalPacotes: calculateTotalPacotes()
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
          {tipoEstoque === '11' && (
            <ItemFieldsEstoque11
              values={{
                pallets: formData.pallets || 0,
                lastros: formData.lastros || 0,
                pacotes: formData.pacotes || 0,
                unidades: formData.unidades || 0,
              }}
              onChange={(field, value) => handleFieldChange(field as any, value)}
            />
          )}
          
          {tipoEstoque === '10' && (
            <ItemFieldsEstoque10
              values={{
                chaoCheio: formData.chaoCheio || 0,
                chaoVazio: formData.chaoVazio || 0,
                refugo: formData.refugo || 0,
                sucata: formData.sucata || 0,
                avaria: formData.avaria || 0,
                manutencao: formData.manutencao || 0,
                novo: formData.novo || 0,
                bloqueado: formData.bloqueado || 0,
              }}
              onChange={(field, value) => handleFieldChange(field as any, value)}
            />
          )}
          
          {tipoEstoque === '23' && (
            <ItemFieldsEstoque23
              values={{
                un: formData.un || 0,
              }}
              onChange={(field, value) => handleFieldChange(field as any, value)}
            />
          )}
          
          {/* Removi os campos hardcoded - agora são renderizados dinamicamente acima */}
          <div className="hidden grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pallets */}
            <div className="space-y-2">
              <Label htmlFor="pallets">Pallets</Label>
              <div className="w-full">
                <NumberInputWithButtons
                  id="pallets"
                  value={formData.pallets}
                  onChange={(value) => handleFieldChange('pallets', value)}
                  min={0}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Lastros */}
            <div className="space-y-2">
              <Label htmlFor="lastros">Lastros</Label>
              <div className="w-full">
                <NumberInputWithButtons
                  id="lastros"
                  value={formData.lastros}
                  onChange={(value) => handleFieldChange('lastros', value)}
                  min={0}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Pacotes */}
            <div className="space-y-2">
              <Label htmlFor="pacotes">Pacotes</Label>
              <div>
                <NumberInputWithButtons
                  id="pacotes"
                  value={formData.pacotes}
                  onChange={(value) => handleFieldChange('pacotes', value)}
                  min={0}
                  className="w-full"
                />
                {formData.unidadesPorPacote && formData.unidades > 0 && (
                  <div className="mt-2">
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
              </div>
            </div>
            
            {/* Unidades */}
            <div className="space-y-2">
              <Label htmlFor="unidades">Unidades</Label>
              <div className="w-full">
                <NumberInputWithButtons
                  id="unidades"
                  value={formData.unidades}
                  onChange={(value) => handleFieldChange('unidades', value)}
                  min={0}
                  className="w-full"
                />
              </div>
            </div>
            
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
