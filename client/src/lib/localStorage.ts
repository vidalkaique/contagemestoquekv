import type { Produto } from "@shared/schema";

export interface CurrentCountProduct {
  id: string;
  nome: string;
  pallets: number;
  lastros: number;
  pacotes: number;
  unidades: number;
  produtoId?: string;
  unidadesPorPacote?: number;
  pacotesPorLastro?: number;
  lastrosPorPallet?: number;
  quantidadePacsPorPallet?: number;
  totalPacotes?: number;
}

export interface CurrentCount {
  id?: string; // ID da contagem no banco de dados, se existir
  date: string;
  estoqueId?: string;
  estoqueNome?: string;
  products: CurrentCountProduct[];
  lastUpdated: string;
  nome?: string; // Nome do usuário que criou a contagem
  matricula?: string; // Matrícula do usuário que criou a contagem
}

const CURRENT_COUNT_KEY = "contaestoque_current_count";
const COUNT_HISTORY_KEY = "contaestoque_count_history";

export function saveCurrentCount(count: CurrentCount): void {
  try {
    localStorage.setItem(CURRENT_COUNT_KEY, JSON.stringify(count));
  } catch (error) {
    console.error("Error saving current count to localStorage:", error);
  }
}

export function getCurrentCount(): CurrentCount | null {
  try {
    const stored = localStorage.getItem(CURRENT_COUNT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Error loading current count from localStorage:", error);
    return null;
  }
}

export function clearCurrentCount(): void {
  try {
    localStorage.removeItem(CURRENT_COUNT_KEY);
  } catch (error) {
    console.error("Error clearing current count from localStorage:", error);
  }
}

export function saveToCountHistory(count: CurrentCount): void {
  try {
    const history = getCountHistory();
    const existingIndex = count.id ? history.findIndex(c => c.id === count.id) : -1;
    
    if (existingIndex >= 0) {
      // Atualiza contagem existente
      history[existingIndex] = {
        ...count,
        lastUpdated: new Date().toISOString()
      };
    } else {
      // Adiciona nova contagem ao histórico
      history.unshift({
        ...count,
        lastUpdated: new Date().toISOString()
      });
      
      // Mantém apenas os 5 mais recentes
      if (history.length > 5) {
        history.pop();
      }
    }
    
    localStorage.setItem(COUNT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error saving to count history:", error);
  }
}

export function getCountHistory(): CurrentCount[] {
  try {
    const stored = localStorage.getItem(COUNT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error getting count history:", error);
    return [];
  }
}

export function getCountById(countId: string): CurrentCount | null {
  try {
    const history = getCountHistory();
    return history.find(c => c.id === countId) || null;
  } catch (error) {
    console.error("Error getting count by ID:", error);
    return null;
  }
}

export function clearCountHistory(): void {
  try {
    localStorage.removeItem(COUNT_HISTORY_KEY);
  } catch (error) {
    console.error("Error clearing count history:", error);
  }
}
