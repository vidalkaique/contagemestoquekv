import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Check, Trash2, Package, Search, Pencil, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCountDate } from "@/hooks/use-count-date";
import { useUnfinishedCount } from "@/hooks/use-counts";

// Types for Excel handling
type ExcelRowType = {
  getCell: (key: string) => { value: any };
  number: number;
  values: Record<string, any>;
};

type Row = {
  getCell: (key: string) => { value: any; fill: any };
  number: number;
  values: Record<string, any>;
};

// Component imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductModal from "@/components/product-modal";
import { ImportStockScreen } from "@/components/import-stock-screen";

// Supabase and local storage
import { supabase } from "@/lib/supabase";
import { 
  saveCurrentCount, 
  getCurrentCount, 
  clearCurrentCount, 
  saveToCountHistory, 
  getCountHistory, 
  type CurrentCount 
} from "@/lib/localStorage";

// Types
import type { 
  InsertContagem, 
  InsertItemContagem, 
  ContagemWithItens 
} from "@shared/schema";

interface ProductItem {
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
  quantidade_sistema?: number;
  valor_total?: number;
  created_at?: string;
  updated_at?: string;
  contagem_id?: string;
  produto_id?: string | null;
  nome_livre?: string | null;
  total?: number;
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

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
    return totalFromPallets + totalFromLastros + (product.pacotes || 0);
  };

  // Função para calcular o total de unidades de um produto (versão consolidada)
  const calculateProductTotal = useCallback((product: ProductItem | Omit<ProductItem, 'id' | 'created_at'>): number => {
    // Se o produto tiver preço médio e quantidade contada, usa esses valores
    if ('preco_medio' in product && 'quantidade_contada' in product) {
      const preco_medio = Number(product.preco_medio) || 0;
      const quantidade_contada = Number(product.quantidade_contada) || 0;
      return preco_medio * quantidade_contada;
    }
    
    // Caso contrário, calcula com base nas unidades
    return (
      (product.pallets || 0) * (product.lastrosPorPallet || 0) * (product.pacotesPorLastro || 0) * (product.unidadesPorPacote || 0) +
      (product.lastros || 0) * (product.pacotesPorLastro || 0) * (product.unidadesPorPacote || 0) +
      (product.pacotes || 0) * (product.unidadesPorPacote || 0) +
      (product.unidades || 0)
    );
  }, []);

  // Função para calcular o total de pacotes de um produto (versão consolidada)
  const calculateTotalPacotes = useCallback((product: ProductItem | Omit<ProductItem, 'id' | 'created_at'>): number => {
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
  }, []);

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
   * Processa os produtos importados e os adiciona à contagem
   * @param importedProducts Lista de produtos importados
   */
  const handleImportComplete = async (importedProducts: Array<{ id: string; quantidade: number; codigo?: string } | { codigo: string; quantidade: number; id?: string }>) => {
    if (!importedProducts.length) {
      toast({
        title: "Nenhum produto para importar",
        description: "A planilha não contém produtos válidos para importação.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Primeiro, obter todos os IDs de produtos únicos
      const produtoIds = importedProducts
        .filter((p): p is { id: string; quantidade: number; codigo?: string } => 
          !!p.id && typeof p.id === 'string' && !p.id.startsWith('free-'))
        .map(p => p.id);
      
      // Busca os produtos do banco de dados para obter os detalhes completos
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('*')
        .in('id', produtoIds);
      
      if (error) {
        console.error("Erro ao buscar produtos:", error);
        throw new Error("Não foi possível buscar os detalhes dos produtos");
      }
      
      // Mapeia os produtos encontrados por ID para busca rápida
      const produtosPorId = new Map(
        (produtos || []).map(p => [p.id, p])
      );
      
      // Processa cada produto importado
      let produtosAdicionados = 0;
      let produtosNaoEncontrados: string[] = [];
      
      // Usar um Map para evitar duplicatas
      const produtosUnicos = new Map<string, {id: string; quantidade: number; codigo?: string; }>();
      
      // Agrupa produtos pelo ID para evitar duplicatas
      for (const item of importedProducts) {
        if (item.id && typeof item.id === 'string') {
          // Se tiver ID, usa como chave
          produtosUnicos.set(item.id, { 
            id: item.id, 
            quantidade: item.quantidade, 
            codigo: 'codigo' in item ? item.codigo : undefined 
          });
        } else if (item.codigo) {
          // Se não tiver ID, mas tiver código, usa o código como chave
          produtosUnicos.set(`code-${item.codigo}`, { 
            id: `code-${item.codigo}`, 
            quantidade: item.quantidade, 
            codigo: item.codigo 
          });
        }
        // Ignora itens sem ID nem código
      }
      
      console.log('Iniciando processamento de', produtosUnicos.size, 'produtos únicos');
      
      // Cria um array de Promises para processar cada produto
      const promises = Array.from(produtosUnicos.entries()).map(async ([id, item]) => {
        const produto = produtosPorId.get(id);
        
        if (!produto) {
          const codigoOuId = item.codigo || id;
          if (codigoOuId && !codigoOuId.startsWith('code-')) {
            return { success: false, id: codigoOuId };
          }
          return { success: false, id: 'id-desconhecido' };
        }
        
        // Processa o produto encontrado
        try {
          // Cria um novo produto no formato esperado
          const newProduct: ProductItem = {
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome || 'Produto sem nome',
            pallets: 0,
            lastros: 0,
            pacotes: item.quantidade || 0,
            unidades: 0,
            totalPacotes: item.quantidade || 0,
            unidadesPorPacote: produto.quantidade_por_pacote || 1,
            pacotesPorLastro: produto.pacotes_por_lastro || 1,
            lastrosPorPallet: produto.lastros_por_palete || 1,
            quantidadePacsPorPallet: (produto.pacotes_por_lastro || 1) * (produto.lastros_por_palete || 1)
          };
          
          // Atualiza o estado dos produtos
          setProducts(prevProducts => [...prevProducts, newProduct]);
          
          return { success: true, id: produto.id };
        } catch (error) {
          console.error('Erro ao processar produto:', error);
          return { success: false, id: produto.id };
        }
      });
      
      // Aguarda todas as Promises serem resolvidas
      const results = await Promise.all(promises);
      
      // Conta produtos adicionados e não encontrados
      const produtosAdicionados = results.filter(r => r.success).length;
      const produtosNaoEncontrados = results.filter(r => !r.success && r.id !== 'id-desconhecido').map(r => r.id);
      
      // Exibe mensagem de sucesso com resumo da importação
      let message = `${produtosAdicionados} produtos importados com sucesso.`;
      
      if (produtosNaoEncontrados.length > 0) {
        message += ` ${produtosNaoEncontrados.length} produtos não foram encontrados no cadastro e foram adicionados como itens livres.`;
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

const handleStartEdit = (index: number) => {
  setEditingProductIndex(index);
  setEditingProduct(products[index]);
};

const handleRemoveProduct = (index: number) => {
  setProducts(prev => prev.filter((_, i) => i !== index));
};

  const handleEditFieldChange = (field: keyof ProductItem, value: any) => {
    if (editingProductIndex === null || !editingProduct) return;
    
    setEditingProduct(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  // Função para salvar as alterações de um produto em edição
  const handleSaveEdit = (index: number) => {
    if (editingProduct === null) return;
    
    setProducts(prev => {
      const newProducts = [...prev];
      newProducts[index] = editingProduct;
      
      // Atualiza o localStorage
      saveCurrentCount({
        id: currentCountId || 'temp',
        date: countDate || new Date().toISOString().split('T')[0],
        products: newProducts,
        createdAt: new Date().toISOString()
      });
      
      return newProducts;
    });
    
    // Limpa o estado de edição
    setEditingProduct(null);
    setEditingProductIndex(null);
  };

  // Função para cancelar a edição de um produto
  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditingProductIndex(null);
  };

  // ... (rest of the code remains the same)

  // Função para gerar e salvar o Excel
  const generateAndSaveExcel = async (countId: string, countData: any, items: any[]): Promise<string> => {
    console.log('=== INÍCIO DA GERAÇÃO DO EXCEL ===');
    console.log('countData:', JSON.stringify(countData, null, 2));
    console.log('items:', JSON.stringify(items, null, 2));
    
    try {
      const { Workbook } = await import('exceljs');
      const excelWorkbook = new Workbook();
      const excelWorksheet = excelWorkbook.addWorksheet('Contagem');
      
      // Configuração do cabeçalho
      excelWorksheet.columns = [
        { header: 'Código', key: 'codigo', width: 15 },
        { header: 'Produto', key: 'produto', width: 40 },
        { header: 'Pallets', key: 'pallets', width: 10 },
        { header: 'Lastros', key: 'lastros', width: 10 },
        { header: 'Pacotes', key: 'pacotes', width: 10 },
        { header: 'Unidades', key: 'unidades', width: 10 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Total Pacotes', key: 'total_pacotes', width: 15 }
      ];

      // Adiciona os dados dos itens
      items.forEach(item => {
        excelWorksheet.addRow({
          codigo: item.codigo || 'N/A',
          produto: item.nome,
          pallets: item.pallets || 0,
          lastros: item.lastros || 0,
          pacotes: item.pacotes || 0,
          unidades: item.unidades || 0,
          total: item.total || 0,
          total_pacotes: item.totalPacotes || 0
        });
      });

      // Gera o buffer do arquivo Excel
      const buffer = await excelWorkbook.xlsx.writeBuffer();
      
      // Cria um Blob e uma URL para download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      
      // Cria um link temporário para download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contagem_${countId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      
      // Limpa o link temporário
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return url;
    } catch (error) {
      console.error('Erro ao gerar o Excel:', error);
      throw error;
    }
  };

// ... (rest of the code remains the same)

// Adicionando produto ao estado
console.log('Adicionando produto ao estado:', { 
  id: newProduct.id, 
  codigo: product.codigo,
  quantidade: product.quantidade_sistema,
  totalPacotes: newProduct.totalPacotes,
  valor_total: newProduct.valor_total
});

// State for import results
const [importResults, setImportResults] = useState<{ added: number; notFound: string[] }>({ added: 0, notFound: [] });

/**
 * Processa os produtos importados e os adiciona à contagem
 * @param importedProducts Lista de produtos importados
 */
const handleImportComplete = async (importedProducts: Array<{ id?: string; quantidade: number; codigo?: string }>) => {
  if (!importedProducts.length) {
    toast({
      title: "Nenhum produto para importar",
      description: "A planilha não contém produtos válidos para importação.",
      variant: "destructive",
    });
    return;
  }

  try {
    // Primeiro, obter todos os IDs de produtos únicos
    const produtoIds = importedProducts
      .filter((p): p is { id: string; quantidade: number; codigo?: string } => 
        !!p.id && typeof p.id === 'string' && !p.id.startsWith('free-'))
      .map(p => p.id);
      
      // Busca os produtos do banco de dados para obter os detalhes completos
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('*')
        .in('id', produtoIds);
      
      if (error) {
        console.error("Erro ao buscar produtos:", error);
        throw new Error("Não foi possível buscar os detalhes dos produtos");
      }
      
      // Mapeia os produtos encontrados por ID para busca rápida
      const produtosPorId = new Map(
        (produtos || []).map(p => [p.id, p])
      );
      
      // Processa cada produto importado
      let produtosAdicionados = 0;
      let produtosNaoEncontrados: string[] = [];
      
      // Usar um Map para evitar duplicatas
      const produtosUnicos = new Map<string, {id: string; quantidade: number; codigo?: string; }>();
      
      // Agrupa produtos pelo ID para evitar duplicatas
      for (const item of importedProducts) {
        if (item.id && typeof item.id === 'string') {
          // Se tiver ID, usa como chave
          produtosUnicos.set(item.id, { 
            id: item.id, 
            quantidade: item.quantidade, 
            codigo: 'codigo' in item ? item.codigo : undefined 
          });
        } else if (item.codigo) {
          // Se não tiver ID, mas tiver código, usa o código como chave
          produtosUnicos.set(`code-${item.codigo}`, { 
            id: `code-${item.codigo}`, 
            quantidade: item.quantidade, 
            codigo: item.codigo 
          });
        }
        // Ignora itens sem ID nem código
      }
      
      console.log('Iniciando processamento de', produtosUnicos.size, 'produtos únicos');
      
      // Cria um array de Promises para processar cada produto
      const promises = Array.from(produtosUnicos.entries()).map(async ([id, item]) => {
        const produto = produtosPorId.get(id);
        
        if (!produto) {
          const codigoOuId = item.codigo || id;
          if (codigoOuId && !codigoOuId.startsWith('code-')) {
            return { success: false, id: codigoOuId };
          }
          return { success: false, id: 'id-desconhecido' };
        }
        
        try {
          console.log('Adicionando produto:', { id: produto.id, codigo: produto.codigo, quantidade: item.quantidade });
          
          // Cria uma promessa para adicionar o produto
          await new Promise<void>((resolve) => {
            handleAddProduct({
              id: produto.id,
              codigo: produto.codigo,
              nome: produto.nome,
              pallets: 0,
              lastros: 0,
              pacotes: 0,
              unidades: 0,
              totalPacotes: 0,
              quantidade_sistema: item.quantidade,
              quantidade_contada: 0,
              diferenca: 0,
              preco_medio: produto.preco_medio || 0,
              valor_total: 0,
              ativo: produto.ativo || true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              quantidade_pacs_por_pallet: produto.quantidade_pacs_por_pallet || 0
            });
            // Dá um pequeno delay entre as adições para evitar sobrecarga
            setTimeout(resolve, 50);
          });
          
          return { success: true, id: produto.id };
        } catch (error) {
          console.error('Erro ao adicionar produto:', { id: produto.id, error });
          return { success: false, id: produto.id, error };
        }
      });
      
      // Aguarda todas as operações de adição serem concluídas
      const results = await Promise.all(promises);
      
      // Conta os sucessos e falhas
      const sucessos = results.filter(r => r.success).length;
      const falhas = results.length - sucessos;
      
      console.log('Resultado da importação:', { total: results.length, sucessos, falhas });
      
      // Atualiza o estado com os resultados
      const notFoundIds = results
        .filter((r): r is { success: false; id: string } => !r.success && r.id !== 'id-desconhecido')
        .map(r => r.id);
      
      setImportResults({
        added: sucessos,
        notFound: notFoundIds
      });
      
      // Exibe feedback para o usuário
      if (sucessos > 0) {
        toast({
          title: "Importação concluída",
          description: `${sucessos} produtos importados com sucesso.`,
        });
      }
      
      if (notFoundIds.length > 0) {
        toast({
          title: "Atenção",
          description: `${notFoundIds.length} produtos não foram encontrados no sistema.`,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("Erro ao importar produtos:", error);
      toast({
        title: "Erro ao importar produtos",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const generateAndSaveExcel = async (countId: string, countData: any, items: any[]): Promise<string> => {
    console.log('=== INÍCIO DA GERAÇÃO DO EXCEL ===');
    console.log('countData:', JSON.stringify(countData, null, 2));
    console.log('items:', JSON.stringify(items, null, 2));
    
    try {
      const { Workbook } = await import('exceljs');
      const excelWorkbook = new Workbook();
      const excelWorksheet = excelWorkbook.addWorksheet('Contagem');
      
      // Configuração do cabeçalho
      excelWorksheet.columns = [
        { header: 'Código', key: 'codigo', width: 15 },
        { header: 'Produto', key: 'nome', width: 40 },
        { header: 'Pallets', key: 'pallets', width: 10 },
        { header: 'Lastros', key: 'lastros', width: 10 },
        { header: 'Pacotes', key: 'pacotes', width: 10 },
        { header: 'Unidades', key: 'unidades', width: 10 },
        { header: 'Total Pacotes', key: 'totalPacotes', width: 15 },
        { header: 'Preço Médio', key: 'preco_medio', width: 15 },
        { header: 'Valor Total', key: 'valor_total', width: 15 }
      ];
      
      // Adiciona os dados dos itens
      items.forEach((item: any) => {
        excelWorksheet.addRow({
          codigo: item.codigo || '',
          nome: item.nome || '',
          pallets: item.pallets || 0,
          lastros: item.lastros || 0,
          pacotes: item.pacotes || 0,
          unidades: item.unidades || 0,
          totalPacotes: item.totalPacotes || 0,
          preco_medio: item.preco_medio || 0,
          valor_total: item.valor_total || 0
        });
      });
      
      // Adiciona formatação condicional para destacar valores
      excelWorksheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber > 1) { // Pula o cabeçalho
          const valorTotalCell = row.getCell(9); // Coluna I (9) = Valor Total
          const valorTotal = Number(valorTotalCell.value) || 0;
          
          if (valorTotal > 0) {
            // Usando type assertion para evitar erros de tipo
            (valorTotalCell as any).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE6F3FF' }
            };
          }
        }
      });
      
      // Formata a data atual para o nome do arquivo
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toISOString().split('T')[0];
      
      // Gera o buffer do arquivo
      const buffer = await excelWorkbook.xlsx.writeBuffer();
      
      // Cria um blob e URL para download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      // Cria um link temporário para download
      const a = document.createElement('a');
      a.href = url;
      a.download = `contagem_${countId}_${dataFormatada}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Limpa o link após o download
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      return url;
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      throw error;
    }
    
    // O código após o bloco try-catch não será executado devido ao return dentro do bloco try
    // Removendo código inalcançável
    
    // Tenta obter o nome do estoque de várias fontes possíveis
    let estoqueNome = 'NÃO INFORMADO';
    
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
    
    // Formata a data atual para exibição
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
    
    // Adiciona a linha com as informações do estoque e data
    const estoqueInfo = excelWorksheet.addRow([
      `Estoque: ${countData.estoque?.nome || countData.estoques?.[0]?.nome || countData.estoque_id || 'N/A'}`,
      '', '', '', '', '', '',
      `Data: ${new Date().toLocaleDateString('pt-BR')}`
    ]);
    
    // Estilizar informações do estoque
    (estoqueInfo as any).font = { bold: true };
    (estoqueInfo as any).alignment = { horizontal: 'left' };
    excelWorksheet.mergeCells('A2:D2');
    excelWorksheet.mergeCells('G2:H2');
    
    // Adicionar linha em branco
    excelWorksheet.addRow([]);
    
    // Cabeçalhos
    const headerTitles = [
      "CÓDIGO", "PRODUTO", "PALLETS", "LASTROS", "PACOTES", "UNIDADES", "TOTAL", "TOTAL PACOTES"
    ];
    
    const headerRow = excelWorksheet.addRow(headerTitles);
    (headerRow as any).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    (headerRow as any).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5496' }
    };
    
    // Inicializa o mapa de códigos de produto se não existir
    const productCodesMap = new Map();
    
    // Função para obter o código do produto de várias fontes possíveis
    const getProductCode = (item: any): string => {
      // 1. Primeiro tenta pegar o código diretamente do item
      if (item.codigo) {
        console.log('Usando código direto do item:', item.codigo);
        return item.codigo;
      }

      // 2. Tenta pegar de propriedades aninhadas
      const nestedCode = item.produto?.codigo || 
                        item.produto?.codigo_barras || 
                        item.produto?.referencia ||
                        item.codigo_barras ||
                        item.referencia;
      
      if (nestedCode) {
        console.log('Usando código de propriedades aninhadas:', nestedCode);
        return nestedCode;
      }

      // 3. Tenta usar o mapa de códigos (se disponível)
      const possibleIds = [
        item.product_id,
        item.id,
        item.produto_id,
        item.produto?.id
      ].filter(Boolean);

      for (const id of possibleIds) {
        if (productCodesMap?.has(id)) {
          const productInfo = productCodesMap.get(id);
          if (productInfo?.codigo) {
            console.log('Usando código do mapa:', productInfo.codigo);
            return productInfo.codigo;
          }
        }
      }

      // 4. Tenta extrair de qualquer campo que possa conter o código
      const codeFields = [
        'codigo', 'codigo_barras', 'referencia', 'code', 'barcode', 'sku',
        'produto.codigo', 'produto.codigo_barras', 'produto.referencia',
        'produto.code', 'produto.barcode', 'produto.sku'
      ];
      
      for (const field of codeFields) {
        try {
          const value = field.split('.').reduce((obj, key) => obj?.[key], item);
          if (value) {
            console.log(`Usando código do campo ${field}:`, value);
            return value.toString();
          }
        } catch (error) {
          console.warn(`Erro ao acessar campo ${field}:`, error);
        }
      }

      // 5. Se nada mais funcionar, retorna o ID como último recurso
      console.log('Nenhum código encontrado, usando ID como fallback:', item.id);
      return item.id || 'N/A';
    };
    
    // Adicionar dados
    for (let index = 0; index < items.length; index++) {
      const item: any = items[index];
      console.log(`\n=== Processando item ${index + 1}/${items.length} ===`);
      console.log('Estrutura completa do item:', JSON.stringify(item, null, 2));
      
      // Verifica se é um produto livre (sem ID de produto cadastrado)
      const isFreeProduct = item.id?.startsWith('free-');
      console.log('É produto livre?', isFreeProduct);
      
      // Calcula totais se não estiverem definidos
      const totalPacotes = item.totalPacotes || calculateTotalPacotes(item);
      const totalUnidades = item.total || calculateProductTotal(item);

      // Obtém o código do produto usando a função auxiliar
      const codigoProduto = isFreeProduct ? 'N/A' : getProductCode(item);
      
      console.log('Código do produto a ser exibido:', codigoProduto);
      
      // Obtém o nome do produto
      const nomeProduto = item.nome || 'Produto não cadastrado';
      
      // Adiciona a linha com os dados formatados
      excelWorksheet.addRow([
        // Código do produto ou 'N/A' para produtos livres
        isFreeProduct ? 'N/A' : codigoProduto,
        // Nome do produto
        nomeProduto,
        // Quantidades
        item.pallets || 0,
        item.lastros || 0,
        item.pacotes || 0,
        item.unidades || 0,
        // Total de unidades
        totalUnidades,
        // Total de pacotes
        totalPacotes
      ]);
    }
    
    // ============================================
    // CRIANDO A ABA DE ANÁLISE
    // ============================================
    
    const analysisWorksheet = excelWorkbook.addWorksheet('Análise');
    
    // Configurar largura das colunas
    analysisWorksheet.columns = [
      { key: 'codigo', width: 15 },
      { key: 'produto', width: 40 },
      { key: 'sistema', width: 15 },
      { key: 'contado', width: 15 },
      { key: 'diferenca', width: 15 }
    ];
    
    // Título da planilha
    const analysisTitleRow = analysisWorksheet.addRow(['ANÁLISE DE DIVERGÊNCIAS']);
    (analysisTitleRow as any).font = { bold: true, size: 16, color: { argb: 'FF2F5496' } };
    (analysisTitleRow as any).alignment = { horizontal: 'center' };
    analysisWorksheet.mergeCells('A1:E1');
    
    // Informações da contagem
    analysisWorksheet.addRow([`Data: ${dataFormatada}`]);
    analysisWorksheet.addRow([`Estoque: ${estoqueNome}`]);
    analysisWorksheet.addRow([]); // Linha em branco
    
    // Cabeçalhos
    const analysisHeaderRow = analysisWorksheet.addRow([
      'CÓDIGO',
      'PRODUTO',
      'SISTEMA',
      'CONTADO',
      'DIFERENÇA (SISTEMA - CONTADO)'
    ]);
    
    // Estilizar cabeçalho
    (analysisHeaderRow as any).font = { 
      bold: true, 
      color: { argb: 'FFFFFFFF' },
      size: 12
    };
    
    (analysisHeaderRow as any).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5496' }
    };
    
    // Adicionar dados dos itens
    for (const item of items) {
      const isFreeProduct = item.id?.startsWith('free-');
      const codigoProduto = isFreeProduct ? 'N/A' : getProductCode(item);
      const nomeProduto = item.nome || 'Produto não cadastrado';
      const totalPacotes = item.totalPacotes || calculateTotalPacotes(item);
      
      // Primeiro, adiciona a linha com os dados básicos
      const row = analysisWorksheet.addRow([
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
      const rowNumber = (row as any).number;
      (row.getCell('E') as any).value = { formula: `C${rowNumber}-D${rowNumber}`, result: 0 };
      
      // Formatar a célula de diferença como número
      const diffCell = row.getCell('E');
      (diffCell as any).numFmt = '#,##0';
    }
    
    // Adicionar formatação condicional para a coluna de diferença
    const lastRow = analysisWorksheet.rowCount;
    
    // Estilo para valores positivos (verde)
    (analysisWorksheet as any).addConditionalFormatting({
      ref: `E5:E${lastRow}`, // A partir da linha 5 (após cabeçalhos e informações)
      rules: [
        {
          type: 'cellIs',
          operator: 'greaterThan',
          priority: 1,
          formulae: ['0'],
          style: { 
            font: { color: { argb: 'FF107C41' } }, // Verde escuro
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } } // Verde claro
          }
        },
        {
          type: 'cellIs',
          operator: 'lessThan',
          priority: 2,
          formulae: ['0'],
          style: { 
            font: { color: { argb: 'FF9C0006' } }, // Vermelho escuro
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } } // Vermelho claro
          }
        },
        {
          type: 'cellIs',
          operator: 'equal',
          priority: 3,
          formulae: ['0'],
          style: { 
            font: { color: { argb: 'FF9C5700' } }, // Laranja escuro
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } } // Amarelo claro
          }
        }
      ]
    });
    
    // Ajustar alinhamento das células
    analysisWorksheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber > 4) { // Pular cabeçalhos e informações iniciais
        ['A', 'B', 'C', 'D', 'E'].forEach((col: string) => {
          const cell = row.getCell(col);
          (cell as any).alignment = { 
            vertical: 'middle',
            horizontal: col === 'B' ? 'left' : 'center'
          };
        });
      }
    });
    
    // Gerar o arquivo Excel
    const buffer = await excelWorkbook.xlsx.writeBuffer();
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
              <div key={product.id} className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg flex-1 pr-2">
                    {product.nome}
                    {product.codigo && (
                      <span className="text-sm text-gray-500 ml-2">(Código: {product.codigo})</span>
                    )}
                  </h3>
                  <div className="flex space-x-1">
                    {editingProductIndex === index ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleSaveEdit(index)}
                          className="h-8 w-8"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleCancelEdit}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleStartEdit(index)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveProduct(index)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                  <div>
                    <span className="text-gray-500">Pallets:</span>
                    {editingProductIndex === index ? (
                      <Input 
                        type="number" 
                        min="0" 
                        value={editingProduct?.pallets || ''}
                        onChange={(e) => handleEditFieldChange('pallets', parseInt(e.target.value) || 0)}
                        className="h-8 w-20 inline-block ml-1"
                      />
                    ) : (
                      <span className="font-medium ml-1">{product.pallets}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Lastros:</span>
                    {editingProductIndex === index ? (
                      <Input 
                        type="number" 
                        min="0" 
                        value={editingProduct?.lastros || ''}
                        onChange={(e) => handleEditFieldChange('lastros', parseInt(e.target.value) || 0)}
                        className="h-8 w-20 inline-block ml-1"
                      />
                    ) : (
                      <span className="font-medium ml-1">{product.lastros}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Pacotes:</span>
                    {editingProductIndex === index ? (
                      <Input 
                        type="number" 
                        min="0" 
                        value={editingProduct?.pacotes || ''}
                        onChange={(e) => handleEditFieldChange('pacotes', parseInt(e.target.value) || 0)}
                        className="h-8 w-20 inline-block ml-1"
                      />
                    ) : (
                      <span className="font-medium ml-1">{product.pacotes}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Unidades:</span>
                    {editingProductIndex === index ? (
                      <Input 
                        type="number" 
                        min="0" 
                        value={editingProduct?.unidades || ''}
                        onChange={(e) => handleEditFieldChange('unidades', parseInt(e.target.value) || 0)}
                        className="h-8 w-20 inline-block ml-1"
                      />
                    ) : (
                      <span className="font-medium ml-1">{product.unidades}</span>
                    )}
                  </div>
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

      <ProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onAddProduct={handleAddProduct}
        estoqueId={unfinishedCount?.estoqueId || undefined}
      />
      
      <ImportStockScreen
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        contagemId={currentCountId || `draft-${Date.now()}`}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
