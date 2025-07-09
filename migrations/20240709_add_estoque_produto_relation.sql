-- Migração para adicionar relacionamento entre produtos e estoques

-- Tabela de relacionamento entre produtos e estoques
CREATE TABLE IF NOT EXISTS public.produto_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  estoque_id UUID NOT NULL REFERENCES public.estoques(id) ON DELETE CASCADE,
  localizacao TEXT,
  quantidade_minima INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(produto_id, estoque_id)
);

-- Índices para melhorar consultas
CREATE INDEX IF NOT EXISTS idx_produto_estoque_produto ON public.produto_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_estoque_estoque ON public.produto_estoque(estoque_id);

-- Função para atualizar o campo atualizado_em
CREATE OR REPLACE FUNCTION atualizar_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar a data de atualização
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'atualizar_produto_estoque') THEN
    CREATE TRIGGER atualizar_produto_estoque
    BEFORE UPDATE ON public.produto_estoque
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_data_atualizacao();
  END IF;
END $$;

-- Adicionar coluna de ativo na tabela de produtos
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- Criar view para facilitar consultas de produtos por estoque
CREATE OR REPLACE VIEW public.produtos_por_estoque AS
SELECT 
  pe.id,
  p.id AS produto_id,
  p.codigo,
  p.nome AS produto_nome,
  e.id AS estoque_id,
  e.nome AS estoque_nome,
  pe.localizacao,
  pe.quantidade_minima,
  p.unidades_por_pacote,
  p.pacotes_por_lastro,
  p.lastros_por_pallet,
  p.quantidade_pacs_por_pallet,
  pe.criado_em,
  pe.atualizado_em
FROM public.produto_estoque pe
JOIN public.produtos p ON pe.produto_id = p.id
JOIN public.estoques e ON pe.estoque_id = e.id
WHERE p.ativo = TRUE;

-- Comentários para documentação
COMMENT ON TABLE public.produto_estoque IS 'Tabela de relacionamento entre produtos e estoques, contendo informações específicas de cada produto em cada estoque';
COMMENT ON COLUMN public.produto_estoque.localizacao IS 'Localização física do produto no estoque';
COMMENT ON COLUMN public.produto_estoque.quantidade_minima IS 'Quantidade mínima em estoque para alertas';

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.produto_estoque TO authenticated;
GRANT SELECT ON TABLE public.produtos_por_estoque TO authenticated;
