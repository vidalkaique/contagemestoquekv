import { useState } from 'react';

// Função auxiliar para converter data para o formato YYYY-MM-DD no fuso local
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function useCountDate() {
  // Inicializa com a data atual no formato YYYY-MM-DD
  const [countDate, setCountDate] = useState<string>(() => {
    return toLocalDateString(new Date());
  });

  const updateCountDate = (newDate: string) => {
    try {
      if (!newDate) {
        setCountDate('');
        return;
      }

      // Extrai ano, mês e dia da string de data
      const [year, month, day] = newDate.split('-').map(Number);
      
      // Cria uma data no fuso horário local
      const localDate = new Date(year, month - 1, day);
      
      // Verifica se a data é válida
      if (isNaN(localDate.getTime())) {
        throw new Error('Data inválida');
      }
      
      // Formata a data para YYYY-MM-DD
      const formattedDate = toLocalDateString(localDate);
      setCountDate(formattedDate);

    } catch (error) {
      console.error('Erro ao atualizar data:', error);
      // Mantém o valor anterior em caso de erro
    }
  };

  return {
    countDate,
    setCountDate: updateCountDate,
  };
}