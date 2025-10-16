import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, FileText, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

export interface ImportedProduct {
  id?: string;
  codigo?: string;
  quantidade: number;
  nome?: string;
  unidadesPorPacote?: number;
  pacotesPorLastro?: number;
  lastrosPorPallet?: number;
  quantidadePacsPorPallet?: number;
}

interface ImportStockScreenProps {
  isOpen: boolean;
  onClose: () => void;
  contagemId: string;
  onImportComplete: (products: ImportedProduct[]) => void;
}

export function ImportStockScreen({ isOpen, onClose, contagemId, onImportComplete }: ImportStockScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Array<{ codigo: string; quantidade: number }>>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const { toast } = useToast();

  const resetState = useCallback(() => {
    setFile(null);
    setPreviewData([]);
    setStep('upload');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo de arquivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!validTypes.includes(selectedFile.type) && 
        !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: 'Formato de arquivo inválido',
        description: 'Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    processFile(selectedFile);
  };

  const processFile = async (fileToProcess: File) => {
    setIsLoading(true);
    
    try {
      const data = await fileToProcess.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet);

      // Mapear colunas (pode ser personalizado conforme necessário)
      const processedData = jsonData
        .map(row => {
          // Tenta encontrar o código em diferentes formatos de coluna
          const codigo = row['Código'] || row['codigo'] || row['CÓDIGO'] || row['CODIGO'] || 
                        row['Material'] || row['material'] || row['MATERIAL'] || '';
          
          // Tenta encontrar a quantidade em diferentes formatos de coluna
          const quantidade = Number(
            row['Quantidade'] || row['quantidade'] || row['QUANTIDADE'] || 
            row['Qtd'] || row['qtd'] || row['QTD'] || 
            row['Estoque'] || row['estoque'] || row['ESTOQUE'] || 0
          );
          
          return {
            codigo: String(codigo).trim(),
            quantidade: Math.max(0, Math.floor(quantidade)) // Garante número inteiro não negativo
          };
        })
        .filter(item => item.codigo); // Remove linhas sem código

      setPreviewData(processedData);
      setStep('preview');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Ocorreu um erro ao processar o arquivo. Verifique o formato e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (previewData.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Primeiro, buscar os IDs dos produtos baseados nos códigos
      // Incluindo o nome para filtrar garrafas vs garrafeiras
      const { data: produtos, error: produtosFetchError } = await supabase
        .from('produtos')
        .select('id, codigo, nome')
        .in('codigo', previewData.map(p => p.codigo));
      
      if (produtosFetchError) throw produtosFetchError;
      
      // Mapear códigos para IDs
      const codigoParaId = new Map(produtos.map(p => [p.codigo, p.id]));
      
      // Agrupar produtos por ID para lidar com duplicatas
      const produtosAgrupados = new Map();
      
      // Contagem Cega: Importa apenas códigos, SEM valores do sistema
      // FILTRO: NÃO importa produtos com "GARRAFA" no nome, apenas "GARRAFEIRA"
      previewData
        .filter(item => {
          if (!codigoParaId.has(item.codigo)) return false;
          
          // Buscar o produto completo para verificar o nome
          const produto = produtos.find(p => p.codigo === item.codigo);
          if (!produto) return false;
          
          const nomeUpper = produto.nome.toUpperCase();
          
          // NÃO importar se contém "GARRAFA" mas NÃO contém "GARRAFEIRA"
          if (nomeUpper.includes('GARRAFA') && !nomeUpper.includes('GARRAFEIRA')) {
            console.log(`🚫 Produto filtrado (GARRAFA): ${produto.nome}`);
            return false;
          }
          
          // Importar se contém "GARRAFEIRA" ou não contém "GARRAFA"
          if (nomeUpper.includes('GARRAFEIRA')) {
            console.log(`✅ Produto aceito (GARRAFEIRA): ${produto.nome}`);
          }
          
          return true;
        })
        .forEach(item => {
          const produtoId = codigoParaId.get(item.codigo)!;
          const chave = `${contagemId}-${produtoId}`;
          
          if (!produtosAgrupados.has(chave)) {
            // Adiciona produto sem quantidade do sistema (contagem cega)
            produtosAgrupados.set(chave, {
              contagem_id: contagemId,
              produto_id: produtoId,
              quantidade_sistema: 0, // Contagem cega: sempre 0
            });
          }
          // Se já existe, não faz nada (evita duplicatas)
        });
      
      // Converter o Map de volta para array
      const dadosParaInserir = Array.from(produtosAgrupados.values());
      
      console.log('Dados para inserir (após agrupamento):', dadosParaInserir);
      
      if (dadosParaInserir.length === 0) {
        throw new Error('Nenhum produto válido para importar. Verifique se os códigos dos produtos existem no sistema.');
      }
      
      // Inserir no banco de dados
      const { error: insertError } = await supabase
        .from('contagem_importacoes')
        .upsert(dadosParaInserir, { 
          onConflict: 'contagem_id,produto_id'
        });
      
      if (insertError) throw insertError;
      
      // Buscar informações completas dos produtos para o callback
      const { data: produtosCompletos, error: produtosCompletosError } = await supabase
        .from('produtos')
        .select('*')
        .in('id', dadosParaInserir.map(item => item.produto_id));
      
      if (produtosCompletosError) throw produtosCompletosError;
      
      // Mapear produtos por ID para busca rápida
      const produtosPorId = new Map(produtosCompletos?.map(p => [p.id, p]) || []);
      
      // Chamar callback de conclusão com os dados processados e informações completas
      onImportComplete(dadosParaInserir.map(item => {
        const produto = produtosPorId.get(item.produto_id);
        return {
          id: item.produto_id,
          quantidade: item.quantidade_sistema,
          codigo: produto?.codigo,
          nome: produto?.nome,
          unidadesPorPacote: produto?.unidades_por_pacote,
          pacotesPorLastro: produto?.pacotes_por_lastro,
          lastrosPorPallet: produto?.lastros_por_pallet,
          quantidadePacsPorPallet: produto?.quantidade_pacs_por_pallet
        };
      }));
      
      toast({
        title: 'Importação concluída',
        description: `${dadosParaInserir.length} produtos foram importados com sucesso.`,
      });
      
      handleClose();
      
    } catch (error) {
      console.error('Erro ao importar produtos:', error);
      
      let errorMessage = 'Ocorreu um erro ao importar os produtos. Tente novamente.';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: 'Erro ao importar produtos',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Estoque</DialogTitle>
          <DialogDescription>
            {step === 'upload' 
              ? 'Faça upload de um arquivo Excel ou CSV com os códigos e quantidades do estoque.'
              : 'Revise os dados antes de confirmar a importação.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' ? (
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Clique para fazer upload</span> ou arraste o arquivo
                  </p>
                  <p className="text-xs text-gray-500">XLSX, XLS ou CSV (até 10MB)</p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </label>
            </div>
            
            {file && (
              <div className="flex items-center p-3 mt-2 text-sm border rounded-md bg-gray-50">
                <FileText className="w-5 h-5 mr-2 text-gray-500" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="ml-2 text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2">
            <div className="mb-4 text-sm text-gray-600">
              <p>Foram encontrados {previewData.length} itens no arquivo.</p>
              <p className="mt-1">Revise os primeiros 10 itens abaixo:</p>
            </div>
            
            <div className="max-h-60 overflow-y-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                      Código
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                      Quantidade
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.slice(0, 10).map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.codigo}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.quantidade.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                  {previewData.length > 10 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-xs text-center text-gray-500">
                        + {previewData.length - 10} itens adicionais não mostrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
              <p className="font-medium">Atenção:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Apenas os produtos com códigos existentes no sistema serão importados.</li>
                <li>Os valores serão definidos como "quantidade em sistema" na contagem.</li>
                <li>Você poderá editar as quantidades após a importação.</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          {step === 'upload' ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => setStep('preview')} 
                disabled={!file || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep('upload')}
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button 
                onClick={handleConfirmImport}
                disabled={isLoading || previewData.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirmar Importação
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
