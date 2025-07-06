import { useLocation } from "wouter";

import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
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
  itens_contagem: ItemContagem[];
}

export default function History() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contagens = [], isLoading } = useQuery<ContagemWithItens[]>({
    queryKey: ["/api/contagens"],
  });

  const filteredContagens = contagens?.filter(contagem => {
    if (!searchQuery.trim()) return true;
    const dateStr = format(new Date(contagem.data), "dd/MM/yyyy", { locale: ptBR });
    return dateStr.includes(searchQuery);
  });

  const handleDownloadExcel = async (contagemId: string) => {
    try {
      // Buscar dados da contagem de forma autenticada
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
        { header: "Total", key: "total", width: 15 },
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
          total: item.total || 0,
        });
      });

      // Estilizar cabeçalho
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Gerar e baixar o arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contagem_${contagemId}.xlsx`;
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

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
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

      <div className="p-4">
        {/* Search/Filter */}
        <div className="mb-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar por data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredContagens?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              {searchQuery ? "Nenhuma contagem encontrada" : "Nenhuma contagem realizada ainda"}
            </p>
            <p className="text-xs">
              {searchQuery ? "Tente buscar por uma data diferente" : "Crie sua primeira contagem"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContagens?.map((contagem) => (
              <div key={contagem.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {format(new Date(contagem.data), "dd/MM/yyyy", { locale: ptBR })}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(contagem.createdAt), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {contagem.itens.length} produtos
                    </p>
                    {contagem.finalizada ? (
                      <p className="text-xs text-emerald-600">Concluída</p>
                    ) : (
                      <p className="text-xs text-yellow-600">Em andamento</p>
                    )}
                  </div>
                </div>
                {contagem.finalizada ? (
                  <Button
                    onClick={() => handleDownloadExcel(contagem.id)}
                    className="w-full bg-primary/10 text-primary py-2 px-3 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Download className="mr-2" size={16} />
                    Baixar Excel
                  </Button>
                ) : (
                  <Button
                    onClick={() => setLocation(`/count/${contagem.id}`)}
                    className="w-full bg-yellow-100 text-yellow-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
                  >
                    Continuar Contagem
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
