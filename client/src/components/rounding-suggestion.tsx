import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { PackagePlus, PackageMinus } from "lucide-react";

interface RoundingSuggestionProps {
  currentValue: number;
  maxValue: number;
  onApply: (newPacotes: number, newUnidades: number) => void;
  className?: string;
}

export function RoundingSuggestion({
  currentValue,
  maxValue,
  onApply,
  className = "",
}: RoundingSuggestionProps) {
  // Se não houver valor máximo definido, não mostra sugestão
  if (!maxValue) {
    return null;
  }

  const halfValue = maxValue / 2;
  const shouldAddPackage = currentValue > halfValue;
  
  // Se o valor for 0 ou já estiver arredondado, não mostra sugestão
  if (currentValue === 0 || (shouldAddPackage && currentValue === maxValue)) {
    return null;
  }

  const handleApply = () => {
    if (shouldAddPackage) {
      // Adiciona 1 pacote e zera as unidades
      onApply(1, 0);
    } else {
      // Mantém os pacotes e zera as unidades
      onApply(0, 0);
    }
  };

  return (
    <Alert className={`mt-2 p-2 bg-amber-50 border-amber-200 ${className}`}>
      <div className="flex items-center justify-between">
        <AlertDescription className="text-amber-800 flex items-center gap-2">
          {shouldAddPackage ? (
            <>
              <PackagePlus className="h-4 w-4 text-amber-700" />
              <span>Adicionar 1 pacote e zerar unidades?</span>
            </>
          ) : (
            <>
              <PackageMinus className="h-4 w-4 text-amber-700" />
              <span>Zerar {currentValue} unidade{currentValue > 1 ? 's' : ''}?</span>
            </>
          )}
        </AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-amber-700 hover:bg-amber-100 h-8 px-3"
          onClick={handleApply}
        >
          Aplicar
        </Button>
      </div>
    </Alert>
  );
}
