import { useState } from 'react';
import { format } from 'date-fns';

export function useCountDate() {
  // Inicializa com a data atual apenas se não for uma contagem existente
  const [countDate, setCountDate] = useState<string>(() => {
    return format(new Date(), "yyyy-MM-dd");
  });

  return {
    countDate,
    setCountDate,
  };
} 