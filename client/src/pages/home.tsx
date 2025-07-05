import { useState } from 'react';
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Plus, History, LineChart, Package, ChevronRight, Warehouse } from "lucide-react";
import type { ContagemWithItens } from "@shared/schema";
import { SelectStockModal } from '@/components/select-stock-modal';

export default function Home() {
  const [, setLocation] = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: ultimaContagem } = useQuery<ContagemWithItens>({
    queryKey: ["ultima-contagem"],
    queryFn: async () => {
      const response = await fetch("http://localhost:3000/contagens/ultima");
      if (!response.ok) {
        // It's okay if it fails, it just means there's no last count
        return null;
      }
      return response.json();
    },
  });

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