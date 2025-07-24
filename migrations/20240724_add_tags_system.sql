-- Cria a tabela de tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#3b82f6', -- Cor padrão azio
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Cria a tabela de junção entre produtos e tags
CREATE TABLE IF NOT EXISTS produto_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(produto_id, tag_id)
);

-- Cria um índice para melhorar consultas por produto
CREATE INDEX IF NOT EXISTS idx_produto_tags_produto_id ON produto_tags(produto_id);

-- Cria um índice para melhorar consultas por tag
CREATE INDEX IF NOT EXISTS idx_produto_tags_tag_id ON produto_tags(tag_id);

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar o updated_at
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produto_tags_updated_at
BEFORE UPDATE ON produto_tags
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
