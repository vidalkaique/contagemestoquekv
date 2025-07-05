import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Estoque, NovaContagem } from '@shared/schema';

interface SelectStockModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStockSelected?: (stock: { id: string; nome: string }) => void;
}

export const SelectStockModal = ({ isOpen, onOpenChange, onStockSelected }: SelectStockModalProps) => {
  const [, setLocation] = useLocation();
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { data: stocks, isLoading, error: stocksError } = useQuery<Estoque[]>({
    queryKey: ['estoques'],
    queryFn: async () => {
      console.log('Buscando estoques do Supabase...');
      try {
        const { data, error } = await supabase
          .from('estoques')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Erro ao buscar estoques:', error);
          throw new Error('Falha ao buscar estoques: ' + error.message);
        }
        
        console.log('Estoques encontrados:', data);
        return data || [];
      } catch (err) {
        console.error('Erro na query de estoques:', err);
        throw err;
      }
    },
  });

  // Log de erros na busca de estoques
  useEffect(() => {
    if (stocksError) {
      console.error('Erro ao carregar estoques:', stocksError);
    }
  }, [stocksError]);

  const createCountMutation = useMutation({
    mutationFn: async (newCount: NovaContagem) => {
      const response = await fetch('http://localhost:3000/contagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCount),
      });
      if (!response.ok) {
        throw new Error('Falha ao criar contagem');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Contagem iniciada com sucesso!');
      setLocation(`/count/${data.id}`);
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao iniciar contagem. Tente novamente.');
    },
  });

  const handleConfirm = () => {
    if (!selectedStock) {
      toast.warning('Por favor, selecione um estoque.');
      return;
    }

    const selectedStockData = stocks?.find(s => s.id === selectedStock);
    
    if (onStockSelected && selectedStockData) {
      onStockSelected(selectedStockData);
    } else {
      createCountMutation.mutate({ estoqueId: selectedStock });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecione o Estoque</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading && <p className="text-center py-4">Carregando estoques...</p>}
          {!isLoading && (!stocks || stocks.length === 0) && (
            <div className="text-center py-4 text-gray-500">
              Nenhum estoque cadastrado. Por favor, cadastre um estoque primeiro.
            </div>
          )}
          {stocks?.map((stock) => (
            <Button
              key={stock.id}
              variant={selectedStock === stock.id ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setSelectedStock(stock.id)}
            >
              {stock.nome}
            </Button>
          ))}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={createCountMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedStock || createCountMutation.isPending}
            className="min-w-[120px]"
          >
            {createCountMutation.isPending ? 'Processando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
