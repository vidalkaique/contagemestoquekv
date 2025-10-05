import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ContagemWithItens, InsertContagem } from "@shared/schema";
import type { Database } from "@/lib/database.types";

type Tables = Database['public']['Tables'];
type ContagemRow = Tables['contagens']['Row'];
type ProdutoRow = Tables['produtos']['Row'];

type DatabaseContagem = {
  id: string;
  data: string;
  finalizada: boolean;
  excel_url: string | null;
  created_at: string;
  estoque_id: string | null;
  nome: string | null;
  matricula: string | null;
  qntd_produtos?: number;
  estoques: Array<{
    id: string;
    nome: string;
    created_at: string;
  }> | null;
  itens_contagem: Array<{
    id: string;
    contagem_id: string;
    produto_id: string | null;
    nome_livre: string | null;
    pallets: number;
    lastros: number;
    pacotes: number;
    unidades: number;
    total: number;
    total_pacotes: number;
    created_at: string;
    produtos: {
      id: string;
      codigo: string;
      nome: string;
      tag: string | null;
      unidades_por_pacote: number;
      pacotes_por_lastro: number;
      lastros_por_pallet: number;
      quantidade_pacs_por_pallet: number | null;
      ativo: boolean;
      created_at: string;
      updated_at: string;
    } | null;
  }>;
};

export function useUnfinishedCount() {
  return useQuery<ContagemWithItens | null>({
    queryKey: ["contagens", "unfinished"],
    queryFn: async () => {
      // SOLUÇÃO 1: Buscar contagem, estoque e itens SEPARADAMENTE
      // Passo 1: Busca apenas a contagem básica (sem joins)
      const { data, error } = await supabase
        .from('contagens')
        .select('id, data, finalizada, excel_url, created_at, estoque_id, nome, matricula, qntd_produtos')
        .eq('finalizada', false)
        .limit(1);

      if (error && error.code !== 'PGRST116') throw error;
      if (!data || data.length === 0) return null;
      const first = data[0];

      // Passo 2: Busca o estoque separadamente
      let estoque = null;
      if (first.estoque_id) {
        const { data: estoqueData, error: estoqueError } = await supabase
          .from('estoques')
          .select('id, nome, created_at')
          .eq('id', first.estoque_id)
          .single();
        
        if (!estoqueError && estoqueData) {
          estoque = estoqueData;
          console.log('✅ Estoque carregado com sucesso:', estoqueData);
        } else {
          console.warn('⚠️ Erro ao carregar estoque:', estoqueError);
        }
      }

      // Passo 3: Busca os itens da contagem separadamente
      const { data: itensData, error: itensError } = await supabase
        .from('itens_contagem')
        .select('id, contagem_id, produto_id, nome_livre, pallets, lastros, pacotes, unidades, total, total_pacotes, created_at')
        .eq('contagem_id', first.id);

      if (itensError) {
        console.warn('⚠️ Erro ao carregar itens:', itensError);
      }



      // Processa os itens carregados
      const itensProcessados = itensData || [];
      
      // Convert to ContagemWithItens type
      const contagem: ContagemWithItens = {
        id: first.id,
        data: first.data,
        finalizada: first.finalizada,
        nome: first.nome || null,
        matricula: first.matricula || null,
        estoqueId: first.estoque_id,
        excelUrl: first.excel_url,
        qntdProdutos: (first as any).qntd_produtos || 0,
        createdAt: new Date(first.created_at),
        produto: null, // Produtos são carregados via itens
        itens: itensProcessados.map((item: any) => ({
          id: item.id,
          contagemId: item.contagem_id,
          produtoId: item.produto_id,
          nomeLivre: item.nome_livre,
          pallets: item.pallets,
          lastros: item.lastros,
          pacotes: item.pacotes,
          unidades: item.unidades,
          total: item.total,
          totalPacotes: item.total_pacotes,
          unidadesPorPacote: undefined,
          pacotesPorLastro: undefined,
          lastrosPorPallet: undefined,
          quantidadePacsPorPallet: undefined,
          produto: null
        })),
        estoque: estoque ? {
          id: estoque.id,
          nome: estoque.nome,
          ativo: true,
          createdAt: new Date(estoque.created_at),
          updatedAt: new Date()
        } : null
      };

      return contagem;
    },
  });
}

type ContagemLista = DatabaseContagem;

export function useCounts() {
  return useQuery<ContagemWithItens[]>({ 
    queryKey: ["contagens"],
    queryFn: async () => {
      console.log('Iniciando consulta ao banco de dados...');
      console.log('Iniciando consulta ao banco de dados para buscar contagens...');
      
      // Primeiro, buscar apenas as contagens para verificar quantas existem
      const { data: contagensBasicas, error: erroContagens } = await supabase
        .from('contagens')
        .select('id, data, finalizada, created_at, nome, matricula')
        .order('created_at', { ascending: false });
      
      console.log('Contagens básicas encontradas:', contagensBasicas?.length || 0);
      
      if (erroContagens) {
        console.error('Erro ao buscar contagens básicas:', erroContagens);
        throw erroContagens;
      }
      
      // Se não houver contagens, retornar array vazio
      if (!contagensBasicas || contagensBasicas.length === 0) {
        console.log('Nenhuma contagem encontrada no banco de dados');
        return [];
      }
      
      console.log('Buscando detalhes completos para', contagensBasicas.length, 'contagens...');
      
      // Verificar se há IDs válidos para buscar
      const idsContagens = contagensBasicas.map(c => c.id).filter(Boolean);
      
      if (idsContagens.length === 0) {
        console.log('Nenhum ID de contagem válido encontrado');
        return [];
      }
      
      console.log('IDs das contagens a serem buscadas:', idsContagens);
      
      // Função para buscar contagens em lotes menores para evitar problemas com a cláusula IN
      const buscarContagensEmLotes = async (ids: string[]) => {
        const TAMANHO_LOTE = 5; // Reduzido para 5 para evitar timeouts
        let todasContagens: any[] = [];
        let ultimoErro: any = null;
        
        // Processar em lotes menores
        for (let i = 0; i < ids.length; i += TAMANHO_LOTE) {
          const loteIds = ids.slice(i, i + TAMANHO_LOTE);
          console.log(`Processando lote ${Math.floor(i/TAMANHO_LOTE) + 1} de ${Math.ceil(ids.length/TAMANHO_LOTE)} com ${loteIds.length} IDs`);
          
          try {
            // Primeiro busca apenas as contagens básicas
            const { data: loteData, error: loteError } = await supabase
              .from('contagens')
              .select(`
                id,
                data,
                finalizada,
                excel_url,
                created_at,
                qntd_produtos,
                estoque_id,
                nome,
                matricula,
                estoques(
                  id,
                  nome,
                  created_at
                )
              `)
              .in('id', loteIds)
              .order('created_at', { ascending: false });
              
            if (loteError) {
              console.error(`Erro ao buscar lote de contagens:`, loteError);
              ultimoErro = loteError;
              continue; // Pula para o próximo lote em caso de erro
            }
            
            if (loteData && loteData.length > 0) {
              // Buscar itens de contagem separadamente para evitar problemas de desempenho
              const contagensComItens = await Promise.all(
                loteData.map(async (contagem) => {
                  const { data: itens, error: itensError } = await supabase
                    .from('itens_contagem')
                    .select(`
                      id,
                      produto_id,
                      nome_livre,
                      pallets,
                      lastros,
                      pacotes,
                      unidades,
                      total,
                      total_pacotes,
                      created_at,
                      produtos(
                        id,
                        codigo,
                        nome,
                        tag,
                        unidades_por_pacote,
                        pacotes_por_lastro,
                        lastros_por_pallet,
                        quantidade_pacs_por_pallet,
                        ativo,
                        created_at,
                        updated_at
                      )
                    `)
                    .eq('contagem_id', contagem.id);
                  
                  if (itensError) {
                    console.error(`Erro ao buscar itens da contagem ${contagem.id}:`, itensError);
                    return { ...contagem, itens_contagem: [] };
                  }
                  
                  return { ...contagem, itens_contagem: itens || [] };
                })
              );
              
              todasContagens = [...todasContagens, ...contagensComItens];
            }
          } catch (error) {
            console.error(`Erro inesperado ao processar lote de contagens:`, error);
            ultimoErro = error;
            continue; // Continua com o próximo lote mesmo em caso de erro inesperado
          }
        }
        
        // Se não encontrou nenhuma contagem e houve erro, retorna o último erro
        if (todasContagens.length === 0 && ultimoErro) {
          console.error('Falha ao carregar contagens. Último erro:', ultimoErro);
          throw new Error(`Não foi possível carregar as contagens: ${ultimoErro.message || 'Erro desconhecido'}`);
        } else if (ultimoErro) {
          console.warn('Algumas contagens podem não ter sido carregadas devido a erros:', ultimoErro);
        }
        
        return { data: todasContagens, error: null };
      };
      
      // Buscar contagens em lotes
      const { data, error } = await buscarContagensEmLotes(idsContagens);
        
      console.log('Consulta ao banco de dados concluída. Número de contagens retornadas:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('Exemplo de contagem retornada (primeira):', {
          id: data[0].id,
          data: data[0].data,
          finalizada: data[0].finalizada,
          numItens: Array.isArray(data[0].itens_contagem) ? data[0].itens_contagem.length : 0,
          temEstoque: !!data[0].estoques
        });
      }
      
      console.log('Dados retornados do banco:', data);
      if (error) {
        console.error('Erro ao buscar contagens:', error);
        throw error;
      }
      
      // Verificar se há dados retornados
      if (!data || data.length === 0) {
        console.log('Nenhum dado de contagem retornado do banco de dados');
        return [];
      }
      
      // Verificar o primeiro item dos dados retornados para depuração
      console.log('=== DETALHES DA PRIMEIRA CONTAGEM RETORNADA ===');
      console.log('ID:', data[0].id);
      console.log('Data:', data[0].data);
      console.log('Finalizada:', data[0].finalizada);
      console.log('Número de itens_contagem:', 
        Array.isArray(data[0].itens_contagem) ? data[0].itens_contagem.length : 'não é array');
      
      if (Array.isArray(data[0].itens_contagem) && data[0].itens_contagem.length > 0) {
        console.log('Primeiro item_contagem:', data[0].itens_contagem[0]);
        console.log('Produto do primeiro item_contagem:', data[0].itens_contagem[0].produtos);
      }
      console.log('==============================================');
      
      if (error) throw error;
      if (!data) return [];

      // Log detalhado antes do mapeamento
      console.log('=== INÍCIO DO MAPEAMENTO DAS CONTAGENS ===');
      console.log('Total de contagens a processar:', data.length);
      
      // Convert to ContagemWithItens[] type
      let resultArray = data.map((contagem, contagemIndex) => {
        console.log(`\n=== PROCESSANDO CONTAGEM ${contagemIndex + 1}/${data.length} ===`);
        console.log('ID da contagem:', contagem.id);
        console.log('Data da contagem:', contagem.data);
        console.log('Finalizada:', contagem.finalizada);
        console.log('Nome do responsável:', contagem.nome || 'Não informado');
        console.log('Matrícula:', contagem.matricula || 'Não informada');
        
        // Verifica se estoques é um array e pega o primeiro item
        const estoque = Array.isArray(contagem.estoques) && contagem.estoques.length > 0 
          ? contagem.estoques[0] 
          : null;

        console.log('Estoque encontrado:', estoque ? 
          `ID: ${estoque.id}, Nome: ${estoque.nome}` : 'Nenhum estoque associado');

        // Mapear itens da contagem
        console.log('\nItens da contagem (bruto):', contagem.itens_contagem);
        
        const itens = Array.isArray(contagem.itens_contagem) 
          ? contagem.itens_contagem.map((item: any, index: number) => {
              console.log(`\n--- Processando item ${index + 1}/${contagem.itens_contagem.length} ---`);
              console.log('Dados brutos do item:', item);
              
              // Verifica se produtos é um array e pega o primeiro item, caso contrário, usa o próprio valor
              const produtos = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
              
              console.log('Dados brutos do produto:', produtos);
              
              const produtoMapeado = produtos ? {
                id: produtos.id,
                codigo: produtos.codigo,
                nome: produtos.nome,
                tag: produtos.tag || null,
                unidadesPorPacote: produtos.unidades_por_pacote,
                pacotesPorLastro: produtos.pacotes_por_lastro,
                lastrosPorPallet: produtos.lastros_por_pallet,
                quantidadePacsPorPallet: produtos.quantidade_pacs_por_pallet || undefined,
                ativo: produtos.ativo !== undefined ? produtos.ativo : true,
                createdAt: new Date(produtos.created_at),
                updatedAt: new Date(produtos.updated_at || produtos.created_at)
              } : null;
              
              console.log('Produto mapeado:', produtoMapeado);
              
              const itemMapeado = {
                id: item.id,
                contagemId: contagem.id,
                produtoId: item.produto_id,
                nomeLivre: item.nome_livre || undefined,
                pallets: item.pallets,
                lastros: item.lastros,
                pacotes: item.pacotes,
                unidades: item.unidades,
                total: item.total,
                totalPacotes: item.total_pacotes,
                produto: produtoMapeado
              };
              
              console.log('Item mapeado final:', itemMapeado);
              return itemMapeado;
            }) 
          : [];
          
        console.log(`\n=== RESUMO DA CONTAGEM ${contagem.id} ===`);
        console.log(`Total de itens na contagem: ${itens.length}`);
        console.log(`Itens:`, itens);
        
        if (itens.length > 0) {
          console.log('Primeiro item da contagem:', itens[0]);
          
          // Verificar se o produto está definido corretamente no primeiro item
          if (itens[0].produto) {
            console.log('Produto do primeiro item está definido:', itens[0].produto);
          } else {
            console.warn('AVISO: Produto do primeiro item está indefinido ou nulo');
            console.log('Dados completos do primeiro item:', itens[0]);
          }
        } else {
          console.warn('AVISO: Nenhum item encontrado para esta contagem');
          console.log('Dados completos da contagem (para depuração):', contagem);
        }

        // Encontra o primeiro produto não nulo dos itens
        let primeiroProduto = null;
        if (itens && itens.length > 0) {
          for (const item of itens) {
            if (item.produto) {
              primeiroProduto = item.produto;
              break;
            }
          }
        }

        // Criar objeto de contagem com todos os campos necessários
        const contagemCompleta: ContagemWithItens = {
          id: contagem.id,
          data: contagem.data,
          finalizada: contagem.finalizada,
          nome: contagem.nome || null,
          matricula: contagem.matricula || null,
          estoqueId: contagem.estoque_id,
          excelUrl: contagem.excel_url || null,
          qntdProdutos: contagem.qntd_produtos || itens.length,
          createdAt: new Date(contagem.created_at),
          itens: itens,
          produto: primeiroProduto,
          estoque: estoque ? {
            id: estoque.id,
            nome: estoque.nome,
            ativo: true,
            createdAt: new Date(estoque.created_at),
            updatedAt: new Date(estoque.created_at)
          } : null
        };

        console.log('Contagem mapeada:', contagemCompleta);
        return contagemCompleta;
      });

      // sort locally by createdAt desc
      resultArray.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Log detalhado do resultado final
      console.log('\n=== RESULTADO FINAL DAS CONTAGENS ===');
      console.log(`Total de contagens processadas: ${resultArray.length}`);
      
      if (resultArray.length > 0) {
        console.log('\n=== DETALHES DA PRIMEIRA CONTAGEM NO RESULTADO FINAL ===');
        console.log('ID:', resultArray[0].id);
        console.log('Data:', resultArray[0].data);
        console.log('Finalizada:', resultArray[0].finalizada);
        console.log('Número de itens:', resultArray[0].itens?.length || 0);
        
        if (resultArray[0].itens && resultArray[0].itens.length > 0) {
          console.log('\nPrimeiro item da primeira contagem:');
          console.log('- ID:', resultArray[0].itens[0].id);
          console.log('- Produto ID:', resultArray[0].itens[0].produtoId);
          console.log('- Nome Livre:', resultArray[0].itens[0].nomeLivre);
          console.log('- Quantidade Total:', resultArray[0].itens[0].total);
          
          if (resultArray[0].itens[0].produto) {
            console.log('\nProduto associado ao primeiro item:');
            console.log('  - ID:', resultArray[0].itens[0].produto.id);
            console.log('  - Código:', resultArray[0].itens[0].produto.codigo);
            console.log('  - Nome:', resultArray[0].itens[0].produto.nome);
          } else {
            console.warn('\nAVISO: Nenhum produto associado ao primeiro item');
          }
        } else {
          console.warn('\nAVISO: Nenhum item encontrado na primeira contagem');
        }
        
        console.log('\n=== RESUMO DAS PRIMEIRAS 3 CONTAGENS ===');
        resultArray.slice(0, 3).forEach((contagem, index) => {
          console.log(`\nContagem ${index + 1}:`);
          console.log('- ID:', contagem.id);
          console.log('- Data:', contagem.data);
          console.log('- Finalizada:', contagem.finalizada);
          console.log('- Número de itens:', contagem.itens?.length || 0);
          
          if (contagem.itens && contagem.itens.length > 0) {
            console.log(`- Primeiro item: ID=${contagem.itens[0].id}, Total=${contagem.itens[0].total}`);
          }
        });
      }
      
      console.log('\n=== FIM DO PROCESSAMENTO DAS CONTAGENS ===\n');
      
      return resultArray;
    }
  });
}

export function useUpdateProductCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ countId, productCount }: { countId: string; productCount: number }) => {
      const { data, error } = await supabase
        .from('contagens')
        .update({ qntd_produtos: productCount })
        .eq('id', countId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contagens"] });
      queryClient.invalidateQueries({ queryKey: ["contagens", "unfinished"] });
    },
  });
}

export function useCreateCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: InsertContagem) => {
      // Garantir que nome e matricula sejam salvos no Supabase
      const { data: result, error } = await supabase
        .from('contagens')
        .insert({
          data: payload.data,
          finalizada: payload.finalizada || false,
          estoque_id: payload.estoqueId || null,
          nome: payload.nome,
          matricula: payload.matricula
        })
        .select(`
          id,
          data,
          finalizada,
          excel_url,
          created_at,
          estoque_id,
          nome,
          matricula,
          qntd_produtos
        `)
        .single();

      if (error) throw error;
      if (!result) throw new Error('Nenhum dado retornado');

      const contagem = result as DatabaseContagem & { 
        estoque_id: string | null;
        qntd_produtos?: number;
      };

      const novaContagem: ContagemWithItens = {
        id: contagem.id,
        data: contagem.data,
        finalizada: contagem.finalizada,
        estoqueId: contagem.estoque_id,
        excelUrl: contagem.excel_url,
        qntdProdutos: contagem.qntd_produtos || 0,
        produto: null, // Inicialmente não há produto associado
        nome: contagem.nome || null,
        matricula: contagem.matricula || null,
        createdAt: new Date(contagem.created_at),
        itens: [],
        estoque: null
      };
      
      return novaContagem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contagens"] });
    },
  });
}
