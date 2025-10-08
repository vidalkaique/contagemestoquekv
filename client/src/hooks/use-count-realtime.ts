import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Interface completa incluindo campos do Estoque 10
export interface RealtimeProductItem {
  id: string;
  codigo?: string;
  nome: string;
  // Estoque 11 (padrão)
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
  totalPacotes: number;
  // Estoque 10 - GARRAFAS
  chaoCheio?: number;
  chaoCheio_pallets?: number;
  chaoCheio_lastros?: number;
  chaoCheio_caixas?: number;
  chaoVazio?: number;
  chaoVazio_pallets?: number;
  chaoVazio_lastros?: number;
  chaoVazio_caixas?: number;
  refugo?: number;
  refugo_pallets?: number;
  refugo_lastros?: number;
  refugo_caixas?: number;
  avaria?: number;
  avaria_pallets?: number;
  avaria_lastros?: number;
  avaria_caixas?: number;
  // Estoque 10 - GARRAFEIRAS
  garrafeiras_chaoCheio?: number;
  garrafeiras_chaoCheio_pallets?: number;
  garrafeiras_chaoCheio_lastros?: number;
  garrafeiras_chaoCheio_caixas?: number;
  garrafeiras_chaoVazio?: number;
  garrafeiras_chaoVazio_pallets?: number;
  garrafeiras_chaoVazio_lastros?: number;
  garrafeiras_chaoVazio_caixas?: number;
  garrafeiras_avaria?: number;
  garrafeiras_avaria_pallets?: number;
  garrafeiras_avaria_lastros?: number;
  garrafeiras_avaria_caixas?: number;
  garrafeiras_refugo?: number;
  garrafeiras_refugo_pallets?: number;
  garrafeiras_refugo_lastros?: number;
  garrafeiras_refugo_caixas?: number;
  // Estoque 10 - EQUIPAMENTOS
  sucata?: number;
  manutencao?: number;
  novo?: number;
  bloqueado?: number;
  // Parâmetros
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

    // Função auxiliar para converter a linha do banco para ProductItem (inclui Estoque 10)
    const mapRow = (item: any): RealtimeProductItem => {
      const prod = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
      return {
        id: prod?.id || item.id,
        codigo: item.codigo || prod?.codigo,
        nome: prod?.nome || item.nome_livre || '',
        // Estoque 11
        pallets: item.pallets ?? 0,
        lastros: item.lastros ?? 0,
        pacotes: item.pacotes ?? 0,
        unidades: item.unidades ?? 0,
        totalPacotes: item.total_pacotes ?? 0,
        // Estoque 10 - GARRAFAS
        chaoCheio: item.chao_cheio ?? 0,
        chaoCheio_pallets: item.chao_cheio_pallets ?? 0,
        chaoCheio_lastros: item.chao_cheio_lastros ?? 0,
        chaoCheio_caixas: item.chao_cheio_caixas ?? 0,
        chaoVazio: item.chao_vazio ?? 0,
        chaoVazio_pallets: item.chao_vazio_pallets ?? 0,
        chaoVazio_lastros: item.chao_vazio_lastros ?? 0,
        chaoVazio_caixas: item.chao_vazio_caixas ?? 0,
        refugo: item.refugo ?? 0,
        refugo_pallets: item.refugo_pallets ?? 0,
        refugo_lastros: item.refugo_lastros ?? 0,
        refugo_caixas: item.refugo_caixas ?? 0,
        avaria: item.avaria ?? 0,
        avaria_pallets: item.avaria_pallets ?? 0,
        avaria_lastros: item.avaria_lastros ?? 0,
        avaria_caixas: item.avaria_caixas ?? 0,
        // Estoque 10 - GARRAFEIRAS
        garrafeiras_chaoCheio: item.garrafeiras_chao_cheio ?? 0,
        garrafeiras_chaoCheio_pallets: item.garrafeiras_chao_cheio_pallets ?? 0,
        garrafeiras_chaoCheio_lastros: item.garrafeiras_chao_cheio_lastros ?? 0,
        garrafeiras_chaoCheio_caixas: item.garrafeiras_chao_cheio_caixas ?? 0,
        garrafeiras_chaoVazio: item.garrafeiras_chao_vazio ?? 0,
        garrafeiras_chaoVazio_pallets: item.garrafeiras_chao_vazio_pallets ?? 0,
        garrafeiras_chaoVazio_lastros: item.garrafeiras_chao_vazio_lastros ?? 0,
        garrafeiras_chaoVazio_caixas: item.garrafeiras_chao_vazio_caixas ?? 0,
        garrafeiras_avaria: item.garrafeiras_avaria ?? 0,
        garrafeiras_avaria_pallets: item.garrafeiras_avaria_pallets ?? 0,
        garrafeiras_avaria_lastros: item.garrafeiras_avaria_lastros ?? 0,
        garrafeiras_avaria_caixas: item.garrafeiras_avaria_caixas ?? 0,
        garrafeiras_refugo: item.garrafeiras_refugo ?? 0,
        garrafeiras_refugo_pallets: item.garrafeiras_refugo_pallets ?? 0,
        garrafeiras_refugo_lastros: item.garrafeiras_refugo_lastros ?? 0,
        garrafeiras_refugo_caixas: item.garrafeiras_refugo_caixas ?? 0,
        // Estoque 10 - EQUIPAMENTOS
        sucata: item.sucata ?? 0,
        manutencao: item.manutencao ?? 0,
        novo: item.novo ?? 0,
        bloqueado: item.bloqueado ?? 0,
        // Parâmetros
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
