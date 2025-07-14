import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Estoque, NovaContagem } from '@shared/schema';
import { Loader2, RotateCw, Package, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectStockModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStockSelected?: (stock: { id: string; nome: string }) => void;
}

export const SelectStockModal = ({ isOpen, onOpenChange, onStockSelected }: SelectStockModalProps) => {
  const [, setLocation] = useLocation();
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: stocks, isLoading, error: stocksError, refetch } = useQuery<Estoque[]>({
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

  // Selecionar automaticamente o primeiro estoque quando a lista for carregada
  useEffect(() => {
    if (stocks && stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0].id);
      setFocusedIndex(0);
    }
  }, [stocks, selectedStock]);
  
  // Navegação por teclado
  useEffect(() => {
    if (!isOpen || !stocks || stocks.length === 0) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const newIndex = Math.max(0, Math.min(stocks.length - 1, focusedIndex + direction));
        
        if (newIndex !== focusedIndex) {
          setFocusedIndex(newIndex);
          setSelectedStock(stocks[newIndex].id);
          // Rolar o item para a visualização
          const element = document.getElementById(`stock-${stocks[newIndex].id}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          // Focar no elemento para leitores de tela
          element?.setAttribute('tabindex', '-1');
          element?.focus();
        }
      } else if (e.key === 'Enter' && selectedStock) {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === 'Tab' && stocks.length > 0) {
        // Se o foco estiver no último botão e o usuário pressionar Tab, voltar para o primeiro item
        const activeElement = document.activeElement;
        const lastButton = document.querySelector('#stock-selector-dialog [data-last-button]');
        
        if (e.shiftKey && activeElement === document.querySelector('#stock-selector-dialog button')) {
          e.preventDefault();
          const element = document.getElementById(`stock-${stocks[stocks.length - 1].id}`);
          element?.setAttribute('tabindex', '0');
          element?.focus();
        } else if (!e.shiftKey && activeElement === lastButton) {
          e.preventDefault();
          const element = document.getElementById(`stock-${stocks[0].id}`);
          element?.setAttribute('tabindex', '0');
          element?.focus();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stocks, focusedIndex, selectedStock]);

  // Log de erros na busca de estoques
  useEffect(() => {
    if (stocksError) {
      console.error('Erro ao carregar estoques:', stocksError);
      toast.error('Erro ao carregar a lista de estoques. Tente novamente.', {
        action: {
          label: 'Recarregar',
          onClick: () => refetch()
        }
      });
    }
  }, [stocksError, refetch]);

  // Removida a mutação de criação de contagem, pois agora será feita pelo componente pai

  const handleConfirm = () => {
    if (!selectedStock) {
      toast.warning('Por favor, selecione um estoque.');
      return;
    }

    const selectedStockData = stocks?.find(s => s.id === selectedStock);
    
    if (onStockSelected && selectedStockData) {
      onStockSelected(selectedStockData);
    } else {
      toast.error('Erro: Nenhum manipulador de seleção de estoque definido');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        id="stock-selector-dialog"
        role="dialog"
        aria-labelledby="stock-selector-title"
        aria-modal="true"
        
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle id="stock-selector-title">Selecione o Estoque</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-8 w-8"
              title="Recarregar lista"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              <span className="sr-only">Recarregar lista</span>
            </Button>
          </div>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {/* Lista de estoques */}
          <div 
            className="w-full max-w-md space-y-3 px-4 py-2"
            role="listbox" 
            aria-label="Lista de estoques"
            aria-orientation="vertical"
            aria-activedescendant={selectedStock ? `stock-${selectedStock}` : undefined}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-gray-600">Carregando estoques...</p>
              </div>
            ) : !stocks || stocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-4">
                <div className="bg-gray-100 p-4 rounded-full">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <div className="space-y-2 w-full">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      onOpenChange(false);
                      setLocation('/stocks');
                    }}
                    className="w-full"
                  >
                    Gerenciar Estoques
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => {
                      onOpenChange(false);
                      setLocation('/stocks/new');
                    }}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Novo Estoque
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  <div className="space-y-3">
                    {stocks.map((stock, index) => (
                      <motion.div
                        key={stock.id}
                        id={`stock-${stock.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          scale: focusedIndex === index ? 1.01 : 1,
                          transition: { 
                            delay: index * 0.05,
                            scale: { duration: 0.1 }
                          }
                        }}
                      >
                        <Button
                          id={`stock-${stock.id}`}
                          variant={focusedIndex === index || selectedStock === stock.id ? 'default' : 'outline'}
                          className={`w-full justify-start transition-all duration-200 relative ${focusedIndex === index || selectedStock === stock.id ? 'border-primary shadow-sm' : 'hover:border-primary/50'}`}
                          onClick={() => setSelectedStock(stock.id)}
                          onMouseEnter={() => setFocusedIndex(index)}
                          onFocus={() => setFocusedIndex(index)}
                          aria-selected={selectedStock === stock.id}
                          role="option"
                          tabIndex={focusedIndex === index ? 0 : -1}
                        >
                          <Package className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{stock.nome}</span>
                          {focusedIndex === index && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-60">
                              {index + 1}/{stocks?.length || 0}
                            </span>
                          )}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <div className="text-xs text-muted-foreground flex items-center">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">↑↓</span> Navegar
            </kbd>
            <span className="mx-2" aria-hidden="true">•</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">↵</span> Selecionar
            </kbd>
            <span className="mx-2" aria-hidden="true">•</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">Esc</span> Sair
            </kbd>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-4"
              data-last-button
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedStock || !stocks?.length}
              className="min-w-[120px]"
            >
              Confirmar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
