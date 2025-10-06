import { useState, useEffect } from 'react';

/**
 * Hook customizado para "debouncing" de um valor.
 * Atrasará a atualização do valor até que um certo tempo tenha passado sem novas mudanças.
 * Útil para evitar chamadas excessivas de API em inputs de texto, salvamento automático, etc.
 * 
 * @template T - O tipo do valor a ser debounced
 * @param value - O valor a ser debounced
 * @param delay - O tempo de atraso em milissegundos (padrão: 500ms)
 * @returns O valor debounced
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // Esta chamada só será feita 300ms após o usuário parar de digitar
 *   searchAPI(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Define um timeout para atualizar o valor debounced após o delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o timeout se o valor mudar antes do delay acabar
    // Isso garante que só o último valor seja usado após o usuário parar de digitar
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}