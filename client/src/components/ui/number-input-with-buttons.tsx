import { Minus, Plus } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";

interface NumberInputWithButtonsProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export function NumberInputWithButtons({
  value,
  onChange,
  min = 0,
  className = "",
  inputClassName = "",
  buttonClassName = "",
}: NumberInputWithButtonsProps) {
  const handleIncrement = () => {
    onChange((value || 0) + 1);
  };

  const handleDecrement = () => {
    onChange(Math.max(min, (value || 0) - 1));
  };

  return (
    <div className={`flex items-center ${className}`}>
      <Button
        type="button"
        variant="destructive"
        size="icon"
        onClick={handleDecrement}
        className={`rounded-r-none h-12 w-10 ${buttonClassName}`}
        aria-label="Decrementar"
      >
        <Minus className="h-4 w-4" />
      </Button>
      
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className={`h-12 text-center rounded-none border-x-0 ${inputClassName}`}
      />
      
      <Button
        type="button"
        variant="destructive"
        size="icon"
        onClick={handleIncrement}
        className={`rounded-l-none h-12 w-10 ${buttonClassName}`}
        aria-label="Incrementar"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
