-- Adiciona a coluna atualizado_em à tabela contagens

-- Primeiro, adiciona a coluna se não existir
do $$
begin
    if not exists (select 1 from information_schema.columns 
                  where table_name = 'contagens' and column_name = 'atualizado_em') then
        alter table public.contagens 
        add column atualizado_em timestamp with time zone default now();
        
        -- Atualiza os registros existentes com a data atual
        update public.contagens 
        set atualizado_em = now()
        where atualizado_em is null;
        
        raise notice 'Coluna atualizado_em adicionada à tabela contagens com sucesso.';
    else
        raise notice 'A coluna atualizado_em já existe na tabela contagens.';
    end if;
end $$;

-- Cria a função para atualizar a data de modificação
CREATE OR REPLACE FUNCTION public.atualiza_data_modificacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria o trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'atualiza_contagem_modificacao') THEN
        CREATE TRIGGER atualiza_contagem_modificacao
        BEFORE UPDATE ON public.contagens
        FOR EACH ROW
        EXECUTE FUNCTION public.atualiza_data_modificacao();
        
        RAISE NOTICE 'Trigger para atualização automática de data criado com sucesso.';
    ELSE
        RAISE NOTICE 'O trigger para atualização automática de data já existe.';
    END IF;
END $$;
