-- Criação da tabela para armazenar as importações de estoque
CREATE TABLE IF NOT EXISTS public.contagem_importacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contagem_id UUID NOT NULL REFERENCES public.contagens(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade_sistema INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Garante que não há duplicatas de produto na mesma contagem
    CONSTRAINT uq_contagem_produto UNIQUE (contagem_id, produto_id)
);

-- Índice para melhorar consultas por contagem
CREATE INDEX IF NOT EXISTS idx_contagem_importacoes_contagem_id ON public.contagem_importacoes(contagem_id);

-- Índice para melhorar consultas por produto
CREATE INDEX IF NOT EXISTS idx_contagem_importacoes_produto_id ON public.contagem_importacoes(produto_id);

-- Comentários para documentação
COMMENT ON TABLE public.contagem_importacoes IS 'Armazena as quantidades de estoque importadas para cada contagem';
COMMENT ON COLUMN public.contagem_importacoes.quantidade_sistema IS 'Quantidade do sistema importada do arquivo Excel';

-- Trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION public.update_contagem_importacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contagem_importacoes_updated_at
BEFORE UPDATE ON public.contagem_importacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_contagem_importacoes_updated_at();
