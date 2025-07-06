import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Package, X } from "lucide-react";
import { getCountHistory, clearCountHistory, type CurrentCount } from "@/lib/localStorage";

export function CountHistory({ onSelect }: { onSelect: (count: CurrentCount) => void }) {
  const [history, setHistory] = useState<CurrentCount[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const savedHistory = getCountHistory();
    setHistory(savedHistory);
  };

  const handleClearHistory = () => {
    if (window.confirm("Tem certeza que deseja limpar todo o histórico de contagens?")) {
      clearCountHistory();
      setHistory([]);
    }
  };

  const handleRemoveFromHistory = (countId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.filter(c => c.id !== countId);
    localStorage.setItem('contaestoque_count_history', JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Contagens Recentes</CardTitle>
            <CardDescription>Continue uma contagem em andamento</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearHistory}
            className="text-red-500 hover:text-red-600"
          >
            Limpar histórico
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3 pr-4">
            {history.map((count) => (
              <Card 
                key={count.id || count.lastUpdated}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onSelect(count)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">
                        Contagem {count.estoqueNome ? `- ${count.estoqueNome}` : ''}
                      </h4>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(count.date), "PPP", { locale: ptBR })}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Package className="h-4 w-4 mr-1" />
                        {count.products.length} {count.products.length === 1 ? 'item' : 'itens'}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Última atualização: {format(new Date(count.lastUpdated), "PPp", { locale: ptBR })}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={(e) => handleRemoveFromHistory(count.id || '', e)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
