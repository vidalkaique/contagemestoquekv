import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, Check, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductModal from "@/components/product-modal";
import { ProductItemEdit } from "@/components/product-item-edit";
import { supabase } from "@/lib/supabase";
import { saveCurrentCount, getCurrentCount, clearCurrentCount } from "@/lib/localStorage";
import type { InsertContagem, InsertItemContagem, ContagemWithItens } from "@shared/schema";
import { useCountDate } from "@/hooks/use-count-date";
import { useUnfinishedCount } from "@/hooks/use-counts";
import { useDebounce } from "@/hooks/use-debounce";

interface ProductItem {
  id: string;
  nome: string;
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
  totalPacotes: number; 
  unidadesPorPacote?: number;
  pacotesPorLastro?: number;
  lastrosPorPallet?: number;
  quantidadePacsPorPallet?: number;
}

export default function NewCount() {
  const [, setLocation] = useLocation();
  const { id: contagemId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { countDate, setCountDate } = useCountDate();
  
  const { data: unfinishedCount } = useUnfinishedCount();

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [activeTab, setActiveTab] = useState("todos");



  const calculateProductPackages = (product: Omit<ProductItem, 'totalPacotes'>): number => {
    const pacotesPorLastro = product.pacotesPorLastro || 0;
    const lastrosPorPallet = product.lastrosPorPallet || 0;
    const totalFromPallets = product.pallets * lastrosPorPallet * pacotesPorLastro;
    const totalFromLastros = product.lastros * pacotesPorLastro;
    return totalFromPallets + totalFromLastros + product.pacotes;
  };

  useEffect(() => {
    if (isLoaded) return;

    if (unfinishedCount) {
      setCountDate(unfinishedCount.data);
      const productsWithTotals = unfinishedCount.itens.map(item => {
        const productData = {
          id: item.produto?.id || crypto.randomUUID(),
          nome: item.produto?.nome || item.nomeLivre || "",
          pallets: item.pallets,
          lastros: item.lastros,
          pacotes: item.pacotes,
          unidades: item.unidades,
          unidadesPorPacote: item.produto?.unidadesPorPacote,
          pacotesPorLastro: item.produto?.pacotesPorLastro,
          lastrosPorPallet: item.produto?.lastrosPorPallet,
          quantidadePacsPorPallet: item.produto?.quantidadePacsPorPallet ?? undefined,
        };
        return {
          ...productData,
          totalPacotes: calculateProductPackages(productData)
        };
      });
      setProducts(productsWithTotals);
      setIsLoaded(true);
    } else if (!contagemId) {
      const savedCount = getCurrentCount();
      if (savedCount && savedCount.products) {
        setCountDate(savedCount.date);
        const productsWithTotals = savedCount.products.map((p: any) => ({
          ...p,
          totalPacotes: p.totalPacotes ?? calculateProductPackages(p),
        }));
        setProducts(productsWithTotals);
        setIsLoaded(true);
      }
    }
  }, [unfinishedCount, setCountDate, isLoaded, contagemId]);

  useEffect(() => {
    // Salva a contagem no localStorage apenas se for uma nova contagem (sem ID na URL ou contagem não finalizada do banco)
    if (products.length > 0 && !contagemId && !unfinishedCount) {
      saveCurrentCount({ date: countDate, products });
    }
  }, [products, countDate, contagemId, unfinishedCount]);

  const createCountMutation = useMutation({
    mutationFn: async ({ data, finalizada }: { data: string; finalizada: boolean }) => {
      const { data: contagem, error } = await supabase
        .from('contagens')
        .insert([{ data, finalizada }])
        .select()
        .single();
      if (error) throw error;
      return contagem;
    },
    onSuccess: (contagem) => {
      addItemsToCount(contagem.id);
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao criar contagem", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ item }: { item: InsertItemContagem }) => {
      // Converte para snake_case conforme as colunas reais do banco de dados
      const dbItem: any = {
        contagem_id: item.contagemId,
        produto_id: item.produtoId,
        nome_livre: item.nomeLivre,
        pallets: item.pallets,
        lastros: item.lastros,
        pacotes: item.pacotes,
        unidades: item.unidades,
        total: item.total,
        total_pacotes: item.totalPacotes,
      };
      const { data, error } = await supabase.from('itens_contagem').insert(dbItem).select().single();
      if (error) throw error;
      return data;
    },
  });

    const calculateProductTotal = (product: ProductItem): number => {
    let totalUnidades = product.unidades || 0;
    let totalPacotes = product.pacotes || 0;

    // Converte lastros e pallets para pacotes
    if (product.pacotesPorLastro) {
      totalPacotes += (product.lastros || 0) * product.pacotesPorLastro;
      if (product.lastrosPorPallet) {
        totalPacotes += (product.pallets || 0) * product.lastrosPorPallet * product.pacotesPorLastro;
      }
    }

    // Converte o total de pacotes para unidades
    if (product.unidadesPorPacote) {
      totalUnidades += totalPacotes * product.unidadesPorPacote;
    }

    return totalUnidades;
  };

  const calculateTotalPacotes = (product: ProductItem): number => {
    let totalPacotes = product.pacotes || 0;

    // Converte lastros e pallets para pacotes
    if (product.pacotesPorLastro) {
      totalPacotes += (product.lastros || 0) * product.pacotesPorLastro;
      if (product.lastrosPorPallet) {
        totalPacotes += (product.pallets || 0) * product.lastrosPorPallet * product.pacotesPorLastro;
      }
    }

    return totalPacotes;
  };

  const addItemsToCount = async (newContagemId: string) => {
    try {
      for (const product of products) {
        const isProdutoCadastrado = !product.id.startsWith('free-');
        const total = calculateProductTotal(product);
        const totalPacotes = calculateTotalPacotes(product);

        await addItemMutation.mutateAsync({
          item: {
            contagemId: newContagemId,
            produtoId: isProdutoCadastrado ? product.id : undefined,
            nomeLivre: !isProdutoCadastrado ? product.nome : undefined,
            pallets: product.pallets,
            lastros: product.lastros,
            pacotes: product.pacotes,
            unidades: product.unidades,
            total: total,
            totalPacotes: product.totalPacotes,
          },
        });
      }
      clearCurrentCount();
      queryClient.invalidateQueries({ queryKey: ["/api/contagens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contagens/unfinished"] });
      setLocation(`/count/${newContagemId}/success`);
    } catch (error) {
      console.error("Erro ao adicionar itens:", error);
      toast({ title: "Erro", description: "Falha ao salvar os itens da contagem.", variant: "destructive" });
    }
  };

  const handleAddProduct = (productData: Omit<ProductItem, 'totalPacotes'>) => {
    const totalPacotes = calculateProductPackages(productData);
    const newProduct: ProductItem = { ...productData, totalPacotes };
    
    // Verifica se o produto já existe na lista
    const existingProductIndex = products.findIndex(p => p.id === productData.id);
    
    let newProducts;
    if (existingProductIndex >= 0) {
      // Se o produto já existe, atualiza as quantidades
      newProducts = [...products];
      const existingProduct = newProducts[existingProductIndex];
      newProducts[existingProductIndex] = {
        ...existingProduct,
        pallets: existingProduct.pallets + productData.pallets,
        lastros: existingProduct.lastros + productData.lastros,
        pacotes: existingProduct.pacotes + productData.pacotes,
        unidades: existingProduct.unidades + productData.unidades,
        totalPacotes: calculateProductPackages({
          ...existingProduct,
          pallets: existingProduct.pallets + productData.pallets,
          lastros: existingProduct.lastros + productData.lastros,
          pacotes: existingProduct.pacotes + productData.pacotes,
          unidades: existingProduct.unidades + productData.unidades,
        })
      };
      
      toast({ 
        title: "Quantidade atualizada", 
        description: `Quantidade de ${productData.nome} foi atualizada.` 
      });
    } else {
      // Se é um novo produto, adiciona à lista
      newProducts = [...products, newProduct];
      toast({ 
        title: "Produto adicionado", 
        description: `${productData.nome} foi adicionado à contagem` 
      });
    }
    
    setProducts(newProducts);
    if (!contagemId) {
      saveCurrentCount({ date: countDate || "", products: newProducts });
    }
    setIsProductModalOpen(false);
  };

  const handleRemoveProduct = (index: number) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    if (!contagemId) {
      saveCurrentCount({ date: countDate || "", products: newProducts });
    }
    toast({ title: "Produto removido", description: "O produto foi removido da contagem.", variant: "destructive" });
  };

  const handleFinalizeCount = async () => {
    if (!countDate) {
      toast({ title: "Data não selecionada", description: "Por favor, selecione a data da contagem.", variant: "destructive" });
      return;
    }
    
    if (contagemId) {
      // Se já temos um ID de contagem, apenas atualizamos para finalizada
      const { error } = await supabase
        .from('contagens')
        .update({ finalizada: true, data: countDate })
        .eq('id', contagemId);
      
      if (error) {
        console.error('Erro ao finalizar contagem:', error);
        toast({ title: "Erro", description: "Falha ao finalizar a contagem.", variant: "destructive" });
        return;
      }
      
      // Adiciona os itens e redireciona
      await addItemsToCount(contagemId);
    } else {
      // Se não temos um ID (fluxo antigo), mantemos o comportamento atual
      createCountMutation.mutate({ data: countDate, finalizada: true });
    }
  };

  const handleDateChange = (newDate: string) => {
    setCountDate(newDate);
    if (!contagemId) {
      saveCurrentCount({ date: newDate, products: products });
    }
  };

  // Filtra produtos com base no termo de busca
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm) return products;
    const searchLower = debouncedSearchTerm.toLowerCase();
    return products.filter(product => 
      product.nome.toLowerCase().includes(searchLower) ||
      (product.id && product.id.toLowerCase().includes(searchLower))
    );
  }, [products, debouncedSearchTerm]);

  // Calcula totais gerais
  const totalUnidades = useMemo(() => {
    return products.reduce((sum, product) => sum + calculateProductTotal(product), 0);
  }, [products]);

  const totalPacotes = useMemo(() => {
    return products.reduce((sum, product) => sum + (product.totalPacotes || 0), 0);
  }, [products]);

  const updateProduct = (index: number, updatedProduct: ProductItem) => {
    const newProducts = [...products];
    newProducts[index] = updatedProduct;
    setProducts(newProducts);
    if (!contagemId) {
      saveCurrentCount({ date: countDate || "", products: newProducts });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-bold ml-2">
              {contagemId ? `Contagem #${contagemId}` : "Nova Contagem"}
            </h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Input 
                type="date" 
                value={countDate} 
                onChange={(e) => handleDateChange(e.target.value)} 
                className="h-10"
              />
            </div>
          </div>
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="completo">Completo</TabsTrigger>
              <TabsTrigger value="rapido">Rápido</TabsTrigger>
            </TabsList>
            
            <Button 
              onClick={() => setIsProductModalOpen(true)} 
              className="ml-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Produto
            </Button>
          </div>

          <TabsContent value="todos" className="space-y-4">
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum produto encontrado</h3>
                  <p className="text-sm text-gray-500">
                    {searchTerm 
                      ? "Nenhum produto corresponde à sua busca." 
                      : "Adicione produtos para começar a contagem."}
                  </p>
                  <Button 
                    onClick={() => setIsProductModalOpen(true)} 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Produto
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((product, index) => (
                  <ProductItemEdit
                    key={product.id}
                    product={product}
                    onSave={(updatedProduct) => {
                      updateProduct(
                        products.findIndex(p => p.id === updatedProduct.id),
                        updatedProduct
                      );
                    }}
                    onRemove={() => handleRemoveProduct(index)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completo">
            <div className="space-y-3">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, index) => (
                  <ProductItemEdit
                    key={product.id}
                    product={product}
                    onSave={(updatedProduct) => {
                      updateProduct(
                        products.findIndex(p => p.id === updatedProduct.id),
                        updatedProduct
                      );
                    }}
                    onRemove={() => handleRemoveProduct(index)}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum produto encontrado</h3>
                    <p className="text-sm text-gray-500">
                      {searchTerm 
                        ? "Nenhum produto corresponde à sua busca." 
                        : "Adicione produtos para começar a contagem."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="rapido">
            <Card>
              <CardHeader>
                <CardTitle>Modo Rápido</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Digite o código de barras ou nome do produto e pressione Enter
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type="text"
                      placeholder="Digite o código ou nome do produto..."
                      className="pl-10 h-12 text-base"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          // Aqui você pode adicionar a lógica para adicionar rapidamente um produto
                          // por exemplo, abrindo o modal com o termo de busca preenchido
                          setSearchTerm(e.currentTarget.value);
                          setIsProductModalOpen(true);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Atalhos Rápidos</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs mr-2">F1</kbd>
                        <span>Novo Produto</span>
                      </div>
                      <div className="flex items-center">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs mr-2">Esc</kbd>
                        <span>Cancelar</span>
                      </div>
                      <div className="flex items-center">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs mr-2">↑↓</kbd>
                        <span>Navegar</span>
                      </div>
                      <div className="flex items-center">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs mr-2">Enter</kbd>
                        <span>Selecionar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 bg-white border-t py-4 mt-6 -mx-4 px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <div>Total de itens: <span className="font-medium">{products.length}</span></div>
              <div>Total de pacotes: <span className="font-medium">{totalPacotes.toLocaleString()}</span></div>
              <div>Total de unidades: <span className="font-medium">{totalUnidades.toLocaleString()}</span></div>
            </div>
            
            <div className="flex space-x-3 w-full md:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/")}
                className="flex-1 md:flex-none"
              >
                Voltar
              </Button>
              
              <Button 
                onClick={handleFinalizeCount} 
                disabled={createCountMutation.isPending || products.length === 0}
                className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {createCountMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Finalizar Contagem
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => {
          setIsProductModalOpen(false);
          setSearchTerm("");
        }} 
        onAddProduct={handleAddProduct} 
        initialSearchTerm={searchTerm}
      />
    </div>
  );
}
