import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit, Trash2, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Produto, InsertProduto } from "@shared/schema";

export default function Products() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    unidadesPorPacote: 0,
    pacotesPorLastro: 0,
    lastrosPorPallet: 0,
  });

  const { data: produtos = [], isLoading } = useQuery<Produto[]>({
    queryKey: ["/api/produtos"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProduto) => {
      const response = await apiRequest("POST", "/api/produtos", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      resetForm();
      toast({
        title: "Produto criado",
        description: "Produto adicionado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar produto",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProduto> }) => {
      const response = await apiRequest("PUT", `/api/produtos/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      resetForm();
      toast({
        title: "Produto atualizado",
        description: "Produto editado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar produto",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/produtos/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      toast({
        title: "Produto removido",
        description: "Produto excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover produto",
        variant: "destructive",
      });
    },
  });

  const filteredProducts = (produtos || []).filter((produto: Produto) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return produto.nome.toLowerCase().includes(query) || 
           produto.codigo.toLowerCase().includes(query);
  });

  const resetForm = () => {
    setFormData({
      codigo: "",
      nome: "",
      unidadesPorPacote: 0,
      pacotesPorLastro: 0,
      lastrosPorPallet: 0,
    });
    setEditingProduct(null);
    setIsFormOpen(false);
  };

  const handleEdit = (produto: Produto) => {
    setFormData({
      codigo: produto.codigo,
      nome: produto.nome,
      unidadesPorPacote: Number(produto.unidadesPorPacote) || 0,
      pacotesPorLastro: Number(produto.pacotesPorLastro) || 0,
      lastrosPorPallet: Number(produto.lastrosPorPallet) || 0,
    });
    setEditingProduct(produto);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.codigo.trim() || !formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Código e nome são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Garantir que os valores numéricos sejam números válidos
    const data = {
      ...formData,
      unidadesPorPacote: Math.max(0, Number(formData.unidadesPorPacote)),
      pacotesPorLastro: Math.max(0, Number(formData.pacotesPorLastro)),
      lastrosPorPallet: Math.max(0, Number(formData.lastrosPorPallet))
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const calculateTotalUnits = (produto: Produto) => {
    // Garantir que todos os valores sejam números válidos
    const unidadesPorPacote = Number(produto.unidadesPorPacote) || 0;
    const pacotesPorLastro = Number(produto.pacotesPorLastro) || 0;
    const lastrosPorPallet = Number(produto.lastrosPorPallet) || 0;
    
    return unidadesPorPacote * pacotesPorLastro * lastrosPorPallet;
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="text-gray-600" size={20} />
        </Button>
        <h2 className="text-lg font-semibold text-gray-900 ml-3">Gestão de Produtos</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Search and Add Button */}
        <div className="flex space-x-3">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Buscar por código ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-primary text-primary-foreground px-4 hover:bg-primary/90"
          >
            <Plus size={20} />
          </Button>
        </div>

        {/* Products List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto mb-3 text-gray-400" size={48} />
            <p className="text-sm">
              {searchQuery ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
            </p>
            <p className="text-xs">
              {searchQuery ? "Tente buscar com outros termos" : "Adicione seu primeiro produto"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((produto) => (
              <div key={produto.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{produto.nome}</h3>
                    <p className="text-sm text-gray-500 mb-1">Código: {produto.codigo}</p>
                    <p className="text-xs text-emerald-600 font-medium">
                      Total por pallet: {calculateTotalUnits(produto) === 0
                        ? "Configure as quantidades"
                        : `${calculateTotalUnits(produto)} unidades`}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(produto)}
                      className="p-2 hover:bg-red-50 text-red-600"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(produto.id)}
                      className="p-2 hover:bg-red-50 text-red-600"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-gray-500">Unid/Pacote</p>
                    <p className="font-medium">{produto.unidadesPorPacote}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-gray-500">Pac/Lastro</p>
                    <p className="font-medium">{produto.pacotesPorLastro}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-gray-500">Last/Pallet</p>
                    <p className="font-medium">{produto.lastrosPorPallet}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ×
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Código do Produto *
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: COCA-001"
                  value={formData.codigo}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Produto *
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Coca-Cola 350ml"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidades por Pacote
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.unidadesPorPacote}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData(prev => ({ ...prev, unidadesPorPacote: value }));
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Pacotes por Lastro
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.pacotesPorLastro}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData(prev => ({ ...prev, pacotesPorLastro: value }));
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Lastros por Pallet
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.lastrosPorPallet}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData(prev => ({ ...prev, lastrosPorPallet: value }));
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-emerald-50 p-3 rounded-lg">
                <p className="text-sm text-emerald-800">
                  <strong>Total por pallet:</strong> {formData.unidadesPorPacote * formData.pacotesPorLastro * formData.lastrosPorPallet} unidades
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {createMutation.isPending || updateMutation.isPending ? 
                    "Salvando..." : 
                    (editingProduct ? "Atualizar" : "Criar")
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}