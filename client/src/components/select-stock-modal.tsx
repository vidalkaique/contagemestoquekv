import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Estoque, NovaContagem } from '@shared/schema';

interface SelectStockModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const SelectStockModal = ({ isOpen, onOpenChange }: SelectStockModalProps) => {
  const [, setLocation] = useLocation();
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { data: stocks, isLoading } = useQuery<Estoque[]>({
    queryKey: ['estoques'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3000/estoques');
      if (!response.ok) throw new Error('Falha ao buscar estoques');
      return response.json();
    },
  });

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

    createCountMutation.mutate({ estoqueId: selectedStock });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecione o Estoque</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2">
          {isLoading && <p>Carregando estoques...</p>}
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedStock || createCountMutation.isPending}>
            {createCountMutation.isPending ? 'Iniciando...' : 'Iniciar Contagem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
