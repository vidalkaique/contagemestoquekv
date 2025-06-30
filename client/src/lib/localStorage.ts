interface CurrentCount {
  date: string;
  products: Array<{
    id: string;
    nome: string;
    pallets: number;
    lastros: number;
    pacotes: number;
    unidades: number;
  }>;
}

const CURRENT_COUNT_KEY = "contaestoque_current_count";

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
