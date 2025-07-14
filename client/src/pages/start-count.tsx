import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Plus, History, Warehouse } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { InsertContagem, ContagemWithItens } from "@shared/schema";
import { saveCurrentCount } from "@/lib/localStorage";
import { useCountDate } from "@/hooks/use-count-date";
import { supabase } from "@/lib/supabase";
import { SelectStockModal } from "@/components/select-stock-modal";

export default function StartCount() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { countDate, setCountDate } = useCountDate();
  const [selectedStock, setSelectedStock] = useState<{id: string, nome: string} | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userMatricula, setUserMatricula] = useState("");
  
  // Efeito para depuração do estado showUserModal
  useEffect(() => {
    console.log('Estado showUserModal alterado para:', showUserModal);
  }, [showUserModal]);
  
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
        .insert([{
          ...data,
          nome_responsavel: userName,
          matricula_responsavel: userMatricula
        }])
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
    console.log('=== INÍCIO handleStartNewCount ===');
    console.log('Data selecionada:', countDate);
    console.log('Estoque selecionado:', selectedStock);
    
    if (!countDate) {
      console.error('Data não selecionada');
      toast({
        title: "Erro",
        description: "Selecione uma data para a contagem",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStock) {
      console.log('Nenhum estoque selecionado, abrindo modal de seleção');
      setIsStockModalOpen(true);
    } else {
      console.log('Estoque já selecionado, mostrando modal de informações do usuário');
      // Pequeno atraso para garantir que o modal anterior foi fechado
      setTimeout(() => {
        setShowUserModal(true);
      }, 100);
    }
    
    console.log('=== FIM handleStartNewCount ===');
  };

  const handleConfirmUserInfo = async () => {
    console.log('handleConfirmUserInfo chamado');
    
    if (!selectedStock) {
      console.error('Nenhum estoque selecionado');
      toast({
        title: "Erro",
        description: "Nenhum estoque selecionado",
        variant: "destructive",
      });
      return;
    }

    if (!countDate) {
      console.error('Nenhuma data selecionada');
      toast({
        title: "Erro",
        description: "Selecione uma data para a contagem",
        variant: "destructive",
      });
      return;
    }

    if (!userName.trim() || !userMatricula.trim()) {
      console.error('Nome ou matrícula não preenchidos');
      toast({
        title: "Erro",
        description: "Preencha seu nome e matrícula",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Criando nova contagem com dados:', {
        data: countDate,
        estoqueId: selectedStock.id,
        finalizada: false,
        nome: userName,
        matricula: userMatricula
      });

      const newCount = await createCountMutation.mutateAsync({
        data: countDate,
        estoqueId: selectedStock.id,
        finalizada: false,
        nome: userName,
        matricula: userMatricula
      });

      console.log('Nova contagem criada:', newCount);

      // Salva a contagem atual no localStorage
      saveCurrentCount({
        id: newCount.id,
        date: newCount.data,
        estoqueId: newCount.estoqueId,
        lastUpdated: new Date().toISOString(),
        products: []
      });

      console.log('Redirecionando para a tela de contagem:', `/count/${newCount.id}`);
      
      // Redireciona para a tela de contagem
      setLocation(`/count/${newCount.id}`);
    } catch (error) {
      console.error("Erro ao criar contagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a contagem",
        variant: "destructive",
      });
    }
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
      <SelectStockModal 
        isOpen={isStockModalOpen} 
        onOpenChange={(isOpen) => {
          console.log('onOpenChange chamado com:', isOpen);
          setIsStockModalOpen(isOpen);
          if (!isOpen) {
            // Se o usuário fechar o modal sem selecionar um estoque, limpa a seleção
            setSelectedStock(null);
          }
        }}
        onStockSelected={(stock) => {
          console.log('=== CALLBACK onStockSelected INICIADO ===');
          console.log('Estoque recebido no callback:', stock);
          
          // Atualiza o estado com o estoque selecionado
          setSelectedStock(stock);
          
          // Pequeno atraso para garantir que o estado foi atualizado
          setTimeout(() => {
            console.log('Abrindo modal de informações do usuário...');
            setShowUserModal(true);
            console.log('Modal de usuário deve estar aberto agora');
          }, 100);
          
          console.log('=== CALLBACK onStockSelected FINALIZADO ===');
        }}
      />
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
        <div className="space-y-2">
          {selectedStock && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Warehouse className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium">Estoque selecionado:</span>
              <span className="text-sm">{selectedStock.nome}</span>
            </div>
          )}
          <Button
            onClick={handleStartNewCount}
            disabled={createCountMutation.isPending}
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg flex items-center justify-center font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-2" size={20} />
            {createCountMutation.isPending ? "Iniciando..." : "Iniciar Nova Contagem"}
          </Button>
        </div>

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

      {/* Modal de informações do usuário */}
      <Dialog 
        open={showUserModal} 
        onOpenChange={(isOpen) => {
          console.log('Modal de usuário alterado para:', isOpen);
          setShowUserModal(isOpen);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Informações do Responsável</DialogTitle>
            <DialogDescription>
              Preencha suas informações para iniciar a contagem
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Nome Completo</Label>
              <Input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Digite seu nome completo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userMatricula">Matrícula</Label>
              <Input
                id="userMatricula"
                type="text"
                value={userMatricula}
                onChange={(e) => setUserMatricula(e.target.value)}
                placeholder="Digite sua matrícula"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowUserModal(false)}
              type="button"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmUserInfo}
              disabled={!userName.trim() || !userMatricula.trim()}
              type="button"
            >
              Confirmar e Iniciar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}