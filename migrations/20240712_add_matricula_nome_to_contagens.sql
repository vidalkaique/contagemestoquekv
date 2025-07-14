-- Adicionar colunas matricula e nome à tabela contagens
do $$
begin
    if not exists (select 1 from information_schema.columns 
                  where table_name = 'contagens' and column_name = 'matricula') then
        alter table public.contagens 
        add column matricula text,
        add column nome text;
    end if;
end $$;
