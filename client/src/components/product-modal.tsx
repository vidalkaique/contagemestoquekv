import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import type { Produto } from "@shared/schema";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: {
    id: string;
    nome: string;
    pallets: number;
    lastros: number;
    pacotes: number;
    unidades: number;
  }) => void;
}

export default function ProductModal({ isOpen, onClose, onAddProduct }: ProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: "",
    pallets: 0,
    lastros: 0,
    pacotes: 0,
    unidades: 0,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);

  const debouncedSearch = useDebounce(formData.nome, 300);

  const { data: suggestions = [] } = useQuery<Produto[]>({
    queryKey: ["/api/produtos/search", { q: debouncedSearch }],
    enabled: debouncedSearch.length >= 1, // Permitir busca com apenas 1 caractere para códigos
  });

  // Auto-select product if exact code match is found
  useEffect(() => {
    if (suggestions.length === 1 && suggestions[0].codigo === formData.nome && !selectedProduct) {
      handleSelectSuggestion(suggestions[0]);
    }
  }, [suggestions, formData.nome, selectedProduct]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome do produto é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (formData.pallets < 0 || formData.lastros < 0 || formData.pacotes < 0 || formData.unidades < 0) {
      toast({
        title: "Erro",
        description: "As quantidades não podem ser negativas",
        variant: "destructive",
      });
      return;
    }

    onAddProduct({
      id: crypto.randomUUID(),
      ...formData,
    });

    // Reset form
    setFormData({
      nome: "",
      pallets: 0,
      lastros: 0,
      pacotes: 0,
      unidades: 0,
    });
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (produto: Produto) => {
    setFormData(prev => ({ ...prev, nome: produto.nome }));
    setShowSuggestions(false);
    setSelectedProduct(produto);
  };

  const calculateTotalUnits = () => {
    if (!selectedProduct) return 0;
    
    const totalUnitsPerPallet = selectedProduct.unidadesPorPacote * 
                               selectedProduct.pacotesPorLastro * 
                               selectedProduct.lastrosPorPallet;
    
    const totalUnitsFromPallets = formData.pallets * totalUnitsPerPallet;
    const totalUnitsFromLastros = formData.lastros * (selectedProduct.unidadesPorPacote * selectedProduct.pacotesPorLastro);
    const totalUnitsFromPacotes = formData.pacotes * selectedProduct.unidadesPorPacote;
    const totalUnitsFromUnidades = formData.unidades;
    
    return totalUnitsFromPallets + totalUnitsFromLastros + totalUnitsFromPacotes + totalUnitsFromUnidades;
  };

  const handleClose = () => {
    setFormData({
      nome: "",
      pallets: 0,
      lastros: 0,
      pacotes: 0,
      unidades: 0,
    });
    setShowSuggestions(false);
    setSelectedProduct(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Adicionar Produto</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="text-gray-500" size={20} />
          </Button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Product Name with Autocomplete */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Código ou Nome do Produto
            </Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Digite o código ou nome do produto..."
                value={formData.nome}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, nome: e.target.value }));
                  setShowSuggestions(true);
                  setSelectedProduct(null); // Reset selection when typing manually
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full"
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && formData.nome.length >= 1 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {suggestions.map((produto) => (
                    <div
                      key={produto.id}
                      onClick={() => handleSelectSuggestion(produto)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{produto.nome}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                              {produto.codigo}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{produto.unidadesPorPacote * produto.pacotesPorLastro * produto.lastrosPorPallet} unid/pallet</div>
                          <div>{produto.unidadesPorPacote}/{produto.pacotesPorLastro}/{produto.lastrosPorPallet}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product Conversion Info */}
          {selectedProduct && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Conversões do Produto</h4>
              <div className="grid grid-cols-3 gap-2 text-xs text-blue-800">
                <div className="text-center">
                  <div>1 Pallet</div>
                  <div className="font-medium">{selectedProduct.lastrosPorPallet} lastros</div>
                </div>
                <div className="text-center">
                  <div>1 Lastro</div>
                  <div className="font-medium">{selectedProduct.pacotesPorLastro} pacotes</div>
                </div>
                <div className="text-center">
                  <div>1 Pacote</div>
                  <div className="font-medium">{selectedProduct.unidadesPorPacote} unidades</div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-xs text-blue-600">Total por pallet:</div>
                <div className="font-medium text-blue-900">
                  {selectedProduct.unidadesPorPacote * selectedProduct.pacotesPorLastro * selectedProduct.lastrosPorPallet} unidades
                </div>
              </div>
            </div>
          )}

          {/* Quantity Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Pallets
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={formData.pallets}
                onChange={(e) => setFormData(prev => ({ ...prev, pallets: parseInt(e.target.value) || 0 }))}
                className="w-full"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Lastros
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={formData.lastros}
                onChange={(e) => setFormData(prev => ({ ...prev, lastros: parseInt(e.target.value) || 0 }))}
                className="w-full"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Pacotes
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={formData.pacotes}
                onChange={(e) => setFormData(prev => ({ ...prev, pacotes: parseInt(e.target.value) || 0 }))}
                className="w-full"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Unidades
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={formData.unidades}
                onChange={(e) => setFormData(prev => ({ ...prev, unidades: parseInt(e.target.value) || 0 }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Total Units Display */}
          {selectedProduct && (formData.pallets > 0 || formData.lastros > 0 || formData.pacotes > 0 || formData.unidades > 0) && (
            <div className="bg-emerald-50 p-3 rounded-lg">
              <h4 className="font-medium text-emerald-900 mb-2">Total de Unidades</h4>
              <div className="text-2xl font-bold text-emerald-800 text-center">
                {calculateTotalUnits().toLocaleString()} unidades
              </div>
              <div className="text-xs text-emerald-600 mt-1 text-center">
                {formData.pallets > 0 && `${formData.pallets} pallet(s) `}
                {formData.lastros > 0 && `${formData.lastros} lastro(s) `}
                {formData.pacotes > 0 && `${formData.pacotes} pacote(s) `}
                {formData.unidades > 0 && `${formData.unidades} unidade(s)`}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Adicionar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
