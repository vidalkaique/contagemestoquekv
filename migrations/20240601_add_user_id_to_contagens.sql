-- Adicionar coluna user_id à tabela contagens se não existir
do $$
begin
    if not exists (select 1 from information_schema.columns 
                  where table_name = 'contagens' and column_name = 'user_id') then
        alter table public.contagens 
        add column user_id uuid references auth.users(id) on delete set null;
        
        -- Adicionar comentário para documentação
        comment on column public.contagens.user_id is 'ID do usuário que criou a contagem (opcional)';
        
        raise notice 'Coluna user_id adicionada à tabela contagens';
    else
        raise notice 'A coluna user_id já existe na tabela contagens';
    end if;
end $$;

-- Atualizar a função de trigger para incluir o user_id se disponível
create or replace function update_contagem_user_id()
returns trigger as $$
begin
    -- Se não houver user_id definido e estivermos em uma sessão autenticada
    if NEW.user_id is null and auth.uid() is not null then
        NEW.user_id = auth.uid();
    end if;
    
    return NEW;
end;
$$ language plpgsql security definer;

-- Criar a trigger se não existir
do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'set_contagem_user_id') then
        create trigger set_contagem_user_id
        before insert on public.contagens
        for each row
        execute function update_contagem_user_id();
        
        raise notice 'Trigger set_contagem_user_id criada com sucesso';
    end if;
end $$;
