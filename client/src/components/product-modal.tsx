import { useState } from "react";
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

  const debouncedSearch = useDebounce(formData.nome, 300);

  const { data: suggestions = [] } = useQuery<Produto[]>({
    queryKey: ["/api/produtos/search", { q: debouncedSearch }],
    enabled: debouncedSearch.length >= 2,
  });

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
              Nome do Produto
            </Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Digite o nome do produto..."
                value={formData.nome}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, nome: e.target.value }));
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full"
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && formData.nome.length >= 2 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {suggestions.map((produto) => (
                    <div
                      key={produto.id}
                      onClick={() => handleSelectSuggestion(produto)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      {produto.nome}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
