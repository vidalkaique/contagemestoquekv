-- Habilitar UUID
create extension if not exists pgcrypto;

-- Produtos
create table if not exists public.produtos (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    nome text not null,
    unidades_por_pacote integer not null default 1,
    pacotes_por_lastro integer not null default 1,
    lastros_por_pallet integer not null default 1,
    created_at timestamptz not null default now()
);

-- Contagens
create table if not exists public.contagens (
    id uuid primary key default gen_random_uuid(),
    data date not null,
    created_at timestamptz not null default now(),
    excel_url text,
    finalizada boolean not null default false
);

-- Garantir que a coluna finalizada exista
do $$ 
begin
    if not exists (select 1 from information_schema.columns 
                  where table_name = 'contagens' and column_name = 'finalizada') then
        alter table public.contagens add column finalizada boolean not null default false;
    end if;
end $$;

-- Itens de contagem
create table if not exists public.itens_contagem (
    id uuid primary key default gen_random_uuid(),
    contagem_id uuid not null references public.contagens(id) on delete cascade,
    produto_id uuid references public.produtos(id),
    nome_livre text,
    pallets integer not null default 0,
    lastros integer not null default 0,
    pacotes integer not null default 0,
    unidades integer not null default 0
);

-- Garantir que a coluna total exista na tabela itens_contagem
do $$ 
begin
    if not exists (select 1 from information_schema.columns 
                  where table_name = 'itens_contagem' and column_name = 'total') then
        alter table public.itens_contagem add column total integer not null default 0;
    end if;
end $$;

-- Criar ou substituir a função que calcula o total
create or replace function calculate_item_total()
returns trigger as $$
declare
    total_calculado integer;
begin
    -- Se tem produto cadastrado, usa as configurações dele
    if NEW.produto_id is not null then
        select 
            (NEW.pallets * p.unidades_por_pacote * p.pacotes_por_lastro * p.lastros_por_pallet) +
            (NEW.lastros * p.unidades_por_pacote * p.pacotes_por_lastro) +
            (NEW.pacotes * p.unidades_por_pacote) +
            NEW.unidades
        from public.produtos p
        where p.id = NEW.produto_id
        into total_calculado;
        
        NEW.total = coalesce(total_calculado, 0);
    else
        -- Se não tem produto, soma direta
        NEW.total = coalesce(NEW.pallets, 0) + coalesce(NEW.lastros, 0) + coalesce(NEW.pacotes, 0) + coalesce(NEW.unidades, 0);
    end if;
    
    return NEW;
end;
$$ language plpgsql;

-- Criar a trigger se não existir
do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'update_item_total') then
        create trigger update_item_total
        before insert or update on public.itens_contagem
        for each row
        execute function calculate_item_total();
    end if;
end $$;

-- Atualizar os totais dos registros existentes
update public.itens_contagem ic
set total = 
    case 
        when p.id is not null then
            (ic.pallets * p.unidades_por_pacote * p.pacotes_por_lastro * p.lastros_por_pallet) +
            (ic.lastros * p.unidades_por_pacote * p.pacotes_por_lastro) +
            (ic.pacotes * p.unidades_por_pacote) +
            ic.unidades
        else
            ic.pallets + ic.lastros + ic.pacotes + ic.unidades
    end
from public.produtos p
where ic.produto_id = p.id or ic.produto_id is null;

-- Índices
create index if not exists idx_produtos_nome on public.produtos(nome);
create index if not exists idx_produtos_codigo on public.produtos(codigo);
create index if not exists idx_itens_contagem_contagem on public.itens_contagem(contagem_id); 