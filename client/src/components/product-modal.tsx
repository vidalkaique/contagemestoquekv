import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useProductSearch } from "@/hooks/use-products";
import { motion, AnimatePresence } from "framer-motion";
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
  initialSearchTerm?: string;
}

export default function ProductModal({ isOpen, onClose, onAddProduct, initialSearchTerm = "" }: ProductModalProps) {
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const [formData, setFormData] = useState({
    pallets: 0,
    lastros: 0,
    pacotes: 0,
    unidades: 0,
  });
  
  const suggestionsListRef = useRef<HTMLDivElement>(null);

  // Atualiza o termo de busca quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      // Foca no campo de busca quando o modal é aberto
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
      
      if (initialSearchTerm) {
        setSearchTerm(initialSearchTerm);
        setShowSuggestions(true);
      }
    } else {
      // Limpa o formulário quando o modal é fechado
      setSearchTerm("");
      setSelectedProduct(null);
      setShowSuggestions(false);
      setFormData({
        pallets: 0,
        lastros: 0,
        pacotes: 0,
        unidades: 0,
      });
    }
  }, [isOpen, initialSearchTerm]);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const { data: suggestions = [], isLoading } = useProductSearch(debouncedSearch);

  const handleSelectSuggestion = (produto: Produto) => {
    setSelectedProduct(produto);
    setSearchTerm(produto.nome);
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
    setFormData({
      pallets: 0,
      lastros: 0,
      pacotes: 0,
      unidades: 0,
    });
    // Foca no primeiro campo de quantidade após selecionar um produto
    setTimeout(() => {
      const firstInput = document.querySelector('input[type="number"]') as HTMLInputElement;
      firstInput?.focus();
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      toast({
        title: "Erro",
        description: "Selecione um produto antes de adicionar.",
        variant: "destructive",
      });
      return;
    }

    // Verifica se pelo menos um campo de quantidade foi preenchido
    const hasQuantity = Object.values(formData).some(value => value > 0);
    
    if (!hasQuantity) {
      toast({
        title: "Atenção",
        description: "Preencha pelo menos um dos campos de quantidade (pallets, lastros, pacotes ou unidades).",
        variant: "destructive",
      });
      
      // Foca no primeiro campo de quantidade
      const firstInput = document.querySelector('input[type="number"]') as HTMLInputElement;
      firstInput?.focus();
      
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

  // Não renderiza nada se o modal não estiver aberto
  if (!isOpen) return null;

  // Manipula eventos de teclado para navegação e fechamento do modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Fecha o modal ao pressionar Escape
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Navega pelas sugestões com as teclas de seta
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          scrollSuggestionIntoView(focusedSuggestionIndex + 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : 0
          );
          scrollSuggestionIntoView(focusedSuggestionIndex - 1);
        } else if (e.key === 'Enter' && focusedSuggestionIndex >= 0) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[focusedSuggestionIndex]);
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, showSuggestions, suggestions, focusedSuggestionIndex]);
  
  // Rola a sugestão para a visualização quando necessário
  const scrollSuggestionIntoView = (index: number) => {
    if (suggestionsListRef.current && index >= 0 && index < suggestions.length) {
      const suggestionElements = suggestionsListRef.current.querySelectorAll('[role="option"]');
      if (suggestionElements[index]) {
        suggestionElements[index].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  };
  
  // Reseta o índice da sugestão focada quando as sugestões mudam
  useEffect(() => {
    setFocusedSuggestionIndex(-1);
  }, [suggestions]);

  // Fecha o modal ao clicar fora do conteúdo
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
            Adicionar Produto
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Fechar modal"
          >
            <X size={24} aria-hidden="true" />
          </Button>
        </div>

        <div id="modal-description" className="sr-only">
          Adicione um produto à contagem atual. Preencha as quantidades e clique em Adicionar.
        </div>
        <form 
          onSubmit={handleSubmit} 
          className="p-6 space-y-6 flex-1 overflow-y-auto"
          aria-labelledby="modal-title"
        >
          {/* Busca de Produtos */}
          <div className="relative">
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Produto
            </Label>
            <div className="relative">
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Digite o código ou nome do produto..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                  setSelectedProduct(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="pl-10 h-12 text-base"
                autoComplete="off"
                aria-label="Buscar produto"
              />
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20} 
                aria-hidden="true"
              />
            </div>

            {/* Sugestões */}
            <AnimatePresence>
              {showSuggestions && !selectedProduct && (
                <motion.div 
                  ref={suggestionsListRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                  role="listbox"
                  aria-label="Sugestões de produtos"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {isLoading ? (
                    <div className="px-4 py-2 text-sm text-gray-500 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Buscando produtos...
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">Nenhum produto encontrado</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {suggestions.map((produto, index) => (
                        <button
                          key={produto.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(produto)}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none ${
                            focusedSuggestionIndex === index ? 'bg-blue-50' : ''
                          }`}
                          role="option"
                          aria-selected={focusedSuggestionIndex === index}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectSuggestion(produto);
                            }
                          }}
                          onMouseEnter={() => setFocusedSuggestionIndex(index)}
                        >
                          <div className="font-medium">{produto.nome}</div>
                          {produto.codigo && (
                            <div className="text-sm text-gray-500">
                              Código: {produto.codigo}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
            </div>
          )}

          {/* Quantidades */}
          {selectedProduct && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="space-y-1">
                    <Label className="text-base">Pallets</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.pallets}
                      onChange={(e) =>
                        setFormData({ ...formData, pallets: parseInt(e.target.value) || 0 })
                      }
                      className="h-12 text-base"
                    />
                  </div>
                </div>
                <div>
                  <div className="space-y-1">
                    <Label className="text-base">Lastros</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.lastros}
                      onChange={(e) =>
                        setFormData({ ...formData, lastros: parseInt(e.target.value) || 0 })
                      }
                      className="h-12 text-base"
                    />
                  </div>
                </div>
                <div>
                  <div className="space-y-1">
                    <Label className="text-base">Pacotes</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.pacotes}
                      onChange={(e) =>
                        setFormData({ ...formData, pacotes: parseInt(e.target.value) || 0 })
                      }
                      className="h-12 text-base"
                    />
                  </div>
                </div>
                <div>
                  <div className="space-y-1">
                    <Label className="text-base">Unidades</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.unidades}
                      onChange={(e) =>
                        setFormData({ ...formData, unidades: parseInt(e.target.value) || 0 })
                      }
                      className="h-12 text-base"
                    />
                  </div>
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

          <div className="flex justify-end space-x-4 pt-6">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
