import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Plus, History, LineChart, Package, ChevronRight, Warehouse } from "lucide-react";
import type { ContagemWithItens } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: contagens } = useQuery<ContagemWithItens[]>({
    queryKey: ["/api/contagens"],
  });

  const lastCount = contagens?.[0];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-8 mt-8">
        <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <ClipboardList className="text-primary-foreground text-2xl" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ContaEstoque</h1>
        <p className="text-gray-600 text-sm">Controle de estoque simplificado</p>
      </div>

      {/* Main Actions */}
      <div className="space-y-4 mb-8">
        <a
          href="/start-count"
          className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors block"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                <Plus size={24} />
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-gray-900">Nova Contagem</h3>
                <p className="text-sm text-gray-500">Iniciar uma nova contagem de estoque</p>
              </div>
            </div>
            <ChevronRight className="text-gray-400" size={20} />
          </div>
        </a>



        <button 
          onClick={() => setLocation("/products")}>
          <div className="p-3 mr-4 text-green-500 bg-green-100 rounded-full">
            <Package />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Gestão de Produtos</p>
            <p className="text-sm text-gray-500">Cadastrar produtos e conversões</p>
          </div>
        </button>

        <button 
          onClick={() => setLocation("/stocks")}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-4 px-6 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-3 mr-4 text-blue-500 bg-blue-100 rounded-full">
              <Warehouse />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 text-left">Gestão de Estoques</p>
              <p className="text-sm text-gray-500 text-left">Cadastrar e gerenciar estoques</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => setLocation("/products")}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-4 px-6 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-3 mr-4 text-green-500 bg-green-100 rounded-full">
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

        <button 
          onClick={() => setLocation("/history")}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-4 px-6 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <History className="text-xl mr-3 text-gray-400" size={24} />
            <div className="text-left">
              <div className="font-semibold">Ver Histórico</div>
              <div className="text-gray-500 text-sm">Contagens anteriores</div>
            </div>
          </div>
          <div className="w-2 h-4 border-r-2 border-b-2 border-gray-300 transform rotate-45" />
        </button>

        <button 
          onClick={() => setLocation("/products")}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-4 px-6 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <Package className="text-xl mr-3 text-gray-400" size={24} />
            <div className="text-left">
              <div className="font-semibold">Gestão de Produtos</div>
              <div className="text-gray-500 text-sm">Cadastrar produtos e conversões</div>
            </div>
          </div>
          <div className="w-2 h-4 border-r-2 border-b-2 border-gray-300 transform rotate-45" />
        </button>
      </div>

      {/* Quick Stats Card */}
      <div className="bg-gradient-to-r from-emerald-50 to-red-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Última contagem</p>
            {lastCount ? (
              <>
                <p className="font-semibold text-gray-900">
                  {format(new Date(lastCount.data), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-xs text-gray-500">
                  {lastCount.itens.length} produtos
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-900">Nenhuma contagem</p>
                <p className="text-xs text-gray-500">Crie sua primeira contagem</p>
              </>
            )}
          </div>
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <LineChart className="text-emerald-600" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}
