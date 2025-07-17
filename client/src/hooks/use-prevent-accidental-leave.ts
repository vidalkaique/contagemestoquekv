import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function usePreventAccidentalLeave(shouldPrevent: boolean) {
  const [, navigate] = useLocation();

  // Efeito para lidar com fechamento/recarregamento da página
  useEffect(() => {
    if (!shouldPrevent) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldPrevent) {
        // Mensagem personalizada que será exibida no diálogo de confirmação
        const confirmationMessage = 'Tem certeza que deseja sair? As alterações não salvas serão perdidas.';
        
        // Padrão para a maioria dos navegadores
        e.preventDefault();
        // Para compatibilidade com navegadores mais antigos
        e.returnValue = confirmationMessage;
        
        return confirmationMessage;
      }
    };

    // Adiciona o event listener para beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Limpa o event listener quando o componente é desmontado
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldPrevent]);

  // Efeito para lidar com a navegação (botão voltar/avançar do navegador)
  useEffect(() => {
    if (!shouldPrevent) return;

    // Adiciona um estado ao histórico para podermos detectar a navegação
    window.history.pushState(null, '', window.location.pathname);

    const handlePopState = (e: PopStateEvent) => {
      if (shouldPrevent) {
        // Mostra um diálogo de confirmação personalizado
        const confirmLeave = window.confirm('Tem certeza que deseja sair? As alterações não salvas serão perdidas.');
        
        if (!confirmLeave) {
          // Se o usuário cancelar, impede a navegação
          e.preventDefault();
          // Força o navegador a ficar na mesma página
          window.history.pushState(null, '', window.location.pathname);
        } else {
          // Se confirmar, navega para a página anterior
          window.history.go(-1);
        }
      }
    };

    // Adiciona o event listener para popstate
    window.addEventListener('popstate', handlePopState);
    
    // Limpa o event listener quando o componente é desmontado
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldPrevent, navigate]);
}
