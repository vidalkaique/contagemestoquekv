import { useLocation } from "wouter";

import { supabase } from "@/lib/supabase";
import { useCounts } from "@/hooks/use-counts";
import { useContagensRealtime } from "@/hooks/use-realtime";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ContagemWithItens } from "@shared/schema";
import { Workbook } from "exceljs";

interface ItemContagem {
  id: string;
  produto_id?: string;
  nome_livre?: string;
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
  total: number;
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
  createdAt: string;
  finalizada: boolean;
  qntdProdutos: number;
  itens?: any[];
  itens_contagem: ItemContagem[];
  excelUrl?: string;
  matricula?: string;
  nome?: string;
}

export default function History() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contagens = [], isLoading } = useCounts();
  
  // Ativa realtime para contagens globais - atualiza histórico automaticamente
  useContagensRealtime();

  const filteredContagens = contagens?.filter(contagem => {
    if (!searchQuery.trim()) return true;
    const dateStr = format(new Date(contagem.data), "dd/MM/yyyy", { locale: ptBR });
    return dateStr.includes(searchQuery);
  });
  
  // Logs de depuração removidos para produção

  const handleDownloadExcel = async (contagemId: string, excelUrl?: string | null) => {
    try {
      // Se já existe uma URL de Excel, redireciona para o download
      if (excelUrl) {
        window.open(excelUrl, '_blank');
        return;
      }

      // Se não tem URL, busca os dados e gera o Excel
      const { data: contagem, error } = await supabase
        .from('contagens')
        .select(`
          id,
          data,
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
              lastros_por_pallet,
              quantidade_pacs_por_pallet
            )
          )
        `)
        .eq('id', contagemId)
        .single();

      if (error || !contagem) {
        console.error('Erro ao buscar dados da contagem:', error);
        throw new Error('Erro ao buscar dados da contagem');
      }

      // Criar workbook
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Contagem");

      // Configurar colunas
      worksheet.columns = [
        { header: "Código", key: "codigo", width: 15 },
        { header: "Produto", key: "nome", width: 30 },
        { header: "Pallets", key: "pallets", width: 10 },
        { header: "Lastros", key: "lastros", width: 10 },
        { header: "Pacotes", key: "pacotes", width: 10 },
        { header: "Unidades", key: "unidades", width: 10 },
        { header: "Total Pacotes", key: "total_pacotes", width: 12 },
        { header: "Total Unidades", key: "total", width: 15 },
      ];

      // Adicionar título
      const titleRow = worksheet.addRow(['CONTAGEM DE ESTOQUE']);
      titleRow.font = { bold: true, size: 18 };
      titleRow.alignment = { horizontal: 'center' };
      worksheet.mergeCells('A1:H1');

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
          total_pacotes: item.total_pacotes || 0,
          total: item.total || 0,
        });
      });

      // Adicionar totais
      const totalPacotes = (contagem.itens_contagem || []).reduce((sum, item) => sum + (item.total_pacotes || 0), 0);
      const totalUnidades = (contagem.itens_contagem || []).reduce((sum, item) => sum + (item.total || 0), 0);
      
      const totalRow = worksheet.addRow({
        codigo: 'TOTAIS:',
        total_pacotes: totalPacotes,
        total: totalUnidades
      });
      
      totalRow.font = { bold: true };

      // Estilizar cabeçalho
      const headerRow = worksheet.getRow(2);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Gerar o arquivo Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `contagem_${contagemId}_${new Date().getTime()}.xlsx`;
      const filePath = `contagens/${contagemId}/${fileName}`;

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
        .eq('id', contagemId);

      if (updateError) {
        console.error('Erro ao atualizar contagem com URL do Excel:', updateError);
        throw new Error('Erro ao salvar o link do Excel');
      }

      // Baixar o arquivo para o usuário
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contagem_${contagemId}.xlsx`;
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="text-gray-600" size={20} />
        </Button>
        <h2 className="text-lg font-semibold text-gray-900 ml-3">Histórico de Contagens</h2>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Search/Filter */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Buscar por data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/4 mb-3"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : 
        
        /* Empty State */
        filteredContagens?.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="text-gray-400" size={24} />
            </div>
            <p className="text-gray-700 font-medium mb-1">
              {searchQuery ? "Nenhuma contagem encontrada" : "Nenhuma contagem realizada ainda"}
            </p>
            <p className="text-sm text-gray-500">
              {searchQuery 
                ? "Tente buscar por uma data diferente" 
                : "Crie sua primeira contagem clicando no botão abaixo"}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => setLocation("/new")} 
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Nova Contagem
              </Button>
            )}
          </div>
        ) : 
        
        /* Counts List */
        (
          <div className="space-y-4">
            {filteredContagens?.map((contagem) => (
              <div key={contagem.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow transition-shadow">
                <div className="p-4 relative">
                  <div className="space-y-2">
                    {/* Data - maior e em negrito */}
                    <div className="font-semibold text-base">
                      {format(new Date(contagem.data), "dd/MM/yyyy")}
                      {!contagem.finalizada && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Rascunho
                        </span>
                      )}
                    </div>
                    
                    {/* Linha de horário e quantidade de itens */}
                    <div className="flex justify-between items-center text-sm">
                      <span>{format(new Date(contagem.createdAt), "HH:mm")}</span>
                      <span className="ml-4">
                        {contagem.qntdProdutos || contagem.itens?.length || 0} {contagem.qntdProdutos === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    
                    {/* Linha de matrícula e status */}
                    <div className="flex justify-between items-center text-sm">
                      <span>matricula: <span className="font-medium">{contagem.matricula || 'N/A'}</span></span>
                      <span className={`font-medium ${contagem.finalizada ? 'text-green-600' : 'text-amber-600'}`}>
                        {contagem.finalizada ? 'concluído' : 'em andamento'}
                      </span>
                    </div>
                    
                    {/* Linha do nome */}
                    <div className="text-sm">
                      nome: <span className="font-medium">{contagem.nome || 'Não informado'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3">
                  {contagem.finalizada ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadExcel(contagem.id, contagem.excelUrl)}
                      className="text-sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {contagem.excelUrl ? 'Abrir Excel' : 'Gerar Excel'}
                    </Button>
                  ) : (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => setLocation(`/count/${contagem.id}`)}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-sm"
                    >
                      Continuar Contagem
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
