-- Adiciona a coluna total_unidades à tabela itens_contagem

-- Primeiro, verifica se a coluna já existe e a adiciona se necessário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'itens_contagem' AND column_name = 'total_unidades') THEN
        
        -- Adiciona a coluna como integer com valor padrão 0
        ALTER TABLE public.itens_contagem 
        ADD COLUMN total_unidades integer NOT NULL DEFAULT 0;
        
        -- Se você precisar calcular o valor baseado em outras colunas existentes, pode fazer algo como:
        -- UPDATE public.itens_contagem
        -- SET total_unidades = [sua_lógica_de_cálculo_aqui]
        -- WHERE total_unidades = 0; -- Apenas se quiser preencher com valores iniciais
        
        RAISE NOTICE 'Coluna total_unidades adicionada à tabela itens_contagem com sucesso.';
    ELSE
        RAISE NOTICE 'A coluna total_unidades já existe na tabela itens_contagem.';
    END IF;
END $$;
