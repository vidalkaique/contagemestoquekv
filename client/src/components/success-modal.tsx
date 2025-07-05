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

interface Contagem {
  id: string;
  data: string;
  estoque?: {
    id: string;
    nome: string;
  };
  itens_contagem: ItemContagem[];
}

export default function SuccessModal({ isOpen, onClose, countId }: SuccessModalProps) {
  const { toast } = useToast();

  const handleDownloadExcel = async () => {
    try {
      // Buscar dados da contagem de forma autenticada
      const { data: contagem, error } = await supabase
        .from('contagens')
        .select(`
          id,
          data,
          estoque:estoques(
            id,
            nome
          ),
          itens_contagem (
            id,
            produto_id,
            nome_livre,
            pallets,
            lastros,
            pacotes,
            unidades,
            total,
            total_pacotes,
            produtos (
              id,
              codigo,
              nome,
              unidades_por_pacote,
              pacotes_por_lastro,
              lastros_por_pallet
            )
          )
        `)
        .eq('id', countId)
        .single();

      if (error || !contagem) {
        console.error('Erro ao buscar dados da contagem:', error);
        throw new Error('Erro ao buscar dados da contagem');
      }

      // Criar workbook
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Contagem");

      // Adicionar título
      const titleRow = worksheet.addRow(['CONTAGEM DE ESTOQUE']);
      titleRow.font = { bold: true, size: 18 };
      titleRow.alignment = { horizontal: 'center' };
      worksheet.mergeCells('A1:H1');
      
      // Adicionar informações do estoque e data
      const estoqueNome = Array.isArray(contagem.estoque) 
        ? contagem.estoque[0]?.nome || 'N/A'
        : contagem.estoque?.nome || 'N/A';
        
      const estoqueInfo = worksheet.addRow([
        `Estoque: ${estoqueNome}`,
        '', '', '', '', '', '',
        `Data: ${new Date(contagem.data).toLocaleDateString('pt-BR')}`
      ]);
      estoqueInfo.font = { bold: true };
      worksheet.mergeCells('A2:D2');
      worksheet.mergeCells('G2:H2');
      
      // Adicionar linha em branco
      worksheet.addRow([]);

      // Configurar colunas
      const headerRow = worksheet.addRow([
        "Código", "Produto", "Pallets", "Lastros", "Pacotes", "Unidades", "Total Pacotes", "Total Unidades"
      ]);
      
      // Estilizar cabeçalho
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      
      // Configurar largura das colunas
      worksheet.columns = [
        { key: "codigo", width: 15 },
        { key: "nome", width: 30 },
        { key: "pallets", width: 10 },
        { key: "lastros", width: 10 },
        { key: "pacotes", width: 10 },
        { key: "unidades", width: 10 },
        { key: "totalPacotes", width: 15 },
        { key: "total", width: 15 },
      ];

      // Adicionar dados
      (contagem.itens_contagem || []).forEach((item: any) => {
        const produto = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
        worksheet.addRow({
          codigo: produto?.codigo || "N/A",
          nome: produto?.nome || item.nome_livre || "N/A",
          pallets: item.pallets || 0,
          lastros: item.lastros || 0,
          pacotes: item.pacotes || 0,
          unidades: item.unidades || 0,
          totalPacotes: item.total_pacotes || 0,
          total: item.total || 0,
        });
      });

      // Adicionar linha em branco antes do final
      worksheet.addRow([]);

      // Gerar e baixar o arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contagem_${countId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O arquivo Excel está sendo baixado",
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
