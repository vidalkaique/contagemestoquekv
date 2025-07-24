-- Adiciona a coluna tag à tabela produtos se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'produtos' AND column_name = 'tag') THEN
        ALTER TABLE produtos ADD COLUMN tag TEXT;
    END IF;
END $$;

-- Adiciona um comentário para documentar a coluna
COMMENT ON COLUMN produtos.tag IS 'Tag simples para categorização do produto';
