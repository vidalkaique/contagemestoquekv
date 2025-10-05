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
import { DynamicStockForm } from "@/components/dynamic-stock-form";
import { useStockConfig, useStockFieldNames } from "@/hooks/use-stock-config";
import type { StockFormData, StockType } from "@/types/stock-config";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onSave: (product: ProductItem) => void;
  tipoEstoque: StockType;
}

export default function EditProductModal({ isOpen, onClose, product, onSave, tipoEstoque }: EditProductModalProps) {
  const { toast } = useToast();

  // Obter configuração do estoque atual
  const stockConfig = useStockConfig(tipoEstoque);
  const stockFieldNames = useStockFieldNames(tipoEstoque);

  const [formData, setFormData] = useState<StockFormData>({
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

  // Função para calcular o total de unidades baseado no estoque
  const calculateTotalUnidades = useCallback((): number => {
    if (tipoEstoque === '10') {
      // Para estoque 10, calcular baseado nos campos específicos
      const { chaoCheio = 0, chaoVazio = 0, refugo = 0, sucata = 0, avaria = 0, manutencao = 0, novo = 0, bloqueado = 0 } = formData;
      return chaoCheio + chaoVazio + refugo + sucata + avaria + manutencao + novo + bloqueado;
    }

    if (tipoEstoque === '23') {
      // Para estoque 23, usar apenas o campo UN
      return formData.un || 0;
    }

    // Para estoque 11 (padrão) - cálculo tradicional
    const { pallets = 0, lastros = 0, pacotes = 0, unidades = 0 } = formData;

    // Usa parâmetros customizados se ativados, senão usa valores do formData
    const unidadesPorPacoteAtual = useCustomParams ? customParams.unidadesPorPacote : (formData.unidadesPorPacote || 1);
    const pacotesPorLastroAtual = useCustomParams ? customParams.pacotesPorLastro : (formData.pacotesPorLastro || 0);
    const lastrosPorPalletAtual = useCustomParams ? customParams.lastrosPorPallet : (formData.lastrosPorPallet || 0);

    const totalFromPallets = pallets * (lastrosPorPalletAtual || 0) * (pacotesPorLastroAtual || 0) * (unidadesPorPacoteAtual || 0);
    const totalFromLastros = lastros * (pacotesPorLastroAtual || 0) * (unidadesPorPacoteAtual || 0);
    const totalFromPacotes = pacotes * (unidadesPorPacoteAtual || 0);

    return totalFromPallets + totalFromLastros + totalFromPacotes + (unidades || 0);
  }, [formData, useCustomParams, customParams, tipoEstoque]);

  // Atualiza o formulário quando o produto muda
  useEffect(() => {
    if (product) {
      setFormData({
        pallets: product.pallets || 0,
        lastros: product.lastros || 0,
        pacotes: product.pacotes || 0,
        unidades: product.unidades || 0,
        chaoCheio: product.chaoCheio || 0,
        chaoVazio: product.chaoVazio || 0,
        refugo: product.refugo || 0,
        sucata: product.sucata || 0,
        avaria: product.avaria || 0,
        manutencao: product.manutencao || 0,
        novo: product.novo || 0,
        bloqueado: product.bloqueado || 0,
        un: product.un || 0,
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
    if (tipoEstoque === '11') {
      const { pallets = 0, lastros = 0, pacotes = 0, pacotesPorLastro = 0, lastrosPorPallet = 0 } = formData;
      const totalFromPallets = pallets * (lastrosPorPallet || 0) * (pacotesPorLastro || 0);
      const totalFromLastros = lastros * (pacotesPorLastro || 0);
      return totalFromPallets + totalFromLastros + (pacotes || 0);
    }
    return formData.totalPacotes || 0;
  };

  // Manipulador de mudança de campo
  const handleFieldChange = useCallback((fieldName: keyof StockFormData, value: number | string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  }, []);

  // Wrapper para compatibilidade com DynamicStockForm
  const handleDynamicFieldChange = useCallback((fieldName: string | number | symbol, value: number | string) => {
    handleFieldChange(fieldName as keyof StockFormData, value);
  }, [handleFieldChange]);

  // Manipulador de submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    const updatedProduct: ProductItem = {
      ...product,
      pallets: formData.pallets || 0,
      lastros: formData.lastros || 0,
      pacotes: formData.pacotes || 0,
      unidades: formData.unidades || 0,
      chaoCheio: formData.chaoCheio || 0,
      chaoVazio: formData.chaoVazio || 0,
      refugo: formData.refugo || 0,
      sucata: formData.sucata || 0,
      avaria: formData.avaria || 0,
      manutencao: formData.manutencao || 0,
      novo: formData.novo || 0,
      bloqueado: formData.bloqueado || 0,
      un: formData.un || 0,
      totalPacotes: calculateTotalPacotes(),
      unidadesPorPacote: formData.unidadesPorPacote || 0,
      pacotesPorLastro: formData.pacotesPorLastro || 0,
      lastrosPorPallet: formData.lastrosPorPallet || 0,
      quantidadePacsPorPallet: formData.quantidadePacsPorPallet || 0,
      quantidadeSistema: formData.quantidadeSistema || 0
    };

    onSave(updatedProduct);
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Editar Produto</h2>
            <p className="text-sm text-gray-600">{product.nome} ({product.codigo})</p>
            {stockConfig && (
              <p className="text-xs text-blue-600 mt-1">
                Configuração: {stockConfig.name} - {stockConfig.description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campos dinâmicos baseados no tipo de estoque */}
          {stockConfig && (
            <DynamicStockForm
              fields={stockConfig.fields}
              values={formData}
              onChange={handleDynamicFieldChange}
            />
          )}

          {/* Campos de parâmetros (apenas para estoque 11) */}
          {tipoEstoque === '11' && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Parâmetros do Produto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unidadesPorPacote">Unidades por Pacote</Label>
                  <div className="w-full">
                    <NumberInputWithButtons
                      id="unidadesPorPacote"
                      value={formData.unidadesPorPacote || 0}
                      onChange={(value) => handleFieldChange('unidadesPorPacote', value)}
                      min={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pacotesPorLastro">Pacotes por Lastro</Label>
                  <div className="w-full">
                    <NumberInputWithButtons
                      id="pacotesPorLastro"
                      value={formData.pacotesPorLastro || 0}
                      onChange={(value) => handleFieldChange('pacotesPorLastro', value)}
                      min={0}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastrosPorPallet">Lastros por Pallet</Label>
                  <div className="w-full">
                    <NumberInputWithButtons
                      id="lastrosPorPallet"
                      value={formData.lastrosPorPallet || 0}
                      onChange={(value) => handleFieldChange('lastrosPorPallet', value)}
                      min={0}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {formData.unidadesPorPacote && (formData.unidades || 0) > 0 && (
                <div className="mt-2">
                  <RoundingSuggestion
                    currentValue={formData.unidades || 0}
                    maxValue={formData.unidadesPorPacote}
                    onApply={(newPacotes, newUnidades) => {
                      handleFieldChange('pacotes', (formData.pacotes || 0) + newPacotes);
                      handleFieldChange('unidades', newUnidades);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Resumo dos totais */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Resumo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total de Pacotes (somente leitura) */}
              <div className="space-y-2">
                <Label>Total de Pacotes</Label>
                <Input
                  value={calculateTotalPacotes()}
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
                    <Label>Diferença (Unidades)</Label>
                    <div className={cn(
                      "p-2 rounded font-bold text-center flex items-center justify-center gap-2",
                      calculateTotalUnidades() > formData.quantidadeSistema
                        ? "text-green-700 bg-green-50"
                        : calculateTotalUnidades() < formData.quantidadeSistema
                          ? "text-red-700 bg-red-50"
                          : "text-gray-700 bg-gray-100"
                    )}>
                      {calculateTotalUnidades() > formData.quantidadeSistema && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {calculateTotalUnidades() < formData.quantidadeSistema && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {calculateTotalUnidades() === formData.quantidadeSistema && (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      {(calculateTotalUnidades() - formData.quantidadeSistema) > 0
                        ? `+${(calculateTotalUnidades() - formData.quantidadeSistema).toLocaleString()}`
                        : (calculateTotalUnidades() - formData.quantidadeSistema).toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </div>
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
