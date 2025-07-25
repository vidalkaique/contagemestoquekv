import { useState, useEffect } from "react";
import { X, Search, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInputWithButtons } from "@/components/ui/number-input-with-buttons";
import { RoundingSuggestion } from "@/components/rounding-suggestion";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useProductSearch, useProductsByEstoque } from "@/hooks/use-products";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Produto, ProdutoComEstoque } from "@shared/schema";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  estoqueId?: string;
  onAddProduct: (product: {
    id: string;
    codigo?: string;
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

export default function ProductModal({ isOpen, onClose, estoqueId, onAddProduct }: ProductModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  
  // Busca produtos do estoque atual se houver um estoque selecionado
  const { data: produtosEstoque = [] } = useProductsByEstoque(estoqueId);
  
  // Busca sugestões de produtos baseado no termo de busca
  const { data: searchResults = [], isLoading } = useProductSearch({
    query: debouncedSearch,
    estoqueId,
  });
  
  // Se houver um estoque selecionado, mostra apenas os produtos do estoque
  // Caso contrário, mostra os resultados da busca
  const suggestions = estoqueId && !searchTerm
    ? produtosEstoque.map(pe => pe as unknown as Produto)
    : searchResults;

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

  const handleApplyRounding = (pacotesToAdd: number, newUnidades: number) => {
    setFormData(prev => ({
      ...prev,
      pacotes: prev.pacotes + pacotesToAdd,
      unidades: newUnidades
    }));
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
      codigo: selectedProduct.codigo,
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

  // Adiciona um produto ao estoque atual
  const handleAddToEstoque = async (produto: Produto) => {
    if (!estoqueId) return;
    
    try {
      const { error } = await supabase
        .from('produto_estoque')
        .insert({
          produto_id: produto.id,
          estoque_id: estoqueId,
        });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Produto adicionado ao estoque com sucesso!",
      });
      
      // Atualiza a lista de produtos do estoque
      queryClient.invalidateQueries({ queryKey: ["produtos/estoque", estoqueId] });
    } catch (error) {
      console.error("Erro ao adicionar produto ao estoque:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o produto ao estoque.",
        variant: "destructive",
      });
    }
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full h-full sm:h-auto sm:max-h-[90vh] sm:my-4 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
            Adicionar Produto
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
          {/* Busca de Produtos */}
          <div className="relative">
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Produto
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nome ou código..."
                className="pl-10 h-12 text-base w-full"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
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
            <div className="bg-gray-50 p-5 rounded-lg space-y-4">
              <div>
                <h4 className="font-medium">{selectedProduct.nome}</h4>
                <p className="text-sm text-gray-500">Código: {selectedProduct.codigo}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-base">
                <div>
                  <Label>Unidades por Pacote</Label>
                  <div className="font-medium text-lg">{selectedProduct.unidadesPorPacote || 1}</div>
                </div>
                <div>
                  <Label>Pacotes por Lastro</Label>
                  <div className="font-medium text-lg">{selectedProduct.pacotesPorLastro || 1}</div>
                </div>
                <div>
                  <Label>Lastros por Pallet</Label>
                  <div className="font-medium text-lg">{selectedProduct.lastrosPorPallet || 1}</div>
                </div>
                <div>
                  <Label>Total por Pallet</Label>
                  <div className="font-medium text-lg text-emerald-600">
                    {(selectedProduct.unidadesPorPacote || 1) *
                      (selectedProduct.pacotesPorLastro || 1) *
                      (selectedProduct.lastrosPorPallet || 1)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pallets">Pallets</Label>
                    <NumberInputWithButtons
                      value={formData.pallets}
                      onChange={(value) => setFormData({ ...formData, pallets: value })}
                      min={0}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastros">Lastros</Label>
                    <NumberInputWithButtons
                      value={formData.lastros}
                      onChange={(value) => setFormData({ ...formData, lastros: value })}
                      min={0}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pacotes">Pacotes</Label>
                    <NumberInputWithButtons
                      value={formData.pacotes}
                      onChange={(value) => setFormData({ ...formData, pacotes: value })}
                      min={0}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="unidades">Unidades</Label>
                    <NumberInputWithButtons
                      id="unidades"
                      value={formData.unidades}
                      onChange={(value) => setFormData({ ...formData, unidades: value })}
                      min={0}
                    />
                    {selectedProduct?.unidadesPorPacote && selectedProduct.unidadesPorPacote > 0 && (
                      <RoundingSuggestion
                        currentValue={formData.unidades}
                        maxValue={selectedProduct.unidadesPorPacote}
                        onApply={handleApplyRounding}
                      />
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <div className="text-sm text-emerald-800">
                    <strong>Total:</strong> {calculateTotal()} unidades
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-12 px-6 text-base"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary text-white hover:bg-primary/90 h-12 px-6 text-base"
              disabled={!selectedProduct}
            >
              Adicionar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
