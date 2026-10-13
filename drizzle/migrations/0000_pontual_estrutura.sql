
-- ===== Papéis =====
create type public.app_role as enum ('admin','equipe','coordenacao','aluno');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','equipe','coordenacao'))
$$;

create or replace function public.is_gestor(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','coordenacao'))
$$;

create policy "ver proprio perfil ou admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "editar proprio nome" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "ver proprios papeis ou admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- ===== Escola =====
create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  ano text not null,
  nome text not null unique,
  ordem int not null default 0
);
grant select, insert, update, delete on public.turmas to authenticated;
grant all on public.turmas to service_role;
alter table public.turmas enable row level security;
create policy "turmas leitura" on public.turmas for select to authenticated using (true);
create policy "turmas admin" on public.turmas for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  turma_id uuid not null references public.turmas(id),
  ativo boolean not null default true,
  user_id uuid unique,
  created_at timestamptz not null default now()
);
create unique index alunos_nome_unico on public.alunos (lower(nome));
grant select, insert, update on public.alunos to authenticated;
grant all on public.alunos to service_role;
alter table public.alunos enable row level security;
create policy "alunos equipe ou o proprio" on public.alunos for select to authenticated
  using (public.is_staff(auth.uid()) or user_id = auth.uid());
create policy "alunos admin insere" on public.alunos for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));
create policy "alunos admin edita" on public.alunos for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.periodos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  inicio date not null,
  fim date not null,
  check (fim >= inicio)
);
grant select, insert, update, delete on public.periodos to authenticated;
grant all on public.periodos to service_role;
alter table public.periodos enable row level security;
create policy "periodos leitura" on public.periodos for select to authenticated using (true);
create policy "periodos admin" on public.periodos for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.config (
  id int primary key default 1 check (id = 1),
  limite int not null default 3 check (limite >= 1),
  contar_justificados boolean not null default true,
  fuso text not null default 'America/Campo_Grande'
);
grant select, update on public.config to authenticated;
grant all on public.config to service_role;
alter table public.config enable row level security;
create policy "config leitura" on public.config for select to authenticated using (true);
create policy "config admin" on public.config for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ===== Atrasos (somente leitura direta; gravação apenas por funções controladas) =====
create table public.atrasos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id),
  data date not null,
  hora time not null,
  justificado boolean not null default false,
  observacao text check (char_length(observacao) <= 200),
  registrado_por uuid,
  registrado_por_nome text not null default '',
  cancelado boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index atrasos_um_por_dia on public.atrasos (aluno_id, data) where not cancelado;
grant select on public.atrasos to authenticated;
grant all on public.atrasos to service_role;
alter table public.atrasos enable row level security;
create policy "atrasos equipe ou o proprio aluno" on public.atrasos for select to authenticated
  using (public.is_staff(auth.uid())
    or exists (select 1 from public.alunos a where a.id = aluno_id and a.user_id = auth.uid()));

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id),
  periodo_id uuid not null references public.periodos(id),
  quantidade int not null,
  gerado_em timestamptz not null default now(),
  status text not null default 'pendente' check (status in ('pendente','analisado')),
  unique (aluno_id, periodo_id)
);
grant select on public.alertas to authenticated;
grant all on public.alertas to service_role;
alter table public.alertas enable row level security;
create policy "alertas gestores" on public.alertas for select to authenticated
  using (public.is_gestor(auth.uid()));

create table public.encaminhamentos (
  id uuid primary key default gen_random_uuid(),
  alerta_id uuid references public.alertas(id),
  aluno_id uuid not null references public.alunos(id),
  texto text not null check (char_length(texto) <= 1000),
  autor uuid,
  autor_nome text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.encaminhamentos to authenticated;
grant all on public.encaminhamentos to service_role;
alter table public.encaminhamentos enable row level security;
create policy "encaminhamentos gestores" on public.encaminhamentos for select to authenticated
  using (public.is_gestor(auth.uid()));

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  quando timestamptz not null default now(),
  usuario uuid,
  usuario_nome text not null default '',
  operacao text not null,
  detalhes jsonb
);
grant select on public.auditoria to authenticated;
grant all on public.auditoria to service_role;
alter table public.auditoria enable row level security;
create policy "auditoria admin" on public.auditoria for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- ===== Auxiliares =====
create or replace function public.nome_usuario(_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(nome,''), email, 'Usuário') from public.profiles where id = _uid
$$;

create or replace function public.auditar(_operacao text, _detalhes jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.auditoria (usuario, usuario_nome, operacao, detalhes)
  values (auth.uid(), coalesce(public.nome_usuario(auth.uid()),'Sistema'), _operacao, _detalhes)
$$;
revoke execute on function public.auditar(text, jsonb) from public, anon, authenticated;

create or replace function public.trg_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.auditar(tg_op || ' em ' || tg_table_name,
    jsonb_build_object('antes', case when tg_op <> 'INSERT' then to_jsonb(old) end,
                       'depois', case when tg_op <> 'DELETE' then to_jsonb(new) end));
  return coalesce(new, old);
end $$;
create trigger aud_alunos after insert or update or delete on public.alunos for each row execute function public.trg_auditoria();
create trigger aud_turmas after insert or update or delete on public.turmas for each row execute function public.trg_auditoria();
create trigger aud_periodos after insert or update or delete on public.periodos for each row execute function public.trg_auditoria();
create trigger aud_config after update on public.config for each row execute function public.trg_auditoria();

-- Recalcula o alerta do aluno no bimestre da data informada
create or replace function public.recalcular_alerta(_aluno uuid, _data date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p record; c record; qtd int; novo boolean := false;
begin
  select * into c from public.config where id = 1;
  select * into p from public.periodos where _data between inicio and fim order by inicio limit 1;
  if p.id is null then return jsonb_build_object('quantidade',0,'alerta_novo',false); end if;
  select count(*) into qtd from public.atrasos
    where aluno_id = _aluno and not cancelado and data between p.inicio and p.fim
      and (c.contar_justificados or not justificado);
  if qtd >= c.limite then
    insert into public.alertas (aluno_id, periodo_id, quantidade) values (_aluno, p.id, qtd)
      on conflict (aluno_id, periodo_id) do nothing;
    novo := found;
  end if;
  update public.alertas set quantidade = qtd where aluno_id = _aluno and periodo_id = p.id;
  return jsonb_build_object('quantidade', qtd, 'alerta_novo', novo, 'limite', c.limite, 'periodo', p.nome);
end $$;
revoke execute on function public.recalcular_alerta(uuid, date) from public, anon, authenticated;

-- Registrar atraso: data e hora definidas pelo servidor
create or replace function public.registrar_atraso(_aluno uuid, _justificado boolean, _observacao text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare fz text; agora timestamp; r jsonb; nome_al text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Sem permissão para registrar atrasos'; end if;
  select nome into nome_al from public.alunos where id = _aluno and ativo;
  if nome_al is null then raise exception 'Aluno não encontrado ou inativo'; end if;
  select fuso into fz from public.config where id = 1;
  agora := now() at time zone fz;
  if exists (select 1 from public.atrasos where aluno_id = _aluno and data = agora::date and not cancelado) then
    raise exception 'Já existe um atraso registrado hoje para este aluno';
  end if;
  insert into public.atrasos (aluno_id, data, hora, justificado, observacao, registrado_por, registrado_por_nome)
  values (_aluno, agora::date, date_trunc('minute', agora)::time, _justificado,
          nullif(left(trim(coalesce(_observacao,'')),200),''), auth.uid(), public.nome_usuario(auth.uid()));
  perform public.auditar('Registrou atraso', jsonb_build_object('aluno', nome_al, 'justificado', _justificado));
  r := public.recalcular_alerta(_aluno, agora::date);
  return r || jsonb_build_object('aluno', nome_al);
end $$;

create or replace function public.corrigir_atraso(_id uuid, _justificado boolean, _motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if not public.is_gestor(auth.uid()) then raise exception 'Sem permissão para corrigir registros'; end if;
  if coalesce(trim(_motivo),'') = '' then raise exception 'Informe o motivo da correção'; end if;
  select * into a from public.atrasos where id = _id and not cancelado;
  if a.id is null then raise exception 'Registro não encontrado'; end if;
  update public.atrasos set justificado = _justificado where id = _id;
  perform public.auditar('Corrigiu atraso', jsonb_build_object('atraso', _id, 'data', a.data,
    'antes', a.justificado, 'depois', _justificado, 'motivo', _motivo,
    'aluno', (select nome from public.alunos where id = a.aluno_id)));
  perform public.recalcular_alerta(a.aluno_id, a.data);
end $$;

create or replace function public.cancelar_atraso(_id uuid, _motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if not public.is_gestor(auth.uid()) then raise exception 'Sem permissão para cancelar registros'; end if;
  if coalesce(trim(_motivo),'') = '' then raise exception 'Informe o motivo do cancelamento'; end if;
  select * into a from public.atrasos where id = _id and not cancelado;
  if a.id is null then raise exception 'Registro não encontrado'; end if;
  update public.atrasos set cancelado = true where id = _id;
  perform public.auditar('Cancelou atraso', jsonb_build_object('atraso', _id, 'data', a.data, 'motivo', _motivo,
    'aluno', (select nome from public.alunos where id = a.aluno_id)));
  perform public.recalcular_alerta(a.aluno_id, a.data);
end $$;

create or replace function public.analisar_alerta(_id uuid, _texto text)
returns void language plpgsql security definer set search_path = public as $$
declare al record;
begin
  if not public.is_gestor(auth.uid()) then raise exception 'Sem permissão'; end if;
  if coalesce(trim(_texto),'') = '' then raise exception 'Descreva o encaminhamento'; end if;
  select * into al from public.alertas where id = _id;
  if al.id is null then raise exception 'Alerta não encontrado'; end if;
  insert into public.encaminhamentos (alerta_id, aluno_id, texto, autor, autor_nome)
    values (_id, al.aluno_id, left(trim(_texto),1000), auth.uid(), public.nome_usuario(auth.uid()));
  update public.alertas set status = 'analisado' where id = _id;
  perform public.auditar('Analisou alerta', jsonb_build_object('alerta', _id));
end $$;

create or replace function public.definir_papel(_user uuid, _role public.app_role, _ativo boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Somente administradores'; end if;
  if _user = auth.uid() and _role = 'admin' and not _ativo then raise exception 'Você não pode remover seu próprio acesso de administrador'; end if;
  if _ativo then
    insert into public.user_roles (user_id, role) values (_user, _role) on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user and role = _role;
  end if;
  perform public.auditar(case when _ativo then 'Concedeu perfil' else 'Removeu perfil' end,
    jsonb_build_object('usuario', public.nome_usuario(_user), 'perfil', _role));
end $$;

create or replace function public.vincular_aluno(_aluno uuid, _user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Somente administradores'; end if;
  update public.alunos set user_id = null where user_id = _user;
  update public.alunos set user_id = _user where id = _aluno;
  if _user is not null then
    insert into public.user_roles (user_id, role) values (_user, 'aluno') on conflict do nothing;
  end if;
end $$;

revoke execute on function public.registrar_atraso(uuid, boolean, text), public.corrigir_atraso(uuid, boolean, text),
  public.cancelar_atraso(uuid, text), public.analisar_alerta(uuid, text),
  public.definir_papel(uuid, public.app_role, boolean), public.vincular_aluno(uuid, uuid) from public, anon;
grant execute on function public.registrar_atraso(uuid, boolean, text), public.corrigir_atraso(uuid, boolean, text),
  public.cancelar_atraso(uuid, text), public.analisar_alerta(uuid, text),
  public.definir_papel(uuid, public.app_role, boolean), public.vincular_aluno(uuid, uuid) to authenticated;

-- Novo usuário: cria perfil; o primeiro usuário do sistema vira administrador
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name', ''), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Dados FICTÍCIOS de demonstração =====
insert into public.config (id) values (1);

insert into public.turmas (ano, nome, ordem)
select ano, ano || ' ' || l, i * 10 + (case l when 'A' then 1 else 2 end)
from (values (1,'6º ano'),(2,'7º ano'),(3,'8º ano'),(4,'9º ano'),(5,'1ª série EM'),(6,'2ª série EM'),(7,'3ª série EM')) as a(i, ano)
cross join (values ('A'),('B')) as t(l);

insert into public.periodos (nome, inicio, fim) values
 ('1º bimestre 2026','2026-02-02','2026-04-24'),
 ('2º bimestre 2026','2026-04-27','2026-07-10'),
 ('3º bimestre 2026','2026-07-27','2026-10-02'),
 ('4º bimestre 2026','2026-10-05','2026-12-18');

with nomes(n, nome) as (values
 (1,'Ana Beatriz Souza'),(2,'Bruno Henrique Lima'),(3,'Carla Mendes Rocha'),(4,'Diego Alves Pereira'),
 (5,'Eduarda Martins Costa'),(6,'Felipe Oliveira Santos'),(7,'Gabriela Ferreira Nunes'),(8,'Heitor Ribeiro Dias'),
 (9,'Isabela Carvalho Melo'),(10,'João Pedro Barbosa'),(11,'Larissa Gomes Teixeira'),(12,'Mateus Araújo Freitas'),
 (13,'Natália Cardoso Pires'),(14,'Otávio Monteiro Reis'),(15,'Paula Cristina Moura'),(16,'Rafael Duarte Campos'),
 (17,'Sofia Almeida Prado'),(18,'Thiago Nogueira Brito'),(19,'Valentina Castro Lopes'),(20,'Yuri Fernandes Vieira'),
 (21,'Alice Rezende Tavares'),(22,'Caio Batista Farias'),(23,'Helena Moreira Cunha'),(24,'Lucas Pinheiro Andrade'),
 (25,'Manuela Azevedo Ramos'),(26,'Pedro Lucas Sales'),(27,'Rebeca Siqueira Leal'),(28,'Samuel Correia Matos')),
t as (select id, row_number() over (order by ordem) - 1 as k from public.turmas)
insert into public.alunos (codigo, nome, turma_id)
select 'P+' || (2027000 + n), nome, t.id from nomes join t on t.k = (n - 1) % 14;

insert into public.atrasos (aluno_id, data, hora, justificado, observacao, registrado_por_nome)
select a.id, v.d::date, v.h::time, v.j, v.o, 'Demonstração'
from (values
 ('Ana Beatriz Souza','2026-03-10','07:18',false,null),
 ('Ana Beatriz Souza','2026-05-14','07:22',true,'Consulta médica'),
 ('Bruno Henrique Lima','2026-08-20','07:15',false,null),
 ('Carla Mendes Rocha','2026-10-06','07:25',false,null),
 ('Carla Mendes Rocha','2026-10-08','07:12',true,'Ônibus atrasou'),
 ('Eduarda Martins Costa','2026-10-07','07:30',false,null)
) as v(nome, d, h, j, o) join public.alunos a on a.nome = v.nome;
