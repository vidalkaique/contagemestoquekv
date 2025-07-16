import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Defina o subconjunto mínimo necessário para o hook operar.
export interface RealtimeProductItem {
  id: string;
  codigo?: string;
  nome: string;
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
  totalPacotes: number;
  unidadesPorPacote?: number;
  pacotesPorLastro?: number;
  lastrosPorPallet?: number;
  quantidadePacsPorPallet?: number | null;
  quantidadeSistema?: number | null;
}

/**
 * Hook que carrega os itens da contagem e mantém o estado sincronizado em tempo real
 * @param contagemId ID da contagem a acompanhar
 * @param setProducts Setter do estado local `products`
 */
export function useCountRealtime(
  contagemId: string | undefined,
  setProducts: React.Dispatch<React.SetStateAction<RealtimeProductItem[]>>,
) {
  useEffect(() => {
    if (!contagemId) return;

    let cancelled = false;

    // Função auxiliar para converter a linha do banco para ProductItem
    const mapRow = (item: any): RealtimeProductItem => {
      const prod = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
      return {
        id: prod?.id || item.id,
        codigo: item.codigo || prod?.codigo,
        nome: prod?.nome || item.nome_livre || '',
        pallets: item.pallets ?? 0,
        lastros: item.lastros ?? 0,
        pacotes: item.pacotes ?? 0,
        unidades: item.unidades ?? 0,
        totalPacotes: item.total_pacotes ?? 0,
        unidadesPorPacote: prod?.unidades_por_pacote ?? undefined,
        pacotesPorLastro: prod?.pacotes_por_lastro ?? undefined,
        lastrosPorPallet: prod?.lastros_por_pallet ?? undefined,
        quantidadePacsPorPallet: prod?.quantidade_pacs_por_pallet ?? undefined,
        quantidadeSistema: item.quantidade_sistema ?? prod?.quantidade_sistema ?? 0,
      };
    };

    // Carrega itens iniciais
    (async () => {
      const { data, error } = await supabase
        .from('itens_contagem')
        .select('*, produtos(*)')
        .eq('contagem_id', contagemId);

      if (!cancelled && !error && data) {
        setProducts(data.map(mapRow));
      }
    })();

    // Função que aplica as mudanças recebidas via Realtime ao array local
    const applyChange = (
      prev: RealtimeProductItem[],
      payload: RealtimePostgresChangesPayload<any>,
    ): RealtimeProductItem[] => {
      const { eventType } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const newItem = mapRow(payload.new);
        const idx = prev.findIndex(p => p.id === newItem.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = newItem;
          return clone;
        }
        return [...prev, newItem];
      }
      if (eventType === 'DELETE') {
        const deletedId = payload.old?.id as string;
        return prev.filter(p => p.id !== deletedId);
      }
      return prev;
    };

    // Inscreve no canal em tempo real
    const channel = supabase.channel(`count-${contagemId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itens_contagem', filter: `contagem_id=eq.${contagemId}` },
        (payload) => {
          setProducts(prev => applyChange(prev, payload));
        },
      )
      .subscribe();

    // Cleanup
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [contagemId, setProducts]);
}
