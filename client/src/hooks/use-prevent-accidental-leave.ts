import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function usePreventAccidentalLeave(shouldPrevent: boolean) {
  const [location] = useLocation();

  useEffect(() => {
    if (!shouldPrevent) return;

    // Função para lidar com fechamento/recarregamento da página
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = 'Tem certeza que deseja sair? As alterações não salvas serão perdidas.';
      e.returnValue = message;
      return message;
    };

    // Adiciona o event listener
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Limpa o event listener quando o componente é desmontado
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldPrevent]);

  // Intercepta a navegação com o botão voltar/avançar
  useEffect(() => {
    if (!shouldPrevent) return;

    const handlePopState = (e: PopStateEvent) => {
      if (window.confirm('Tem certeza que deseja sair? As alterações não salvas serão perdidas.')) {
        return;
      }
      // Se o usuário cancelar, mantém na mesma rota
      window.history.pushState(null, '', location);
      e.preventDefault();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldPrevent, location]);
}
