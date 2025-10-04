import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ItemFieldsEstoque10Props {
  values: {
    chaoCheio: number;
    chaoVazio: number;
    refugo: number;
    sucata: number;
    avaria: number;
    manutencao: number;
    novo: number;
    bloqueado: number;
  };
  onChange: (field: string, value: number) => void;
}

export function ItemFieldsEstoque10({ values, onChange }: ItemFieldsEstoque10Props) {
  const fields = [
    { key: 'chaoCheio', label: 'Chão Cheio' },
    { key: 'chaoVazio', label: 'Chão Vazio' },
    { key: 'refugo', label: 'Refugo' },
    { key: 'sucata', label: 'Sucata' },
    { key: 'avaria', label: 'Avaria' },
    { key: 'manutencao', label: 'Manutenção' },
    { key: 'novo', label: 'Novo' },
    { key: 'bloqueado', label: 'Bloqueado' },
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
