-- Adiciona a coluna qntd_produtos na tabela contagens
ALTER TABLE contagens 
ADD COLUMN qntd_produtos INTEGER NOT NULL DEFAULT 0;

-- Atualiza as contagens existentes com a contagem de itens
UPDATE contagens c
SET qntd_produtos = (
  SELECT COUNT(*) 
  FROM itens_contagem ic 
  WHERE ic.contagem_id = c.id
)
WHERE qntd_produtos = 0;
