import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useProductSearch } from "@/hooks/use-products";
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
    unidadesPorPacote?: number;
    pacotesPorLastro?: number;
    lastrosPorPallet?: number;
  }) => void;
}

export default function ProductModal({ isOpen, onClose, onAddProduct }: ProductModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [formData, setFormData] = useState({
    pallets: 0,
    lastros: 0,
    pacotes: 0,
    unidades: 0,
  });

  const debouncedSearch = useDebounce(searchTerm, 300);
  const { data: suggestions = [], isLoading } = useProductSearch(debouncedSearch);

  const handleSelectSuggestion = (produto: Produto) => {
    setSelectedProduct(produto);
    setSearchTerm(produto.nome);
    setShowSuggestions(false);
    setFormData({
      pallets: 0,
      lastros: 0,
      pacotes: 0,
      unidades: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast({
        title: "Erro",
        description: "Selecione um produto da lista",
        variant: "destructive",
      });
      return;
    }

    onAddProduct({
      id: selectedProduct.id,
      nome: selectedProduct.nome,
      ...formData,
      unidadesPorPacote: selectedProduct.unidadesPorPacote,
      pacotesPorLastro: selectedProduct.pacotesPorLastro,
      lastrosPorPallet: selectedProduct.lastrosPorPallet,
    });

    // Limpa o formulário
    setSearchTerm("");
    setSelectedProduct(null);
    setFormData({
      pallets: 0,
      lastros: 0,
      pacotes: 0,
      unidades: 0,
    });
    onClose();
  };

  // Calcula o total de unidades baseado nas quantidades informadas
  const calculateTotal = () => {
    if (!selectedProduct) return 0;

    const unidadesPorPacote = selectedProduct.unidadesPorPacote || 1;
    const pacotesPorLastro = selectedProduct.pacotesPorLastro || 1;
    const lastrosPorPallet = selectedProduct.lastrosPorPallet || 1;

    return (
      formData.unidades +
      (formData.pacotes * unidadesPorPacote) +
      (formData.lastros * pacotesPorLastro * unidadesPorPacote) +
      (formData.pallets * lastrosPorPallet * pacotesPorLastro * unidadesPorPacote)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Adicionar Produto
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Busca de Produtos */}
          <div className="relative">
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Produto
            </Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Digite o código ou nome do produto..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                  setSelectedProduct(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {/* Sugestões */}
            {showSuggestions && searchTerm && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">Buscando produtos...</div>
                ) : suggestions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nenhum produto encontrado
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {suggestions.map((produto) => (
                      <button
                        key={produto.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(produto)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        <div className="font-medium">{produto.nome}</div>
                        <div className="text-sm text-gray-500">
                          Código: {produto.codigo}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Produto Selecionado */}
          {selectedProduct && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
              <div>
                <h4 className="font-medium">{selectedProduct.nome}</h4>
                <p className="text-sm text-gray-500">Código: {selectedProduct.codigo}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label>Unidades por Pacote</Label>
                  <div className="font-medium">{selectedProduct.unidadesPorPacote || 1}</div>
                </div>
                <div>
                  <Label>Pacotes por Lastro</Label>
                  <div className="font-medium">{selectedProduct.pacotesPorLastro || 1}</div>
                </div>
                <div>
                  <Label>Lastros por Pallet</Label>
                  <div className="font-medium">{selectedProduct.lastrosPorPallet || 1}</div>
                </div>
                <div>
                  <Label>Total por Pallet</Label>
                  <div className="font-medium text-emerald-600">
                    {(selectedProduct.unidadesPorPacote || 1) *
                      (selectedProduct.pacotesPorLastro || 1) *
                      (selectedProduct.lastrosPorPallet || 1)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quantidades */}
          {selectedProduct && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Pallets
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.pallets}
                    onChange={(e) => setFormData(prev => ({ ...prev, pallets: Math.max(0, parseInt(e.target.value) || 0) }))}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Lastros
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.lastros}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastros: Math.max(0, parseInt(e.target.value) || 0) }))}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Pacotes
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.pacotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, pacotes: Math.max(0, parseInt(e.target.value) || 0) }))}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidades
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.unidades}
                    onChange={(e) => setFormData(prev => ({ ...prev, unidades: Math.max(0, parseInt(e.target.value) || 0) }))}
                  />
                </div>
              </div>

              {/* Total */}
              <div className="bg-emerald-50 p-3 rounded-lg">
                <div className="text-sm text-emerald-800">
                  <strong>Total:</strong> {calculateTotal()} unidades
                </div>
              </div>
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!selectedProduct}
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
