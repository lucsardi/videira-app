-- =========================================================
-- VIDEIRA APP — Schema do Supabase
-- Cole este arquivo inteiro em: Supabase > SQL Editor > New query > Run
--
-- Se você já tinha rodado uma versão ANTERIOR deste script (com só
-- "admin"/"leader"), pode rodar este arquivo de novo por cima —
-- ele foi escrito para ser seguro de re-executar (idempotente) e
-- migra automaticamente os papéis antigos para os novos.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- Tabela: connections (conexões / células) ----------
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- ---------- Tabela: people (aniversariantes) ----------
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_day int not null check (birth_day between 1 and 31),
  birth_month int not null check (birth_month between 1 and 12),
  connection_id uuid references connections(id) on delete set null,
  is_leader boolean not null default false,
  wedding_day int check (wedding_day between 1 and 31),
  wedding_month int check (wedding_month between 1 and 12),
  spouse_name text,
  photo_url text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Caso a tabela já existisse de uma versão anterior sem a coluna de foto:
alter table people add column if not exists photo_url text;

-- ---------- Tabela: profiles (perfil/papel de cada usuário) ----------
-- Papéis (roles):
--   admin          -> acesso total, vê a igreja inteira
--   leader_view    -> só visualiza, restrito à própria conexão
--   leader_editor  -> visualiza, adiciona e edita, restrito à própria conexão
--   leader_manager -> visualiza, adiciona, edita e exclui, restrito à própria conexão
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'leader_view',
  connection_id uuid references connections(id) on delete set null,
  created_at timestamptz default now()
);

-- Migração de uma versão antiga (role só admin/leader) para os 4 níveis novos
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'role'
  ) then
    update profiles set role = 'leader_view' where role = 'leader';
  end if;
end $$;

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'leader_view', 'leader_editor', 'leader_manager'));

-- ---------- Tabela: invites (convites para novos usuários) ----------
-- Importante: em Authentication > URL Configuration no painel do Supabase,
-- configure o "Site URL" com o endereço do seu app publicado (ex:
-- https://seu-app.vercel.app/login.html) para que o e-mail de confirmação
-- que o Supabase envia automaticamente leve a pessoa para o lugar certo.
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  email text not null,
  role text not null check (role in ('admin', 'leader_view', 'leader_editor', 'leader_manager')),
  connection_id uuid references connections(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  used boolean not null default false,
  created_at timestamptz default now()
);

-- ---------- Cria profile automaticamente quando um usuário é criado ----------
-- Se houver um convite pendente (mesmo e-mail, ainda não usado), aplica o papel
-- e a conexão definidos no convite. Senão, entra com o papel padrão (leader_view).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  convite record;
begin
  select * into convite
  from public.invites
  where lower(email) = lower(new.email) and used = false
  order by created_at desc
  limit 1;

  if convite.id is not null then
    insert into public.profiles (id, full_name, role, connection_id)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), convite.role, convite.connection_id)
    on conflict (id) do nothing;

    update public.invites set used = true where id = convite.id;
  else
    insert into public.profiles (id, full_name, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'leader_view')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Função pública para a tela de convite ler os dados do convite pelo token
-- (sem precisar dar acesso de leitura à tabela inteira de convites)
create or replace function public.get_invite_info(p_token uuid)
returns table(email text, role text, connection_name text, used boolean)
language sql security definer set search_path = public stable
as $$
  select i.email, i.role, c.name, i.used
  from public.invites i
  left join public.connections c on c.id = i.connection_id
  where i.token = p_token;
$$;

grant execute on function public.get_invite_info(uuid) to anon, authenticated;

-- ---------- Funções auxiliares de permissão ----------
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_edit()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'leader_editor', 'leader_manager')
  );
$$;

create or replace function public.can_delete()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'leader_manager')
  );
$$;

create or replace function public.my_connection()
returns uuid
language sql security definer set search_path = public stable
as $$
  select connection_id from public.profiles where id = auth.uid();
$$;

-- =========================================================
-- Row Level Security (RLS)
-- =========================================================
alter table connections enable row level security;
alter table people enable row level security;
alter table profiles enable row level security;

-- connections: todo usuário logado pode ver a lista (para escolher/exibir a própria conexão);
-- só admin cria/edita/apaga conexões
drop policy if exists "connections_select" on connections;
create policy "connections_select" on connections
  for select using (auth.role() = 'authenticated');

drop policy if exists "connections_admin_all" on connections;
create policy "connections_admin_all" on connections
  for all using (public.is_admin()) with check (public.is_admin());

-- people: visão restrita à própria conexão para líderes; admin vê tudo (igreja inteira)
drop policy if exists "people_select" on people;
create policy "people_select" on people
  for select using (
    public.is_admin() or connection_id = public.my_connection()
  );

drop policy if exists "people_insert" on people;
create policy "people_insert" on people
  for insert with check (
    public.is_admin()
    or (public.can_edit() and connection_id = public.my_connection())
  );

drop policy if exists "people_update" on people;
create policy "people_update" on people
  for update using (
    public.is_admin()
    or (public.can_edit() and connection_id = public.my_connection())
  );

drop policy if exists "people_admin_update" on people;
drop policy if exists "people_admin_delete" on people;
drop policy if exists "people_delete" on people;
create policy "people_delete" on people
  for delete using (
    public.is_admin()
    or (public.can_delete() and connection_id = public.my_connection())
  );

-- profiles: cada um vê o próprio perfil; admin vê e edita todos
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles
  for update using (public.is_admin());

-- Admin pode revogar o acesso de alguém removendo o profile dela (o login em si
-- continua existindo no Supabase Auth, mas a pessoa perde toda permissão no app)
drop policy if exists "profiles_admin_delete" on profiles;
create policy "profiles_admin_delete" on profiles
  for delete using (public.is_admin());

-- invites: só admin cria/vê/apaga convites (a leitura pública e pontual por token
-- acontece através da função get_invite_info, que não expõe a tabela inteira)
alter table invites enable row level security;

drop policy if exists "invites_admin_all" on invites;
create policy "invites_admin_all" on invites
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- Storage: bucket para fotos dos aniversariantes
-- =========================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_publico" on storage.objects;
create policy "avatars_select_publico" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_autenticado" on storage.objects;
create policy "avatars_insert_autenticado" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "avatars_update_autenticado" on storage.objects;
create policy "avatars_update_autenticado" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "avatars_delete_autenticado" on storage.objects;
create policy "avatars_delete_autenticado" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- =========================================================
-- Depois de rodar este script:
-- 1) Crie seu primeiro usuário admin em Authentication > Users > Add user
-- 2) Vá em Table Editor > profiles, ache a linha desse usuário
--    e mude a coluna "role" de "leader_view" para "admin"
-- 3) Cadastre as conexões pela tela "Conexões" do app (como admin),
--    ou aqui embaixo:
--
-- insert into connections (name) values
--   ('Conexão Vila Nova'),
--   ('Conexão Centro');
--
-- 4) Para os demais líderes: use o botão "Convidar novo usuário" na tela
--    Usuários do app (como admin) — gera um link que você envia por
--    WhatsApp/e-mail. A pessoa abre o link, cria a própria senha, e o
--    papel/conexão já vêm certos automaticamente, sem precisar mexer
--    no Supabase.
-- =========================================================
