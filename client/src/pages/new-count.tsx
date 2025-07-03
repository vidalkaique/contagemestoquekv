import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Plus, Check, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductModal from "@/components/product-modal";
import SuccessModal from "@/components/success-modal";
import { apiRequest } from "@/lib/queryClient";
import { saveCurrentCount, getCurrentCount, clearCurrentCount } from "@/lib/localStorage";
import type { InsertContagem, InsertItemContagem, ContagemWithItens } from "@shared/schema";
import { useCountDate } from "@/hooks/use-count-date";

interface ProductItem {
  id: string;
  nome: string;
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
  // Dados do produto para cálculo
  unidadesPorPacote?: number;
  pacotesPorLastro?: number;
  lastrosPorPallet?: number;
}

export default function NewCount() {
  const [, setLocation] = useLocation();
  const { id: contagemId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { countDate, setCountDate } = useCountDate();
  
  // Buscar dados da contagem se existir
  const { data: contagem } = useQuery<ContagemWithItens>({
    queryKey: ["/api/contagens", contagemId],
    enabled: !!contagemId,
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    // Se tiver contagem, usar os itens dela
    if (contagem) {
      return contagem.itens.map(item => ({
        id: item.produto?.id || crypto.randomUUID(),
        nome: item.produto?.nome || item.nomeLivre || "",
        pallets: item.pallets,
        lastros: item.lastros,
        pacotes: item.pacotes,
        unidades: item.unidades,
        unidadesPorPacote: item.produto?.unidadesPorPacote,
        pacotesPorLastro: item.produto?.pacotesPorLastro,
        lastrosPorPallet: item.produto?.lastrosPorPallet,
      }));
    }
    // Se não, tentar carregar do localStorage
    const saved = getCurrentCount();
    return saved?.products || [];
  });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Atualizar estado quando a contagem for carregada
  useEffect(() => {
    if (contagem?.data) {
      try {
        console.log('Data da contagem do banco:', contagem.data);
        // Para contagens existentes, sempre usa a data do banco
        const [ano, mes, dia] = contagem.data.split('-');
        const formattedDate = `${ano}-${mes}-${dia}`;
        console.log('Data formatada:', formattedDate);
        setCountDate(formattedDate);
        setProducts(contagem.itens.map(item => ({
          id: item.produto?.id || crypto.randomUUID(),
          nome: item.produto?.nome || item.nomeLivre || "",
          pallets: item.pallets,
          lastros: item.lastros,
          pacotes: item.pacotes,
          unidades: item.unidades,
          unidadesPorPacote: item.produto?.unidadesPorPacote,
          pacotesPorLastro: item.produto?.pacotesPorLastro,
          lastrosPorPallet: item.produto?.lastrosPorPallet,
        })));
      } catch (error) {
        console.error("Erro ao carregar data:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar data da contagem",
          variant: "destructive",
        });
      }
    }
  }, [contagem, toast, setCountDate]);

  const createCountMutation = useMutation({
    mutationFn: async (data: InsertContagem) => {
      const response = await apiRequest("POST", "/api/contagens", data);
      return response.json();
    },
    onSuccess: (contagem) => {
      // Add items to the count
      addItemsToCount(contagem.id);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar contagem",
        variant: "destructive",
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ contagemId, item }: { contagemId: string; item: InsertItemContagem }) => {
      const response = await apiRequest("POST", `/api/contagens/${contagemId}/itens`, item);
      return response.json();
    },
  });

  const addItemsToCount = async (contagemId: string) => {
    try {
      for (const product of products) {
        // Se o produto tem um ID válido (não é um UUID gerado localmente), é um produto cadastrado
        const isProdutoCadastrado = product.id && product.id.length > 10;

        // Calcular o total
        let total = 0;
        if (product.unidadesPorPacote && product.pacotesPorLastro && product.lastrosPorPallet) {
          const totalUnitsPerPallet = product.unidadesPorPacote * product.pacotesPorLastro * product.lastrosPorPallet;
          total = (product.pallets || 0) * totalUnitsPerPallet +
                 (product.lastros || 0) * (product.unidadesPorPacote * product.pacotesPorLastro) +
                 (product.pacotes || 0) * product.unidadesPorPacote +
                 (product.unidades || 0);
        } else {
          // Se não tem configuração de produto, soma direta
          total = (product.pallets || 0) + (product.lastros || 0) + (product.pacotes || 0) + (product.unidades || 0);
        }

        await addItemMutation.mutateAsync({
          contagemId,
          item: {
            contagem_id: contagemId,
            produto_id: isProdutoCadastrado ? product.id : undefined,
            nome_livre: !isProdutoCadastrado ? product.nome : undefined,
            pallets: product.pallets,
            lastros: product.lastros,
            pacotes: product.pacotes,
            unidades: product.unidades
          },
        });
      }

      // Marcar contagem como finalizada
      await apiRequest("PUT", `/api/contagens/${contagemId}`, {
        finalizada: true
      });
      
      // Clear local storage and show success
      clearCurrentCount();
      queryClient.invalidateQueries({ queryKey: ["/api/contagens"] });
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error("Erro ao adicionar itens:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar produtos à contagem",
        variant: "destructive",
      });
    }
  };

  const handleAddProduct = (product: ProductItem) => {
    const newProducts = [...products, product];
    setProducts(newProducts);
    // Só salva no localStorage se for uma nova contagem
    if (!contagemId) {
      saveCurrentCount({
        date: countDate || "",
        products: newProducts,
      });
    }
    setIsProductModalOpen(false);
    
    toast({
      title: "Produto adicionado",
      description: `${product.nome} foi adicionado à contagem`,
    });
  };

  const handleRemoveProduct = (index: number) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    // Só salva no localStorage se for uma nova contagem
    if (!contagemId) {
      saveCurrentCount({
        date: countDate || "",
        products: newProducts,
      });
    }
    
    toast({
      title: "Produto removido",
      description: "Produto foi removido da contagem",
    });
  };

  const handleFinalizeCount = () => {
    if (products.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à contagem",
        variant: "destructive",
      });
      return;
    }

    // Se já tem ID, apenas adicionar os itens
    if (contagemId) {
      addItemsToCount(contagemId);
      return;
    }

    // Se não tem ID, criar nova contagem
    if (!countDate) {
      toast({
        title: "Erro",
        description: "Selecione uma data para a contagem",
        variant: "destructive",
      });
      return;
    }

    console.log('Data sendo enviada na finalização:', countDate);
    createCountMutation.mutate({
      data: countDate,
      finalizada: false
    });
  };

  const handleDateChange = (newDate: string) => {
    console.log('Nova data selecionada:', newDate);
    if (!newDate) {
      toast({
        title: "Erro",
        description: "Selecione uma data válida",
        variant: "destructive",
      });
      return;
    }

    setCountDate(newDate);
  };

  const calculateProductTotal = (product: ProductItem): number => {
    if (!product.unidadesPorPacote || !product.pacotesPorLastro || !product.lastrosPorPallet) {
      return 0;
    }
    
    const totalUnitsPerPallet = product.unidadesPorPacote * product.pacotesPorLastro * product.lastrosPorPallet;
    const totalUnitsFromPallets = product.pallets * totalUnitsPerPallet;
    const totalUnitsFromLastros = product.lastros * (product.unidadesPorPacote * product.pacotesPorLastro);
    const totalUnitsFromPacotes = product.pacotes * product.unidadesPorPacote;
    const totalUnitsFromUnidades = product.unidades;
    
    return totalUnitsFromPallets + totalUnitsFromLastros + totalUnitsFromPacotes + totalUnitsFromUnidades;
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/start-count")}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="text-gray-600" size={20} />
        </Button>
        <h2 className="text-lg font-semibold text-gray-900 ml-3">
          {contagemId ? "Continuar Contagem" : "Nova Contagem"}
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Date Selection */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Data da Contagem
          </Label>
          <Input
            type="date"
            value={countDate || ""}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full"
            disabled={!!contagemId}
            placeholder="dd/mm/aaaa"
            min="2020-01-01"
            max="2030-12-31"
          />
        </div>

        {/* Add Product Button */}
        <Button
          onClick={() => setIsProductModalOpen(true)}
          className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg flex items-center justify-center font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="mr-2" size={20} />
          Adicionar Produto
        </Button>

        {/* Products List */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Produtos Adicionados
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs ml-2">
              {products.length}
            </span>
          </h3>
          
          {products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Nenhum produto adicionado ainda</p>
              <p className="text-xs">Clique em "Adicionar Produto" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{product.nome}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProduct(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Pallets:</span>
                      <span className="font-medium ml-1">{product.pallets}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Lastros:</span>
                      <span className="font-medium ml-1">{product.lastros}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Pacotes:</span>
                      <span className="font-medium ml-1">{product.pacotes}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Unidades:</span>
                      <span className="font-medium ml-1">{product.unidades}</span>
                    </div>
                  </div>
                  
                  {/* Total de Unidades */}
                  {calculateProductTotal(product) > 0 && (
                    <div className="bg-red-50 p-2 rounded-md">
                      <div className="text-sm font-medium text-red-900">
                        Total: {calculateProductTotal(product).toLocaleString()} unidades
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Finalize Button */}
        {products.length > 0 && (
          <div className="pt-4">
            <Button
              onClick={handleFinalizeCount}
              disabled={createCountMutation.isPending}
              className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              {createCountMutation.isPending ? (
                "Finalizando..."
              ) : (
                <>
                  <Check className="mr-2" size={20} />
                  Finalizar Contagem
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onAddProduct={handleAddProduct}
      />

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setLocation("/");
        }}
        countId={contagemId}
      />
    </>
  );
}
