import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, X } from "lucide-react";

type SaveCountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  isLoading?: boolean;
};

export function SaveCountModal({
  isOpen,
  onClose,
  onSave,
  onDiscard,
  isLoading = false,
}: SaveCountModalProps) {
  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      console.error("Erro ao salvar contagem:", error);
    } finally {
      onClose();
    }
  };

  const handleDiscard = () => {
    onDiscard();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Salvar contagem</DialogTitle>
          <DialogDescription>
            Você tem uma contagem em andamento. O que deseja fazer?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Seus itens contados serão salvos e você poderá continuar de onde parou mais tarde.
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between w-full">
          <Button 
            variant="outline" 
            onClick={handleDiscard}
            className="w-full sm:w-auto"
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Descartar alterações
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={handleSave} 
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar e sair
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
