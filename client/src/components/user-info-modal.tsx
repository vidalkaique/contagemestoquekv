import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

export interface UserInfo {
  matricula: string;
  nome: string;
}

interface UserInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (info: UserInfo) => void;
  onResetSaving?: () => void;
}

export function UserInfoModal({ open, onOpenChange, onSave, onResetSaving }: UserInfoModalProps) {
  const [formData, setFormData] = useState<UserInfo>({ matricula: "", nome: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Resetar o estado quando o modal é fechado
  useEffect(() => {
    if (!open) {
      setFormData({ matricula: "", nome: "" });
      setIsSaving(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.matricula.trim() || !formData.nome.trim()) {
      console.log('Dados inválidos:', formData);
      return;
    }

    console.log('Iniciando salvamento...', formData);
    console.log('Estado atual:', { isSaving, open });

    try {
      // Define que está salvando
      setIsSaving(true);
      
      // Chama a função de salvamento e aguarda a conclusão
      await onSave(formData);
      
      console.log('Salvamento concluído com sucesso');
      
      // Só fecha o modal após confirmar que o salvamento foi bem-sucedido
      onOpenChange(false);
      
    } catch (error) {
      console.error('Erro ao salvar informações:', error);
      // Não fecha o modal em caso de erro
      throw error; // Propaga o erro para ser tratado pelo componente pai
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Informações do Contador</DialogTitle>
          <DialogDescription>
            Por favor, informe seus dados para registrar a contagem
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="matricula">Matrícula</Label>
            <Input
              id="matricula"
              placeholder="Sua matrícula"
              value={formData.matricula}
              onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
              required
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              placeholder="Seu nome completo"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
              disabled={isSaving}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !formData.matricula.trim() || !formData.nome.trim()}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
