import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Check, Trash2, Package, Search, Pencil, X, Upload } from "lucide-react";

// Hooks
import { useToast } from "@/hooks/use-toast";
import { useCountDate } from "@/hooks/use-count-date";
import { useUnfinishedCount } from "@/hooks/use-counts";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductModal from "@/components/product-modal";
import { ImportStockScreen } from "@/components/import-stock-screen";

// Services
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

// Types
interface ProductItem {
  id: string;
  codigo?: string;
  nome: string;
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
  pacotesPorLastro: number;
  lastrosPorPallet: number;
  unidadesPorPacote: number;
  quantidadePacsPorPallet?: number;
  total?: number;
  totalPacotes?: number;
}

// Constants
const INITIAL_PRODUCT: Omit<ProductItem, 'id'> = {
  nome: '',
  codigo: '',
  pallets: 0,
  lastros: 0,
  pacotes: 0,
  unidades: 0,
  pacotesPorLastro: 0,
  lastrosPorPallet: 0,
  unidadesPorPacote: 0,
  quantidadePacsPorPallet: 0
};

function NewCountRefactored() {
  // Hooks
  const [, setLocation] = useLocation();
  const { id: routeContagemId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { countDate, setCountDate } = useCountDate();
  
  // Carrega a contagem não finalizada, se existir
  const { data: unfinishedCount } = useUnfinishedCount();

  // Estados do componente
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [currentCountId, setCurrentCountId] = useState<string | undefined>(undefined);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  // Efeito para carregar os dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Verifica se há uma contagem não finalizada
        if (unfinishedCount) {
          setCurrentCountId(unfinishedCount.id);
          setCountDate(new Date(unfinishedCount.data).toISOString().split('T')[0]);
          
          // Carrega os produtos da contagem não finalizada
          if (unfinishedCount.itens && unfinishedCount.itens.length > 0) {
            const formattedProducts = unfinishedCount.itens.map(item => ({
              id: item.id,
              codigo: item.codigo || '',
              nome: item.nome_livre || item.produto?.nome || 'Produto sem nome',
              pallets: item.pallets || 0,
              lastros: item.lastros || 0,
              pacotes: item.pacotes || 0,
              unidades: item.unidades || 0,
              pacotesPorLastro: item.produto?.pacotes_por_lastro || 0,
              lastrosPorPallet: item.produto?.lastros_por_pallet || 0,
              unidadesPorPacote: item.produto?.unidades_por_pacote || 0,
              quantidadePacsPorPallet: item.produto?.quantidade_pacs_por_pallet || 0,
              total: item.total || 0,
              totalPacotes: item.total_pacotes || 0
            }));
            
            setProducts(formattedProducts as ProductItem[]);
          }
        } else if (routeContagemId) {
          // Carrega uma contagem existente pelo ID da rota
          loadCount(routeContagemId);
        } else {
          // Carrega do localStorage se não houver contagem não finalizada
          const savedCount = getCurrentCount();
          if (savedCount) {
            setProducts(savedCount.products || []);
            setCountDate(savedCount.date);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da contagem",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [routeContagemId, unfinishedCount]);

  // Função para carregar uma contagem específica
  const loadCount = async (countId: string) => {
    try {
      setIsLoading(true);
      
      const { data: count, error } = await supabase
        .from('contagens')
        .select(`
          *,
          itens:itens_contagem (
            *,
            produto:produtos(*)
          )
        `)
        .eq('id', countId)
        .single();

      if (error) throw error;
      if (!count) throw new Error('Contagem não encontrada');

      setCurrentCountId(count.id);
      setCountDate(new Date(count.data).toISOString().split('T')[0]);
      
      if (count.itens && count.itens.length > 0) {
        const formattedProducts = count.itens.map((item: any) => ({
          id: item.id,
          codigo: item.codigo || '',
          nome: item.nome_livre || item.produto?.nome || 'Produto sem nome',
          pallets: item.pallets || 0,
          lastros: item.lastros || 0,
          pacotes: item.pacotes || 0,
          unidades: item.unidades || 0,
          pacotesPorLastro: item.produto?.pacotes_por_lastro || 0,
          lastrosPorPallet: item.produto?.lastros_por_pallet || 0,
          unidadesPorPacote: item.produto?.unidades_por_pacote || 0,
          quantidadePacsPorPallet: item.produto?.quantidade_pacs_por_pallet || 0,
          total: item.total || 0,
          totalPacotes: item.total_pacotes || 0
        }));
        
        setProducts(formattedProducts as ProductItem[]);
      }
    } catch (error) {
      console.error("Erro ao carregar contagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a contagem",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para calcular o total de um produto
  const calculateProductTotal = (product: ProductItem): number => {
    const { pallets, lastros, pacotes, unidades, pacotesPorLastro, lastrosPorPallet, unidadesPorPacote } = product;
    
    const totalFromPallets = pallets * (lastrosPorPallet || 0) * (pacotesPorLastro || 0) * (unidadesPorPacote || 0);
    const totalFromLastros = lastros * (pacotesPorLastro || 0) * (unidadesPorPacote || 0);
    const totalFromPacotes = pacotes * (unidadesPorPacote || 0);
    const totalFromUnidades = unidades || 0;
    
    return totalFromPallets + totalFromLastros + totalFromPacotes + totalFromUnidades;
  };

  // Função para calcular o total de pacotes
  const calculateTotalPacotes = (product: ProductItem): number => {
    const { pallets, lastros, pacotes, pacotesPorLastro, lastrosPorPallet } = product;
    
    const totalPallets = pallets * (lastrosPorPallet || 0) * (pacotesPorLastro || 0);
    const totalLastros = lastros * (pacotesPorLastro || 0);
    
    return totalPallets + totalLastros + pacotes;
  };

  // Função para adicionar/editar um produto
  const handleAddProduct = (product: ProductItem) => {
    const total = calculateProductTotal(product);
    const totalPacotes = calculateTotalPacotes(product);
    
    const productToAdd = {
      ...product,
      total,
      totalPacotes
    };

    setProducts(prev => {
      const newProducts = [...prev];
      
      if (editingProductIndex !== null) {
        // Edita o produto existente
        newProducts[editingProductIndex] = productToAdd;
      } else {
        // Adiciona um novo produto
        newProducts.push({
          ...productToAdd,
          id: product.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
      }
      
      // Salva no localStorage
      saveCurrentCount({
        id: currentCountId || 'temp',
        date: countDate || new Date().toISOString().split('T')[0],
        products: newProducts,
        createdAt: new Date().toISOString()
      });
      
      return newProducts;
    });
    
    // Fecha o modal e limpa o estado de edição
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setEditingProductIndex(null);
  };

  // Função para iniciar a edição de um produto
  const handleStartEdit = (index: number) => {
    setEditingProductIndex(index);
    setEditingProduct(products[index]);
    setIsProductModalOpen(true);
  };

  // Função para remover um produto
  const handleRemoveProduct = (index: number) => {
    setProducts(prev => {
      const newProducts = prev.filter((_, i) => i !== index);
      
      // Atualiza o localStorage
      saveCurrentCount({
        id: currentCountId || 'temp',
        date: countDate || new Date().toISOString().split('T')[0],
        products: newProducts,
        createdAt: new Date().toISOString()
      });
      
      return newProducts;
    });
  };

  // Função para processar a importação de produtos
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
      setIsSaving(true);
      
      // Filtra produtos com ID ou código
      const produtosComId = importedProducts.filter(p => p.id || p.codigo);
      
      // Busca os produtos no banco de dados
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('*')
        .in('id', produtosComId.map(p => p.id).filter(Boolean) as string[]);
      
      if (error) throw error;
      
      // Mapeia os produtos encontrados
      const produtosEncontrados = produtosComId
        .map(imp => {
          const produto = produtos?.find(p => p.id === imp.id || p.codigo === imp.codigo);
          if (!produto) return null;
          
          return {
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome,
            pallets: 0,
            lastros: 0,
            pacotes: imp.quantidade || 0,
            unidades: 0,
            pacotesPorLastro: produto.pacotes_por_lastro || 0,
            lastrosPorPallet: produto.lastros_por_pallet || 0,
            unidadesPorPacote: produto.unidades_por_pacote || 0,
            quantidadePacsPorPallet: produto.quantidade_pacs_por_pallet || 0
          };
        })
        .filter(Boolean) as ProductItem[];
      
      // Adiciona os produtos encontrados à lista
      setProducts(prev => {
        const newProducts = [...prev];
        
        produtosEncontrados.forEach(produto => {
          const existingIndex = newProducts.findIndex(p => p.id === produto.id);
          
          if (existingIndex >= 0) {
            // Atualiza o produto existente
            newProducts[existingIndex] = {
              ...newProducts[existingIndex],
              pacotes: (newProducts[existingIndex].pacotes || 0) + (produto.pacotes || 0)
            };
          } else {
            // Adiciona um novo produto
            newProducts.push(produto);
          }
        });
        
        // Atualiza o localStorage
        saveCurrentCount({
          id: currentCountId || 'temp',
          date: countDate || new Date().toISOString().split('T')[0],
          products: newProducts,
          createdAt: new Date().toISOString()
        });
        
        return newProducts;
      });
      
      // Fecha o modal de importação
      setIsImportModalOpen(false);
      
      toast({
        title: "Importação concluída",
        description: `${produtosEncontrados.length} produtos importados com sucesso.`,
      });
      
    } catch (error) {
      console.error("Erro ao importar produtos:", error);
      
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar os produtos. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Função para finalizar a contagem
  const handleFinalizeCount = async () => {
    if (!products.length) {
      toast({
        title: "Contagem vazia",
        description: "Adicione pelo menos um produto antes de finalizar a contagem.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsFinalizing(true);
      
      // Cria ou atualiza a contagem no banco de dados
      let contagemId = currentCountId;
      
      if (!contagemId) {
        // Cria uma nova contagem
        const { data: novaContagem, error: createError } = await supabase
          .from('contagens')
          .insert([{
            data: countDate || new Date().toISOString().split('T')[0],
            finalizada: true,
            usuario_id: (await supabase.auth.getSession()).data.session?.user.id,
            qntd_produtos: new Set(products.map(p => p.id)).size // Conta produtos únicos
          }])
          .select()
          .single();
          
        if (createError) throw createError;
        if (!novaContagem) throw new Error('Falha ao criar contagem');
        
        contagemId = novaContagem.id;
      } else {
        // Atualiza a contagem existente
        const { error: updateError } = await supabase
          .from('contagens')
          .update({
            finalizada: true,
            data: countDate || new Date().toISOString().split('T')[0],
            qntd_produtos: new Set(products.map(p => p.id)).size // Atualiza a contagem de produtos únicos
          })
          .eq('id', contagemId);
          
        if (updateError) throw updateError;
      }
      
      // Remove itens existentes da contagem
      const { error: deleteError } = await supabase
        .from('itens_contagem')
        .delete()
        .eq('contagem_id', contagemId);
        
      if (deleteError) throw deleteError;
      
      // Prepara os itens para inserção
      const itensParaInserir = products.map(produto => ({
        contagem_id: contagemId!,
        produto_id: produto.id.startsWith('temp-') ? null : produto.id,
        nome_livre: produto.nome,
        codigo: produto.codigo || null,
        pallets: produto.pallets,
        lastros: produto.lastros,
        pacotes: produto.pacotes,
        unidades: produto.unidades,
        total: calculateProductTotal(produto),
        total_pacotes: calculateTotalPacotes(produto)
      }));
      
      // Insere os itens da contagem
      const { error: insertError } = await supabase
        .from('itens_contagem')
        .insert(itensParaInserir);
        
      if (insertError) throw insertError;
      
      // Gera e salva o Excel
      const excelUrl = await generateAndSaveExcel(
        contagemId,
        { id: contagemId, data: countDate, estoque_id: 1 },
        products
      );
      
      // Atualiza a contagem com a URL do Excel
      const { error: excelUpdateError } = await supabase
        .from('contagens')
        .update({ excel_url: excelUrl })
        .eq('id', contagemId);
        
      if (excelUpdateError) throw excelUpdateError;
      
      // Limpa o estado
      clearCurrentCount();
      setProducts([]);
      setCurrentCountId(undefined);
      
      // Redireciona para a tela de sucesso
      navigate(`/count/${contagemId}/success`);
      
    } catch (error) {
      console.error("Erro ao finalizar contagem:", error);
      
      toast({
        title: "Erro ao finalizar contagem",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao finalizar a contagem.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

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
        { header: 'Produto', key: 'nome', width: 40 },
        { header: 'Pallets', key: 'pallets', width: 10 },
        { header: 'Lastros', key: 'lastros', width: 10 },
        { header: 'Pacotes', key: 'pacotes', width: 10 },
        { header: 'Unidades', key: 'unidades', width: 10 },
        { header: 'Total Pacotes', key: 'totalPacotes', width: 15 },
        { header: 'Total Unidades', key: 'total', width: 15 }
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
          totalPacotes: item.totalPacotes || calculateTotalPacotes(item),
          total: item.total || calculateProductTotal(item)
        });
      });
      
      // Adiciona formatação condicional para destacar valores
      excelWorksheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber > 1) { // Pula o cabeçalho
          const totalCell = row.getCell('H'); // Coluna H = Total Unidades
          const total = Number(totalCell.value) || 0;
          
          if (total > 0) {
            // Usando type assertion para evitar erros de tipo
            (totalCell as any).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE6F3FF' }
            };
          }
        }
      });
      
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
      const dataAtual = new Date().toLocaleDateString('pt-BR');
      analysisWorksheet.addRow([`Data: ${dataAtual}`]);
      analysisWorksheet.addRow([`Estoque: ${countData.estoque?.nome || 'NÃO INFORMADO'}`]);
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
        const codigoProduto = isFreeProduct ? 'N/A' : (item.codigo || 'N/A');
        const nomeProduto = item.nome || 'Produto não cadastrado';
        const totalPacotes = item.totalPacotes || calculateTotalPacotes(item);
        
        // Adiciona a linha com os dados básicos
        const row = analysisWorksheet.addRow([
          codigoProduto,
          nomeProduto,
          '', // Sistema (em branco para preenchimento manual)
          totalPacotes,
          ''  // Diferença (será preenchida com fórmula)
        ]);
        
        // Adiciona a fórmula para calcular a diferença
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
      
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      throw error;
    }
  };

  // Renderização condicional do conteúdo
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calcula o total geral de itens
  const totalItens = products.reduce((sum, product) => sum + (product.total || 0), 0);
  const totalPacotes = products.reduce((sum, product) => sum + (product.totalPacotes || 0), 0);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nova Contagem</h1>
            <p className="text-sm text-muted-foreground">
              Adicione os produtos para realizar a contagem de estoque
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          
          <Button 
            onClick={() => {
              setEditingProduct(null);
              setEditingProductIndex(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar Produto</span>
            <span className="sm:hidden">Produto</span>
          </Button>
        </div>
      </div>
      
      {/* Data da Contagem */}
      <div className="mb-6 max-w-xs">
        <Label htmlFor="countDate">Data da Contagem</Label>
        <Input
          id="countDate"
          type="date"
          value={countDate || ''}
          onChange={(e) => setCountDate(e.target.value)}
          className="mt-1"
        />
      </div>
      
      {/* Lista de Produtos */}
      {products.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produto</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pallets</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lastros</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pacotes</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unid.</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pac./Pallet</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((product, index) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {product.codigo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {product.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {product.pallets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {product.lastros}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {product.pacotes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {product.unidades}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                      {product.total?.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {product.totalPacotes?.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleStartEdit(index)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveProduct(index)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800 font-medium">
                  <td colSpan={6} className="px-6 py-3 text-right text-sm text-gray-900 dark:text-white">
                    Total Geral:
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-gray-900 dark:text-white">
                    {totalItens.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-gray-900 dark:text-white">
                    {totalPacotes.toLocaleString('pt-BR')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum produto adicionado</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comece adicionando um produto à contagem.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => setIsProductModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Adicionar Produto
            </Button>
          </div>
        </div>
      )}
      
      {/* Rodapé com botão de finalizar */}
      {products.length > 0 && (
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleFinalizeCount}
            disabled={isFinalizing}
            className="px-6 py-6 text-lg"
          >
            {isFinalizing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Finalizando...
              </>
            ) : (
              'Finalizar Contagem'
            )}
          </Button>
        </div>
      )}
      
      {/* Modal de Produto */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
          setEditingProductIndex(null);
        }}
        onSubmit={handleAddProduct}
        initialProduct={editingProduct}
      />
      
      {/* Modal de Importação */}
      <ImportStockScreen
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

export default NewCountRefactored;
