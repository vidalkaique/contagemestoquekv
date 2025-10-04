import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ItemFieldsEstoque23Props {
  values: {
    un: number;
  };
  onChange: (field: string, value: number) => void;
}

export function ItemFieldsEstoque23({ values, onChange }: ItemFieldsEstoque23Props) {
  return (
    <div>
      <Label className="text-sm font-medium text-gray-700">
        UN (Unidades)
      </Label>
      <Input
        type="number"
        min="0"
        value={values.un}
        onChange={(e) => onChange('un', parseInt(e.target.value) || 0)}
        className="mt-1"
      />
    </div>
  );
}
