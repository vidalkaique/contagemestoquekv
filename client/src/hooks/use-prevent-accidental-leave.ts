import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function usePreventAccidentalLeave(shouldPrevent: boolean) {
  const [location, setLocation] = useLocation();

  // Efeito para lidar com fechamento/recarregamento da página
  useEffect(() => {
    if (!shouldPrevent) return;

    // Função para lidar com fechamento/recarregamento da página
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldPrevent) {
        // Mensagem padrão que alguns navegadores podem mostrar
        const message = 'Tem certeza que deseja sair? As alterações não salvas serão perdidas.';
        e.preventDefault();
        e.returnValue = message; // Para navegadores mais antigos
        return message; // Para navegadores modernos
      }
    };

    // Adiciona o event listener
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Limpa o event listener quando o componente é desmontado
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldPrevent]);

  // Efeito para lidar com a navegação (botão voltar/avançar do navegador)
  useEffect(() => {
    if (!shouldPrevent) return;

    // Função para lidar com o popstate (navegação com botão voltar/avançar)
    const handlePopState = (e: PopStateEvent) => {
      if (shouldPrevent) {
        // Mostra um diálogo de confirmação personalizado
        const confirmLeave = window.confirm('Tem certeza que deseja sair? As alterações não salvas serão perdidas.');
        
        if (!confirmLeave) {
          // Se o usuário cancelar, impede a navegação
          e.preventDefault();
          // Força o navegador a ficar na mesma página
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    // Adiciona um estado ao histórico para podermos detectar a navegação
    window.history.pushState(null, '');

    // Adiciona o event listener para popstate
    window.addEventListener('popstate', handlePopState);
    
    // Limpa o event listener quando o componente é desmontado
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldPrevent]);
}
