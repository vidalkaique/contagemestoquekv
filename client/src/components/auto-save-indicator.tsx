import React from 'react';
import { Check, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AutoSaveStatus } from '@/hooks/use-auto-save';

/**
 * Props do componente AutoSaveIndicator
 * Regra #3: TypeScript consistente com interfaces bem definidas
 */
export interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  onManualSave: () => void;
  className?: string;
}

/**
 * Configuração visual para cada status
 * Regra #1: DRY - Configuração centralizada
 */
const getStatusConfig = (status: AutoSaveStatus, hasUnsavedChanges: boolean) => {
  switch (status) {
    case 'saving':
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        text: 'Salvando...',
        className: 'text-blue-600'
      };
    case 'saved':
      return {
        icon: <Check className="w-4 h-4" />,
        text: 'Salvo',
        className: 'text-green-600'
      };
    case 'error':
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        text: 'Erro ao salvar',
        className: 'text-red-600'
      };
    default:
      return {
        icon: hasUnsavedChanges ? <Clock className="w-4 h-4" /> : <Check className="w-4 h-4" />,
        text: hasUnsavedChanges ? 'Alterações não salvas' : 'Atualizado',
        className: hasUnsavedChanges ? 'text-yellow-600' : 'text-gray-600'
      };
  }
};

/**
 * Formata tempo relativo de forma simples
 * Regra #1: DRY - Função utilitária reutilizável
 */
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes === 1) return 'há 1 minuto';
  if (diffMinutes < 60) return `há ${diffMinutes} minutos`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return 'há 1 hora';
  if (diffHours < 24) return `há ${diffHours} horas`;
  
  return date.toLocaleDateString('pt-BR');
};

/**
 * Componente de indicador de auto-save
 * Regra #4: Componente focado em uma responsabilidade
 * Regra #7: Apenas apresentação, sem lógica de negócio
 * Regra #11: Acessibilidade com labels adequados
 */
export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSaved,
  hasUnsavedChanges,
  onManualSave,
  className = ''
}) => {
  const config = getStatusConfig(status, hasUnsavedChanges);
  const timeAgo = lastSaved ? formatTimeAgo(lastSaved) : null;
  const showManualSave = status === 'error' || hasUnsavedChanges;

  return (
    <div 
      className={`flex items-center gap-2 text-sm ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Status do salvamento automático"
    >
      {/* Indicador principal */}
      <div className={`flex items-center gap-1 ${config.className}`}>
        {config.icon}
        <span>{config.text}</span>
      </div>
      
      {/* Timestamp */}
      {timeAgo && status !== 'saving' && (
        <span className="text-gray-500 text-xs">
          {timeAgo}
        </span>
      )}
      
      {/* Botão de salvamento manual */}
      {showManualSave && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onManualSave}
          className="h-6 px-2 text-xs"
          aria-label="Salvar manualmente"
        >
          Salvar agora
        </Button>
      )}
    </div>
  );
};

/**
 * Versão compacta do indicador (apenas ícone)
 * Regra #4: Componente reutilizável para diferentes contextos
 */
export const AutoSaveIndicatorCompact: React.FC<Pick<AutoSaveIndicatorProps, 'status' | 'hasUnsavedChanges'>> = ({
  status,
  hasUnsavedChanges
}) => {
  const config = getStatusConfig(status, hasUnsavedChanges);
  
  return (
    <div 
      className={`flex items-center ${config.className}`}
      title={config.text}
      role="status"
      aria-label={config.text}
    >
      {config.icon}
    </div>
  );
};
