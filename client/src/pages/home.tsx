import { useState, useEffect } from 'react';
import { useLocation, Link } from "wouter";
import { useCounts } from "@/hooks/use-counts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Plus, History, LineChart, Package, ChevronRight, Warehouse, Clock, Trash2 } from "lucide-react";
import type { ContagemWithItens } from "@shared/schema";
import { SelectStockModal } from '@/components/select-stock-modal';
import { getCountHistory, clearCurrentCount, type CurrentCount } from "@/lib/localStorage";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [countHistory, setCountHistory] = useState<CurrentCount[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Carrega o histórico de contagens do localStorage
  useEffect(() => {
    const history = getCountHistory();
    setCountHistory(history);
  }, []);

  const { data: contagens = [] } = useCounts();
  const ultimaContagem = contagens.length > 0 ? contagens[0] : null;


  const handleClearCurrentCount = () => {
    if (window.confirm("Tem certeza que deseja limpar a contagem em andamento?")) {
      clearCurrentCount();
      // Atualiza o histórico removendo a contagem atual
      const updatedHistory = getCountHistory();
      setCountHistory(updatedHistory);
    }
  };

  return (
    <>
      <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="text-center mb-6">
        <ClipboardList className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold mt-2">ContaEstoque</h1>
        <p className="text-gray-600 text-sm">Controle de estoque simplificado</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-green-100 text-green-800 rounded-xl p-4 flex items-center justify-between shadow-sm hover:bg-green-200 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-3 mr-4 bg-white rounded-full">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-left">Nova Contagem</p>
              <p className="text-sm text-left">Iniciar uma nova contagem de estoque</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Histórico de contagens */}
        {showHistory && countHistory.length > 0 && (
          <div className="space-y-3 mt-2">
            {countHistory.map((count, index) => {
              // Pula a primeira se for a contagem atual (já exibida acima)
              if (index === 0 && !count.id) return null;
              
              return (
                <div 
                  key={count.id || count.lastUpdated}
                  className="bg-white border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = '/new-count'}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {count.id ? `Contagem #${count.id}` : 'Rascunho'}
                        {count.estoqueNome && ` • ${count.estoqueNome}`}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {count.products.length} {count.products.length === 1 ? 'item' : 'itens'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(parseISO(count.lastUpdated), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Última contagem finalizada */}
        {ultimaContagem && (!showHistory || countHistory.length === 0) && (
          <button
            onClick={() => setLocation(`/count/${ultimaContagem.id}`)}
            className="w-full bg-blue-50 text-blue-800 rounded-xl p-4 flex items-center justify-between shadow-sm hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center">
              <div className="p-3 mr-4 bg-white rounded-full">
                <History className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-left">Última Contagem</p>
                <p className="text-sm text-left">
                  {format(new Date(ultimaContagem.data), "dd/MM/yyyy", { locale: ptBR })}
                  {ultimaContagem.estoque && ` • ${ultimaContagem.estoque.nome}`}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        )} {/* Contagem em andamento */}
        {countHistory.length > 0 && countHistory[0] && !countHistory[0].id && (
          <div className="relative bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start">
              <div className="p-2 bg-yellow-100 rounded-full mr-3">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800">Contagem em andamento</h3>
                <p className="text-sm text-yellow-700">
                  {countHistory[0].products.length} {countHistory[0].products.length === 1 ? 'item' : 'itens'} adicionados
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Última atualização: {format(parseISO(countHistory[0].lastUpdated), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearCurrentCount();
                  }}
                  className="text-yellow-600 hover:text-yellow-800"
                  title="Limpar contagem"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Link href="/new-count" className="text-yellow-600 hover:text-yellow-800">
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        )}



        <button
          onClick={() => setLocation("/history")}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-4 px-6 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-3 mr-4 text-orange-500 bg-orange-100 rounded-full">
              <History className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 text-left">Ver Histórico</p>
              <p className="text-sm text-gray-500 text-left">Contagens anteriores</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => setLocation("/products")}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-4 px-6 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-3 mr-4 text-purple-500 bg-purple-100 rounded-full">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 text-left">Gestão de Produtos</p>
              <p className="text-sm text-gray-500 text-left">Cadastrar produtos e conversões</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => setLocation("/stocks")}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-4 px-6 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-3 mr-4 text-blue-500 bg-blue-100 rounded-full">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 text-left">Gestão de Estoques</p>
              <p className="text-sm text-gray-500 text-left">Cadastrar e gerenciar estoques</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="pt-4">
        {ultimaContagem ? (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-sm font-medium text-gray-500">Última contagem</h2>
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {format(new Date(ultimaContagem.data), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-sm text-gray-500">{ultimaContagem.itens.length} itens contados</p>
              </div>
              <div className="p-3 text-green-500 bg-green-100 rounded-full">
                <LineChart className="w-6 h-6" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <h2 className="text-sm font-medium text-gray-500">Última contagem</h2>
            <div className="flex items-center justify-center mt-2 space-x-2">
                <p className="text-gray-700">Nenhuma contagem</p>
            </div>
            <p className="text-sm text-gray-500 mt-1">Crie sua primeira contagem</p>
          </div>
        )}
      </div>
    </div>

      <SelectStockModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );

}