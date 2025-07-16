-- Adiciona a coluna unidade_medida à tabela itens_contagem

-- Primeiro, verifica se a coluna já existe e a adiciona se necessário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'itens_contagem' AND column_name = 'unidade_medida') THEN
        
        -- Adiciona a coluna como varchar(20) com valor padrão 'UN' (unidade)
        -- Você pode alterar o valor padrão para 'CX' (caixa), 'KG' (quilo), etc., se necessário
        ALTER TABLE public.itens_contagem 
        ADD COLUMN unidade_medida varchar(20) NOT NULL DEFAULT 'UN';
        
        -- Se você precisar atualizar os valores existentes com base em alguma lógica:
        -- UPDATE public.itens_contagem
        -- SET unidade_medida = 'CX' -- ou outra lógica de preenchimento
        -- WHERE [sua_condicao];
        
        RAISE NOTICE 'Coluna unidade_medida adicionada à tabela itens_contagem com sucesso.';
    ELSE
        RAISE NOTICE 'A coluna unidade_medida já existe na tabela itens_contagem.';
    END IF;
END $$;
