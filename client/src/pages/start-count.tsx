import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Plus, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InsertContagem, ContagemWithItens } from "@shared/schema";
import { saveCurrentCount } from "@/lib/localStorage";
import { useCountDate } from "@/hooks/use-count-date";
import { supabase } from "@/lib/supabase";

export default function StartCount() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { countDate, setCountDate } = useCountDate();
  
  // Buscar contagens não finalizadas
  const { data: unfinishedCounts = [] } = useQuery<ContagemWithItens[]>({
    queryKey: ["contagens/unfinished"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contagens")
        .select(`
          *,
          itens (*)
        `)
        .eq("finalizada", false);

      if (error) throw error;
      return data || [];
    }
  });

  const createCountMutation = useMutation({
    mutationFn: async (data: InsertContagem) => {
      const { data: newCount, error } = await supabase
        .from("contagens")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return newCount;
    },
    onSuccess: (contagem) => {
      // Redirecionar para a página de contagem com o ID
      setLocation(`/count/${contagem.id}`);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar contagem",
        variant: "destructive",
      });
    },
  });

  const handleStartNewCount = () => {
    if (!countDate) {
      toast({
        title: "Erro",
        description: "Selecione uma data para a contagem",
        variant: "destructive",
      });
      return;
    }

    console.log('Data sendo enviada:', countDate);
    createCountMutation.mutate({
      data: countDate,
      finalizada: false
    });
  };

  const handleDateChange = (newDate: string) => {
    console.log('Nova data selecionada:', newDate);
    if (!newDate) {
      toast({
        title: "Erro",
        description: "Selecione uma data válida",
        variant: "destructive",
      });
      return;
    }

    setCountDate(newDate);
  };

  const formatContagemDate = (data: string | null | undefined) => {
    if (!data) return "";
    try {
      // Adiciona o fuso horário UTC para evitar problemas com timezone
      const [year, month, day] = data.split('-');
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "";
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
        <h2 className="text-lg font-semibold text-gray-900 ml-3">
          Iniciar Contagem
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Date Selection */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Data da Contagem
          </Label>
          <Input
            type="date"
            value={countDate || ""}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full"
            placeholder="dd/mm/aaaa"
            min="2020-01-01"
            max="2030-12-31"
          />
        </div>

        {/* Start New Count Button */}
        <Button
          onClick={handleStartNewCount}
          disabled={createCountMutation.isPending}
          className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg flex items-center justify-center font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="mr-2" size={20} />
          {createCountMutation.isPending ? "Iniciando..." : "Iniciar Nova Contagem"}
        </Button>

        {/* Unfinished Counts */}
        {unfinishedCounts.length > 0 && (
          <div className="pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <History className="mr-2" size={16} />
              Contagens em Andamento
            </h3>
            <div className="space-y-3">
              {unfinishedCounts.map((contagem) => (
                <Button
                  key={contagem.id}
                  variant="outline"
                  onClick={() => setLocation(`/count/${contagem.id}`)}
                  className="w-full justify-start text-left font-normal"
                >
                  <div>
                    <div className="font-medium">
                      {formatContagemDate(contagem.data)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {contagem.itens.length} produtos
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
} 