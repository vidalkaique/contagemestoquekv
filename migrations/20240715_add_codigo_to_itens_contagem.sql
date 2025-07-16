-- Adiciona a coluna codigo à tabela itens_contagem

-- Primeiro, verifica se a coluna já existe e a adiciona se necessário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'itens_contagem' AND column_name = 'codigo') THEN
        
        -- Adiciona a coluna como nullable inicialmente
        ALTER TABLE public.itens_contagem 
        ADD COLUMN codigo text;
        
        -- Atualiza os registros existentes com um valor padrão (você pode ajustar isso conforme necessário)
        UPDATE public.itens_contagem 
        SET codigo = 'COD-' || id::text
        WHERE codigo IS NULL;
        
        -- Opcional: altera a coluna para NOT NULL após preencher os valores
        -- ALTER TABLE public.itens_contagem ALTER COLUMN codigo SET NOT NULL;
        
        RAISE NOTICE 'Coluna codigo adicionada à tabela itens_contagem com sucesso.';
    ELSE
        RAISE NOTICE 'A coluna codigo já existe na tabela itens_contagem.';
    END IF;
END $$;
