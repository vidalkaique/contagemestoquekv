import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInputWithButtons } from "@/components/ui/number-input-with-buttons";
import { RoundingSuggestion } from "@/components/rounding-suggestion";
import { useToast } from "@/hooks/use-toast";
import type { ProductItem } from "@/pages/new-count";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onSave: (product: ProductItem) => void;
}

export default function EditProductModal({ isOpen, onClose, product, onSave }: EditProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Omit<ProductItem, 'id' | 'nome' | 'codigo'>>({
    pallets: 0,
    lastros: 0,
    pacotes: 0,
    unidades: 0,
    totalPacotes: 0,
    unidadesPorPacote: 0,
    pacotesPorLastro: 0,
    lastrosPorPallet: 0,
    quantidadePacsPorPallet: 0,
    quantidadeSistema: 0
  });

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
    const newFormData = {
      ...formData,
      [field]: value,
      totalPacotes: calculateTotalPacotes()
    };
    
    setFormData(newFormData);
  };

  // Submete o formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    // Atualiza o produto com os novos valores
    const updatedProduct: ProductItem = {
      ...product,
      ...formData,
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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Quantidade no Sistema</Label>
                <Input
                  value={formData.quantidadeSistema}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
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
