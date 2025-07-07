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
import { saveCurrentCount, getCurrentCount, clearCurrentCount, saveToCountHistory, getCountHistory, type CurrentCount } from "@/lib/localStorage";
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
  
  // Carrega a contagem não finalizada, se existir
  const { data: unfinishedCount } = useUnfinishedCount();

  // Estados do componente
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [currentCountId, setCurrentCountId] = useState<string | undefined>(undefined);

  // Define o ID da contagem atual com base no parâmetro da rota ou na contagem não finalizada carregada
  useEffect(() => {
    if (contagemId) {
      setCurrentCountId(contagemId);
    } else if (unfinishedCount?.id) {
      setCurrentCountId(unfinishedCount.id);
    }
  }, [contagemId, unfinishedCount]);

  /**
   * Calcula o total de pacotes com base nos pallets, lastros e pacotes avulsos
   * @param product Produto sem o campo totalPacotes
   * @returns Número total de pacotes
   */
  const calculateProductPackages = (product: Omit<ProductItem, 'totalPacotes'>): number => {
    const pacotesPorLastro = product.pacotesPorLastro ?? 0;
    const lastrosPorPallet = product.lastrosPorPallet ?? 0;
    
    // Calcula pacotes vindos de pallets inteiros
    const totalFromPallets = product.pallets * lastrosPorPallet * pacotesPorLastro;
    
    // Calcula pacotes vindos de lastros avulsos
    const totalFromLastros = product.lastros * pacotesPorLastro;
    
    // Soma com pacotes avulsos
    return totalFromPallets + totalFromLastros + product.pacotes;
  };

  /**
   * Calcula o total de unidades de um produto, considerando pallets, lastros, pacotes e unidades avulsas
   * @param product Produto a ser calculado
   * @returns Número total de unidades
   */
  const calculateProductTotal = (product: ProductItem): number => {
    // Inicia com as unidades avulsas
    let totalUnidades = product.unidades ?? 0;
    
    // Calcula o total de pacotes primeiro
    const totalPacotes = calculateTotalPacotes(product);
    
    // Se houver conversão de pacotes para unidades, aplica
    if (product.unidadesPorPacote) {
      totalUnidades += totalPacotes * product.unidadesPorPacote;
    }
    
    return totalUnidades;
  };

  /**
   * Calcula o total de pacotes de um produto, considerando pallets, lastros e pacotes avulsos
   * @param product Produto a ser calculado
   * @returns Número total de pacotes
   */
  const calculateTotalPacotes = (product: ProductItem): number => {
    // Inicia com os pacotes avulsos
    let totalPacotes = product.pacotes ?? 0;
    
    // Se não houver conversão definida, retorna apenas os pacotes avulsos
    if (!product.pacotesPorLastro) {
      return totalPacotes;
    }
    
    // Adiciona pacotes de lastros avulsos
    totalPacotes += (product.lastros ?? 0) * product.pacotesPorLastro;
    
    // Se houver conversão de pallets, adiciona os pacotes dos pallets
    if (product.lastrosPorPallet) {
      totalPacotes += (product.pallets ?? 0) * product.lastrosPorPallet * product.pacotesPorLastro;
    }
    
    return totalPacotes;
  };

  /**
   * Adiciona itens a uma contagem existente ou a uma nova contagem
   * @param newContagemId ID da contagem à qual os itens serão adicionados
   */
  const addItemsToCount = async (newContagemId: string): Promise<void> => {
    if (!newContagemId) {
      console.error("ID da contagem não fornecido");
      toast({
        title: "Erro",
        description: "ID da contagem inválido.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`Iniciando salvamento de ${products.length} itens para a contagem ${newContagemId}`);
      
      // Itera sobre cada produto e adiciona à contagem
      for (const product of products) {
        const isProdutoCadastrado = !product.id.startsWith('free-');
        const total = calculateProductTotal(product);
        const totalPacotes = calculateTotalPacotes(product);

        console.log('Salvando item:', {
          produto: product.nome,
          total,
          totalPacotes,
          pallets: product.pallets,
          lastros: product.lastros,
          pacotes: product.pacotes,
          unidades: product.unidades,
          pacotesPorLastro: product.pacotesPorLastro,
          lastrosPorPallet: product.lastrosPorPallet
        });

        // Validações básicas
        if (total <= 0) {
          console.warn(`Produto ${product.nome} tem quantidade total inválida:`, total);
          continue; // Pula itens com quantidade inválida
        }

        try {
          // Adiciona o item à contagem
          await addItemMutation.mutateAsync({
            contagemId: newContagemId,
            produtoId: isProdutoCadastrado ? product.id : undefined,
            nomeLivre: !isProdutoCadastrado ? product.nome : undefined,
            pallets: product.pallets ?? 0,
            lastros: product.lastros ?? 0,
            pacotes: product.pacotes ?? 0,
            unidades: product.unidades ?? 0,
            total: total,
            totalPacotes: totalPacotes,
          });
          
          console.log(`Item ${product.nome} salvo com sucesso!`);
        } catch (error) {
          console.error(`Erro ao salvar item ${product.nome}:`, error);
          throw error; // Propaga o erro para ser tratado no catch externo
        }
      }

      // Limpa o estado local após salvar
      clearCurrentCount();
      
      // Atualiza as queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contagens"] }),
        queryClient.invalidateQueries({ queryKey: ["contagens-unfinished"] })
      ]);
      
      // Redireciona para a tela de sucesso
      setLocation(`/count/${newContagemId}/success`);
      
    } catch (error) {
      console.error("Erro ao adicionar itens:", error);
      toast({ 
        title: "Erro ao salvar itens", 
        description: "Não foi possível salvar os itens da contagem. Tente novamente.", 
        variant: "destructive" 
      });
    }
  };

  /**
   * Cria uma nova contagem no banco de dados
   */
  const createCountMutation = useMutation({
    mutationFn: async ({ data, finalizada }: { data: string; finalizada: boolean }) => {
      // Valida a data de entrada
      if (!data) {
        throw new Error("Data da contagem não fornecida");
      }

      // Garante que a data está no formato correto (YYYY-MM-DD)
      const formattedDate = new Date(data).toISOString().split('T')[0];
      
      // Insere a nova contagem no banco de dados
      const { data: contagem, error } = await supabase
        .from('contagens')
        .insert([{ 
          data: formattedDate,
          finalizada,
          estoque_id: 1, // TODO: Implementar seleção de estoque
          usuario_id: (await supabase.auth.getSession()).data.session?.user.id || null
        }])
        .select()
        .single();
      
      if (error) {
        console.error("Erro ao criar contagem no banco de dados:", error);
        throw new Error(`Falha ao criar contagem: ${error.message}`);
      }
      
      if (!contagem) {
        throw new Error("Nenhum dado retornado ao criar contagem");
      }
      
      return contagem;
    },
    onSuccess: (contagem) => {
      // Adiciona os itens à contagem recém-criada
      if (contagem?.id) {
        addItemsToCount(contagem.id);
      } else {
        console.error("ID da contagem não encontrado no retorno");
        toast({
          title: "Erro",
          description: "Não foi possível obter o ID da contagem criada.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Erro ao criar contagem:", error);
      toast({ 
        title: "Erro ao criar contagem", 
        description: error.message || "Ocorreu um erro ao tentar criar a contagem. Tente novamente.",
        variant: "destructive" 
      });
    },
  });

  /**
   * Adiciona um item a uma contagem existente
   */
  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<InsertItemContagem, 'id' | 'created_at'>) => {
      console.log('Iniciando mutação para adicionar item:', {
        produto: item.nomeLivre || `ID: ${item.produtoId}`,
        totalPacotes: item.totalPacotes,
        total: item.total,
        pallets: item.pallets,
        lastros: item.lastros,
        pacotes: item.pacotes,
        unidades: item.unidades
      });
      
      // Validações básicas
      if (!item.contagemId) {
        const errorMsg = "ID da contagem não fornecido";
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!item.produtoId && !item.nomeLivre) {
        const errorMsg = "É necessário informar um produto ou um nome livre";
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Garante que totalPacotes seja um número válido
      const totalPacotes = Number(item.totalPacotes) || 0;
      
      // Converte para snake_case conforme as colunas reais do banco de dados
      const dbItem = {
        contagem_id: item.contagemId,
        produto_id: item.produtoId || null,
        nome_livre: item.nomeLivre || null,
        pallets: item.pallets || 0,
        lastros: item.lastros || 0,
        pacotes: item.pacotes || 0,
        unidades: item.unidades || 0,
        total: item.total || 0,
        total_pacotes: totalPacotes,
      };
      
      console.log('Inserindo no banco de dados:', dbItem);
      
      // Insere o item no banco de dados
      const { data, error } = await supabase
        .from('itens_contagem')
        .insert(dbItem)
        .select()
        .single();
        
      if (error) {
        console.error("Erro ao adicionar item no Supabase:", {
          error,
          dbItem,
          supabaseError: error.details || error.hint || error.message
        });
        throw new Error(`Falha ao adicionar item: ${error.message}`);
      }
      
      if (!data) {
        const errorMsg = "Nenhum dado retornado ao adicionar item";
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('Item adicionado com sucesso:', data);
      return data;
    },
  });

  /**
   * Adiciona um novo produto à lista de produtos da contagem atual
   * @param product Produto a ser adicionado
   * @returns O produto adicionado com valores padrão
   */
  const handleAddProduct = (product: Omit<ProductItem, 'totalPacotes'> & { totalPacotes?: number }): ProductItem => {
    try {
      // Validações iniciais
      if (!product || !product.id || !product.nome) {
        throw new Error("Dados do produto inválidos");
      }

      // Cria o produto com valores padrão
      const productWithDefaults: ProductItem = {
        ...product,
        pallets: product.pallets ?? 0,
        lastros: product.lastros ?? 0,
        pacotes: product.pacotes ?? 0,
        unidades: product.unidades ?? 0,
        totalPacotes: product.totalPacotes ?? calculateTotalPacotes({
          ...product,
          pallets: product.pallets ?? 0,
          lastros: product.lastros ?? 0,
          pacotes: product.pacotes ?? 0,
          unidades: product.unidades ?? 0,
          totalPacotes: 0,
        }),
      };

      // Verifica se o produto já existe na lista
      const productIndex = products.findIndex(p => p.id === product.id);
      let updatedProducts: ProductItem[];
      
      if (productIndex >= 0) {
        // Atualiza o produto existente
        updatedProducts = [...products];
        updatedProducts[productIndex] = productWithDefaults;
      } else {
        // Adiciona o novo produto
        updatedProducts = [...products, productWithDefaults];
      }
      
      // Atualiza o estado
      setProducts(updatedProducts);
      
      // Prepara os dados para salvar no localStorage
      const currentCount: CurrentCount = {
        id: currentCountId || `draft-${Date.now()}`,
        date: new Date(countDate).toISOString().split('T')[0],
        products: updatedProducts,
        lastUpdated: new Date().toISOString()
      };
      
      // Atualiza o ID da contagem se ainda não existir
      if (!currentCountId) {
        setCurrentCountId(currentCount.id);
      }
      
      // Persiste os dados
      saveCurrentCount(currentCount);
      saveToCountHistory(currentCount);
      
      return productWithDefaults;
      
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      toast({
        title: "Erro ao adicionar produto",
        description: error instanceof Error ? error.message : "Não foi possível adicionar o produto à contagem.",
        variant: "destructive",
      });
      throw error; // Propaga o erro para o chamador, se necessário
    }
  };

  /**
   * Remove um produto da lista de produtos da contagem atual
   * @param index Índice do produto a ser removido
   * @returns O produto removido ou undefined se o índice for inválido
   */
  const handleRemoveProduct = (index: number): ProductItem | undefined => {
    try {
      // Valida o índice
      if (index < 0 || index >= products.length) {
        console.warn(`Índice inválido ao remover produto: ${index}`);
        return undefined;
      }

      // Cria uma cópia do array de produtos e remove o item
      const updatedProducts = [...products];
      const [removedProduct] = updatedProducts.splice(index, 1);
      
      // Atualiza o estado
      setProducts(updatedProducts);
      
      // Prepara os dados para salvar no localStorage
      const currentCount: CurrentCount = {
        id: currentCountId || `draft-${Date.now()}`,
        date: new Date(countDate).toISOString().split('T')[0],
        products: updatedProducts,
        lastUpdated: new Date().toISOString()
      };
      
      // Atualiza o ID da contagem se ainda não existir
      if (!currentCountId) {
        setCurrentCountId(currentCount.id);
      }
      
      // Persiste os dados
      saveCurrentCount(currentCount);
      saveToCountHistory(currentCount);
      
      return removedProduct;
      
    } catch (error) {
      console.error("Erro ao remover produto:", error);
      toast({
        title: "Erro ao remover produto",
        description: "Não foi possível remover o produto da contagem.",
        variant: "destructive",
      });
      return undefined;
    }
  };

  /**
   * Finaliza a contagem atual, salvando todos os itens no banco de dados
   * e marcando a contagem como finalizada
   */
  const handleFinalizeCount = async (): Promise<void> => {
    // Resolve o ID da contagem usando, na ordem: estado, parâmetro da rota ou contagem não finalizada
    const resolvedCountId = currentCountId || contagemId || unfinishedCount?.id;

    // ID que será usado na tela de sucesso
    let successRedirectId: string | undefined;
    // Se o ID é de um draft local ou não existe, trata como nova contagem
    const isDraftId = resolvedCountId?.startsWith('draft-') || !resolvedCountId;
    // Valida se existem produtos na contagem
    if (!products.length) {
      toast({
        title: "Contagem vazia",
        description: "Adicione pelo menos um produto antes de finalizar a contagem.",
        variant: "destructive",
      });
      return;
    }
    
    // Valida a data da contagem
    const formattedDate = new Date(countDate).toISOString().split('T')[0];
    if (!formattedDate || isNaN(new Date(formattedDate).getTime())) {
      toast({
        title: "Data inválida",
        description: "A data da contagem é inválida. Verifique e tente novamente.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Se já tiver um ID de contagem, atualiza a existente
      if (resolvedCountId && !isDraftId) {
        console.log(`Atualizando contagem existente: ${resolvedCountId}`);
        successRedirectId = resolvedCountId;
        
        // Atualiza os dados básicos da contagem
        const { error: updateError } = await supabase
          .from('contagens')
          .update({ 
            data: formattedDate,
            finalizada: true
          })
          .eq('id', resolvedCountId);
        
        if (updateError) {
          console.error("Erro ao atualizar contagem:", updateError);
          throw new Error(`Falha ao atualizar contagem: ${updateError.message}`);
        }
        
        console.log(`Removendo itens antigos da contagem: ${resolvedCountId}`);
        
        // Remove os itens antigos da contagem
        const { error: deleteError } = await supabase
          .from('itens_contagem')
          .delete()
          .eq('contagem_id', resolvedCountId);
        
        if (deleteError) {
          console.error("Erro ao remover itens antigos:", deleteError);
          throw new Error(`Falha ao remover itens antigos: ${deleteError.message}`);
        }
        
        console.log(`Adicionando ${products.length} itens à contagem`);
        
        // Adiciona os itens atualizados à contagem
        await addItemsToCount(resolvedCountId);
        
        console.log("Contagem finalizada com sucesso!");
      } else {
        console.log("Criando nova contagem...");
        

        
        // Cria uma nova contagem
        const { data: contagem, error: createError } = await supabase
          .from('contagens')
          .insert([{
            data: formattedDate,
            finalizada: true,
            estoque_id: unfinishedCount?.estoque?.id ?? null,


          }])
          .select()
          .single();
        
        if (createError) {
          console.error("Erro ao criar contagem:", createError);
          throw new Error(`Falha ao criar contagem: ${createError.message}`);
        }
        
        if (!contagem?.id) {
          throw new Error("Não foi possível obter o ID da contagem criada.");
        }
        
        console.log(`Nova contagem criada com ID: ${contagem.id}`);
        
        // Adiciona os itens à nova contagem
        await addItemsToCount(contagem.id);
        
        console.log("Contagem criada e finalizada com sucesso!");
        
        // Guarda o ID para redirecionamento pós-sucesso
        successRedirectId = contagem.id;
      }
      
      // Limpa o estado local
      clearCurrentCount();
      
      // Define rota de sucesso
      const targetId = successRedirectId || currentCountId;
      setLocation(targetId ? `/count/${targetId}/success` : '/');
      
    } catch (error) {
      console.error("Erro ao finalizar contagem:", error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Ocorreu um erro inesperado ao finalizar a contagem.";
      
      toast({
        title: "Erro ao finalizar contagem",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Rejeita a promessa para que o chamador saiba que houve um erro
      throw error;
    }
  };

  /**
   * Atualiza a data da contagem e salva no localStorage se for uma contagem nova
   * @param newDate Nova data no formato YYYY-MM-DD
   */
  const handleDateChange = (newDate: string): void => {
    // Valida o formato da data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      console.warn("Formato de data inválido:", newDate);
      return;
    }
    
    // Atualiza a data no estado local
    setCountDate(newDate);
    
    // Se for uma contagem existente, não precisamos fazer nada mais
    if (contagemId) {
      return;
    }
    
    try {
      // Cria ou atualiza a contagem atual no localStorage
      const currentCount: CurrentCount = { 
        id: currentCountId || `draft-${Date.now()}`,
        date: newDate, 
        products: products,
        lastUpdated: new Date().toISOString()
      };
      
      // Atualiza o ID da contagem se ainda não existir
      if (!currentCountId) {
        setCurrentCountId(currentCount.id);
      }
      
      // Salva no localStorage
      saveCurrentCount(currentCount);
      
    } catch (error) {
      console.error("Erro ao salvar contagem no localStorage:", error);
      
      // Mostra uma mensagem de erro não intrusiva
      toast({
        title: "Aviso",
        description: "Não foi possível salvar a alteração de data. Sua contagem não foi perdida.",
        variant: "destructive",
      });
      
      // Reverte para a data anterior em caso de erro
      setCountDate(countDate);
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

                {(product.unidadesPorPacote !== undefined || product.pacotesPorLastro !== undefined || product.lastrosPorPallet !== undefined || product.quantidadePacsPorPallet !== undefined) && (
                  <div className="border-t pt-3 mt-3 text-xs text-gray-600">
                    <p className="font-semibold mb-2">Detalhes do Produto:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {product.unidadesPorPacote !== undefined && (
                        <div>Un/Pacote: <span className="font-bold">{product.unidadesPorPacote}</span></div>
                      )}
                      {product.pacotesPorLastro !== undefined && (
                        <div>Pac/Lastro: <span className="font-bold">{product.pacotesPorLastro}</span></div>
                      )}
                      {product.lastrosPorPallet !== undefined && (
                        <div>Lastro/Pallet: <span className="font-bold">{product.lastrosPorPallet}</span></div>
                      )}
                      {(product.pacotesPorLastro !== undefined && product.lastrosPorPallet !== undefined) && (
                        <div>
                          Pacotes/Pallet: <span className="font-bold">
                            {product.quantidadePacsPorPallet ?? (product.pacotesPorLastro * product.lastrosPorPallet)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {(calculateProductTotal(product) > 0 || (product.totalPacotes ?? 0) > 0) && (
                  <div className="bg-red-50 p-3 rounded-lg mt-3 text-center">
                    <div className="text-sm font-medium text-red-900">
                      Total Unidades: <span className="font-bold">{calculateProductTotal(product).toLocaleString()}</span>
                    </div>
                    <div className="text-sm font-medium text-red-900 mt-1">
                      Total Pacotes: <span className="font-bold">{(product.totalPacotes ?? 0).toLocaleString()}</span>
                    </div>
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
