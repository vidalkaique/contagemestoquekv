import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Package, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ContagemWithItens, Estoque, Produto } from "@shared/schema";

interface CountHistoryProps {
  onSelect: (count: ContagemWithItens) => void;
}

export function CountHistory({ onSelect }: CountHistoryProps) {
  const [history, setHistory] = useState<ContagemWithItens[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contagens')
        .select(`
          id,
          data,
          finalizada,
          created_at,
          nome,
          matricula,
          estoque_id,
          qntd_produtos,
          estoques:estoques(id, nome, ativo, created_at, updated_at),
          itens_contagem(
            id,
            produto_id,
            nome_livre,
            pallets,
            lastros,
            pacotes,
            unidades,
            total,
            total_pacotes,
            produtos:produtos(id, codigo, nome, unidades_por_pacote, pacotes_por_lastro, lastros_por_pallet, quantidade_pacs_por_pallet, created_at)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar histórico:', error);
        return;
      }

      if (data) {
        const formattedData = data.map(contagem => {
          // Verifica se há estoques e pega o primeiro
          const estoqueData = contagem.estoques && contagem.estoques.length > 0 ? contagem.estoques[0] : null;
          
          const estoque: Estoque | null = estoqueData ? {
            id: estoqueData.id,
            nome: estoqueData.nome,
            ativo: estoqueData.ativo,
            createdAt: new Date(estoqueData.created_at),
            updatedAt: new Date(estoqueData.updated_at)
          } : null;

          const itens = contagem.itens_contagem?.map(item => {
            // Verifica se há produtos e pega o primeiro
            const produtoData = item.produtos && Array.isArray(item.produtos) && item.produtos.length > 0 
              ? item.produtos[0] 
              : null;
              
            return {
              id: item.id,
              contagemId: contagem.id,
              produtoId: item.produto_id || undefined,
              nomeLivre: item.nome_livre || undefined,
              pallets: item.pallets,
              lastros: item.lastros,
              pacotes: item.pacotes,
              unidades: item.unidades,
              total: item.total,
              totalPacotes: item.total_pacotes,
              produto: produtoData ? {
                id: produtoData.id,
                codigo: produtoData.codigo,
                nome: produtoData.nome,
                unidadesPorPacote: produtoData.unidades_por_pacote,
                pacotesPorLastro: produtoData.pacotes_por_lastro,
                lastrosPorPallet: produtoData.lastros_por_pallet,
                quantidadePacsPorPallet: produtoData.quantidade_pacs_por_pallet || undefined,
                ativo: true,
                createdAt: new Date(produtoData.created_at),
                updatedAt: new Date(produtoData.created_at)
              } : null
            };
          }) || [];

          return {
            id: contagem.id,
            data: contagem.data,
            finalizada: contagem.finalizada,
            nome: contagem.nome || null,
            matricula: contagem.matricula || null,
            estoqueId: contagem.estoque_id,
            qntdProdutos: contagem.qntd_produtos || itens.length,
            createdAt: new Date(contagem.created_at),
            itens,
            estoque,
            produto: itens[0]?.produto || null
          } as ContagemWithItens;
        });
        
        setHistory(formattedData);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Carregando histórico...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Nenhuma contagem encontrada</CardTitle>
          <CardDescription>Não há contagens de estoque registradas.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Contagens Recentes</CardTitle>
            <CardDescription>Continue uma contagem em andamento</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3 pr-4">
            {history.map((count) => (
              <Card 
                key={count.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onSelect(count)}
              >
                <CardContent className="p-4 relative">
                  <div className="space-y-1">
                    {/* Data */}
                    <div className="text-sm">
                      {format(new Date(count.data), "dd/MM/yyyy")}
                    </div>
                    
                    {/* Linha de horário e quantidade de itens */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        {format(new Date(count.createdAt), "HH:mm")}
                      </span>
                      <span className="text-sm">
                        {count.qntdProdutos || 0} {count.qntdProdutos === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    
                    {/* Linha de matrícula e status */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        matricula: {count.matricula || 'N/A'}
                      </span>
                      <span className={`text-sm font-medium ${count.finalizada ? 'text-green-600' : 'text-amber-600'}`}>
                        {count.finalizada ? 'concluído' : 'em andamento'}
                      </span>
                    </div>
                    
                    {/* Linha do nome */}
                    <div className="text-sm">
                      nome: {count.nome || 'Não informado'}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-gray-400 hover:text-red-500 absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Aqui você pode adicionar a lógica para remover a contagem do histórico se necessário
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
