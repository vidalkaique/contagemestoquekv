-- Remove a coluna total_unidades da tabela itens_contagem se ela existir
-- Esta migração é necessária pois a coluna se tornou redundante com as colunas 'total' e 'total_pacotes'

DO $$
BEGIN
    -- Verifica se a coluna existe antes de tentar removê-la
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'itens_contagem' AND column_name = 'total_unidades') THEN
        
        -- Remove a coluna
        ALTER TABLE public.itens_contagem 
        DROP COLUMN total_unidades;
        
        RAISE NOTICE 'Coluna total_unidades removida da tabela itens_contagem com sucesso.';
    ELSE
        RAISE NOTICE 'A coluna total_unidades não existe na tabela itens_contagem.';
    END IF;
END $$;
