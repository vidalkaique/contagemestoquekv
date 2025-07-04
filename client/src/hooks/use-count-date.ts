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
      if (!newDate) {
        setCountDate('');
        return;
      }

      // Solução definitiva para o problema de fuso horário na sua origem.
      // O input type="date" retorna uma string 'YYYY-MM-DD'.
      // new Date('YYYY-MM-DD') por padrão cria uma data em UTC.
      // Para tratar como data local, o que corrige o bug, adicionamos um horário.
      const date = new Date(`${newDate}T12:00:00`);

      if (isNaN(date.getTime())) {
        throw new Error('Data inválida');
      }
      
      // Agora, a formatação para yyyy-MM-dd será correta.
      const formattedDate = format(date, "yyyy-MM-dd");
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