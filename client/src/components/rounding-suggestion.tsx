import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { ArrowUp, ArrowDown } from "lucide-react";

interface RoundingSuggestionProps {
  currentValue: number;
  maxValue: number;
  onApply: (value: number) => void;
  className?: string;
}

export function RoundingSuggestion({
  currentValue,
  maxValue,
  onApply,
  className = "",
}: RoundingSuggestionProps) {
  // Se não houver valor máximo definido ou o valor atual for 0, não mostra sugestão
  if (!maxValue || currentValue === 0) {
    return null;
  }

  const halfValue = maxValue / 2;
  const shouldRoundUp = currentValue > halfValue;
  const suggestedValue = shouldRoundUp ? maxValue : 0;
  
  // Se o valor já estiver arredondado, não mostra sugestão
  if (currentValue === suggestedValue) {
    return null;
  }

  return (
    <Alert className={`mt-2 p-2 bg-amber-50 border-amber-200 ${className}`}>
      <div className="flex items-center justify-between">
        <AlertDescription className="text-amber-800 flex items-center gap-2">
          {shouldRoundUp ? (
            <ArrowUp className="h-4 w-4 text-amber-700" />
          ) : (
            <ArrowDown className="h-4 w-4 text-amber-700" />
          )}
          Arredondar para {suggestedValue}?
        </AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-amber-700 hover:bg-amber-100 h-8 px-3"
          onClick={() => onApply(suggestedValue)}
        >
          Aplicar
        </Button>
      </div>
    </Alert>
  );
}
