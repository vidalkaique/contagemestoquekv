import { useState, useEffect, type ReactNode } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Check, Trash2, Package, Search, Pencil, X, Upload, Download } from "lucide-react";
import { UserInfoModal } from "@/components/user-info-modal";
import type { UserInfo } from "@/components/user-info-modal";
import * as XLSX from 'xlsx';
import type { Worksheet, Row, Workbook, Cell } from 'exceljs';
import { useUnfinishedCount } from "@/hooks/use-counts";
import { useCountDate } from "@/hooks/use-count-date";
import { useFullRealtime } from "@/hooks/use-realtime";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useCountRealtime, type RealtimeProductItem } from "@/hooks/use-count-realtime";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductModal from "@/components/product-modal";
import EditProductModal from "@/components/edit-product-modal";
import { saveCurrentCount, getCurrentCount, clearCurrentCount, saveToCountHistory, getCountHistory, type CurrentCount } from "@/lib/localStorage";
import type { InsertContagem, InsertItemContagem, ContagemWithItens } from "@shared/schema";
import { usePreventRefresh } from "@/hooks/use-prevent-refresh";
import { exportToExcelWithTemplate, type ExcelExportData } from "@/lib/excel-templates";

// Interface estendida para incluir campos do Estoque 10
interface ExtendedInsertItemContagem extends Omit<InsertItemContagem, 'id' | 'created_at'> {
  // Campos do Estoque 10 - GARRAFAS
  chaoCheio?: number;
  chaoCheio_pallets?: number;
  chaoCheio_lastros?: number;
  chaoCheio_caixas?: number;
  
  chaoVazio?: number;
  chaoVazio_pallets?: number;
  chaoVazio_lastros?: number;
  chaoVazio_caixas?: number;
  
  refugo?: number;
  refugo_pallets?: number;
  refugo_lastros?: number;
  refugo_caixas?: number;
  
  avaria?: number;
  avaria_pallets?: number;
  avaria_lastros?: number;
  avaria_caixas?: number;
  
  // Campos do Estoque 10 - GARRAFEIRAS
  garrafeiras_chaoCheio?: number;
  garrafeiras_chaoCheio_pallets?: number;
  garrafeiras_chaoCheio_lastros?: number;
  garrafeiras_chaoCheio_caixas?: number;
  
  garrafeiras_chaoVazio?: number;
  garrafeiras_chaoVazio_pallets?: number;
  garrafeiras_chaoVazio_lastros?: number;
  garrafeiras_chaoVazio_caixas?: number;
  
  garrafeiras_avaria?: number;
  garrafeiras_avaria_pallets?: number;
  garrafeiras_avaria_lastros?: number;
  garrafeiras_avaria_caixas?: number;
  
  garrafeiras_refugo?: number;
  garrafeiras_refugo_pallets?: number;
  garrafeiras_refugo_lastros?: number;
  garrafeiras_refugo_caixas?: number;
  
  // Campos do Estoque 10 - EQUIPAMENTOS
  sucata?: number;
  manutencao?: number;
  novo?: number;
  bloqueado?: number;
}
import { ImportStockScreen, type ImportedProduct } from "@/components/import-stock-screen";
import { SaveCountModal } from "@/components/modals/save-count-modal";

// Função auxiliar para converter data para formato YYYY-MM-DD sem problemas de fuso horário
const toLocalDateString = (dateString: string): string => {
  // Se a string já está no formato YYYY-MM-DD, retorna como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Caso contrário, cria uma data local e formata
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface ProductItem {
  id: string;
  codigo?: string;
  nome: string;
  
  // Campos do Estoque 11 (Padrão)
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
  
  // Campos do Estoque 10 (Status) - GARRAFAS
  chaoCheio?: number;
  chaoCheio_pallets?: number;
  chaoCheio_lastros?: number;
  chaoCheio_caixas?: number;
  chaoCheio_gajPbr?: number;
  
  chaoVazio?: number;
  chaoVazio_pallets?: number;
  chaoVazio_lastros?: number;
  chaoVazio_caixas?: number;
  chaoVazio_gajPbr?: number;
  
  refugo?: number;
  refugo_pallets?: number;
  refugo_lastros?: number;
  refugo_caixas?: number;
  
  avaria?: number;
  avaria_pallets?: number;
  avaria_lastros?: number;
  avaria_caixas?: number;
  
  // GAJ/PBR após refugo (novo campo)
  gajPbrRefugo?: number;
  
  // GARRAFEIRAS VAZIAS (nova seção)
  garrafeirasVazias_pallets?: number;
  garrafeirasVazias_lastros?: number;
  garrafeirasVazias_caixas?: number;
  
  // GAJ/PBR (novo campo)
  gajPbr?: number;
  
  // Campos do Estoque 10 (Status) - GARRAFEIRAS
  garrafeiras_chaoCheio?: number;
  garrafeiras_chaoCheio_pallets?: number;
  garrafeiras_chaoCheio_lastros?: number;
  garrafeiras_chaoCheio_caixas?: number;
  
  garrafeiras_chaoVazio?: number;
  garrafeiras_chaoVazio_pallets?: number;
  garrafeiras_chaoVazio_lastros?: number;
  garrafeiras_chaoVazio_caixas?: number;
  
  garrafeiras_avaria?: number;
  garrafeiras_avaria_pallets?: number;
  garrafeiras_avaria_lastros?: number;
  garrafeiras_avaria_caixas?: number;
  
  garrafeiras_refugo?: number;
  garrafeiras_refugo_pallets?: number;
  garrafeiras_refugo_lastros?: number;
  garrafeiras_refugo_caixas?: number;
  
  // Campos do Estoque 10 (Status) - EQUIPAMENTOS (apenas UN)
  sucata?: number;
  manutencao?: number;
  novo?: number;
  bloqueado?: number;
  
  // Campos do Estoque 23 (Simplificado)
  un?: number;
  
  // Campos comuns
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
  
  // SOLUÇÃO A: Sempre cria nova contagem
  // Detecção de estoque será feita quando a contagem for carregada
  const [tipoEstoque, setTipoEstoque] = useState<'10' | '11' | '23'>('11');

  // Estados do componente
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(() => {
    // Tenta carregar as informações do usuário do localStorage ao inicializar
    if (typeof window !== 'undefined') {
      const savedUserInfo = localStorage.getItem('userInfo');
      return savedUserInfo ? JSON.parse(savedUserInfo) : null;
    }
    return null;
  });
  const [pendingCountId, setPendingCountId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [currentCountId, setCurrentCountId] = useState<string | undefined>(undefined);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Busca informações do estoque da contagem atual quando ela for definida
  useEffect(() => {
    if (currentCountId && !currentCountId.startsWith('draft-')) {
      // Busca a contagem e o estoque associado
      const fetchStockInfo = async () => {
        try {
          const { data, error } = await supabase
            .from('contagens')
            .select('estoque_id')
            .eq('id', currentCountId)
            .single();

          if (error) throw error;
          
          if (data?.estoque_id) {
            // Busca o nome do estoque
            const { data: estoqueData, error: estoqueError } = await supabase
              .from('estoques')
              .select('nome')
              .eq('id', data.estoque_id)
              .single();
            
            if (!estoqueError && estoqueData) {
              const estoqueNome = estoqueData.nome?.toLowerCase() || '';
              console.log('Estoque carregado:', estoqueData.nome);
              
              // Detecta tipo de estoque pelo nome
              if (estoqueNome.includes('10')) {
                setTipoEstoque('10');
              } else if (estoqueNome.includes('23')) {
                setTipoEstoque('23');
              } else {
                setTipoEstoque('11');
              }
            }
          }
        } catch (error) {
          console.error('Erro ao buscar informações do estoque:', error);
        }
      };

      fetchStockInfo();
    }
  }, [currentCountId]);

  // Ativa realtime completo para esta contagem específica
  useFullRealtime(
    currentCountId, 
    (updatedUserInfo) => {
      console.log('Informações do usuário atualizadas via realtime:', updatedUserInfo);
      setUserInfo({
        matricula: updatedUserInfo.matricula || '',
        nome: updatedUserInfo.nome || ''
      });
      // Também salva no localStorage para manter sincronizado
      localStorage.setItem('userInfo', JSON.stringify({
        matricula: updatedUserInfo.matricula || '',
        nome: updatedUserInfo.nome || ''
      }));
    }
  );

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

  // Função para obter o UUID do estoque baseado no tipo
  const getEstoqueIdByTipo = async (tipo: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('estoques')
        .select('id')
        .ilike('nome', `%${tipo}%`)
        .single();
      
      if (error || !data) {
        console.error('Erro ao buscar estoque por tipo:', error);
        // Fallback para Estoque 11 se não encontrar
        const { data: fallbackData } = await supabase
          .from('estoques')
          .select('id')
          .ilike('nome', '%11%')
          .single();
        return fallbackData?.id || '3dd14edb-66cd-4374-abaa-9827936823a3';
      }
      
      return data.id;
    } catch (error) {
      console.error('Erro ao buscar estoque:', error);
      return '3dd14edb-66cd-4374-abaa-9827936823a3'; // Fallback para Estoque 10
    }
  };

  // Função para salvar a contagem como rascunho (CIRURGICAMENTE ADICIONADA)
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
      // 1. Cria ou atualiza a contagem no Supabase
      const { data: contagem, error: contagemError } = await supabase
        .from('contagens')
        .upsert({
          id: currentCountId.startsWith('draft-') ? undefined : currentCountId,
          data: countDate,
          finalizada: false,
          estoque_id: await getEstoqueIdByTipo(tipoEstoque), // UUID dinâmico baseado no tipo
          nome: userInfo?.nome || null,
          matricula: userInfo?.matricula || null
        })
        .select()
        .single();

      if (contagemError) throw contagemError;
      
      const finalCountId = contagem.id;

      // 2. Remove itens antigos se existirem
      const { error: deleteError } = await supabase
        .from('itens_contagem')
        .delete()
        .eq('contagem_id', finalCountId);

      if (deleteError) throw deleteError;

      // 3. Adiciona os itens atuais com TODOS os campos do Estoque 10
      const itemsToSave = products.map(product => ({
        contagem_id: finalCountId,
        produto_id: product.id.startsWith('free-') ? null : product.id,
        nome_livre: product.id.startsWith('free-') ? product.nome : null,
        // Estoque 11
        pallets: product.pallets || 0,
        lastros: product.lastros || 0,
        pacotes: product.pacotes || 0,
        unidades: product.unidades || 0,
        // Estoque 10 - GARRAFAS
        chao_cheio: product.chaoCheio || 0,
        chao_cheio_pallets: product.chaoCheio_pallets || 0,
        chao_cheio_lastros: product.chaoCheio_lastros || 0,
        chao_cheio_caixas: product.chaoCheio_caixas || 0,
        chao_vazio: product.chaoVazio || 0,
        chao_vazio_pallets: product.chaoVazio_pallets || 0,
        chao_vazio_lastros: product.chaoVazio_lastros || 0,
        chao_vazio_caixas: product.chaoVazio_caixas || 0,
        refugo: product.refugo || 0,
        refugo_pallets: product.refugo_pallets || 0,
        refugo_lastros: product.refugo_lastros || 0,
        refugo_caixas: product.refugo_caixas || 0,
        avaria: product.avaria || 0,
        avaria_pallets: product.avaria_pallets || 0,
        avaria_lastros: product.avaria_lastros || 0,
        avaria_caixas: product.avaria_caixas || 0,
        // Estoque 10 - GARRAFEIRAS
        garrafeiras_chao_cheio: product.garrafeiras_chaoCheio || 0,
        garrafeiras_chao_cheio_pallets: product.garrafeiras_chaoCheio_pallets || 0,
        garrafeiras_chao_cheio_lastros: product.garrafeiras_chaoCheio_lastros || 0,
        garrafeiras_chao_cheio_caixas: product.garrafeiras_chaoCheio_caixas || 0,
        garrafeiras_chao_vazio: product.garrafeiras_chaoVazio || 0,
        garrafeiras_chao_vazio_pallets: product.garrafeiras_chaoVazio_pallets || 0,
        garrafeiras_chao_vazio_lastros: product.garrafeiras_chaoVazio_lastros || 0,
        garrafeiras_chao_vazio_caixas: product.garrafeiras_chaoVazio_caixas || 0,
        garrafeiras_avaria: product.garrafeiras_avaria || 0,
        garrafeiras_avaria_pallets: product.garrafeiras_avaria_pallets || 0,
        garrafeiras_avaria_lastros: product.garrafeiras_avaria_lastros || 0,
        garrafeiras_avaria_caixas: product.garrafeiras_avaria_caixas || 0,
        garrafeiras_refugo: product.garrafeiras_refugo || 0,
        garrafeiras_refugo_pallets: product.garrafeiras_refugo_pallets || 0,
        garrafeiras_refugo_lastros: product.garrafeiras_refugo_lastros || 0,
        garrafeiras_refugo_caixas: product.garrafeiras_refugo_caixas || 0,
        // Estoque 10 - EQUIPAMENTOS
        sucata: product.sucata || 0,
        manutencao: product.manutencao || 0,
        novo: product.novo || 0,
        bloqueado: product.bloqueado || 0,
        // Estoque 23 - SIMPLIFICADO
        un: product.un || 0,
        // Totais
        total_pacotes: calculateTotalPacotes(product),
        total: calculateProductTotal(product),
        codigo: product.codigo || null
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

  // Função para descartar alterações e sair (CIRURGICAMENTE ADICIONADA)
  const handleDiscardChanges = () => {
    // Limpa o localStorage
    clearCurrentCount();
    
    // Navega para a tela inicial
    navigate('/');
  };

  // Sincroniza os itens da contagem em tempo real
  useCountRealtime(
    currentCountId,
    setProducts as unknown as React.Dispatch<React.SetStateAction<RealtimeProductItem[]>>,
  );

  // Previne a atualização da página quando houver alterações não salvas
  usePreventRefresh(hasUnsavedChanges, 'Tem certeza que deseja sair? As alterações não salvas serão perdidas.');

  // Captura o botão físico de voltar do celular/navegador
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Se há alterações não salvas, mostra o modal de confirmação
      if (hasUnsavedChanges || products.length > 0) {
        // Previne a navegação padrão
        event.preventDefault();
        // Adiciona um novo estado no histórico para "cancelar" o voltar
        window.history.pushState(null, '', window.location.href);
        // Mostra o modal de confirmação
        setShowExitModal(true);
      }
    };

    // Adiciona um estado no histórico para capturar o botão voltar
    window.history.pushState(null, '', window.location.href);
    
    // Adiciona o listener
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, products.length]);

  // Função para lidar com o clique no botão de voltar
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      navigate(-1 as any); // Usando 'as any' temporariamente para contornar o erro de tipo
    }
  };

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
    setHasUnsavedChanges(true);
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


  // Função para salvar informações do usuário no localStorage e Supabase (realtime)
  const saveUserInfo = async (info: UserInfo) => {
    console.log('Salvando informações do usuário:', info);
    
    // Valida os dados de entrada
    if (!info?.matricula?.trim() || !info?.nome?.trim()) {
      const errorMsg = 'Matrícula e nome são obrigatórios';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Cria um objeto com as informações formatadas
    const userData = {
      matricula: info.matricula.trim(),
      nome: info.nome.trim()
    };
    
    try {
      // Salva as informações no localStorage
      localStorage.setItem('userInfo', JSON.stringify(userData));
      console.log('Informações salvas com sucesso no localStorage');

      // Atualiza o estado local
      setUserInfo(userData);
      
      // Salva imediatamente no Supabase se houver uma contagem atual
      if (currentCountId && !currentCountId.startsWith('draft-')) {
        console.log('Salvando informações do usuário no Supabase para contagem:', currentCountId);
        
        const { error: supabaseError } = await supabase
          .from('contagens')
          .update({
            matricula: userData.matricula,
            nome: userData.nome,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', currentCountId);
          
        if (supabaseError) {
          console.error('Erro ao salvar no Supabase:', supabaseError);
          throw new Error(`Erro ao salvar no banco de dados: ${supabaseError.message}`);
        }
        
        console.log('Informações salvas com sucesso no Supabase');
        
        // Invalida as queries para atualizar em tempo real
        await queryClient.invalidateQueries({ queryKey: ['contagens'] });
        await queryClient.invalidateQueries({ queryKey: ['contagens-unfinished'] });
      } else if (currentCountId?.startsWith('draft-')) {
        console.log('Contagem ainda é um rascunho local. Informações serão salvas quando a contagem for criada no banco.');
      } else {
        console.log('Nenhuma contagem atual encontrada. Informações serão salvas quando uma contagem for iniciada.');
      }
      
      // Mostra mensagem de sucesso
      toast({
        title: "Sucesso",
        description: "Informações salvas com sucesso!",
        variant: "default"
      });

      return userData;

    } catch (error) {
      console.error('Erro ao salvar informações do usuário:', error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível salvar suas informações. Tente novamente.";
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw error; // Propaga o erro para ser tratado pelo componente do modal
    } finally {
      // Se estava esperando para salvar, continua o processo de salvamento
      if (isSavePending) {
        const wasSavePending = isSavePending;
        setIsSavePending(false);
        
        if (wasSavePending) {
          console.log('Continuando processo de salvamento pendente...');
          // Aguarda um pequeno delay para garantir que o modal foi fechado
          setTimeout(() => {
            handleSaveDraft().catch(console.error);
          }, 100);
        }
      }
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

  // Estado para controlar se há um salvamento pendente
  const [isSavePending, setIsSavePending] = useState(false);

  // Garante que exista uma contagem rascunho no Supabase e devolve o ID
  const ensureCountExists = async (): Promise<string> => {
    if (currentCountId) return currentCountId;

    const formattedDate = toLocalDateString(countDate);
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

  // Define o ID da contagem atual com base no parâmetro da rota
  useEffect(() => {
    if (contagemId) {
      setCurrentCountId(contagemId);
    }
  }, [contagemId]);

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
          // Adiciona o item à contagem (inclui TODOS os campos do Estoque 10)
          await addItemMutation.mutateAsync({
            contagemId: newContagemId,
            produtoId: isProdutoCadastrado ? product.id : undefined,
            nomeLivre: !isProdutoCadastrado ? product.nome : undefined,
            // Estoque 11 (padrão)
            pallets: product.pallets ?? 0,
            lastros: product.lastros ?? 0,
            pacotes: product.pacotes ?? 0,
            unidades: product.unidades ?? 0,
            // Estoque 10 - GARRAFAS
            chaoCheio: product.chaoCheio ?? 0,
            chaoCheio_pallets: product.chaoCheio_pallets ?? 0,
            chaoCheio_lastros: product.chaoCheio_lastros ?? 0,
            chaoCheio_caixas: product.chaoCheio_caixas ?? 0,
            chaoVazio: product.chaoVazio ?? 0,
            chaoVazio_pallets: product.chaoVazio_pallets ?? 0,
            chaoVazio_lastros: product.chaoVazio_lastros ?? 0,
            chaoVazio_caixas: product.chaoVazio_caixas ?? 0,
            refugo: product.refugo ?? 0,
            refugo_pallets: product.refugo_pallets ?? 0,
            refugo_lastros: product.refugo_lastros ?? 0,
            refugo_caixas: product.refugo_caixas ?? 0,
            avaria: product.avaria ?? 0,
            avaria_pallets: product.avaria_pallets ?? 0,
            avaria_lastros: product.avaria_lastros ?? 0,
            avaria_caixas: product.avaria_caixas ?? 0,
            // Estoque 10 - GARRAFEIRAS
            garrafeiras_chaoCheio: product.garrafeiras_chaoCheio ?? 0,
            garrafeiras_chaoCheio_pallets: product.garrafeiras_chaoCheio_pallets ?? 0,
            garrafeiras_chaoCheio_lastros: product.garrafeiras_chaoCheio_lastros ?? 0,
            garrafeiras_chaoCheio_caixas: product.garrafeiras_chaoCheio_caixas ?? 0,
            garrafeiras_chaoVazio: product.garrafeiras_chaoVazio ?? 0,
            garrafeiras_chaoVazio_pallets: product.garrafeiras_chaoVazio_pallets ?? 0,
            garrafeiras_chaoVazio_lastros: product.garrafeiras_chaoVazio_lastros ?? 0,
            garrafeiras_chaoVazio_caixas: product.garrafeiras_chaoVazio_caixas ?? 0,
            garrafeiras_avaria: product.garrafeiras_avaria ?? 0,
            garrafeiras_avaria_pallets: product.garrafeiras_avaria_pallets ?? 0,
            garrafeiras_avaria_lastros: product.garrafeiras_avaria_lastros ?? 0,
            garrafeiras_avaria_caixas: product.garrafeiras_avaria_caixas ?? 0,
            garrafeiras_refugo: product.garrafeiras_refugo ?? 0,
            garrafeiras_refugo_pallets: product.garrafeiras_refugo_pallets ?? 0,
            garrafeiras_refugo_lastros: product.garrafeiras_refugo_lastros ?? 0,
            garrafeiras_refugo_caixas: product.garrafeiras_refugo_caixas ?? 0,
            // Estoque 10 - EQUIPAMENTOS
            sucata: product.sucata ?? 0,
            manutencao: product.manutencao ?? 0,
            novo: product.novo ?? 0,
            bloqueado: product.bloqueado ?? 0,
            // Estoque 23 - SIMPLIFICADO
            un: product.un ?? 0,
            // Totais e código
            total: total,
            totalPacotes: totalPacotes,
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
      const formattedDate = toLocalDateString(data);
      
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
    mutationFn: async (item: ExtendedInsertItemContagem) => {
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
        // Estoque 11 (padrão)
        pallets: item.pallets || 0,
        lastros: item.lastros || 0,
        pacotes: item.pacotes || 0,
        unidades: item.unidades || 0,
        // Estoque 10 - GARRAFAS (com subcampos)
        chao_cheio: item.chaoCheio || 0,
        chao_cheio_pallets: item.chaoCheio_pallets || 0,
        chao_cheio_lastros: item.chaoCheio_lastros || 0,
        chao_cheio_caixas: item.chaoCheio_caixas || 0,
        
        chao_vazio: item.chaoVazio || 0,
        chao_vazio_pallets: item.chaoVazio_pallets || 0,
        chao_vazio_lastros: item.chaoVazio_lastros || 0,
        chao_vazio_caixas: item.chaoVazio_caixas || 0,
        
        refugo: item.refugo || 0,
        refugo_pallets: item.refugo_pallets || 0,
        refugo_lastros: item.refugo_lastros || 0,
        refugo_caixas: item.refugo_caixas || 0,
        
        avaria: item.avaria || 0,
        avaria_pallets: item.avaria_pallets || 0,
        avaria_lastros: item.avaria_lastros || 0,
        avaria_caixas: item.avaria_caixas || 0,
        
        // Estoque 10 - GARRAFEIRAS (com subcampos)
        garrafeiras_chao_cheio: item.garrafeiras_chaoCheio || 0,
        garrafeiras_chao_cheio_pallets: item.garrafeiras_chaoCheio_pallets || 0,
        garrafeiras_chao_cheio_lastros: item.garrafeiras_chaoCheio_lastros || 0,
        garrafeiras_chao_cheio_caixas: item.garrafeiras_chaoCheio_caixas || 0,
        
        garrafeiras_chao_vazio: item.garrafeiras_chaoVazio || 0,
        garrafeiras_chao_vazio_pallets: item.garrafeiras_chaoVazio_pallets || 0,
        garrafeiras_chao_vazio_lastros: item.garrafeiras_chaoVazio_lastros || 0,
        garrafeiras_chao_vazio_caixas: item.garrafeiras_chaoVazio_caixas || 0,
        
        garrafeiras_avaria: item.garrafeiras_avaria || 0,
        garrafeiras_avaria_pallets: item.garrafeiras_avaria_pallets || 0,
        garrafeiras_avaria_lastros: item.garrafeiras_avaria_lastros || 0,
        garrafeiras_avaria_caixas: item.garrafeiras_avaria_caixas || 0,
        
        garrafeiras_refugo: item.garrafeiras_refugo || 0,
        garrafeiras_refugo_pallets: item.garrafeiras_refugo_pallets || 0,
        garrafeiras_refugo_lastros: item.garrafeiras_refugo_lastros || 0,
        garrafeiras_refugo_caixas: item.garrafeiras_refugo_caixas || 0,
        
        // Estoque 10 - EQUIPAMENTOS (apenas UN)
        sucata: item.sucata || 0,
        manutencao: item.manutencao || 0,
        novo: item.novo || 0,
        bloqueado: item.bloqueado || 0,
        // Estoque 23 - SIMPLIFICADO
        un: item.un || 0,
        // Totais
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
  const handleAddProduct = (newProduct: Omit<ProductItem, 'id' | 'totalPacotes'>) => {
    const productWithId = {
      ...newProduct,
      id: Date.now().toString(),
      totalPacotes: 0, // Será calculado
    };
    setProducts(prev => [...prev, productWithId]);
    setHasUnsavedChanges(true);
  };

  /**
   * Remove um produto da lista de produtos da contagem atual
   * @param index Índice do produto a ser removido
   * @returns O produto removido ou undefined se o índice for inválido
   */
  const handleRemoveProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    setHasUnsavedChanges(true);
    
    const currentCount: CurrentCount = {
      id: currentCountId || `draft-${Date.now()}`,
      date: new Date(countDate).toISOString().split('T')[0],
      products: products.filter(p => p.id !== productId).map(p => ({
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

    toast({
      title: "Produto removido",
      description: "O produto foi removido da contagem com sucesso.",
    });
  };

  /**
   * Remove um produto da lista de produtos da contagem atual
   * @param productId ID do produto a ser removido
   */
  const handleDeleteProduct = (productId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este produto da contagem?")) {
      const updatedProducts = products.filter(p => p.id !== productId);
      setProducts(updatedProducts);
      setHasUnsavedChanges(true);

      const currentCount: CurrentCount = {
        id: currentCountId || `draft-${Date.now()}`,
        date: new Date(countDate).toISOString().split('T')[0],
        products: updatedProducts.map(p => ({
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

      toast({
        title: "Produto removido",
        description: "O produto foi removido da contagem com sucesso.",
      });
    }
  };

  // Função para remover produto por índice (mantida para compatibilidade)
  const removeProductByIndex = (index: number): ProductItem | undefined => {
    try {
      // Valida o índice
      if (index < 0 || index >= products.length) {
        console.warn(`Índice inválido ao remover produto: ${index}`);
        return undefined;
      }

      // Remove o produto usando a função principal
      const productToRemove = products[index];
      handleRemoveProduct(productToRemove.id);
      
      return productToRemove;
      
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
      // Atualiza o estado local com as informações do usuário
      setUserInfo(userInfo);
      
      // Primeiro, adicione os itens à contagem
      await addItemsToCount(pendingCountId);
      
      // Atualiza a contagem com as informações do usuário e finaliza
      const { error } = await supabase
        .from('contagens')
        .update({ 
          finalizada: true,
          matricula: userInfo.matricula,
          nome: userInfo.nome,
          data: new Date(countDate).toISOString().split('T')[0],
          // Atualiza a quantidade de produtos únicos
          qntd_produtos: new Set(products.map(p => p.id)).size
        })
        .eq('id', pendingCountId);
        
      if (error) throw error;
      
          // Define o tipo estendido para os dados da contagem
      interface CountDataWithUserInfo extends CountData {
        matricula: string;
        nome: string;
      }
      
      // Gera e salva o Excel
      const countData: CountDataWithUserInfo = {
        data: new Date(countDate).toISOString().split('T')[0],
        matricula: userInfo.matricula,
        nome: userInfo.nome
      };
      
      await generateAndSaveExcel(pendingCountId, countData, products);
      
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
        description: error instanceof Error ? error.message : "Ocorreu um erro ao finalizar a contagem.",
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
    matricula?: string;
    nome?: string;
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
    // Alerta de confirmação antes de finalizar
    const confirmFinalize = window.confirm(
      "Tem certeza de que deseja finalizar esta contagem?\n\n" +
      "Após finalizar, você não poderá mais editar os itens da contagem.\n" +
      `Total de produtos: ${products.length}`
    );
    
    if (!confirmFinalize) {
      return; // Usuario cancelou a operação
    }
    
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
    
    // Regra #2: Removido variáveis do Excel não utilizadas
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
            : null
        };
        
        // Regra #2: Removido Excel export - agora apenas no botão "Exportar para Excel"
        
        // Conta o número de produtos únicos na contagem
        const uniqueProductCount = new Set(products.map(p => p.id)).size;
        
        // Atualiza os dados básicos da contagem
        const { error: updateError } = await supabase
          .from('contagens')
          .update({ 
            data: formattedDate,
            finalizada: true,
            qntd_produtos: uniqueProductCount, // Adiciona a contagem de produtos únicos
            // Inclui as informações do usuário se disponíveis
            matricula: userInfo?.matricula || null,
            nome: userInfo?.nome || null
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
            estoque_id: null, // Será preenchido pelo modal de seleção de estoque
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
        
        // Regra #2: Removido Excel export - agora apenas no botão "Exportar para Excel"
        
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
   * Exporta os produtos para Excel com template específico por estoque
   * Regra #1: DRY - Código reutilizável e modular
   * Regra #7: Separação de lógica e apresentação
   */
  const exportToExcel = () => {
    try {
      // Regra #8: Tratamento correto de dados
      const exportData: ExcelExportData = {
        products,
        countDate,
        userInfo: userInfo || undefined,
        totalItems: products.reduce((sum, p) => sum + calculateProductTotal(p), 0),
        totalProducts: products.length
      };

      // Regra #3: TypeScript consistente - usa factory pattern
      exportToExcelWithTemplate(tipoEstoque, exportData);
      
      toast({
        title: "Exportação concluída",
        description: `Planilha do Estoque ${tipoEstoque} exportada com sucesso!`,
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

                {/* Exibe campos baseado no tipo de estoque */}
                {(() => {
                  // Usa a variável tipoEstoque para detectar corretamente
                  const isEstoque10 = tipoEstoque === '10';
                  
                  if (isEstoque10) {
                    // Detecta o tipo de garrafeira baseado no nome do produto
                    const detectGarrafeiraType = (productName: string): '600ml' | '300ml' | '1l' | 'other' => {
                      const nameUpper = productName.toUpperCase();
                      if (nameUpper.includes('600ML') || nameUpper.includes('600')) return '600ml';
                      if (nameUpper.includes('300ML') || nameUpper.includes('300')) return '300ml';
                      if (nameUpper.includes('1L') || nameUpper.includes('1000ML')) return '1l';
                      return 'other';
                    };
                    
                    // Calcula garrafas baseado no tipo e quantidade de caixas
                    const calculateGarrafas = (caixas: number): number => {
                      const type = detectGarrafeiraType(product.nome || '');
                      switch (type) {
                        case '600ml':
                        case '300ml':
                          return caixas * 24;
                        case '1l':
                          return caixas * 12;
                        default:
                          return 0; // Outros produtos não convertem
                      }
                    };
                    
                    // Resumo bonito para Estoque 10 (igual ao modal)
                    const chaoCheio = product.chaoCheio || 0;
                    const chaoVazio = product.chaoVazio || 0;
                    const refugo = product.refugo || 0;
                    const avaria = product.avaria || 0;
                    
                    // Cálculos de garrafas convertidas
                    const chaoCheioGarrafas = calculateGarrafas(chaoCheio);
                    const chaoVazioGarrafas = calculateGarrafas(chaoVazio);
                    const gajPbrChaoCheio = product.chaoCheio_gajPbr || 0;
                    const gajPbrChaoVazio = product.chaoVazio_gajPbr || 0;
                    
                    const totalGarrafas = chaoCheio + chaoVazio + refugo + avaria;
                    const totalEquipamentos = (product.novo || 0) + (product.manutencao || 0) + 
                                              (product.sucata || 0) + (product.bloqueado || 0);
                    
                    // Cálculos de Garrafeiras Vazias - Correção: 1 pallet = 60 cx
                    const garrafeirasVazias = (product.garrafeirasVazias_pallets || 0) * 60 + 
                                            (product.garrafeirasVazias_lastros || 0) * 24 + 
                                            (product.garrafeirasVazias_caixas || 0);
                    const gajPbrGarrafeirasVazias = product.gajPbr || 0;
                    
                    if (totalGarrafas === 0 && totalEquipamentos === 0 && garrafeirasVazias === 0 && gajPbrChaoCheio === 0 && gajPbrChaoVazio === 0 && gajPbrGarrafeirasVazias === 0) return null;
                    
                    return (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-gray-800 mb-2 text-xs">Resumo da Contagem</h4>
                        
                        {/* Resumos de Garrafeiras com conversões */}
                        {(chaoCheioGarrafas > 0 || chaoVazioGarrafas > 0) && (
                          <div className="space-y-2 mb-3">
                            {/* Resumo Chão Cheio */}
                            {chaoCheioGarrafas > 0 && (
                              <div className="bg-green-50 p-2 rounded border border-green-200">
                                <div className="text-xs font-bold text-green-800 mb-1">📊 RESUMO CHÃO CHEIO</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-green-700">Total Garrafas Ch.Cheio:</span>
                                    <span className="font-bold text-green-800">{chaoCheioGarrafas} un</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-green-700">Total Garrafeiras Ch.Cheio:</span>
                                    <span className="font-bold text-green-800">{chaoCheio} cx</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-green-700">Total GAJ/PBR Ch.Cheio:</span>
                                    <span className="font-bold text-green-800">{gajPbrChaoCheio}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Resumo Chão Vazio */}
                            {chaoVazioGarrafas > 0 && (
                              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                <div className="text-xs font-bold text-blue-800 mb-1">📊 RESUMO CHÃO VAZIO</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-blue-700">Total Garrafas Ch.Vazio:</span>
                                    <span className="font-bold text-blue-800">{chaoVazioGarrafas} un</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-blue-700">Total Garrafeiras Ch.Vazio:</span>
                                    <span className="font-bold text-blue-800">{chaoVazio} cx</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-blue-700">Total GAJ/PBR Ch.Vazio:</span>
                                    <span className="font-bold text-blue-800">{gajPbrChaoVazio}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Garrafeiras Vazias */}
                        {garrafeirasVazias > 0 && (
                          <div className="bg-purple-50 p-2 rounded border border-purple-200 mb-2">
                            <div className="text-xs font-bold text-purple-800 mb-1">📦 Garrafeiras Vazias</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-purple-700">Total (CX):</span>
                                <span className="font-bold text-purple-800">{garrafeirasVazias} cx</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-700">GAJ/PBR:</span>
                                <span className="font-bold text-purple-800">{gajPbrGarrafeirasVazias} un</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Resumo tradicional para outros campos */}
                        {(refugo > 0 || avaria > 0) && (
                          <div className="mb-2">
                            <div className="text-xs font-medium text-gray-600 mb-1">Outros:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {refugo > 0 && (
                                <div><span className="font-medium">Refugo:</span> <span className="text-blue-600 font-bold">{refugo} cx</span></div>
                              )}
                              {avaria > 0 && (
                                <div><span className="font-medium">Avaria:</span> <span className="text-blue-600 font-bold">{avaria} cx</span></div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {totalEquipamentos > 0 && (
                          <div className={totalGarrafas > 0 ? "border-t border-blue-300 pt-2" : ""}>
                            <div className="text-xs font-medium text-gray-600 mb-1">EQUIPAMENTOS:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {(product.novo || 0) > 0 && (
                                <div><span className="font-medium">Novo:</span> <span className="text-blue-600 font-bold">{product.novo} un</span></div>
                              )}
                              {(product.manutencao || 0) > 0 && (
                                <div><span className="font-medium">Manutenção:</span> <span className="text-blue-600 font-bold">{product.manutencao} un</span></div>
                              )}
                              {(product.sucata || 0) > 0 && (
                                <div><span className="font-medium">Sucata:</span> <span className="text-blue-600 font-bold">{product.sucata} un</span></div>
                              )}
                              {(product.bloqueado || 0) > 0 && (
                                <div><span className="font-medium">Bloqueado:</span> <span className="text-blue-600 font-bold">{product.bloqueado} un</span></div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 pt-2 border-t border-blue-300 text-right">
                          <span className="text-xs font-semibold text-gray-700">Total Geral: </span>
                          <span className="text-sm font-bold text-blue-700">{totalGarrafas + totalEquipamentos}</span>
                        </div>
                      </div>
                    );
                  } else if (tipoEstoque === '23') {
                    // Exibe campo do Estoque 23 (simplificado)
                    const totalUn = product.un || 0;
                    
                    if (totalUn === 0) return null;
                    
                    return (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-gray-800 mb-2 text-xs">Resumo da Contagem</h4>
                        <div className="text-sm">
                          <span className="font-medium">UN:</span> <span className="text-green-600 font-bold">{totalUn}</span>
                        </div>
                      </div>
                    );
                  } else {
                    // Exibe campos do Estoque 11 (padrão)
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div><span className="font-medium">Pallets:</span> {product.pallets}</div>
                        <div><span className="font-medium">Lastros:</span> {product.lastros}</div>
                        <div><span className="font-medium">Pacotes:</span> {product.pacotes}</div>
                        <div><span className="font-medium">Unidades:</span> {product.unidades}</div>
                      </div>
                    );
                  }
                })()}

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
                  <div className="p-3 rounded-lg mt-3 text-sm font-medium bg-blue-50">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="text-left">Total Unidades:</div>
                      <div className="text-right font-bold">{calculateProductTotal(product).toLocaleString()}</div>
                      
                      <div className="text-left">Total Pacotes:</div>
                      <div className="text-right font-bold">{(product.totalPacotes ?? 0).toLocaleString()}</div>
                    </div>
                  </div>
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
        onResetSaving={() => setIsSavePending(false)}
      />

      <ProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onAddProduct={handleAddProduct}
        estoqueId={undefined}
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
        tipoEstoque={tipoEstoque}
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
