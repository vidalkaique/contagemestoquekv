import { useState } from 'react';
import { useLocation, Link } from "wouter";
import { useCounts } from "@/hooks/use-counts";
import { ClipboardList, Plus, History, Package, ChevronRight, Warehouse } from "lucide-react";
import { SelectStockModal } from '@/components/select-stock-modal';
import type { CurrentCount } from "@/lib/localStorage";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [countHistory] = useState<CurrentCount[]>([]);
  const { data: contagens = [] } = useCounts();

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
    </div>

      <SelectStockModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );

}