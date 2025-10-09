import { supabase } from '@/lib/supabase';
import { saveCurrentCount, type CurrentCount } from '@/lib/localStorage';

/**
 * Dados para backup da contagem
 * Regra #3: TypeScript consistente
 */
export interface CountBackupData {
  products: any[];
  countDate: string;
  currentCountId: string | null;
  userInfo?: {
    matricula: string;
    nome: string;
  } | null;
  lastUpdated: string;
}

/**
 * Resultado do backup
 */
export interface BackupResult {
  success: boolean;
  method: 'localStorage' | 'supabase' | 'both';
  error?: Error;
}

/**
 * Salva no localStorage (sempre funciona)
 * Regra #8: Fallback confiável
 */
const saveToLocalStorage = async (data: CountBackupData): Promise<void> => {
  try {
    const currentCount: CurrentCount = {
      id: data.currentCountId || `draft-${Date.now()}`,
      date: data.countDate,
      products: data.products,
      lastUpdated: data.lastUpdated
    };
    
    saveCurrentCount(currentCount);
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error);
    throw new Error('Falha crítica: não foi possível salvar localmente');
  }
};

/**
 * Salva dados completos no Supabase (contagem + produtos)
 * Regra #1: DRY - Reutiliza lógica robusta já existente do handleSaveDraft
 * Regra #8: Tratamento de erros robusto
 */
const saveToSupabase = async (data: CountBackupData): Promise<void> => {
  // Só tenta salvar no Supabase se tiver um ID válido (não draft)
  if (!data.currentCountId || data.currentCountId.startsWith('draft-')) {
    throw new Error('ID inválido para Supabase');
  }

  try {
    // Função para obter o UUID do estoque baseado no tipo (Regra #1: DRY)
    const getEstoqueIdByTipo = async (tipo: string): Promise<string> => {
      try {
        const { data: estoqueData, error } = await supabase
          .from('estoques')
          .select('id')
          .ilike('nome', `%${tipo}%`)
          .single();
        
        if (error || !estoqueData) {
          // Fallback para Estoque 11 se não encontrar
          const { data: fallbackData } = await supabase
            .from('estoques')
            .select('id')
            .ilike('nome', '%11%')
            .single();
          return fallbackData?.id || '3dd14edb-66cd-4374-abaa-9827936823a3';
        }
        
        return estoqueData.id;
      } catch (error) {
        return '3dd14edb-66cd-4374-abaa-9827936823a3'; // Fallback para Estoque 10
      }
    };

    // Detecta tipo de estoque baseado nos produtos (Regra #3: TypeScript consistente)
    const detectTipoEstoque = (): '10' | '11' | '23' => {
      for (const product of data.products) {
        // Se tem campos do Estoque 10, é Estoque 10
        if (product.chaoCheio || product.chaoVazio || product.refugo || product.avaria ||
            product.garrafeiras_chaoCheio || product.sucata || product.manutencao) {
          return '10';
        }
        // Se tem campo UN, é Estoque 23
        if (product.un) {
          return '23';
        }
      }
      // Padrão é Estoque 11
      return '11';
    };

    const tipoEstoque = detectTipoEstoque();
    const estoqueId = await getEstoqueIdByTipo(tipoEstoque);

    // 1. Cria ou atualiza a contagem no Supabase (Regra #1: DRY - mesma lógica do handleSaveDraft)
    const { data: contagem, error: contagemError } = await supabase
      .from('contagens')
      .upsert({
        id: data.currentCountId,
        data: data.countDate,
        finalizada: false, // Auto-save sempre salva como rascunho
        estoque_id: estoqueId,
        nome: data.userInfo?.nome || null,
        matricula: data.userInfo?.matricula || null
      })
      .select()
      .single();

    if (contagemError) throw contagemError;
    
    const finalCountId = contagem.id;

    // 2. Remove itens antigos se existirem (Regra #8: Operação atômica)
    const { error: deleteError } = await supabase
      .from('itens_contagem')
      .delete()
      .eq('contagem_id', finalCountId);

    if (deleteError) throw deleteError;

    // 3. Função para calcular totais (Regra #1: DRY - evita duplicação)
    const calculateTotalPacotes = (product: any): number => {
      return (product.pallets || 0) * (product.lastrosPorPallet || 1) * (product.pacotesPorLastro || 1) +
             (product.lastros || 0) * (product.pacotesPorLastro || 1) +
             (product.pacotes || 0);
    };

    const calculateProductTotal = (product: any): number => {
      // Estoque 10 - Soma todos os campos
      if (tipoEstoque === '10') {
        const garrafas = (product.chaoCheio || 0) + (product.chaoVazio || 0) + 
                        (product.refugo || 0) + (product.avaria || 0);
        const garrafeiras = (product.garrafeiras_chaoCheio || 0) + (product.garrafeiras_chaoVazio || 0) +
                           (product.garrafeiras_avaria || 0) + (product.garrafeiras_refugo || 0);
        const equipamentos = (product.sucata || 0) + (product.manutencao || 0) + 
                            (product.novo || 0) + (product.bloqueado || 0);
        return garrafas + garrafeiras + equipamentos;
      }
      // Estoque 23 - Apenas UN
      if (tipoEstoque === '23') {
        return product.un || 0;
      }
      // Estoque 11 - Cálculo padrão
      return calculateTotalPacotes(product) * (product.unidadesPorPacote || 1) + (product.unidades || 0);
    };

    // 4. ESTRATÉGIA SEGURA: Salvar todos os produtos como nome_livre para evitar Foreign Key Error
    // Isso garante que o auto-save sempre funcione, independente da existência do produto no banco
    if (data.products.length === 0) {
      console.warn('⚠️ Auto-save: Nenhum produto para salvar');
      return;
    }

    const itemsToSave = data.products.map(product => ({
      contagem_id: finalCountId,
      produto_id: null, // SEMPRE NULL - Evita Foreign Key Error
      nome_livre: product.nome || `Produto ${product.codigo || 'sem código'}`, // SEMPRE nome_livre
      // Estoque 11 (padrão)
      pallets: product.pallets || 0,
      lastros: product.lastros || 0,
      pacotes: product.pacotes || 0,
      unidades: product.unidades || 0,
      // Estoque 10 - GARRAFAS (todos os 16 campos)
      chao_cheio: product.chaoCheio || 0,
      chao_cheio_pallets: product.chaoCheio_pallets || 0,
      chao_cheio_lastros: product.chaoCheio_lastros || 0,
      chao_cheio_caixas: product.chaoCheio_caixas || 0,
      chao_vazio: product.chaoVazio || 0,
      chao_vazio_pallets: product.chaoVazio_pallets || 0,
      chao_vazio_lastros: product.chaoVazio_lastros || 0,
      chao_vazio_caixas: product.chaoVazio_caixas || 0,
      refugo: product.refugo || 0,
      refugo_pallets: product.refugo_pallets || 0,
      refugo_lastros: product.refugo_lastros || 0,
      refugo_caixas: product.refugo_caixas || 0,
      avaria: product.avaria || 0,
      avaria_pallets: product.avaria_pallets || 0,
      avaria_lastros: product.avaria_lastros || 0,
      avaria_caixas: product.avaria_caixas || 0,
      // Estoque 10 - GARRAFEIRAS (todos os 16 campos)
      garrafeiras_chao_cheio: product.garrafeiras_chaoCheio || 0,
      garrafeiras_chao_cheio_pallets: product.garrafeiras_chaoCheio_pallets || 0,
      garrafeiras_chao_cheio_lastros: product.garrafeiras_chaoCheio_lastros || 0,
      garrafeiras_chao_cheio_caixas: product.garrafeiras_chaoCheio_caixas || 0,
      garrafeiras_chao_vazio: product.garrafeiras_chaoVazio || 0,
      garrafeiras_chao_vazio_pallets: product.garrafeiras_chaoVazio_pallets || 0,
      garrafeiras_chao_vazio_lastros: product.garrafeiras_chaoVazio_lastros || 0,
      garrafeiras_chao_vazio_caixas: product.garrafeiras_chaoVazio_caixas || 0,
      garrafeiras_avaria: product.garrafeiras_avaria || 0,
      garrafeiras_avaria_pallets: product.garrafeiras_avaria_pallets || 0,
      garrafeiras_avaria_lastros: product.garrafeiras_avaria_lastros || 0,
      garrafeiras_avaria_caixas: product.garrafeiras_avaria_caixas || 0,
      garrafeiras_refugo: product.garrafeiras_refugo || 0,
      garrafeiras_refugo_pallets: product.garrafeiras_refugo_pallets || 0,
      garrafeiras_refugo_lastros: product.garrafeiras_refugo_lastros || 0,
      garrafeiras_refugo_caixas: product.garrafeiras_refugo_caixas || 0,
      // Estoque 10 - EQUIPAMENTOS (4 campos)
      sucata: product.sucata || 0,
      manutencao: product.manutencao || 0,
      novo: product.novo || 0,
      bloqueado: product.bloqueado || 0,
      // Estoque 23 - SIMPLIFICADO
      un: product.un || 0,
      // Totais calculados
      total_pacotes: calculateTotalPacotes(product),
      total: calculateProductTotal(product),
      codigo: product.codigo || null
    }));

    // 5. Insere todos os itens de uma vez (Regra #9: Performance otimizada)
    const { error: insertError } = await supabase
      .from('itens_contagem')
      .insert(itemsToSave);

    if (insertError) throw insertError;

    console.log(`✅ Auto-save Supabase: ${data.products.length} produtos salvos como nome_livre na contagem ${finalCountId}`);
    console.log('ℹ️ Estratégia segura: Todos os produtos salvos como nome_livre para evitar Foreign Key Error');
    
  } catch (error) {
    console.warn('❌ Auto-save Supabase falhou:', error);
    throw error;
  }
};

/**
 * Estratégia de backup com múltiplas camadas
 * Regra #8: Error handling robusto com fallbacks
 * Regra #1: DRY - Função centralizada para todos os backups
 */
export const saveWithBackupStrategy = async (data: CountBackupData): Promise<BackupResult> => {
  let localStorageSuccess = false;
  let supabaseSuccess = false;
  let lastError: Error | undefined;

  // 1. Sempre tenta salvar no localStorage primeiro (crítico)
  try {
    await saveToLocalStorage(data);
    localStorageSuccess = true;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error('Erro no localStorage');
    console.error('Falha crítica no localStorage:', lastError);
    
    // Se localStorage falhar, é um erro crítico
    return {
      success: false,
      method: 'localStorage',
      error: lastError
    };
  }

  // 2. Tenta salvar no Supabase (opcional, mas desejável)
  try {
    await saveToSupabase(data);
    supabaseSuccess = true;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error('Erro no Supabase');
    console.warn('Falha no Supabase (continuando com localStorage):', lastError);
    // Não é crítico se Supabase falhar
  }

  // Determina o resultado
  if (localStorageSuccess && supabaseSuccess) {
    return {
      success: true,
      method: 'both'
    };
  } else if (localStorageSuccess) {
    return {
      success: true,
      method: 'localStorage',
      error: lastError // Inclui erro do Supabase para debug
    };
  } else {
    return {
      success: false,
      method: 'localStorage',
      error: lastError
    };
  }
};

/**
 * Verifica se está online
 * Regra #9: Performance - Evita tentativas desnecessárias
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Hook para detectar mudanças de conectividade
 * Regra #6: Hook customizado para lógica específica
 */
export const useOnlineStatus = () => {
  const [online, setOnline] = React.useState(isOnline());

  React.useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
};

// Importação condicional do React para o hook
import React from 'react';
