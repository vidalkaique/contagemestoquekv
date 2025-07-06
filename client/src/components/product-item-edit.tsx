import { useState, useEffect } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ProductItemEditProps {
  product: {
    id: string;
    nome: string;
    pallets: number;
    lastros: number;
    pacotes: number;
    unidades: number;
    totalPacotes: number;
    unidadesPorPacote?: number;
    pacotesPorLastro?: number;
    lastrosPorPallet?: number;
    quantidadePacsPorPallet?: number;
  };
  onSave: (updatedProduct: any) => void;
  onRemove: () => void;
}

export function ProductItemEdit({ product, onSave, onRemove }: ProductItemEditProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    pallets: product.pallets,
    lastros: product.lastros,
    pacotes: product.pacotes,
    unidades: product.unidades,
  });

  // Atualiza o formulário quando o produto muda
  useEffect(() => {
    setFormData({
      pallets: product.pallets,
      lastros: product.lastros,
      pacotes: product.pacotes,
      unidades: product.unidades,
    });
  }, [product]);

  // Calcula o total de pacotes
  const calculateTotalPacotes = (customFormData = formData) => {
    let total = customFormData.pacotes || 0;
    
    // Adiciona pacotes dos lastros
    if (product.pacotesPorLastro) {
      total += (customFormData.lastros || 0) * product.pacotesPorLastro;
      
      // Adiciona pacotes dos pallets
      if (product.lastrosPorPallet) {
        total += (customFormData.pallets || 0) * product.lastrosPorPallet * product.pacotesPorLastro;
      }
    }
    
    console.log('Calculando totalPacotes:', {
      pacotes: customFormData.pacotes,
      lastros: customFormData.lastros,
      pallets: customFormData.pallets,
      pacotesPorLastro: product.pacotesPorLastro,
      lastrosPorPallet: product.lastrosPorPallet,
      totalCalculado: total
    });
    
    return total;
  };

  // Calcula o total de unidades
  const calculateTotalUnidades = () => {
    const totalPacotes = calculateTotalPacotes();
    const total = formData.unidades + (product.unidadesPorPacote ? totalPacotes * product.unidadesPorPacote : 0);
    
    console.log('Calculando totalUnidades:', {
      unidades: formData.unidades,
      totalPacotes,
      unidadesPorPacote: product.unidadesPorPacote,
      totalCalculado: total
    });
    
    return total;
  };

  const handleSave = () => {
    const totalPacotes = calculateTotalPacotes();
    const updatedProduct = {
      ...product,
      ...formData,
      totalPacotes,
    };
    
    console.log('Salvando produto:', updatedProduct);
    
    onSave(updatedProduct);
    setIsEditing(false);
    toast({
      title: "Atualizado",
      description: `Quantidades de ${product.nome} foram atualizadas.`,
    });
  };

  const handleCancel = () => {
    setFormData({
      pallets: product.pallets,
      lastros: product.lastros,
      pacotes: product.pacotes,
      unidades: product.unidades,
    });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg flex-1 pr-2">{product.nome}</h3>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="h-8"
            >
              Editar
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRemove}
              className="h-8 w-8 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
          <div><span className="text-gray-500">Pallets:</span><span className="font-medium ml-1">{product.pallets}</span></div>
          <div><span className="text-gray-500">Lastros:</span><span className="font-medium ml-1">{product.lastros}</span></div>
          <div><span className="text-gray-500">Pacotes:</span><span className="font-medium ml-1">{product.pacotes}</span></div>
          <div><span className="text-gray-500">Unidades:</span><span className="font-medium ml-1">{product.unidades}</span></div>
        </div>

        {(product.unidadesPorPacote || product.pacotesPorLastro || product.lastrosPorPallet || product.quantidadePacsPorPallet) && (
          <div className="border-t pt-3 mt-3 text-xs text-gray-600">
            <p className="font-semibold mb-2">Detalhes do Produto:</p>
            <div className="grid grid-cols-2 gap-2">
              {product.unidadesPorPacote && <div>Un/Pacote: <span className="font-bold">{product.unidadesPorPacote}</span></div>}
              {product.pacotesPorLastro && <div>Pac/Lastro: <span className="font-bold">{product.pacotesPorLastro}</span></div>}
              {product.lastrosPorPallet && <div>Lastro/Pallet: <span className="font-bold">{product.lastrosPorPallet}</span></div>}
              {(product.pacotesPorLastro && product.lastrosPorPallet) && 
                <div>Pacotes/Pallet: <span className="font-bold">{product.quantidadePacsPorPallet ?? (product.pacotesPorLastro * product.lastrosPorPallet)}</span></div>
              }
            </div>
          </div>
        )}
        
        {(calculateTotalUnidades() > 0 || calculateTotalPacotes() > 0) && (
          <div className="bg-red-50 p-3 rounded-lg mt-3 text-center">
            <div className="text-sm font-medium text-red-900">Total Unidades: <span className="font-bold">{calculateTotalUnidades().toLocaleString()}</span></div>
            <div className="text-sm font-medium text-red-900 mt-1">Total Pacotes: <span className="font-bold">{calculateTotalPacotes().toLocaleString()}</span></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-blue-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">{product.nome}</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSave}
            className="h-8"
          >
            <Check className="mr-1 h-4 w-4" /> Salvar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCancel}
            className="h-8"
          >
            <X className="mr-1 h-4 w-4" /> Cancelar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Pallets</Label>
          <Input
            type="number"
            min="0"
            value={formData.pallets}
            onChange={(e) => setFormData({...formData, pallets: parseInt(e.target.value) || 0})}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Lastros</Label>
          <Input
            type="number"
            min="0"
            value={formData.lastros}
            onChange={(e) => setFormData({...formData, lastros: parseInt(e.target.value) || 0})}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Pacotes</Label>
          <Input
            type="number"
            min="0"
            value={formData.pacotes}
            onChange={(e) => setFormData({...formData, pacotes: parseInt(e.target.value) || 0})}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Unidades</Label>
          <Input
            type="number"
            min="0"
            value={formData.unidades}
            onChange={(e) => setFormData({...formData, unidades: parseInt(e.target.value) || 0})}
            className="mt-1"
          />
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg mt-4 text-center">
        <div className="text-sm font-medium text-blue-900">
          Total Unidades: <span className="font-bold">{calculateTotalUnidades().toLocaleString()}</span>
        </div>
        <div className="text-sm font-medium text-blue-900 mt-1">
          Total Pacotes: <span className="font-bold">{calculateTotalPacotes().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
