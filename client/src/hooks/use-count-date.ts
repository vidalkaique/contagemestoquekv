import { useState } from 'react';
import { format } from 'date-fns';

export function useCountDate() {
  // Inicializa com a data atual apenas se não for uma contagem existente
  const [countDate, setCountDate] = useState<string>(() => {
    try {
      return format(new Date(), "yyyy-MM-dd");
    } catch (error) {
      console.error('Erro ao formatar data inicial:', error);
      return '';
    }
  });

  const updateCountDate = (newDate: string) => {
    try {
      // Validar se a data é válida
      const date = new Date(newDate);
      if (isNaN(date.getTime())) {
        throw new Error('Data inválida');
      }
      
      // Formatar a data no formato YYYY-MM-DD
      const formattedDate = format(date, "yyyy-MM-dd");
      console.log('Data formatada:', formattedDate);
      setCountDate(formattedDate);
    } catch (error) {
      console.error('Erro ao atualizar data:', error);
      setCountDate('');
    }
  };

  return {
    countDate,
    setCountDate: updateCountDate,
  };
} 