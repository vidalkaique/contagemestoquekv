import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Check, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    if (!product.unidadesPorPacote || !product.pacotesPorLastro || !product.lastrosPorPallet) return 0;
    const pacotesPorLastro = product.pacotesPorLastro;
    const lastrosPorPallet = product.lastrosPorPallet;
    const unidadesPorPacote = product.unidadesPorPacote;
    const totalFromPallets = product.pallets * lastrosPorPallet * pacotesPorLastro * unidadesPorPacote;
    const totalFromLastros = product.lastros * pacotesPorLastro * unidadesPorPacote;
    const totalFromPacotes = product.pacotes * unidadesPorPacote;
    return totalFromPallets + totalFromLastros + totalFromPacotes + product.unidades;
  };

  const addItemsToCount = async (newContagemId: string) => {
    try {
      for (const product of products) {
        const isProdutoCadastrado = !product.id.includes('-');
        const total = isProdutoCadastrado ? calculateProductTotal(product) : (product.pallets || 0) + (product.lastros || 0) + (product.pacotes || 0) + (product.unidades || 0);
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
      setLocation(`/contagem/${newContagemId}/sucesso`);
    } catch (error) {
      console.error("Erro ao adicionar itens:", error);
      toast({ title: "Erro", description: "Falha ao salvar os itens da contagem.", variant: "destructive" });
    }
  };

  const handleAddProduct = (productData: Omit<ProductItem, 'totalPacotes'>) => {
    const totalPacotes = calculateProductPackages(productData);
    const newProduct: ProductItem = { ...productData, totalPacotes };
    const newProducts = [...products, newProduct];
    setProducts(newProducts);
    if (!contagemId) {
      saveCurrentCount({ date: countDate || "", products: newProducts });
    }
    setIsProductModalOpen(false);
    toast({ title: "Produto adicionado", description: `${productData.nome} foi adicionado à contagem` });
  };

  const handleRemoveProduct = (index: number) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    if (!contagemId) {
      saveCurrentCount({ date: countDate || "", products: newProducts });
    }
    toast({ title: "Produto removido", description: "O produto foi removido da contagem.", variant: "destructive" });
  };

  const handleFinalizeCount = () => {
    if (!countDate) {
      toast({ title: "Data não selecionada", description: "Por favor, selecione a data da contagem.", variant: "destructive" });
      return;
    }
    createCountMutation.mutate({ data: countDate, finalizada: true });
  };

  const handleDateChange = (newDate: string) => {
    setCountDate(newDate);
    if (!contagemId) {
      saveCurrentCount({ date: newDate, products: products });
    }
  };

  return (
    <>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold ml-2">
            {contagemId ? `Contagem #${contagemId}` : "Nova Contagem"}
          </h1>
        </div>

        <div className="mb-4">
          <Label htmlFor="count-date">Data da Contagem</Label>
          <Input id="count-date" type="date" value={countDate} onChange={(e) => handleDateChange(e.target.value)} className="mt-1" />
        </div>

        <Button onClick={() => setIsProductModalOpen(true)} className="w-full mb-4">
          <Plus className="mr-2" size={20} />
          Adicionar Produto
        </Button>

        {products.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Package size={48} className="mx-auto mb-2" />
            <p>Nenhum produto adicionado ainda.</p>
            <p className="text-sm">Clique em "Adicionar Produto" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => (
              <div key={product.id} className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg flex-1 pr-2">{product.nome}</h3>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(index)}>
                    <Trash2 className="text-red-500" size={20} />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                  <div><span className="text-gray-500">Pallets:</span><span className="font-medium ml-1">{product.pallets}</span></div>
                  <div><span className="text-gray-500">Lastros:</span><span className="font-medium ml-1">{product.lastros}</span></div>
                  <div><span className="text-gray-500">Pacotes:</span><span className="font-medium ml-1">{product.pacotes}</span></div>
                  <div><span className="text-gray-500">Unidades:</span><span className="font-medium ml-1">{product.unidades}</span></div>
                </div>

                {(product.unidadesPorPacote || product.pacotesPorLastro || product.lastrosPorPallet || product.quantidadePacsPorPallet) && (
                  <div className="border-t pt-3 mt-3 text-xs text-gray-600">
                    <p className="font-semibold mb-2">Detalhes do Produto:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {product.unidadesPorPacote && <div>Un/Pacote: <span className="font-bold">{product.unidadesPorPacote}</span></div>}
                      {product.pacotesPorLastro && <div>Pac/Lastro: <span className="font-bold">{product.pacotesPorLastro}</span></div>}
                      {product.lastrosPorPallet && <div>Lastro/Pallet: <span className="font-bold">{product.lastrosPorPallet}</span></div>}
                      {(product.pacotesPorLastro && product.lastrosPorPallet) && 
                        <div>Pacotes/Pallet: <span className="font-bold">{product.quantidadePacsPorPallet ?? (product.pacotesPorLastro * product.lastrosPorPallet)}</span></div>
                      }
                    </div>
                  </div>
                )}
                
                {(calculateProductTotal(product) > 0 || product.totalPacotes > 0) && (
                  <div className="bg-red-50 p-3 rounded-lg mt-3 text-center">
                    <div className="text-sm font-medium text-red-900">Total Unidades: <span className="font-bold">{calculateProductTotal(product).toLocaleString()}</span></div>
                    <div className="text-sm font-medium text-red-900 mt-1">Total Pacotes: <span className="font-bold">{product.totalPacotes.toLocaleString()}</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {products.length > 0 && (
          <div className="pt-4">
            <Button onClick={handleFinalizeCount} disabled={createCountMutation.isPending} className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors">
              {createCountMutation.isPending ? "Finalizando..." : <><Check className="mr-2" size={20} />Finalizar Contagem</>}
            </Button>
          </div>
        )}
      </div>

      <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onAddProduct={handleAddProduct} />
    </>
  );
}
