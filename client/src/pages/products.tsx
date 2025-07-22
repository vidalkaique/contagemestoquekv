import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit, Trash2, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useProducts, useCreateProduct } from "@/hooks/use-products";
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

  const { data: produtos = [], isLoading } = useProducts();
  const createMutation = useCreateProduct();

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProduto> }) => {
      // Mapeia os dados do formulário (camelCase) para o formato do banco (snake_case)
      const dataToUpdate = {
        codigo: data.codigo,
        nome: data.nome,
        unidades_por_pacote: data.unidadesPorPacote,
        pacotes_por_lastro: data.pacotesPorLastro,
        lastros_por_pallet: data.lastrosPorPallet,
        // Recalcula o valor aqui para garantir que esteja sempre correto
        quantidade_pacs_por_pallet: (data.pacotesPorLastro !== undefined && data.lastrosPorPallet !== undefined)
          ? data.pacotesPorLastro * data.lastrosPorPallet
          : undefined,
      };

      // Remove chaves indefinidas para não enviar campos vazios na atualização
      Object.keys(dataToUpdate).forEach(key => (dataToUpdate as any)[key] === undefined && delete (dataToUpdate as any)[key]);

      const { data: updatedProduct, error } = await supabase
        .from("produtos")
        .update(dataToUpdate)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updatedProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
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
      const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
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
    return produto.nome.toLowerCase().includes(query) || produto.codigo.toLowerCase().includes(query);
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

    const data = {
      ...formData,
      unidadesPorPacote: Math.max(0, Number(formData.unidadesPorPacote)),
      pacotesPorLastro: Math.max(0, Number(formData.pacotesPorLastro)),
      lastrosPorPallet: Math.max(0, Number(formData.lastrosPorPallet)),
      quantidadePacsPorPallet: Math.max(0, Number(formData.pacotesPorLastro)) * Math.max(0, Number(formData.lastrosPorPallet)),
      ativo: true,
      updatedAt: new Date(),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          resetForm();
          toast({
            title: "Produto criado",
            description: "Novo produto adicionado com sucesso",
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
    }
  };

  const calculateTotalUnits = (produto: Produto) => {
    return (
      (Number(produto.unidadesPorPacote) || 0) *
      (Number(produto.pacotesPorLastro) || 0) *
      (Number(produto.lastrosPorPallet) || 0)
    );
  };

  return (
    <>
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Gestão de Produtos</h1>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={18} className="mr-2" />
            Novo Produto
          </Button>
        </header>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        </div>

        <div className="mt-6 bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
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
            <div className="text-center py-10">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchQuery ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery ? "Tente buscar com outros termos" : "Adicione seu primeiro produto"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((produto) => (
                <div key={produto.id} className="bg-white border border-gray-200 rounded-lg p-4 transition-shadow hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{produto.nome}</h3>
                      <p className="text-sm text-gray-500">Código: {produto.codigo}</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(produto)} className="text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                        <Edit size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(produto.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Un/Pacote</p>
                        <p className="font-medium text-sm text-gray-800">{produto.unidadesPorPacote}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pac/Lastro</p>
                        <p className="font-medium text-sm text-gray-800">{produto.pacotesPorLastro}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Lastro/Pallet</p>
                        <p className="font-medium text-sm text-gray-800">{produto.lastrosPorPallet}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pacotes/Pallet</p>
                        <p className="font-medium text-sm text-gray-800">{produto.quantidadePacsPorPallet}</p>
                      </div>
                    </div>
                    <div className="mt-4 bg-emerald-50 text-emerald-800 rounded-md p-2 text-center">
                      <p className="text-xs font-semibold">
                        Total de {calculateTotalUnits(produto)} unidades por pallet
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Formulário de Criar/Editar Produto (Modal) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
            <h2 className="text-xl font-bold mb-4">{editingProduct ? "Editar Produto" : "Novo Produto"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Código do Produto *
                </Label>
                <Input
                  type="text"
                  placeholder="Digite o Código do Produto"
                  value={formData.codigo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, codigo: e.target.value }))}
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
                  placeholder="Digite o Nome do Produto"
                  value={formData.nome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                  className="w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Un/Pacote
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.unidadesPorPacote}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData((prev) => ({ ...prev, unidadesPorPacote: value }));
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Pac/Lastro
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.pacotesPorLastro}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData((prev) => ({ ...prev, pacotesPorLastro: value }));
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Lastro/Pallet
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.lastrosPorPallet}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData((prev) => ({ ...prev, lastrosPorPallet: value }));
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-emerald-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-emerald-800">Pacotes por pallet:</p>
                  <p className="text-sm font-bold text-emerald-900">{formData.pacotesPorLastro * formData.lastrosPorPallet}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-emerald-800">Total de unidades por pallet:</p>
                  <p className="text-sm font-bold text-emerald-900">
                    {formData.unidadesPorPacote * formData.pacotesPorLastro * formData.lastrosPorPallet}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingProduct ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}