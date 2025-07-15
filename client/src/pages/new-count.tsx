import { useState, useEffect, type ReactNode } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Check, Trash2, Package, Search, Pencil, X, Upload, Download } from "lucide-react";
import { UserInfoModal } from "@/components/user-info-modal";
import type { UserInfo } from "@/components/user-info-modal";
import * as XLSX from 'xlsx';
import type { Worksheet, Row, Workbook, Cell } from 'exceljs';
import { useToast } from "@/hooks/use-toast";
import { useCountRealtime, type RealtimeProductItem } from "@/hooks/use-count-realtime";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductModal from "@/components/product-modal";
import EditProductModal from "@/components/edit-product-modal";
import { saveCurrentCount, getCurrentCount, clearCurrentCount, saveToCountHistory, getCountHistory, type CurrentCount } from "@/lib/localStorage";
import type { InsertContagem, InsertItemContagem, ContagemWithItens } from "@shared/schema";
import { useCountDate } from "@/hooks/use-count-date";
import { useUnfinishedCount } from "@/hooks/use-counts";
import { ImportStockScreen, type ImportedProduct } from "@/components/import-stock-screen";
import { SaveCountModal } from "@/components/modals/save-count-modal";

export interface ProductItem {
  id: string;
  codigo?: string;
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
  quantidadeSistema?: number;
}

export default function NewCount() {
  const [, navigate] = useLocation();
  const { id: contagemId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { countDate, setCountDate } = useCountDate();
  
  // Carrega a contagem não finalizada, se existir
  const { data: unfinishedCount } = useUnfinishedCount();

  // Estados do componente
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [pendingCountId, setPendingCountId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [currentCountId, setCurrentCountId] = useState<string | undefined>(undefined);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Define o currentCountId quando a contagem é carregada
  useEffect(() => {
    if (unfinishedCount?.id) {
      setCurrentCountId(unfinishedCount.id);
    }
  }, [unfinishedCount?.id]);

  // Verifica se já existe matrícula/nome salvo
  useEffect(() => {
    if (currentCountId) {
      const checkUserInfo = async () => {
        try {
          const { data, error } = await supabase
            .from('contagens')
            .select('matricula, nome')
            .eq('id', currentCountId)
            .single();

          if (error) throw error;
          
          if (data?.matricula && data?.nome) {
            setUserInfo({ matricula: data.matricula, nome: data.nome });
          } else {
            setIsUserInfoModalOpen(true);
          }
        } catch (error) {
          console.error('Erro ao verificar informações do usuário:', error);
          setIsUserInfoModalOpen(true);
        }
      };

      checkUserInfo();
    }
  }, [currentCountId]);

  // Sincroniza os itens da contagem em tempo real
  useCountRealtime(
    currentCountId,
    setProducts as unknown as React.Dispatch<React.SetStateAction<RealtimeProductItem[]>>,
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Inicia a edição de um produto
  const handleStartEdit = (productOrIndex: ProductItem | number) => {
    if (typeof productOrIndex === 'number') {
      // Se for um número, é o índice do produto no array
      const index = productOrIndex;
      setEditingProductIndex(index);
      setEditingProduct({ ...products[index] });
    } else {
      // Se for um objeto, é o próprio produto
      const product = productOrIndex;
      setEditingProduct(product);
    }
  };

  // Salva as alterações de um produto
  const handleSaveEdit = (updatedProduct: ProductItem) => {
    if (updatedProduct) {
      // Atualiza o produto na lista de produtos
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === updatedProduct.id ? updatedProduct : product
        )
      );
      
      // Atualiza o localStorage
      const currentCount: CurrentCount = {
        id: currentCountId || `draft-${Date.now()}`,
        date: new Date(countDate).toISOString().split('T')[0],
        products: products.map(p => ({
          id: p.id,
          nome: p.nome,
          pallets: p.pallets,
          lastros: p.lastros,
          pacotes: p.pacotes,
          unidades: p.unidades,
          produtoId: p.codigo,
          unidadesPorPacote: p.unidadesPorPacote,
          pacotesPorLastro: p.pacotesPorLastro,
          lastrosPorPallet: p.lastrosPorPallet,
          quantidadePacsPorPallet: p.quantidadePacsPorPallet,
          totalPacotes: p.totalPacotes
        })),
        lastUpdated: new Date().toISOString()
      };
      
      saveCurrentCount(currentCount);
    }
    
    // Limpa os estados de edição
    setEditingProductIndex(null);
    setEditingProduct(null);
  };


  // Função para salvar informações do usuário
  const saveUserInfo = async (info: UserInfo) => {
    console.log('Iniciando saveUserInfo', { info, currentCountId });
    
    try {
      // Verifica se temos um ID de contagem válido
      if (!currentCountId) {
        console.error('ID da contagem não encontrado');
        throw new Error('ID da contagem não encontrado');
      }

      // Atualiza as informações no Supabase
      const { data, error } = await supabase
        .from('contagens')
        .update({ matricula: info.matricula.trim(), nome: info.nome.trim() })
        .eq('id', currentCountId)
        .select('id, matricula, nome')
        .single();

      console.log('Resposta do Supabase:', { data, error });

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      if (!data?.id) {
        console.error('Falha ao atualizar as informações');
        throw new Error('Falha ao atualizar as informações');
      }

      // Verifica se as informações foram atualizadas corretamente
      if (data?.matricula !== info.matricula.trim() || data?.nome !== info.nome.trim()) {
        console.error('Dados não foram atualizados corretamente no Supabase');
        throw new Error('Dados não foram atualizados corretamente no Supabase');
      }

      // Atualiza o estado local
      setUserInfo(info);
      setIsUserInfoModalOpen(false);

      console.log('Informações salvas com sucesso:', info);

      // Mostra mensagem de sucesso
      toast({
        title: "Sucesso",
        description: "Informações salvas com sucesso!",
        variant: "default"
      });

    } catch (error) {
      console.error('Erro ao salvar informações do usuário:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível salvar suas informações. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Função para lidar com o clique no botão de voltar
  const handleBack = () => {
    // Verifica se existem itens na contagem
    if (products.length > 0) {
      // Se houver itens, mostra o modal de confirmação
      setShowExitModal(true);
    } else {
      // Se não houver itens, apenas volta
      navigate('/');
    }
  };

  // Função para salvar a contagem como rascunho
  const handleSaveDraft = async () => {
    if (!currentCountId || products.length === 0) {
      toast({
        title: "Nada para salvar",
        description: "Adicione itens à contagem antes de salvar.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // 1. Atualiza o status da contagem para 'rascunho'
      const { error: updateError } = await supabase
        .from('contagens')
        .update({ 
          status: 'rascunho', 
          atualizado_em: new Date().toISOString(),
          // Garante que os campos de matrícula e nome estejam presentes
          matricula: unfinishedCount?.matricula || null,
          nome: unfinishedCount?.nome || null
        })
        .eq('id', currentCountId);

      if (updateError) throw updateError;

      // 2. Remove os itens antigos da contagem
      const { error: deleteError } = await supabase
        .from('itens_contagem')
        .delete()
        .eq('contagem_id', currentCountId);

      if (deleteError) throw deleteError;

      // 3. Adiciona os itens atuais
      const itemsToSave = products.map(product => ({
        contagem_id: currentCountId,
        produto_id: product.id.startsWith('free-') ? null : product.id,
        nome_livre: product.id.startsWith('free-') ? product.nome : null,
        pallets: product.pallets || 0,
        lastros: product.lastros || 0,
        pacotes: product.pacotes || 0,
        unidades: product.unidades || 0,
        total_pacotes: calculateTotalPacotes(product),
        total: calculateProductTotal(product), // Usando 'total' em vez de 'total_unidades'
        unidade_medida: 'un',
        codigo: product.codigo || null,
        quantidade_sistema: product.quantidadeSistema || 0,
      }));

      const { error: insertError } = await supabase
        .from('itens_contagem')
        .insert(itemsToSave);

      if (insertError) throw insertError;

      toast({
        title: "Contagem salva",
        description: "Sua contagem foi salva como rascunho com sucesso.",
      });

      // Atualiza a lista de contagens
      await queryClient.invalidateQueries({ queryKey: ['contagens'] });
      
      // Navega para a tela inicial
      navigate('/');
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a contagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      setShowExitModal(false);
    }
  };

  // Função para descartar alterações e sair
  const handleDiscardChanges = () => {
    // Se for um rascunho, remove do banco de dados
    if (currentCountId) {
      supabase
        .from('contagens')
        .delete()
        .eq('id', currentCountId)
        .then(({ error }) => {
          if (error) {
            console.error('Erro ao remover rascunho:', error);
          }
        });
    }
    
    // Limpa o estado local
    setProducts([]);
    setCurrentCountId(undefined);
    
    // Navega para a tela inicial
    navigate('/');
  };

  // Garante que exista uma contagem rascunho no Supabase e devolve o ID
  const ensureCountExists = async (): Promise<string> => {
    if (currentCountId) return currentCountId;

    const formattedDate = new Date(countDate).toISOString().split('T')[0];
    const { data: sessionData } = await supabase.auth.getSession();
    const usuarioId = sessionData.session?.user.id || null;

    const { data, error } = await supabase
      .from('contagens')
      .insert({ data: formattedDate, finalizada: false, usuario_id: usuarioId })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Erro ao criar contagem:', error);
      throw new Error(error?.message || 'Falha ao criar contagem');
    }

    setCurrentCountId(data.id);
    return data.id;
  };

  // Define o ID da contagem atual com base no parâmetro da rota ou na contagem não finalizada carregada
  useEffect(() => {
    if (contagemId) {
      setCurrentCountId(contagemId);
    } else if (unfinishedCount?.id) {
      setCurrentCountId(unfinishedCount.id);
    }
  }, [contagemId, unfinishedCount]);

  /**
   * Tipo auxiliar para os parâmetros da função calculateProductPackages
   */
  type ProductForPackageCalc = {
    pallets?: number;
    lastros?: number;
    pacotes?: number;
    pacotesPorLastro?: number;
    lastrosPorPallet?: number;
    [key: string]: any; // Permite outras propriedades sem causar erros
  };

  /**
   * Calcula o total de pacotes com base nos pallets, lastros e pacotes avulsos
   * @param product Objeto com as propriedades necessárias para o cálculo
   * @returns Número total de pacotes
   */
  const calculateProductPackages = (product: ProductForPackageCalc): number => {
    const pacotesPorLastro = product.pacotesPorLastro ?? 0;
    const lastrosPorPallet = product.lastrosPorPallet ?? 0;
    const pallets = product.pallets ?? 0;
    const lastros = product.lastros ?? 0;
    const pacotes = product.pacotes ?? 0;
    
    // Calcula pacotes vindos de pallets inteiros
    const totalFromPallets = pallets * lastrosPorPallet * pacotesPorLastro;
    
    // Calcula pacotes vindos de lastros avulsos
    const totalFromLastros = lastros * pacotesPorLastro;
    
    // Soma com pacotes avulsos
    return totalFromPallets + totalFromLastros + pacotes;
  };

  /**
   * Calcula o total de unidades de um produto, considerando pallets, lastros, pacotes e unidades avulsas
   * @param product Produto a ser calculado
   * @returns Número total de unidades
   */
  const calculateProductTotal = (product: ProductItem): number => {
    return (
      (product.pallets || 0) * (product.lastrosPorPallet || 0) * (product.pacotesPorLastro || 0) * (product.unidadesPorPacote || 0) +
      (product.lastros || 0) * (product.pacotesPorLastro || 0) * (product.unidadesPorPacote || 0) +
      (product.pacotes || 0) * (product.unidadesPorPacote || 0) +
      (product.unidades || 0)
    );
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
            // Garante que o código do produto seja incluído
            codigo: product.codigo || undefined,
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
      navigate(`/count/${newContagemId}/success`);
      
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
      
      // Usa insert em vez de upsert para evitar erro de constraint
      const { data, error } = await supabase.from('itens_contagem').insert(dbItem).select().single();
      
      if (error) {
        console.error("Erro ao adicionar item no Supabase:", {
          error,
          dbItem,
          supabaseError: error.details || error.hint || error.message
        });
        throw new Error(`Falha ao adicionar item: ${error.message}`);
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

      // ---------- Persistência no Supabase ----------
      (async () => {
        try {
          const contagemId = await ensureCountExists();

          const dbPayload = {
            contagem_id: contagemId,
            produto_id: productWithDefaults.id.startsWith('free-') ? null : productWithDefaults.id,
            nome_livre: productWithDefaults.id.startsWith('free-') ? productWithDefaults.nome : null,
            pallets: productWithDefaults.pallets ?? 0,
            lastros: productWithDefaults.lastros ?? 0,
            pacotes: productWithDefaults.pacotes ?? 0,
            unidades: productWithDefaults.unidades ?? 0,
            total: calculateProductTotal(productWithDefaults),
            total_pacotes: productWithDefaults.totalPacotes ?? 0,
          };

          if (dbPayload.produto_id) {
            // upsert evita duplicata por contagem/produto
            await supabase.from('itens_contagem').upsert(dbPayload, {
              onConflict: 'contagem_id,produto_id',
            });
          } else {
            await supabase.from('itens_contagem').insert(dbPayload);
          }
        } catch (err) {
          console.error('Erro ao persistir item no Supabase:', err);
        }
      })();

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
  const handleDeleteProduct = (productId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este produto da contagem?")) {
      const updatedProducts = products.filter(p => p.id !== productId);
      setProducts(updatedProducts);

      const currentCount: CurrentCount = {
        id: currentCountId || `draft-${Date.now()}`,
        date: new Date(countDate).toISOString().split('T')[0],
        products: updatedProducts,
        lastUpdated: new Date().toISOString()
      };

      if (!currentCountId) {
        setCurrentCountId(currentCount.id);
      }

      saveCurrentCount(currentCount);
      saveToCountHistory(currentCount);

      toast({
        title: "Produto removido",
        description: "O produto foi removido da contagem com sucesso.",
      });
    }
  };

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
  
  // Manipular o envio das informações do usuário
  const handleUserInfoSubmit = async (userInfo: { matricula: string; nome: string }) => {
    if (!pendingCountId) return;
    
    try {
      // Primeiro, adicione os itens à contagem
      await addItemsToCount(pendingCountId);
      
      // Atualiza a contagem com as informações do usuário e finaliza
      const { error } = await supabase
        .from('contagens')
        .update({ 
          finalizada: true,
          matricula: userInfo.matricula,
          nome: userInfo.nome,
          data: new Date(countDate).toISOString().split('T')[0]
        })
        .eq('id', pendingCountId);
        
      if (error) throw error;
      
      // Gera e salva o Excel
      await generateAndSaveExcel(pendingCountId, { data: new Date(countDate).toISOString().split('T')[0] }, products);
      
      // Limpa o estado local e redireciona para a página inicial
      clearCurrentCount();
      navigate("/");
      
      toast({
        title: "Sucesso!",
        description: "Contagem finalizada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao finalizar contagem:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao finalizar a contagem.",
        variant: "destructive",
      });
    } finally {
      setIsUserInfoModalOpen(false);
      setPendingCountId(null);
    }
  };

  // Atualiza o localStorage com os produtos atuais
  const updateLocalStorage = () => {
    const currentCount: CurrentCount = {
      id: currentCountId || `draft-${Date.now()}`,
      date: new Date(countDate).toISOString().split('T')[0],
      products: products.map(p => ({
        id: p.id,
        nome: p.nome,
        pallets: p.pallets,
        lastros: p.lastros,
        pacotes: p.pacotes,
        unidades: p.unidades,
        produtoId: p.codigo,
        unidadesPorPacote: p.unidadesPorPacote,
        pacotesPorLastro: p.pacotesPorLastro,
        lastrosPorPallet: p.lastrosPorPallet,
        quantidadePacsPorPallet: p.quantidadePacsPorPallet,
        totalPacotes: p.totalPacotes
      })),
      lastUpdated: new Date().toISOString()
    };
    
    if (!currentCountId) {
      setCurrentCountId(currentCount.id);
    }
    
    saveCurrentCount(currentCount);
    saveToCountHistory(currentCount);
  };

  /**
   * Processa os produtos importados e os adiciona à contagem
   * @param importedProducts Lista de produtos importados
   */
  const handleImportComplete = async (importedProducts: ImportedProduct[]) => {
    if (!importedProducts.length) {
      toast({
        title: "Nenhum produto para importar",
        description: "A planilha não contém produtos válidos para importação.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Criar uma lista para armazenar os produtos a serem adicionados
      const produtosParaAdicionar: Omit<ProductItem, 'totalPacotes'>[] = [];
      const produtosAdicionadosIds = new Set(products.map(p => p.id));
      let produtosAdicionados = 0;
      let produtosNaoEncontrados: string[] = [];
      
      // Processar cada produto importado
      for (const item of importedProducts) {
        try {
          // Criar um ID único para o produto
          const productId = item.id || `free-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Verificar se o produto já foi adicionado
          if (produtosAdicionadosIds.has(productId)) {
            console.log(`Produto ${item.codigo || productId} já adicionado, pulando...`);
            continue;
          }
          
          // Extrair as propriedades com valores padrão seguros
          const nome = item.nome || `Produto ${item.codigo || productId}`;
          const codigo = item.codigo || '';
          
          // Criar o objeto do produto com as informações fornecidas
          // O totalPacotes será calculado posteriormente
          const newProduct: Omit<ProductItem, 'totalPacotes'> = {
            id: productId,
            codigo,
            nome,
            pallets: 0,
            lastros: 0,
            pacotes: 0,
            unidades: 0,
            unidadesPorPacote: item.unidadesPorPacote,
            pacotesPorLastro: item.pacotesPorLastro,
            lastrosPorPallet: item.lastrosPorPallet,
            quantidadePacsPorPallet: item.quantidadePacsPorPallet,
            quantidadeSistema: item.quantidade
          };
          
          // Adicionar à lista de produtos a serem adicionados
          produtosParaAdicionar.push(newProduct);
          produtosAdicionados++;
          
          // Adicionar o ID à lista de produtos já processados
          produtosAdicionadosIds.add(productId);
          
        } catch (error) {
          console.error(`Erro ao processar produto ${item.codigo || item.id}:`, error);
          if (item.codigo) {
            produtosNaoEncontrados.push(item.codigo);
          }
        }
      }
      
      // Adicionar todos os produtos de uma vez para evitar múltiplas renderizações
      if (produtosParaAdicionar.length > 0) {
        // Usar uma função de atualização de estado para garantir que estamos trabalhando com o estado mais recente
        setProducts(prevProducts => {
          // Criar um mapa para evitar duplicatas
          const produtosMap = new Map(prevProducts.map(p => [p.id, p]));
          
          // Adicionar novos produtos ao mapa
          produtosParaAdicionar.forEach(produto => {
            produtosMap.set(produto.id, {
              ...produto,
              totalPacotes: calculateTotalPacotes({
                ...produto,
                totalPacotes: 0
              })
            } as ProductItem);
          });
          
          // Converter o mapa de volta para array
          return Array.from(produtosMap.values());
        });
        
        // Atualizar o histórico de contagem
        const currentCount: CurrentCount = {
          id: currentCountId || `draft-${Date.now()}`,
          date: new Date(countDate).toISOString().split('T')[0],
          products: [...products, ...produtosParaAdicionar.map(p => {
            const totalPacotes = calculateTotalPacotes({
              ...p,
              totalPacotes: 0
            });
            
            // Garantir que o objeto esteja no formato CurrentCountProduct
            return {
              id: p.id,
              nome: p.nome,
              pallets: p.pallets,
              lastros: p.lastros,
              pacotes: p.pacotes,
              unidades: p.unidades,
              produtoId: p.codigo,
              unidadesPorPacote: p.unidadesPorPacote,
              pacotesPorLastro: p.pacotesPorLastro,
              lastrosPorPallet: p.lastrosPorPallet,
              quantidadePacsPorPallet: p.quantidadePacsPorPallet,
              totalPacotes: totalPacotes
            };
          })],
          lastUpdated: new Date().toISOString()
        };
        
        // Atualiza o ID da contagem se ainda não existir
        if (!currentCountId) {
          setCurrentCountId(currentCount.id);
        }
        
        // Salva no localStorage
        saveCurrentCount(currentCount);
        saveToCountHistory(currentCount);
      }
      
      // Exibe mensagem de sucesso com resumo da importação
      let message = `${produtosAdicionados} produtos importados com sucesso.`;
      
      if (produtosNaoEncontrados.length > 0) {
        message += ` ${produtosNaoEncontrados.length} produtos tiveram problemas ao serem importados.`;
      }
      
      toast({
        title: "Importação concluída",
        description: message,
      });
      
      // Fecha o modal de importação
      setIsImportModalOpen(false);
      
    } catch (error) {
      console.error("Erro ao processar importação:", error);
      
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar a importação.",
        variant: "destructive",
      });
    }
  };

  // Filtrar produtos com base no termo de busca
  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.nome.toLowerCase().includes(searchLower) ||
      (product.codigo && product.codigo.toLowerCase().includes(searchLower))
    );
  });

  /**
   * Finaliza a contagem atual, salvando todos os itens no banco de dados
   * e marcando a contagem como finalizada
   */
  // Função para gerar e salvar o Excel no Supabase Storage
  // Função para buscar os códigos dos produtos no banco de dados
  const fetchProductCodes = async (productIds: string[]) => {
    if (!productIds.length) {
      console.log('Nenhum ID de produto fornecido para busca');
      return new Map();
    }
    
    try {
      console.log('[fetchProductCodes] IDs recebidos:', productIds);

      const productMap = new Map<string, { codigo: string | null; codigo_barras: string | null; referencia: string | null; nome: string }>();

      // Sanitize ids
      const ids = productIds.filter(id => !!id && typeof id === 'string');
      if (ids.length === 0) {
        console.warn('[fetchProductCodes] Nenhum id válido.');
        return productMap;
      }

      for (const id of ids) {
        try {
          const { data, error } = await supabase
            .from('produtos')
            .select('id, codigo, codigo_barras, referencia, nome')
            .eq('id', id)
            .maybeSingle();

          if (error) {
            console.error(`[fetchProductCodes] Erro Supabase para id ${id}:`, error);
            continue;
          }

          if (data) {
            productMap.set(id, {
              codigo: (data as any).codigo || null,
              codigo_barras: (data as any).codigo_barras || null,
              referencia: (data as any).referencia || null,
              nome: (data as any).nome || 'Produto sem nome'
            });
            console.log(`[fetchProductCodes] Produto ok ${id} »`, productMap.get(id));
          } else {
            console.warn(`[fetchProductCodes] Produto não encontrado para id ${id}`);
          }
        } catch (err) {
          console.error('[fetchProductCodes] Exceção inesperada para id', id, err);
        }
      }

      console.log('[fetchProductCodes] Finalizado. Total mapeados:', productMap.size);
      return productMap;
      
    } catch (error) {
      console.error('Erro inesperado ao buscar códigos dos produtos:', error);
      return new Map();
    }
  };

  // Define types for count data
  interface CountData {
    data?: string | Date;
    estoque?: { nome: string };
    estoques?: { nome: string };
    estoque_id?: string;
  }

  // Define item type for Excel generation
  interface ExcelItem {
    id: string;
    product_id?: string;
    nome: string;
    codigo?: string;
    codigo_barras?: string;
    referencia?: string;
    produto?: {
      codigo?: string;
      codigo_barras?: string;
      referencia?: string;
      id?: string;
      nome?: string;
    };
    pallets?: number;
    lastros?: number;
    pacotes?: number;
    unidades?: number;
    totalPacotes: number;
    unidadesPorPacote?: number;
    pacotesPorLastro?: number;
    lastrosPorPallet?: number;
    quantidadePacsPorPallet?: number;
    quantidadeSistema?: number;
    total?: number;
  }

  const generateAndSaveExcel = async (countId: string, countData: CountData, items: (ProductItem | ExcelItem)[]): Promise<string> => {
    // Convert ProductItem to ExcelItem if needed
    const excelItems: ExcelItem[] = items.map(item => {
      // Create a base item with all possible fields
      const baseItem: Partial<ExcelItem> = {
        ...item,
        id: 'id' in item ? item.id : `temp-${Math.random().toString(36).substr(2, 9)}`,
        nome: 'nome' in item ? item.nome : 'Produto não cadastrado',
        totalPacotes: 'totalPacotes' in item ? item.totalPacotes : 0,
        pallets: 'pallets' in item ? item.pallets : 0,
        lastros: 'lastros' in item ? item.lastros : 0,
        pacotes: 'pacotes' in item ? item.pacotes : 0,
        unidades: 'unidades' in item ? item.unidades : 0,
      };
      
      // Ensure all required ExcelItem fields are present
      const excelItem: ExcelItem = {
        id: baseItem.id!,
        nome: baseItem.nome!,
        totalPacotes: baseItem.totalPacotes!,
        // Optional fields
        product_id: baseItem.product_id,
        codigo: baseItem.codigo,
        codigo_barras: baseItem.codigo_barras,
        referencia: baseItem.referencia,
        produto: baseItem.produto,
        pallets: baseItem.pallets,
        lastros: baseItem.lastros,
        pacotes: baseItem.pacotes,
        unidades: baseItem.unidades,
        unidadesPorPacote: baseItem.unidadesPorPacote,
        pacotesPorLastro: baseItem.pacotesPorLastro,
        lastrosPorPallet: baseItem.lastrosPorPallet,
        quantidadePacsPorPallet: baseItem.quantidadePacsPorPallet,
        quantidadeSistema: baseItem.quantidadeSistema,
        total: baseItem.total,
      };
      
      return excelItem;
    });
    console.log('=== INÍCIO DA GERAÇÃO DO EXCEL ===');
    console.log('countData:', JSON.stringify(countData, null, 2));
    console.log('items:', JSON.stringify(items, null, 2));
    
    // Use the converted items
    const itemsToProcess = excelItems;
    
    // Busca os códigos dos produtos no banco de dados
    console.log('Itens recebidos para geração do Excel:', JSON.stringify(itemsToProcess, null, 2));
    
    // Extrai os IDs dos produtos, garantindo que são válidos
    const productEntries = itemsToProcess
      .filter(item => {
        // Verifica se o item tem um ID válido (não é produto livre)
        const hasValidId = item && item.id && !item.id.startsWith('free-');
        // Verifica se tem product_id (caso o ID principal seja diferente)
        const hasProductId = item && item.product_id && !item.product_id.startsWith('free-');
        
        if (!hasValidId && !hasProductId) {
          console.log('Item inválido ou é produto livre:', item);
          return false;
        }
        return true;
      })
      .map(item => {
        // Usa product_id se disponível, senão usa id
        const productId = item.product_id || item.id;
        console.log(`Processando item - ID: ${item.id}, ` +
                   `Product ID: ${item.product_id || 'N/A'}, ` +
                   `Nome: ${item.nome || 'Sem nome'}, ` +
                   `Usando ID: ${productId}`);
        
        return {
          id: item.id,
          product_id: productId,
          nome: item.nome
        };
      });
    
    // Extrai apenas os IDs únicos para busca
    const productIds = productEntries
      .map(entry => entry.product_id)
      .filter((item): item is string => !!item) // Filtra valores nulos/undefined e faz type assertion
      .filter((item, index, self) => self.indexOf(item) === index); // Remove duplicados
    
    // Log para depuração
    console.log('Entradas de produtos processadas:', productEntries);
    console.log('IDs de produtos únicos para busca:', productIds);
    
    console.log('IDs de produtos únicos para busca:', productIds);
    
    // Busca os códigos dos produtos no banco
    const productCodesMap = await fetchProductCodes(productIds);
    console.log('Mapa de códigos de produtos:', Object.fromEntries(productCodesMap));
    
    // Verifica se todos os produtos foram encontrados
    const missingProducts = productIds.filter(id => !productCodesMap.has(id));
    if (missingProducts.length > 0) {
      console.warn('Os seguintes produtos não foram encontrados no banco de dados:', missingProducts);
    }
    
    const { Workbook } = await import('exceljs');
    
    // Criar workbook
    const workbook: Workbook = new Workbook();
    const worksheet: Worksheet = workbook.addWorksheet("Contagem");
    
    // Configurar propriedades da planilha
    worksheet.properties.defaultColWidth = 15;
    
    // Adicionar título
    const titleRow = worksheet.addRow(['CONTAGEM DE ESTOQUE']);
    titleRow.font = { bold: true, size: 18, color: { argb: 'FF2F5496' } };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.height = 30;
    worksheet.mergeCells('A1:H1');
    
    // Formatar a data
    let dataFormatada: string = 'NÃO INFORMADA';
    try {
      const dataContagem = countData.data ? new Date(countData.data) : new Date();
      dataFormatada = dataContagem.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
    }
    
    // Adicionar informações do estoque e data
    console.log('=== DADOS DO ESTOQUE ===');
    
    let estoqueNome: string = 'NÃO INFORMADO';
    
    // Tenta obter o nome do estoque de várias fontes possíveis
    if (countData.estoques?.nome) {
      estoqueNome = countData.estoques.nome;
      console.log('Usando nome do estoque de countData.estoques.nome');
    } else if (countData.estoque?.nome) {
      estoqueNome = countData.estoque.nome;
      console.log('Usando nome do estoque de countData.estoque.nome');
    } else if (countData.estoque_id) {
      // Tenta buscar o nome do estoque diretamente se tivermos o ID
      try {
        const { data: estoque, error } = await supabase
          .from('estoques')
          .select('nome')
          .eq('id', countData.estoque_id)
          .single();
          
        if (!error && estoque?.nome) {
          estoqueNome = estoque.nome;
          console.log('Nome do estoque encontrado no banco de dados:', estoqueNome);
        } else {
          console.log('Estoque não encontrado no banco de dados, usando ID como referência');
          estoqueNome = `Estoque ID: ${countData.estoque_id}`;
        }
      } catch (error) {
        console.error('Erro ao buscar nome do estoque:', error);
        estoqueNome = `Estoque ID: ${countData.estoque_id}`;
      }
    }
    
    console.log('Nome do estoque a ser exibido:', estoqueNome);
    
    // Adiciona a linha com as informações do estoque e data
    const estoqueInfo = worksheet.addRow([
      `Estoque: ${estoqueNome}`,
      '', '', '', '', '', '',
      `Data: ${dataFormatada}`
    ]);
    
    // Estilizar informações do estoque
    estoqueInfo.font = { bold: true };
    estoqueInfo.alignment = { horizontal: 'left' };
    worksheet.mergeCells('A2:D2');
    worksheet.mergeCells('G2:H2');
    // Adicionar linha em branco
    worksheet.addRow([]);
    
    // Cabeçalhos
    const analysisHeaderTitles = [
      'CÓDIGO',
      'PRODUTO',
      'SISTEMA',
      'CONTADO',
      'DIFERENÇA (SISTEMA - CONTADO)'
    ] as const;
    
    const analysisHeaderRow = worksheet.addRow([...analysisHeaderTitles]);
    analysisHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    analysisHeaderRow.fill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF2F5496' }
    };
    
    // Função para obter o código do produto de várias fontes possíveis
    const getProductCode = (item: ExcelItem): string => {
      // Verifica se o produto tem um código no banco de dados
      if (item.product_id && productCodesMap.has(item.product_id)) {
        const produtoInfo = productCodesMap.get(item.product_id);
        if (produtoInfo) {
          return produtoInfo.codigo || produtoInfo.codigo_barras || produtoInfo.referencia || 'N/A';
        }
      }
      
      // Se não encontrar no banco de dados, usa o código fornecido no item
      return item.codigo || item.codigo_barras || item.referencia || 'N/A';
    };
    
    // Adicionar dados dos itens
    excelItems.forEach((item) => {
      try {
        const isFreeProduct = item.id?.startsWith('free-');
        const codigoProduto = isFreeProduct ? 'N/A' : (getProductCode(item) || 'N/A');
        const nomeProduto = item.nome || 'Produto não cadastrado';
        const totalPacotes = item.totalPacotes || 0;
        
        // Primeiro, adiciona a linha com os dados básicos
        const row = worksheet.addRow([
          // Código do produto ou 'N/A' para produtos livres
          isFreeProduct ? 'N/A' : codigoProduto,
          // Nome do produto
          nomeProduto,
          // Sistema (em branco para preenchimento manual)
          '',
          // Total de pacotes contados
          totalPacotes,
          // Inicialmente vazio, será preenchido com a fórmula abaixo
          ''
        ]);
        
        // Agora que a linha foi criada, adicionamos a fórmula corretamente
        // row.number já retorna o número correto da linha no Excel (1-based)
        const rowNumber = row.number;
        const cellE = row.getCell('E');
        
        // Define o valor da célula E como uma fórmula que subtrai a coluna D da coluna C
        // Usando tipo any temporariamente para evitar erros de tipo com ExcelJS
        (cellE as any).value = { 
          formula: `C${rowNumber}-D${rowNumber}`, 
          result: 0 
        };
        
        // Formatar a célula de diferença como número
        // Usando tipo any temporariamente para evitar erros de tipo com ExcelJS
        (cellE as any).numFmt = '#,##0';
      } catch (error) {
        console.error('Erro ao adicionar item à planilha de análise:', error);
      }
    });
    
    // Adicionar formatação condicional para a coluna de diferença
    const lastRow = worksheet.lastRow?.number || 0;
    if (lastRow > 4) { // Apenas adiciona se houver linhas de dados
      const conditionalFormatting = {
        ref: `E5:E${lastRow}`, // Coluna de diferença
        rules: [
          {
            type: 'cellIs' as const,
            operator: 'greaterThan' as const,
            priority: 1,
            formulae: ['0'],
            style: {
              font: { color: { argb: 'FF0000' } }, // Texto vermelho
              fill: {
                type: 'pattern' as const,
                pattern: 'solid' as const,
                fgColor: { argb: 'FFFFC7CE' } // Fundo vermelho claro
              }
            }
          },
          {
            type: 'cellIs' as const,
            operator: 'lessThan' as const,
            priority: 2,
            formulae: ['0'],
            style: {
              font: { color: { argb: 'FF0000' } }, // Texto vermelho
              fill: {
                type: 'pattern' as const,
                pattern: 'solid' as const,
                fgColor: { argb: 'FFFFC7CE' } // Fundo vermelho claro
              }
            }
          }
        ]
      };
      
      worksheet.addConditionalFormatting(conditionalFormatting);
    }
    
    // Ajustar alinhamento das células
    worksheet.eachRow((row: Row, rowNumber: number) => {
      if (rowNumber > 4) { // Pular cabeçalhos e informações iniciais
        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
          const cell = row.getCell(col);
          cell.alignment = { 
            vertical: 'middle',
            horizontal: col === 'B' ? 'left' : 'center'
          };
        });
      }
    });
    
    // Gerar o arquivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `contagem_${countId}_${new Date().getTime()}.xlsx`;
    const filePath = `contagens/${countId}/${fileName}`;
    
    // Fazer upload para o Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('contagens')
      .upload(filePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Erro ao fazer upload do Excel:', uploadError);
      throw new Error('Erro ao salvar o arquivo Excel');
    }
    
    // Obter URL pública do arquivo
    const { data: { publicUrl } } = supabase.storage
      .from('contagens')
      .getPublicUrl(filePath);
    
    console.log('=== FIM DA GERAÇÃO DO EXCEL ===');
    console.log('Arquivo salvo em:', filePath);
    console.log('URL pública:', publicUrl);
    
    return publicUrl;
  };

  // Obtém os valores dos hooks no nível superior do componente
  const { id: routeContagemId } = useParams();
  const { data: localUnfinishedCount } = useUnfinishedCount();
  const { countDate: localCountDate } = useCountDate();
  
  const handleFinalizeCount = async (): Promise<void> => {
    // Resolve o ID da contagem usando, na ordem: estado, parâmetro da rota ou contagem não finalizada
    const resolvedCountId = currentCountId || routeContagemId || (localUnfinishedCount?.id ? String(localUnfinishedCount.id) : undefined);
    
    // Garante que temos um ID de contagem válido
    if (!resolvedCountId) {
      console.error('Nenhum ID de contagem válido encontrado');
      toast({
        title: 'Erro',
        description: 'Não foi possível identificar a contagem. Por favor, recarregue a página e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    // ID que será usado na tela de sucesso
    let successRedirectId: string | undefined;
    // Se o ID é de um draft local ou não existe, trata como nova contagem
    const isDraftId = resolvedCountId?.startsWith('draft-') || !resolvedCountId;
    
    // Dados para geração do Excel
    let excelUrl: string | null = null;
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
    const formattedDate = new Date(localCountDate).toISOString().split('T')[0];
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
        
        // Busca os dados completos da contagem para garantir que temos as informações do estoque
        const { data: contagemCompleta, error: erroBusca } = await supabase
          .from('contagens')
          .select(`
            *,
            estoques (
              id,
              nome
            )
          `)
          .eq('id', resolvedCountId)
          .single();
          
        if (erroBusca) {
          console.error('Erro ao buscar dados da contagem:', erroBusca);
          throw new Error('Não foi possível obter os dados completos da contagem');
        }
        
        console.log('Dados completos da contagem:', contagemCompleta);
        
        // Prepara os dados para o Excel
        const contagemData = {
          ...contagemCompleta,
          // Garante que estoques seja um objeto simples ou null
          estoques: Array.isArray(contagemCompleta.estoques) && contagemCompleta.estoques.length > 0 
            ? contagemCompleta.estoques[0] 
            : null,
          // Mantém compatibilidade com o código existente
          estoque: Array.isArray(contagemCompleta.estoques) && contagemCompleta.estoques.length > 0 
            ? contagemCompleta.estoques[0]
            : null,
          estoque_id: contagemCompleta.estoque_id
        };
        
        console.log('Dados formatados para o Excel:', contagemData);
        
        // Gera e salva o Excel
        try {
          excelUrl = await generateAndSaveExcel(resolvedCountId, contagemData, products);
          console.log('Excel gerado e salvo com sucesso:', excelUrl);
        } catch (error) {
          console.error('Erro ao gerar Excel:', error);
          // Não interrompe o fluxo se falhar a geração do Excel
        }
        
        // Conta o número de produtos únicos na contagem
        const uniqueProductCount = new Set(products.map(p => p.id)).size;
        
        // Atualiza os dados básicos da contagem
        const { error: updateError } = await supabase
          .from('contagens')
          .update({ 
            data: formattedDate,
            finalizada: true,
            excel_url: excelUrl,
            qntd_produtos: uniqueProductCount // Adiciona a contagem de produtos únicos
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
        
        // Conta o número de produtos únicos na contagem
        const uniqueProductCount = new Set(products.map(p => p.id)).size;
        
        // Cria uma nova contagem
        const { data: contagem, error: createError } = await supabase
          .from('contagens')
          .insert([{
            data: formattedDate,
            finalizada: true,
            estoque_id: unfinishedCount?.estoque?.id || null,
            qntd_produtos: uniqueProductCount // Adiciona a contagem de produtos únicos
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
        
        // Busca os dados completos da contagem recém-criada para garantir que temos as informações do estoque
        const { data: contagemCompleta, error: erroBusca } = await supabase
          .from('contagens')
          .select(`
            *,
            estoques (
              id,
              nome
            )
          `)
          .eq('id', contagem.id)
          .single();
          
        if (erroBusca) {
          console.error('Erro ao buscar dados da contagem:', erroBusca);
          throw new Error('Não foi possível obter os dados completos da contagem recém-criada');
        }
        
        console.log('Dados completos da contagem recém-criada:', contagemCompleta);
        
        // Prepara os dados para o Excel
        const contagemData = {
          ...contagemCompleta,
          // Garante que estoques seja um objeto simples ou null
          estoques: Array.isArray(contagemCompleta.estoques) && contagemCompleta.estoques.length > 0 
            ? contagemCompleta.estoques[0] 
            : null,
          // Mantém compatibilidade com o código existente
          estoque: Array.isArray(contagemCompleta.estoques) && contagemCompleta.estoques.length > 0 
            ? contagemCompleta.estoques[0]
            : null
        };
        
        console.log('Dados formatados para o Excel (nova contagem):', contagemData);
        
        // Gera e salva o Excel
        try {
          excelUrl = await generateAndSaveExcel(contagem.id, contagemData, products);
          console.log('Excel gerado e salvo com sucesso para nova contagem:', excelUrl);
          
          // Atualiza a contagem com a URL do Excel
          const { error: updateError } = await supabase
            .from('contagens')
            .update({ excel_url: excelUrl })
            .eq('id', contagem.id);
            
          if (updateError) {
            console.error('Erro ao atualizar URL do Excel:', updateError);
            // Não interrompe o fluxo
          }
        } catch (error) {
          console.error('Erro ao gerar Excel para nova contagem:', error);
          // Não interrompe o fluxo se falhar a geração do Excel
        }
        
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
      navigate(targetId ? `/count/${targetId}/success` : '/');
      
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

  /**
   * Exporta os produtos para um arquivo Excel com abas de contagem e análise
   */
  const exportToExcel = () => {
    try {
      // Cria um novo livro de trabalho
      const wb = XLSX.utils.book_new();
      
      // ===== PRIMEIRA ABA: CONTAGEM DETALHADA =====
      // Cabeçalho com informações da contagem
      const header = [
        ['CONTAGEM DE ESTOQUE'],
        ['', '', `Data: ${new Date(countDate).toLocaleDateString('pt-BR')}`],
        [''] // Linha em branco
      ];
      
      // Dados dos produtos
      const data = products.map(product => {
        // Cria um objeto temporário sem a propriedade totalPacotes
        const { totalPacotes: _, ...productWithoutTotal } = product;
        
        // Calcula o total de pacotes e unidades usando as funções auxiliares
        const totalPacotes = calculateProductPackages(productWithoutTotal);
        const totalUnidades = calculateProductTotal(product);
        
        return {
          'CÓDIGO': product.codigo || 'N/A',
          'PRODUTO': product.nome,
          'PALLETS': (product.pallets || 0).toString(),
          'LASTROS': (product.lastros || 0).toString(),
          'PACOTES': (product.pacotes || 0).toString(),
          'UNIDADES': (product.unidades || 0).toString(),
          'TOTAL PACOTES': totalPacotes.toString(),
          'TOTAL UNIDADES': totalUnidades.toString(),
          'SISTEMA (PACOTES)': (product.quantidadeSistema || 0).toString(),
          'DIVERGÊNCIA (PACOTES)': (totalPacotes - (product.quantidadeSistema || 0)).toString(),
          'UN/PACOTE': product.unidadesPorPacote?.toString() || 'N/A',
          'PAC/LASTRO': product.pacotesPorLastro?.toString() || 'N/A',
          'LAST/PALLET': product.lastrosPorPallet?.toString() || 'N/A'
        };
      });

      // Cabeçalhos da tabela
      const headers = [Object.keys(data[0] || {})];
      
      // Converte os dados para o formato de matriz
      const dataArray = data.map(item => Object.values(item));
      
      // Combina cabeçalho, cabeçalhos da tabela e dados
      const sheetData = [
        ...header,
        ...headers,
        ...dataArray
      ];
      
      // Cria a planilha
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Ajusta a largura das colunas
      const wscols = [
        { wch: 15 },  // CÓDIGO
        { wch: 40 },  // PRODUTO
        { wch: 10 },  // PALLETS
        { wch: 10 },  // LASTROS
        { wch: 10 },  // PACOTES
        { wch: 10 },  // UNIDADES
        { wch: 15 },  // TOTAL PACOTES
        { wch: 15 },  // TOTAL UNIDADES
        { wch: 20 },  // SISTEMA (PACOTES)
        { wch: 20 },  // DIVERGÊNCIA (PACOTES)
        { wch: 12 },  // UN/PACOTE
        { wch: 12 },  // PAC/LASTRO
        { wch: 12 }   // LAST/PALLET
      ];
      ws['!cols'] = wscols;
      
      // Adiciona bordas e formatação
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Aplica formatação ao cabeçalho
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = ws[XLSX.utils.encode_cell({r: 0, c: C})];
        if (headerCell) {
          headerCell.s = {
            font: { bold: true, color: { rgb: 'FFFFFFFF' } },
            fill: { fgColor: { rgb: '2F5496' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
      
      // Aplica formatação aos cabeçalhos da tabela
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = ws[XLSX.utils.encode_cell({r: 3, c: C})];
        if (headerCell) {
          headerCell.s = {
            font: { bold: true, color: { rgb: 'FFFFFFFF' } },
            fill: { fgColor: { rgb: '4472C4' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
      
      // Ajusta o alinhamento das células numéricas
      for (let R = 4; R <= range.e.r; ++R) {
        for (let C = 0; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
          if (!ws[cellAddress]) continue;
          
          // Se for uma célula numérica (exceto as duas primeiras colunas)
          if (C >= 2) {
            ws[cellAddress].s = ws[cellAddress].s || {};
            ws[cellAddress].s.alignment = { horizontal: 'center' };
            
            // Formata como número com separador de milhar
            if (typeof ws[cellAddress].v === 'number') {
              ws[cellAddress].t = 'n';
              ws[cellAddress].z = '#,##0';
            }
          } else {
            // Alinha texto à esquerda para as primeiras colunas
            ws[cellAddress].s = ws[cellAddress].s || {};
            ws[cellAddress].s.alignment = { horizontal: 'left' };
          }
        }
      }
      
      // Adiciona a planilha ao livro de trabalho
      XLSX.utils.book_append_sheet(wb, ws, 'Contagem Detalhada');
      
      // ===== SEGUNDA ABA: ANÁLISE DE DIVERGÊNCIAS =====
      const analysisData = products.map(product => {
        const { totalPacotes: _, ...productWithoutTotal } = product;
        const totalPacotes = calculateProductPackages(productWithoutTotal);
        const quantidadeSistema = product.quantidadeSistema || 0;
        const diferenca = totalPacotes - quantidadeSistema;
        
        return {
          'CÓDIGO': product.codigo || 'N/A',
          'PRODUTO': product.nome,
          'SISTEMA (PACOTES)': quantidadeSistema.toString(),
          'CONTADO (PACOTES)': totalPacotes.toString(),
          'DIFERENÇA (PACOTES)': diferenca.toString(),
          'STATUS': diferenca === 0 ? 'OK' : (diferenca > 0 ? 'SOBRA' : 'FALTA')
        };
      });
      
      // Cabeçalho da aba de análise
      const analysisHeader = [
        ['ANÁLISE DE DIVERGÊNCIAS'],
        ['', `Data: ${new Date(countDate).toLocaleDateString('pt-BR')}`],
        [''] // Linha em branco
      ];
      
      // Cabeçalhos da tabela de análise
      const analysisTableHeaders = [
        'CÓDIGO',
        'PRODUTO',
        'SISTEMA (PACOTES)',
        'CONTADO (PACOTES)',
        'DIFERENÇA (PACOTES)',
        'STATUS'
      ];
      
      // Converte os dados para o formato de matriz
      const analysisArray = analysisData.map(item => [
        item['CÓDIGO'],
        item['PRODUTO'],
        item['SISTEMA (PACOTES)'],
        item['CONTADO (PACOTES)'],
        item['DIFERENÇA (PACOTES)'],
        item['STATUS']
      ]);
      
      // Combina cabeçalho, cabeçalhos da tabela e dados
      const analysisSheetData = [
        ...analysisHeader,
        analysisTableHeaders,
        ...analysisArray
      ];
      
      // Cria a planilha de análise
      const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisSheetData);
      
      // Ajusta a largura das colunas
      wsAnalysis['!cols'] = [
        { wch: 15 },  // CÓDIGO
        { wch: 40 },  // PRODUTO
        { wch: 20 },  // SISTEMA (PACOTES)
        { wch: 20 },  // CONTADO (PACOTES)
        { wch: 25 },  // DIFERENÇA (PACOTES)
        { wch: 15 }   // STATUS
      ];
      
      // Aplica formatação condicional para a coluna de status
      const analysisRange = XLSX.utils.decode_range(wsAnalysis['!ref'] || 'A1');
      
      // Aplica formatação ao título
      for (let C = analysisRange.s.c; C <= analysisRange.e.c; ++C) {
        const titleCell = wsAnalysis[XLSX.utils.encode_cell({r: 0, c: C})];
        if (titleCell) {
          titleCell.s = {
            font: { bold: true, size: 16, color: { rgb: '2F5496' } },
            alignment: { horizontal: 'center' }
          };
        }
      }
      
      // Aplica formatação aos cabeçalhos da tabela
      for (let C = analysisRange.s.c; C <= analysisRange.e.c; ++C) {
        const headerCell = wsAnalysis[XLSX.utils.encode_cell({r: 3, c: C})];
        if (headerCell) {
          headerCell.s = {
            font: { bold: true, color: { rgb: 'FFFFFFFF' } },
            fill: { fgColor: { rgb: '4472C4' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
      
      // Ajusta o alinhamento e formatação das células de dados
      for (let R = 4; R <= analysisRange.e.r; ++R) {
        for (let C = 0; C <= analysisRange.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
          if (!wsAnalysis[cellAddress]) continue;
          
          // Formatação para colunas numéricas
          if (C >= 2 && C <= 4) {
            wsAnalysis[cellAddress].s = wsAnalysis[cellAddress].s || {};
            wsAnalysis[cellAddress].s.alignment = { horizontal: 'center' };
            
            if (typeof wsAnalysis[cellAddress].v === 'number') {
              wsAnalysis[cellAddress].t = 'n';
              wsAnalysis[cellAddress].z = '#,##0';
            }
          } 
          // Formatação para a coluna de status
          else if (C === 5) {
            const status = wsAnalysis[cellAddress].v;
            wsAnalysis[cellAddress].s = {
              font: { 
                bold: true,
                color: { 
                  rgb: status === 'OK' ? '107C41' : 
                       status === 'SOBRA' ? '9C5700' : '9C0006' 
                } 
              },
              fill: { 
                fgColor: { 
                  rgb: status === 'OK' ? 'C6EFCE' : 
                       status === 'SOBRA' ? 'FFEB9C' : 'FFC7CE' 
                } 
              },
              alignment: { horizontal: 'center' }
            };
          }
          // Formatação para as colunas de texto
          else {
            wsAnalysis[cellAddress].s = wsAnalysis[cellAddress].s || {};
            wsAnalysis[cellAddress].s.alignment = { 
              horizontal: C === 1 ? 'left' : 'center' 
            };
          }
        }
      }
      
      // Adiciona a planilha de análise ao livro de trabalho
      XLSX.utils.book_append_sheet(wb, wsAnalysis, 'Análise de Divergências');
      
      // ===== TERCEIRA ABA: RESUMO =====
      const totalPallets = products.reduce((sum, p) => sum + (p.pallets || 0), 0);
      const totalLastros = products.reduce((sum, p) => sum + (p.lastros || 0), 0);
      const totalPacotes = products.reduce((sum, p) => {
        const { totalPacotes: _, ...productWithoutTotal } = p;
        return sum + calculateProductPackages(productWithoutTotal);
      }, 0);
      const totalUnidades = products.reduce((sum, p) => sum + calculateProductTotal(p), 0);
      
      // Define o tipo explicitamente como string[][] já que todos os valores serão strings
      const summaryData: string[][] = [
        ['RESUMO DA CONTAGEM'],
        ['']
      ];
      
      // Adiciona totais
      summaryData.push(['TOTAIS:']);
      summaryData.push(['', 'PALLETS', 'LASTROS', 'PACOTES', 'UNIDADES']);
      summaryData.push([
        'TOTAL', 
        totalPallets.toString(), 
        totalLastros.toString(), 
        totalPacotes.toString(), 
        totalUnidades.toString()
      ]);
      summaryData.push(['']); // Linha em branco
      
      // Adiciona contagem por produto
      summaryData.push(['CONTAGEM POR PRODUTO:']);
      summaryData.push(['PRODUTO', 'PALLETS', 'LASTROS', 'PACOTES', 'UNIDADES']);
      
      // Cria uma cópia dos produtos para evitar modificar o estado original
      const sortedProducts = [...products].sort((a, b) => a.nome.localeCompare(b.nome));
      
      sortedProducts.forEach(product => {
        const { totalPacotes: _, ...productWithoutTotal } = product;
        const totalPacotes = calculateProductPackages(productWithoutTotal);
        
        summaryData.push([
          product.nome,
          (product.pallets || 0).toString(),
          (product.lastros || 0).toString(),
          totalPacotes.toString(),
          calculateProductTotal(product).toString()
        ]);
      });
      
      // Cria a planilha de resumo
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Ajusta a largura das colunas
      wsSummary['!cols'] = [
        { wch: 40 },  // PRODUTO
        { wch: 12 },  // PALLETS
        { wch: 12 },  // LASTROS
        { wch: 12 },  // PACOTES
        { wch: 15 }   // UNIDADES
      ];
      
      // Aplica formatação ao título
      const summaryRange = XLSX.utils.decode_range(wsSummary['!ref'] || 'A1');
      
      // Formata o título
      const titleCell = wsSummary['A1'];
      if (titleCell) {
        titleCell.s = {
          font: { bold: true, size: 16, color: { rgb: '2F5496' } }
        };
      }
      
      // Formata os cabeçalhos
      [3, 6].forEach(row => {
        for (let C = 0; C <= 4; C++) {
          const cellAddress = XLSX.utils.encode_cell({r: row, c: C});
          if (wsSummary[cellAddress]) {
            wsSummary[cellAddress].s = {
              font: { bold: true, color: { rgb: 'FFFFFFFF' } },
              fill: { fgColor: { rgb: '4472C4' } },
              alignment: { horizontal: 'center' }
            };
          }
        }
      });
      
      // Formata os totais
      for (let C = 1; C <= 4; C++) {
        const cellAddress = XLSX.utils.encode_cell({r: 4, c: C});
        if (wsSummary[cellAddress]) {
          wsSummary[cellAddress].s = {
            font: { bold: true },
            numFmt: '#,##0'
          };
        }
      }
      
      // Formata os dados numéricos
      for (let R = 7; R <= summaryRange.e.r; R++) {
        for (let C = 1; C <= 4; C++) {
          const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
          if (wsSummary[cellAddress] && typeof wsSummary[cellAddress].v === 'number') {
            wsSummary[cellAddress].t = 'n';
            wsSummary[cellAddress].z = '#,##0';
            wsSummary[cellAddress].s = wsSummary[cellAddress].s || {};
            wsSummary[cellAddress].s.alignment = { horizontal: 'center' };
          }
        }
      }
      
      // Adiciona a planilha de resumo ao livro de trabalho
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');
      
      // Gera o arquivo Excel
      const fileName = `contagem_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "Exportação concluída",
        description: `A planilha foi baixada como ${fileName}`,
      });
      
    } catch (error) {
      console.error("Erro ao exportar para Excel:", error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar os dados para Excel. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-bold ml-2">
              {contagemId ? `Contagem #${contagemId}` : "Nova Contagem"}
            </h1>
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="count-date">Data da Contagem</Label>
          <Input 
            id="count-date" 
            type="date" 
            value={countDate} 
            onChange={(e) => handleDateChange(e.target.value)} 
            className="mb-3" 
          />
          
          {/* Campo de busca */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar produto por nome ou código..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => setIsProductModalOpen(true)} 
              className="flex-1"
            >
              <Plus className="mr-2" size={20} />
              Adicionar Produto
            </Button>
            <Button 
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1"
            >
              <Upload className="mr-2" size={20} />
              Importar
            </Button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Package size={48} className="mx-auto mb-2" />
            <p>Nenhum produto adicionado ainda.</p>
            <p className="text-sm">Clique em "Adicionar Produto" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product, index) => (
              <div key={product.id} className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{product.nome}</h3>
                    {product.codigo && (
                      <p className="text-sm text-gray-500">Código: {product.codigo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleStartEdit(product)} className="p-1 text-gray-500 hover:text-gray-700">
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="p-1 text-red-500 hover:text-red-700">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div><span className="font-medium">Pallets:</span> {product.pallets}</div>
                  <div><span className="font-medium">Lastros:</span> {product.lastros}</div>
                  <div><span className="font-medium">Pacotes:</span> {product.pacotes}</div>
                  <div><span className="font-medium">Unidades:</span> {product.unidades}</div>
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
                
                {(calculateProductTotal(product) > 0 || (product.totalPacotes ?? 0) > 0 || (product.quantidadeSistema ?? 0) > 0) && (
                  (() => {
                    const totalPacotes = product.totalPacotes ?? 0;
                    const quantidadeSistema = product.quantidadeSistema ?? 0;
                    const difference = totalPacotes - quantidadeSistema;
                    const differenceColor = difference > 0 ? 'text-green-700' : difference < 0 ? 'text-red-700' : 'text-gray-700';
                    const differenceBg = difference > 0 ? 'bg-green-100' : difference < 0 ? 'bg-red-100' : 'bg-gray-100';

                    return (
                      <div className={`p-3 rounded-lg mt-3 text-sm font-medium ${differenceBg}`}>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div className="text-left">Total Unidades:</div>
                          <div className="text-right font-bold">{calculateProductTotal(product).toLocaleString()}</div>
                          
                          <div className="text-left">Total Pacotes:</div>
                          <div className="text-right font-bold">{totalPacotes.toLocaleString()}</div>

                          <div className="text-left">Sistema (Pacotes):</div>
                          <div className="text-right font-bold">{quantidadeSistema.toLocaleString()}</div>

                          <div className={`text-left font-bold ${differenceColor}`}>Diferença (Pacotes):</div>
                          <div className={`text-right font-bold ${differenceColor}`}>{difference.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            ))}
          </div>
        )}

        {products.length > 0 && (
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={exportToExcel} 
              variant="outline" 
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Exportar para Excel
            </Button>
            <Button 
              onClick={handleFinalizeCount} 
              disabled={createCountMutation.isPending} 
              className="w-full sm:w-auto bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              {createCountMutation.isPending ? "Finalizando..." : <><Check className="mr-2" size={20} />Finalizar Contagem</>}
            </Button>
          </div>
        )}
      </div>

      {/* Modal de informações do usuário */}
      <UserInfoModal
        open={isUserInfoModalOpen}
        onOpenChange={setIsUserInfoModalOpen}
        onSave={saveUserInfo}
        onResetSaving={() => setIsUserInfoModalOpen(false)}
      />

      <ProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onAddProduct={handleAddProduct}
        estoqueId={unfinishedCount?.estoqueId || undefined}
      />
      
      {isImportModalOpen && (
        <ImportStockScreen
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          contagemId={currentCountId || `draft-${Date.now()}`}
          onImportComplete={handleImportComplete}
        />
      )}
      
      {/* Modal de edição de produto */}
      <EditProductModal
        isOpen={editingProduct !== null}
        onClose={() => {
          setEditingProductIndex(null);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleSaveEdit}
      />

      {/* Modal de informações do usuário */}
      <UserInfoModal
        open={isUserInfoModalOpen}
        onOpenChange={setIsUserInfoModalOpen}
        onSave={handleUserInfoSubmit}
      />

      {/* Modal de confirmação de saída */}
      <SaveCountModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onSave={handleSaveDraft}
        onDiscard={handleDiscardChanges}
        isLoading={isSaving}
      />
    </>
  );
}
