import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Check, Trash2, Package, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ProductModal from "@/components/product-modal";
import { supabase } from "@/lib/supabase";
import { saveCurrentCount, getCurrentCount, clearCurrentCount } from "@/lib/localStorage";
import type { InsertContagem, InsertItemContagem, ContagemWithItens } from "@shared/schema";
import { useCountDate } from "@/hooks/use-count-date";
import { useUnfinishedCount } from "@/hooks/use-counts";

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
  const [searchQuery, setSearchQuery] = useState("");
  const addButtonRef = useRef<HTMLButtonElement>(null);

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
    }
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ item }: { item: InsertItemContagem }) => {
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
    }
  });

  const calculateProductTotal = (product: ProductItem): number => {
    let totalUnidades = product.unidades || 0;
    let totalPacotes = product.pacotes || 0;

    if (product.pacotesPorLastro) {
      totalPacotes += (product.lastros || 0) * product.pacotesPorLastro;
      if (product.lastrosPorPallet) {
        totalPacotes += (product.pallets || 0) * product.lastrosPorPallet * product.pacotesPorLastro;
      }
    }

    if (product.unidadesPorPacote) {
      totalUnidades += totalPacotes * product.unidadesPorPacote;
    }

    return totalUnidades;
  };

  const calculateTotalPacotes = (product: ProductItem): number => {
    let totalPacotes = product.pacotes || 0;

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

  const handleAddProduct = useCallback((productData: Omit<ProductItem, 'totalPacotes'>) => {
    const totalPacotes = calculateProductPackages(productData);
    const newProduct: ProductItem = { ...productData, totalPacotes };
    const newProducts = [...products, newProduct];
    setProducts(newProducts);
    if (!contagemId) {
      saveCurrentCount({ date: countDate || "", products: newProducts });
    }
    setIsProductModalOpen(false);
    
    toast({
      title: "✅ Produto adicionado",
      description: (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{productData.nome}</span>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>Pallets: {productData.pallets || 0}</span>
            <span>Lastros: {productData.lastros || 0}</span>
            <span>Pacotes: {productData.pacotes || 0}</span>
          </div>
        </div>
      ),
      duration: 2000
    });
  }, [products, countDate, contagemId]);

  const handleRemoveProduct = useCallback((index: number) => {
    const productToRemove = products[index];
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    if (!contagemId) {
      saveCurrentCount({ date: countDate || "", products: newProducts });
    }
    
    toast({
      title: "🗑️ Produto removido",
      description: `${productToRemove.nome} foi removido da contagem`,
      variant: "destructive",
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            const restoredProducts = [...products];
            setProducts(restoredProducts);
            if (!contagemId) {
              saveCurrentCount({ date: countDate || "", products: restoredProducts });
            }
            toast({ title: "✅ Ação desfeita", description: "O produto foi restaurado." });
          }}
        >
          Desfazer
        </Button>
      ),
      duration: 5000
    });
  }, [products, countDate, contagemId]);

  const handleFinalizeCount = async () => {
    if (!countDate) {
      toast({ title: "Data não selecionada", description: "Por favor, selecione a data da contagem.", variant: "destructive" });
      return;
    }
    
    if (contagemId) {
      const { error } = await supabase
        .from('contagens')
        .update({ finalizada: true, data: countDate })
        .eq('id', contagemId);
      
      if (error) {
        console.error('Erro ao finalizar contagem:', error);
        toast({ title: "Erro", description: "Falha ao finalizar a contagem.", variant: "destructive" });
        return;
      }
      
      await addItemsToCount(contagemId);
    } else {
      createCountMutation.mutate({ data: countDate, finalizada: true });
    }
  };

  const handleDateChange = useCallback((newDate: string) => {
    setCountDate(newDate);
    if (!contagemId) {
      saveCurrentCount({ date: newDate, products: products });
    }
  }, [contagemId, products, setCountDate]);

  const filteredProducts = searchQuery
    ? products.filter((product) => 
        product.nome.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => setLocation("/")} className="w-full sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>

        <div className="w-full sm:w-64 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <div className="text-right">
            <Label htmlFor="count-date" className="block text-sm font-medium text-gray-700 mb-1">
              Data da Contagem
            </Label>
            <Input
              id="count-date"
              type="date"
              value={countDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={addButtonRef}
                  onClick={() => setIsProductModalOpen(true)}
                  className="mt-6 h-10"
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pressione <Badge variant="outline" className="mx-1">Ctrl</Badge> + <Badge variant="outline" className="mx-1">Enter</Badge> para adicionar rapidamente</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto adicionado'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery 
              ? 'Tente ajustar sua busca ou adicione um novo produto.'
              : 'Comece adicionando seu primeiro produto à contagem.'}
          </p>
          <div className="mt-6">
            <Button onClick={() => setIsProductModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> 
              {searchQuery ? 'Adicionar Novo Produto' : 'Adicionar Produto'}
            </Button>
            {searchQuery && (
              <Button 
                variant="outline" 
                className="ml-2"
                onClick={() => setSearchQuery('')}
              >
                <X className="mr-2 h-4 w-4" /> Limpar busca
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Produtos</h2>
              <p className="text-sm text-muted-foreground">
                {products.length} {products.length === 1 ? 'produto' : 'produtos'} na contagem
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {searchQuery && (
                <p className="text-sm text-muted-foreground">
                  {filteredProducts.length} de {products.length} produtos encontrados
                </p>
              )}
              <Button 
                onClick={() => setIsProductModalOpen(true)}
                className="hidden sm:flex"
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredProducts.map((product, index) => (
              <div key={`${product.id}-${index}`} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{product.nome}</h3>
                    {product.quantidadePacsPorPallet && (
                      <p className="text-sm text-muted-foreground">
                        {product.quantidadePacsPorPallet} pacotes/pallet
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveProduct(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pallets</p>
                    <p className="font-medium">{product.pallets || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Lastros</p>
                    <p className="font-medium">{product.lastros || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pacotes</p>
                    <p className="font-medium">{product.pacotes || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Unidades</p>
                    <p className="font-medium">{product.unidades || 0}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-amber-800">Total Pacotes</p>
                      <p className="text-lg font-bold text-amber-900">
                        {calculateTotalPacotes(product).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-green-800">Total Unidades</p>
                      <p className="text-lg font-bold text-green-900">
                        {calculateProductTotal(product).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t pt-4 pb-6 -mx-4 px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {products.length} {products.length === 1 ? 'produto' : 'produtos'} na contagem • 
              {filteredProducts.length < products.length && (
                <>
                  {' '}Mostrando {filteredProducts.length} de {products.length} produtos
                </>
              )}
            </div>
            <Button 
              onClick={handleFinalizeCount} 
              disabled={!countDate || createCountMutation.isPending}
              className="w-full sm:w-auto"
              size="lg"
            >
              {createCountMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
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
      )}

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onAddProduct={handleAddProduct}
      />
    </div>
  );
}
