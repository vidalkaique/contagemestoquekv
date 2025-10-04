import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ItemFieldsEstoque11Props {
  values: {
    pallets: number;
    lastros: number;
    pacotes: number;
    unidades: number;
  };
  onChange: (field: string, value: number) => void;
}

export function ItemFieldsEstoque11({ values, onChange }: ItemFieldsEstoque11Props) {
  const fields = [
    { key: 'pallets', label: 'Pallets' },
    { key: 'lastros', label: 'Lastros' },
    { key: 'pacotes', label: 'Pacotes' },
    { key: 'unidades', label: 'Unidades' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map((field) => (
        <div key={field.key}>
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
          </Label>
          <Input
            type="number"
            min="0"
            value={values[field.key as keyof typeof values]}
            onChange={(e) => onChange(field.key, parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      ))}
    </div>
  );
}
