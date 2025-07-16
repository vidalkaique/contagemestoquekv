-- Adiciona a coluna quantidade_sistema à tabela itens_contagem

-- Primeiro, verifica se a coluna já existe e a adiciona se necessário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'itens_contagem' AND column_name = 'quantidade_sistema') THEN
        
        -- Adiciona a coluna como integer com valor padrão 0
        ALTER TABLE public.itens_contagem 
        ADD COLUMN quantidade_sistema integer NOT NULL DEFAULT 0;
        
        RAISE NOTICE 'Coluna quantidade_sistema adicionada à tabela itens_contagem com sucesso.';
    ELSE
        RAISE NOTICE 'A coluna quantidade_sistema já existe na tabela itens_contagem.';
    END IF;
END $$;
