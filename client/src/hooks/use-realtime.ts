import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

/**
 * Hook para gerenciar listeners de realtime do Supabase
 * Oferece diferentes tipos de sincronização em tempo real
 */

/**
 * Hook global para sincronizar todas as contagens em tempo real
 * Usado na tela principal/dashboard
 */
export const useContagensRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔄 Iniciando listener realtime para contagens globais');

    const channel = supabase
      .channel('contagens-global-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'contagens'
        },
        (payload) => {
          console.log('📡 Mudança detectada em contagens:', payload);
          
          // Invalida todas as queries relacionadas a contagens
          queryClient.invalidateQueries({ queryKey: ['contagens'] });
          queryClient.invalidateQueries({ queryKey: ['contagens-unfinished'] });
          
          // Notificação opcional baseada no evento
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Nova contagem criada",
              description: "Uma nova contagem foi iniciada",
              variant: "default"
            });
          } else if (payload.eventType === 'UPDATE') {
            // Só notifica se foi finalizada
            if (payload.new?.finalizada && !payload.old?.finalizada) {
              toast({
                title: "Contagem finalizada",
                description: "Uma contagem foi concluída",
                variant: "default"
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Removendo listener realtime para contagens globais');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

/**
 * Hook para sincronizar itens de uma contagem específica em tempo real
 * Usado na página de contagem atual
 */
export const useContagemItensRealtime = (contagemId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!contagemId || contagemId.startsWith('draft-')) {
      console.log('⏭️ Pulando realtime: contagem é rascunho local ou inexistente');
      return;
    }

    console.log('🔄 Iniciando listener realtime para itens da contagem:', contagemId);

    const channel = supabase
      .channel(`contagem-itens-${contagemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itens_contagem',
          filter: `contagem_id=eq.${contagemId}`
        },
        (payload) => {
          console.log('📡 Mudança detectada nos itens da contagem:', payload);
          
          // Invalida queries específicas da contagem
          queryClient.invalidateQueries({ queryKey: ['contagem', contagemId] });
          queryClient.invalidateQueries({ queryKey: ['contagem-itens', contagemId] });
          
          // Também invalida a contagem global para atualizar totais
          queryClient.invalidateQueries({ queryKey: ['contagens'] });
          
          // Notificações opcionais
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Item adicionado",
              description: "Um novo produto foi adicionado à contagem",
              variant: "default",
              duration: 2000
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Item atualizado", 
              description: "Quantidade de um produto foi alterada",
              variant: "default",
              duration: 2000
            });
          } else if (payload.eventType === 'DELETE') {
            toast({
              title: "Item removido",
              description: "Um produto foi removido da contagem",
              variant: "destructive",
              duration: 2000
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Removendo listener realtime para itens da contagem:', contagemId);
      supabase.removeChannel(channel);
    };
  }, [contagemId, queryClient]);
};

/**
 * Hook para sincronizar informações de usuário de uma contagem específica
 * Usado quando há mudanças de nome/matrícula
 */
export const useContagemUserInfoRealtime = (
  contagemId?: string,
  onUserInfoUpdate?: (userInfo: { matricula: string | null; nome: string | null }) => void
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!contagemId || contagemId.startsWith('draft-')) {
      return;
    }

    console.log('🔄 Iniciando listener realtime para informações do usuário da contagem:', contagemId);

    const channel = supabase
      .channel(`contagem-userinfo-${contagemId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contagens',
          filter: `id=eq.${contagemId}`
        },
        (payload) => {
          console.log('📡 Informações do usuário atualizadas:', payload);
          
          // Se nome ou matrícula mudaram
          if (
            payload.new?.matricula !== payload.old?.matricula ||
            payload.new?.nome !== payload.old?.nome
          ) {
            // Chama callback se fornecido
            if (onUserInfoUpdate) {
              onUserInfoUpdate({
                matricula: payload.new?.matricula || null,
                nome: payload.new?.nome || null
              });
            }

            // Invalida queries
            queryClient.invalidateQueries({ queryKey: ['contagens'] });
            queryClient.invalidateQueries({ queryKey: ['contagem', contagemId] });

            // Notificação
            toast({
              title: "Informações atualizadas",
              description: "Nome/matrícula foram atualizados em tempo real",
              variant: "default",
              duration: 3000
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Removendo listener realtime para informações do usuário');
      supabase.removeChannel(channel);
    };
  }, [contagemId, onUserInfoUpdate, queryClient]);
};

/**
 * Hook combinado para usar todos os listeners de realtime de uma vez
 * Útil para páginas que precisam de sincronização completa
 */
export const useFullRealtime = (
  contagemId?: string,
  onUserInfoUpdate?: (userInfo: { matricula: string | null; nome: string | null }) => void
) => {
  // Usa todos os hooks de realtime
  useContagensRealtime();
  useContagemItensRealtime(contagemId);
  useContagemUserInfoRealtime(contagemId, onUserInfoUpdate);
};
