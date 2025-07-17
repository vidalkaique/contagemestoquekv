import { useEffect } from 'react';

/**
 * Hook que previne a atualização da página quando houver alterações não salvas
 * @param shouldPrevent - Se deve prevenir a atualização da página
 * @param message - Mensagem personalizada a ser exibida (opcional)
 */
export function usePreventRefresh(shouldPrevent: boolean, message = 'Tem certeza que deseja sair? As alterações não salvas serão perdidas.') {
  useEffect(() => {
    if (!shouldPrevent) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Mensagem padrão que alguns navegadores mostram
      e.preventDefault();
      // Para compatibilidade com navegadores mais antigos
      e.returnValue = message;
      return message;
    };

    // Adiciona o event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Remove o event listener quando o componente é desmontado
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldPrevent, message]);
}
