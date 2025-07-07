import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Workbook } from "exceljs";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  countId: string;
}

interface ItemContagem {
  id: string;
  produto_id?: string;
  nome_livre?: string;
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
  total: number;
  total_pacotes?: number;
  produtos?: {
    id: string;
    codigo: string;
    nome: string;
    unidades_por_pacote: number;
    pacotes_por_lastro: number;
    lastros_por_pallet: number;
  };
}

interface Estoque {
  id: string;
  nome: string;
}

interface Contagem {
  id: string;
  data: string;
  finalizada: boolean;
  estoque_id: string;
  estoques: {
    id: string;
    nome: string;
  } | null;
  itens_contagem: Array<ItemContagem & {
    produtos: {
      id: string;
      codigo: string;
      nome: string;
      unidades_por_pacote: number;
      pacotes_por_lastro: number;
      lastros_por_pallet: number;
      quantidade_pacs_por_pallet: number | null;
    } | null;
  }>;
}

export default function SuccessModal({ isOpen, onClose, countId }: SuccessModalProps) {
  const { toast } = useToast();

  const handleDownloadExcel = async () => {
    try {
      // Buscar dados da contagem de forma autenticada
      console.log('Buscando contagem com ID:', countId);
      
      // Primeiro, buscar a contagem principal com o estoque relacionado
      const { data: contagemData, error } = await supabase
        .from('contagens')
        .select(`
          id,
          data,
          finalizada,
          estoque_id,
          excel_url,
          estoques:estoques(
            id,
            nome
          )
        `)
        .eq('id', countId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar contagem:', error);
        throw new Error('Erro ao buscar os dados da contagem');
      }
      
      if (!contagemData) {
        throw new Error('Contagem não encontrada');
      }

      // Se já existe uma URL de Excel, redireciona para o download
      if (contagemData.excel_url) {
        window.open(contagemData.excel_url, '_blank');
        return;
      }
      
      console.log('Dados da contagem:', contagemData);
      
      // Depois, buscar os itens da contagem com os produtos relacionados
      const { data: itensData, error: itensError } = await supabase
        .from('itens_contagem')
        .select(`
          id,
          produto_id,
          nome_livre,
          pallets,
          lastros,
          pacotes,
          unidades,
          total,
          total_pacotes,
          produtos:produtos!left(
            id,
            codigo,
            nome,
            unidades_por_pacote,
            pacotes_por_lastro,
            lastros_por_pallet,
            quantidade_pacs_por_pallet
          )
        `)
        .eq('contagem_id', countId);
        
      if (itensError) {
        console.error('Erro ao buscar itens da contagem:', itensError);
        throw new Error('Erro ao buscar os itens da contagem');
      }
      
      // Combinar os dados
      const contagemCompleta = {
        ...contagemData,
        itens_contagem: itensData || []
      };
      
      console.log('Contagem completa:', contagemCompleta);
      
      // Converter para o tipo Contagem esperado
      const contagem = contagemCompleta as unknown as Contagem;
      
      // Criar workbook
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Contagem");

      // Configurar propriedades da planilha
      worksheet.properties.defaultColWidth = 15;
      
      // Adicionar título
      const titleRow = worksheet.addRow(['CONTAGEM DE ESTOQUE']);
      titleRow.font = { bold: true, size: 18, color: { argb: 'FF2F5496' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 30;
      worksheet.mergeCells('A1:H1');
      
      // Adicionar informações do estoque e data
      const estoqueNome = contagem.estoques?.nome || contagem.estoque_id || 'NÃO INFORMADO';
      
      // Formatar a data corretamente
      let dataFormatada = 'NÃO INFORMADA';
      try {
        const dataContagem = contagem.data ? new Date(contagem.data) : new Date();
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
      
      console.log('Nome do estoque:', estoqueNome);
      console.log('Data formatada:', dataFormatada);
      
      // Adicionar informações do estoque
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

      // Configurar cabeçalhos das colunas
      const headerTitles = [
        "CÓDIGO", 
        "PRODUTO", 
        "PALLETS", 
        "LASTROS", 
        "PACOTES", 
        "UNIDADES", 
        "TOTAL PACOTES", 
        "TOTAL UNIDADES"
      ];
      
      const headerRow = worksheet.addRow(headerTitles);
      
      // Estilizar cabeçalho
      headerRow.font = { 
        bold: true, 
        color: { argb: 'FFFFFFFF' },
        size: 12
      };
      
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2F5496" },
      };
      
      headerRow.alignment = { 
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
      
      headerRow.height = 25;
      
      // Configurar largura das colunas
      worksheet.columns = [
        { key: "codigo", width: 15, style: { alignment: { horizontal: 'left' } } },
        { key: "nome", width: 40, style: { alignment: { horizontal: 'left' } } },
        { key: "pallets", width: 10, style: { alignment: { horizontal: 'center' } } },
        { key: "lastros", width: 10, style: { alignment: { horizontal: 'center' } } },
        { key: "pacotes", width: 10, style: { alignment: { horizontal: 'center' } } },
        { key: "unidades", width: 10, style: { alignment: { horizontal: 'center' } } },
        { key: "totalPacotes", width: 15, style: { alignment: { horizontal: 'center' } } },
        { key: "total", width: 15, style: { alignment: { horizontal: 'center' } } },
      ];

      // Adicionar dados
      (contagem.itens_contagem || []).forEach((item: any) => {
        const produto = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
        const row = worksheet.addRow({
          codigo: produto?.codigo || "N/A",
          nome: produto?.nome || item.nome_livre || "N/A",
          pallets: item.pallets || 0,
          lastros: item.lastros || 0,
          pacotes: item.pacotes || 0,
          unidades: item.unidades || 0,
          totalPacotes: item.total_pacotes || 0,
          total: item.total || 0,
        });
        
        // Estilizar a linha de dados
        row.alignment = {
          vertical: 'middle',
          wrapText: true
        };
        
        // Formatar células numéricas
        const formatNumber = (cell: any) => {
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0';
          }
        };
        
        // Aplicar formatação apenas para colunas numéricas
        const numCols = ['pallets', 'lastros', 'pacotes', 'unidades', 'totalPacotes', 'total'];
        numCols.forEach((col, idx) => {
          const cell = row.getCell(idx + 1);
          formatNumber(cell);
        });
      });
      
      // Ajustar automaticamente a altura das linhas com base no conteúdo
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 3) { // Pular cabeçalhos
          // Definir uma altura padrão em vez de undefined
          row.height = 20; // Altura padrão em pontos
        }
      });

      // Adicionar totais
      const totalGeralPacotes = (contagem.itens_contagem || []).reduce((sum, item) => sum + (item.total_pacotes || 0), 0);
      const totalGeralUnidades = (contagem.itens_contagem || []).reduce((sum, item) => sum + (item.total || 0), 0);
      
      // Linha em branco
      worksheet.addRow([]);
      
      // Linha de totais - apenas totais de pacotes e unidades
      const totalRow = worksheet.addRow([
        'TOTAIS:',
        '',
        '', // Pallets
        '', // Lastros
        '', // Pacotes
        '', // Unidades
        totalGeralPacotes,
        totalGeralUnidades
      ]);
      
      // Estilizar linha de totais
      totalRow.font = { bold: true, color: { argb: 'FF2F5496' } };
      totalRow.eachCell((cell) => {
        if (cell.value) {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF2F5496' } },
            bottom: { style: 'thin', color: { argb: 'FF2F5496' } }
          };
        }
      });
      
      // Adicionar linha em branco final
      worksheet.addRow([]);
      
      // Adicionar linha em branco final
      worksheet.addRow([]);

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

      // Atualizar a contagem com a URL do Excel
      const { error: updateError } = await supabase
        .from('contagens')
        .update({ excel_url: publicUrl })
        .eq('id', countId);

      if (updateError) {
        console.error('Erro ao atualizar contagem com URL do Excel:', updateError);
        throw new Error('Erro ao salvar o link do Excel');
      }

      // Baixar o arquivo para o usuário
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contagem_${countId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O arquivo Excel foi salvo e está sendo baixado",
      });
    } catch (error) {
      console.error("Erro ao baixar Excel:", error);
      toast({
        title: "Erro",
        description: "Erro ao baixar arquivo Excel",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Check className="text-emerald-600" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Contagem Finalizada!</h3>
          <p className="text-gray-600 text-sm mb-6">
            A contagem foi salva com sucesso. Você pode baixar o arquivo Excel agora.
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={handleDownloadExcel}
              className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              <Download className="mr-2" size={20} />
              Baixar Excel
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
