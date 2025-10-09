import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Configurações do auto-save
 * Regra #3: TypeScript consistente com interfaces bem definidas
 */
export interface AutoSaveOptions {
  debounceMs?: number;
  maxWaitMs?: number;
  enableAutoSave?: boolean;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

/**
 * Status do auto-save
 * Regra #3: Tipos específicos ao invés de any
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Resultado do hook
 */
export interface AutoSaveResult {
  saveStatus: AutoSaveStatus;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  manualSave: () => Promise<void>;
}

/**
 * Função de debounce utilitária
 * Regra #1: DRY - Função reutilizável
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

/**
 * Hook de auto-save inteligente
 * Regra #6: Hook customizado para lógica complexa
 * Regra #7: Separação de lógica e apresentação
 * Regra #8: Tratamento robusto de erros
 */
export const useAutoSave = <T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: AutoSaveOptions = {}
): AutoSaveResult => {
  const {
    debounceMs = 2000,
    maxWaitMs = 30000,
    enableAutoSave = true,
    onSaveStart,
    onSaveSuccess,
    onSaveError
  } = options;

  // Estados do auto-save
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs para evitar stale closures
  const dataRef = useRef(data);
  const saveFunctionRef = useRef(saveFunction);
  const optionsRef = useRef(options);

  // Atualiza refs quando props mudam
  useEffect(() => {
    dataRef.current = data;
    saveFunctionRef.current = saveFunction;
    optionsRef.current = options;
  });

  /**
   * Função de salvamento com tratamento de erros
   * Regra #8: Error handling adequado
   */
  const performSave = useCallback(async (dataToSave: T): Promise<void> => {
    if (!enableAutoSave) return;
    
    try {
      setSaveStatus('saving');
      onSaveStart?.();
      
      await saveFunctionRef.current(dataToSave);
      
      setSaveStatus('saved');
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      onSaveSuccess?.();
      
      // Volta para idle após 2s para não poluir a UI
      setTimeout(() => {
        setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 2000);
      
    } catch (error) {
      setSaveStatus('error');
      const errorObj = error instanceof Error ? error : new Error('Erro desconhecido no auto-save');
      onSaveError?.(errorObj);
      console.error('Auto-save failed:', errorObj);
    }
  }, [enableAutoSave, onSaveStart, onSaveSuccess, onSaveError]);

  /**
   * Salvamento com debounce
   * Regra #9: Performance otimizada
   */
  const debouncedSave = useCallback(
    debounce((dataToSave: T) => {
      performSave(dataToSave);
    }, debounceMs),
    [performSave, debounceMs]
  );

  /**
   * Salvamento forçado (manual ou por timeout)
   * Regra #6: useCallback para funções que serão passadas como props
   */
  const manualSave = useCallback(async (): Promise<void> => {
    debouncedSave.cancel(); // Cancela debounce pendente
    await performSave(dataRef.current);
  }, [performSave, debouncedSave]);

  /**
   * Effect para detectar mudanças nos dados
   * Regra #6: Dependências corretas no useEffect
   */
  useEffect(() => {
    if (!enableAutoSave) return;
    
    setHasUnsavedChanges(true);
    debouncedSave(data);
  }, [data, debouncedSave, enableAutoSave]);

  /**
   * Effect para salvamento forçado por tempo
   * Regra #6: Cleanup adequado de intervals
   */
  useEffect(() => {
    if (!enableAutoSave || maxWaitMs <= 0) return;
    
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        manualSave();
      }
    }, maxWaitMs);

    return () => clearInterval(interval);
  }, [manualSave, maxWaitMs, enableAutoSave, hasUnsavedChanges]);

  /**
   * Cleanup no unmount
   * Regra #6: Limpeza adequada de recursos
   */
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    saveStatus,
    lastSaved,
    hasUnsavedChanges,
    manualSave
  };
};
