-- APP Titulacion - esquema base para Supabase
-- Ejecuta este archivo manualmente en Supabase SQL Editor.
-- Recomendado: crea primero tu usuario en Supabase Auth y despues promuevelo a admin
-- con el UPDATE comentado cerca del final.

begin;

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Private schema for helper functions used by RLS/triggers.
create schema if not exists private;
revoke all on schema private from public;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'operador', 'consulta');
  end if;

  if not exists (select 1 from pg_type where typname = 'estado_tramite') then
    create type public.estado_tramite as enum (
      'pendiente',
      'recibido',
      'enviado',
      'aceptado',
      'rechazado'
    );
  end if;
end $$;

-- Profiles linked to Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text not null default 'Usuario',
  role public.app_role not null default 'consulta',
  active boolean not null default true,
  theme_mode text not null default 'light' check (theme_mode in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Academic/catalog tables.
create table if not exists public.niveles_estudio (
  id text primary key,
  nombre text not null unique,
  abreviatura text not null,
  pago_mxn integer not null check (pago_mxn >= 0),
  color_hex text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  orden smallint not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facultades (
  codigo text primary key check (codigo ~ '^[0-9]{4}$'),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carreras (
  id uuid primary key default gen_random_uuid(),
  facultad_codigo text not null references public.facultades(codigo) on update cascade on delete restrict,
  nivel_id text not null references public.niveles_estudio(id) on update cascade on delete restrict,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carreras_nombre_not_blank check (btrim(nombre) <> ''),
  constraint carreras_unique_per_faculty_level unique (facultad_codigo, nivel_id, nombre),
  constraint carreras_composite_ref unique (id, facultad_codigo, nivel_id)
);

create table if not exists public.tramites (
  id text primary key,
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Main table.
create table if not exists public.solicitudes_titulacion (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  folio text unique,
  origen text not null default 'admin' constraint solicitudes_origen_check check (origen in ('admin', 'portal_web')),

  alumno_nombre text not null,
  alumno_email text not null,
  telefono text not null,
  telefono_alternativo text,

  tramite_id text not null default 'titulo' references public.tramites(id) on update cascade on delete restrict,
  nivel_id text not null references public.niveles_estudio(id) on update cascade on delete restrict,
  facultad_codigo text not null references public.facultades(codigo) on update cascade on delete restrict,
  carrera_id uuid not null,

  pago_mxn integer not null check (pago_mxn >= 0),
  prepa_uas boolean not null default false,
  generacion_prepa text,
  generacion_licenciatura text,

  fecha_documentos_recibidos date,
  fecha_ingreso_sistema date default current_date,
  fecha_recepcion_fisica date,
  fecha_envio date,

  reenvio boolean not null default false,
  carta_poder text,
  carta_porte text,
  localizacion text,
  observaciones text,
  estado public.estado_tramite not null default 'pendiente',

  periodo_mes smallint not null default (extract(month from current_date))::smallint check (periodo_mes between 1 and 12),
  periodo_anio smallint not null default (extract(year from current_date))::smallint check (periodo_anio between 2000 and 2100),

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  search_text text generated always as (
    lower(
      coalesce(alumno_nombre, '') || ' ' ||
      coalesce(alumno_email, '') || ' ' ||
      coalesce(telefono, '') || ' ' ||
      coalesce(telefono_alternativo, '') || ' ' ||
      coalesce(folio, '') || ' ' ||
      coalesce(carta_poder, '') || ' ' ||
      coalesce(carta_porte, '') || ' ' ||
      coalesce(localizacion, '') || ' ' ||
      coalesce(observaciones, '')
    )
  ) stored,

  constraint solicitudes_nombre_not_blank check (btrim(alumno_nombre) <> ''),
  constraint solicitudes_email_format check (alumno_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint solicitudes_phone_format check (telefono ~ '^[0-9 +().-]{7,20}$'),
  constraint solicitudes_alt_phone_format check (telefono_alternativo is null or telefono_alternativo = '' or telefono_alternativo ~ '^[0-9 +().-]{7,20}$'),
  constraint solicitudes_dates_order check (
    fecha_envio is null
    or fecha_recepcion_fisica is null
    or fecha_envio >= fecha_recepcion_fisica
  ),
  constraint solicitudes_carrera_matches_catalog foreign key (carrera_id, facultad_codigo, nivel_id)
    references public.carreras(id, facultad_codigo, nivel_id)
    on update cascade
    on delete restrict
);

alter table public.solicitudes_titulacion
  add column if not exists origen text not null default 'admin';

alter table public.solicitudes_titulacion
  alter column fecha_ingreso_sistema set default current_date,
  alter column periodo_mes set default (extract(month from current_date))::smallint,
  alter column periodo_anio set default (extract(year from current_date))::smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'solicitudes_origen_check'
      and conrelid = 'public.solicitudes_titulacion'::regclass
  ) then
    alter table public.solicitudes_titulacion
      add constraint solicitudes_origen_check check (origen in ('admin', 'portal_web'));
  end if;
end $$;

create table if not exists public.solicitud_estado_historial (
  id bigint generated always as identity primary key,
  solicitud_id uuid not null references public.solicitudes_titulacion(id) on delete cascade,
  estado_anterior public.estado_tramite,
  estado_nuevo public.estado_tramite not null,
  observaciones text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- Helper functions
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.set_solicitud_audit_fields()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  select n.pago_mxn
  into new.pago_mxn
  from public.niveles_estudio n
  where n.id = new.nivel_id;

  if new.pago_mxn is null then
    raise exception 'Nivel de estudio invalido: %', new.nivel_id;
  end if;

  if current_user = 'anon' then
    new.origen = 'portal_web';
    new.estado = 'pendiente';
    new.fecha_ingreso_sistema = current_date;
    new.fecha_documentos_recibidos = null;
    new.fecha_recepcion_fisica = null;
    new.fecha_envio = null;
    new.reenvio = false;
    new.localizacion = null;
    new.observaciones = null;
    new.created_by = null;
    new.updated_by = null;
    new.periodo_mes = (extract(month from current_date))::smallint;
    new.periodo_anio = (extract(year from current_date))::smallint;
  end if;

  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.created_at = coalesce(new.created_at, now());
    new.fecha_ingreso_sistema = coalesce(new.fecha_ingreso_sistema, current_date);
  end if;

  new.updated_by = coalesce(auth.uid(), new.updated_by);
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
  limit 1
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(private.current_user_role() = 'admin', false)
$$;

create or replace function private.can_read_titulacion()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(private.current_user_role() in ('admin', 'operador', 'consulta'), false)
$$;

create or replace function private.can_write_titulacion()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(private.current_user_role() in ('admin', 'operador'), false)
$$;

create or replace function private.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  -- Allow trusted SQL Editor/service-role maintenance where there is no end-user JWT.
  if auth.uid() is not null and not private.is_admin() then
    new.role = old.role;
    new.active = old.active;
    new.email = old.email;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), new.email, 'Usuario')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function private.log_solicitud_estado_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.solicitud_estado_historial (
      solicitud_id,
      estado_anterior,
      estado_nuevo,
      observaciones,
      changed_by
    )
    values (
      new.id,
      null,
      new.estado,
      new.observaciones,
      coalesce(auth.uid(), new.created_by)
    );
  elsif new.estado is distinct from old.estado then
    insert into public.solicitud_estado_historial (
      solicitud_id,
      estado_anterior,
      estado_nuevo,
      observaciones,
      changed_by
    )
    values (
      new.id,
      old.estado,
      new.estado,
      new.observaciones,
      coalesce(auth.uid(), new.updated_by)
    );
  end if;

  return new;
end;
$$;

-- Triggers
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.guard_profile_role_change();

drop trigger if exists niveles_set_updated_at on public.niveles_estudio;
create trigger niveles_set_updated_at
before update on public.niveles_estudio
for each row execute function private.set_updated_at();

drop trigger if exists facultades_set_updated_at on public.facultades;
create trigger facultades_set_updated_at
before update on public.facultades
for each row execute function private.set_updated_at();

drop trigger if exists carreras_set_updated_at on public.carreras;
create trigger carreras_set_updated_at
before update on public.carreras
for each row execute function private.set_updated_at();

drop trigger if exists tramites_set_updated_at on public.tramites;
create trigger tramites_set_updated_at
before update on public.tramites
for each row execute function private.set_updated_at();

drop trigger if exists solicitudes_set_audit_fields on public.solicitudes_titulacion;
create trigger solicitudes_set_audit_fields
before insert or update on public.solicitudes_titulacion
for each row execute function private.set_solicitud_audit_fields();

drop trigger if exists solicitudes_log_estado_change on public.solicitudes_titulacion;
create trigger solicitudes_log_estado_change
after insert or update of estado on public.solicitudes_titulacion
for each row execute function private.log_solicitud_estado_change();

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function private.handle_new_auth_user();

insert into public.profiles (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), u.email, 'Usuario')
from auth.users u
on conflict (id) do nothing;

-- Seed catalogs
insert into public.niveles_estudio (id, nombre, abreviatura, pago_mxn, color_hex, orden)
values
  ('tecnico', 'Técnico', 'Téc.', 1500, '#f59e0b', 10),
  ('subprofesional', 'Subprofesional', 'Sub.', 1500, '#fb923c', 20),
  ('tsu', 'Técnico Superior Universitario', 'TSU', 2000, '#06b6d4', 30),
  ('licenciatura', 'Licenciatura', 'Lic.', 3000, '#3b82f6', 40),
  ('maestria', 'Maestría', 'Maest.', 3500, '#8b5cf6', 50),
  ('doctorado', 'Doctorado', 'Doc.', 4000, '#10b981', 60),
  ('otras_zonas_licenciatura', 'Otras Zonas Licenciatura', 'OZL', 3000, '#6366f1', 70),
  ('otras_zonas_posgrado', 'Otras Zonas Posgrado', 'OZP', 3500, '#ec4899', 80)
on conflict (id) do update set
  nombre = excluded.nombre,
  abreviatura = excluded.abreviatura,
  pago_mxn = excluded.pago_mxn,
  color_hex = excluded.color_hex,
  orden = excluded.orden,
  activo = true;

update public.carreras
set activo = false;

update public.facultades
set activo = false;

insert into public.facultades (codigo, nombre, activo)
values
  ('2206', 'FAC. DE MEDICINA (EXT. MAZATLAN)', true),
  ('4500', 'FAC. DE CIENCIAS SOCIALES MAZATLÁN', true),
  ('4510', 'FAC. DE CIENCIAS ECONÓMICO ADMINISTRATIVAS DE MAZATLÁN', true),
  ('4520', 'FAC. DE DERECHO MAZATLÁN', true),
  ('4530', 'FAC. DE PSICOLOGÍA MAZATLÁN', true),
  ('4540', 'UA DE GASTRONOMÍA Y NUTRICIÓN MAZATLÁN', true),
  ('4550', 'FAC. DE ARQUITECTURA Y DISEÑO INDUSTRIAL', true),
  ('4560', 'UA DE EDUCACIÓN FÍSICA Y DEPORTE MAZATLAN', true),
  ('4570', 'UA DE CIENCIAS DE LA EDUCACIÓN', true),
  ('4610', 'ESCUELA DE TURISMO MAZATLÁN', true),
  ('4700', 'FAC. DE INGENIERÍA Y TECNOLOGÍA DE MAZATLÁN', true),
  ('4800', 'FAC. DE INFORMÁTICA MAZATLÁN', true),
  ('4900', 'FAC. DE CIENCIAS DEL MAR', true),
  ('4920', 'CENTRO DE ESTUDIOS SUPERIORES DE EL ROSARIO', true),
  ('5810', 'FAC. DE TRABAJO SOCIAL MAZATLÁN', true),
  ('5820', 'FAC. DE ENFERMERÍA MAZATLÁN', true),
  ('9054', 'UA DE ARTES EXTENSIÓN MAZATLÁN', true),
  ('9811', 'CENTRO DE ESTUDIOS DE IDIOMAS MAZATLÁN', true)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  activo = true;

insert into public.tramites (id, nombre)
values ('titulo', 'TITULO')
on conflict (id) do update set nombre = excluded.nombre, activo = true;

insert into public.carreras (facultad_codigo, nivel_id, nombre, activo)
values
  ('2206', 'licenciatura', 'MÉDICO GENERAL', true),
  ('4500', 'licenciatura', 'LICENCIATURA EN SOCIOLOGÍA', true),
  ('4500', 'licenciatura', 'LICENCIATURA EN ECONOMÍA', true),
  ('4500', 'licenciatura', 'LICENCIATURA EN COMERCIO INTERNACIONAL', true),
  ('4500', 'licenciatura', 'LICENCIATURA EN CIENCIAS DE LA COMUNICACIÓN', true),
  ('4510', 'licenciatura', 'LICENCIATURA EN CONTADURÍA PÚBLICA', true),
  ('4510', 'licenciatura', 'LICENCIATURA EN ADMINISTRACIÓN DE EMPRESAS', true),
  ('4510', 'licenciatura', 'LICENCIATURA EN MERCADOTECNIA', true),
  ('4510', 'licenciatura', 'LICENCIATURA EN ADMINISTRACIÓN DE RECURSOS HUMANOS', true),
  ('4520', 'licenciatura', 'LICENCIATURA EN DERECHO', true),
  ('4520', 'licenciatura', 'LICENCIATURA EN DERECHO MODALIDAD SEMIESCOLARIZADA', true),
  ('4520', 'licenciatura', 'LICENCIATURA EN CRIMINALÍSTICA Y CIENCIAS FORENSES', true),
  ('4530', 'licenciatura', 'LICENCIATURA EN PSICOLOGÍA SEMIESCOLARIZADA', true),
  ('4530', 'licenciatura', 'LICENCIATURA EN PSICOLOGÍA', true),
  ('4540', 'licenciatura', 'LICENCIATURA EN NUTRICIÓN', true),
  ('4540', 'licenciatura', 'LICENCIATURA EN GASTRONOMÍA', true),
  ('4550', 'licenciatura', 'LICENCIATURA EN ARQUITECTURA', true),
  ('4550', 'licenciatura', 'LICENCIATURA EN DISEÑO INDUSTRIAL', true),
  ('4560', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN FÍSICA', true),
  ('4560', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN DEPORTIVA (SEMIESCOLARIZADA)', true),
  ('4570', 'licenciatura', 'LICENCIATURA EN CIENCIAS DE LA EDUCACIÓN SEMIESCOLARIZADA', true),
  ('4570', 'licenciatura', 'LICENCIATURA EN CIENCIAS DE LA EDUCACIÓN', true),
  ('4570', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN MEDIA EN EL ÁREA DE ESPAÑOL, MODALIDAD SEMIESCOLARIZADA', true),
  ('4570', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN MEDIA EN EL AREA DE ESPAÑOL', true),
  ('4610', 'licenciatura', 'LICENCIATURA EN TURISMO', true),
  ('4700', 'licenciatura', 'LICENCIATURA EN INGENIERÍA CIVIL', true),
  ('4700', 'licenciatura', 'LICENCIATURA EN INGENIERÍA EN PROCESOS INDUSTRIALES', true),
  ('4700', 'licenciatura', 'LICENCIATURA EN INGENIERIA EN ENERGÍAS RENOVABLES', true),
  ('4800', 'licenciatura', 'LICENCIATURA EN INFORMÁTICA', true),
  ('4800', 'licenciatura', 'LICENCIATURA EN INGENIERÍA EN SISTEMAS DE INFORMACIÓN', true),
  ('4800', 'licenciatura', 'LICENCIATURA EN INGENIERÍA EN SISTEMAS DE INFORMACIÓN (MODALIDAD VIRTUAL)', true),
  ('4900', 'licenciatura', 'LICENCIATURA EN BIOLOGÍA PESQUERA', true),
  ('4900', 'licenciatura', 'LICENCIATURA EN GESTIÓN DE ZONA COSTERA', true),
  ('4900', 'licenciatura', 'LICENCIATURA EN BIOLOGÍA ACUÍCOLA', true),
  ('4900', 'licenciatura', 'LICENCIATURA EN INGENIERÍA BIOTECNOLOGÍA ACUÁTICA', true),
  ('4920', 'licenciatura', 'LICENCIATURA EN ADMINISTRACIÓN DE EMPRESAS', true),
  ('4920', 'licenciatura', 'LICENCIATURA EN INGENIERÍA AGRONÓMICA', true),
  ('5810', 'licenciatura', 'LICENCIATURA EN TRABAJO SOCIAL', true),
  ('5810', 'licenciatura', 'LICENCIATURA EN TRABAJO SOCIAL SEMIESCOLARIZADA', true),
  ('5820', 'licenciatura', 'LICENCIATURA EN ENFERMERÍA', true),
  ('9054', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN ARTÍSTICA', true),
  ('9811', 'licenciatura', 'LICENCIATURA EN ENSEÑANZA DEL IDIOMA INGLES', true)
on conflict (facultad_codigo, nivel_id, nombre) do update set activo = true;

-- Views for the frontend/reports. security_invoker keeps RLS active.
create or replace view public.v_solicitudes_titulacion_detalle
with (security_invoker = true)
as
select
  s.id,
  s.legacy_id,
  s.folio,
  s.origen,
  s.tramite_id,
  s.alumno_nombre as nombre,
  s.alumno_email as email,
  s.telefono,
  s.telefono_alternativo as telefono_alt,
  t.nombre as tramite,
  s.nivel_id,
  n.nombre as nivel,
  n.abreviatura as nivel_abreviatura,
  n.color_hex as nivel_color,
  s.pago_mxn as pago,
  f.codigo as escuela,
  f.nombre as facultad,
  c.id as carrera_id,
  c.nombre as carrera,
  s.prepa_uas,
  s.generacion_prepa as prepa,
  s.generacion_licenciatura as lic,
  s.fecha_documentos_recibidos as recibio,
  s.fecha_ingreso_sistema as ingreso,
  s.fecha_recepcion_fisica as recibido,
  s.fecha_envio as envio,
  s.reenvio,
  s.carta_poder,
  s.carta_porte,
  s.localizacion,
  s.observaciones,
  s.estado,
  s.periodo_mes as mes,
  s.periodo_anio as anio,
  s.created_by,
  s.updated_by,
  s.created_at,
  s.updated_at
from public.solicitudes_titulacion s
join public.tramites t on t.id = s.tramite_id
join public.niveles_estudio n on n.id = s.nivel_id
join public.facultades f on f.codigo = s.facultad_codigo
join public.carreras c on c.id = s.carrera_id;

create or replace view public.v_metricas_mensuales
with (security_invoker = true)
as
select
  s.periodo_anio as anio,
  s.periodo_mes as mes,
  n.id as nivel_id,
  n.nombre as nivel,
  count(*)::integer as total,
  coalesce(sum(s.pago_mxn), 0)::integer as ingreso_mxn
from public.solicitudes_titulacion s
join public.niveles_estudio n on n.id = s.nivel_id
group by s.periodo_anio, s.periodo_mes, n.id, n.nombre;

-- Indexes for common filters, joins, RLS and search.
create index if not exists profiles_role_active_idx on public.profiles (role, active);
create index if not exists carreras_facultad_nivel_idx on public.carreras (facultad_codigo, nivel_id) where activo = true;
create index if not exists solicitudes_periodo_idx on public.solicitudes_titulacion (periodo_anio, periodo_mes);
create index if not exists solicitudes_estado_idx on public.solicitudes_titulacion (estado);
create index if not exists solicitudes_facultad_carrera_idx on public.solicitudes_titulacion (facultad_codigo, carrera_id);
create index if not exists solicitudes_nivel_idx on public.solicitudes_titulacion (nivel_id);
create index if not exists solicitudes_created_by_idx on public.solicitudes_titulacion (created_by);
create index if not exists solicitudes_updated_by_idx on public.solicitudes_titulacion (updated_by);
create index if not exists solicitudes_search_trgm_idx on public.solicitudes_titulacion using gin (search_text gin_trgm_ops);
create index if not exists historial_solicitud_changed_at_idx on public.solicitud_estado_historial (solicitud_id, changed_at desc);

-- Grants. Tables remain protected by RLS.
revoke all on all tables in schema public from anon;
grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant select on public.niveles_estudio, public.facultades, public.carreras, public.tramites to anon;
grant select on public.niveles_estudio, public.facultades, public.carreras, public.tramites to authenticated;
grant insert, update on public.niveles_estudio to authenticated;
grant insert, update on public.facultades to authenticated;
grant insert, update on public.carreras to authenticated;
grant insert, update on public.tramites to authenticated;
grant insert (
  alumno_nombre,
  alumno_email,
  telefono,
  telefono_alternativo,
  tramite_id,
  nivel_id,
  facultad_codigo,
  carrera_id,
  prepa_uas,
  generacion_prepa,
  generacion_licenciatura,
  carta_poder,
  carta_porte
) on public.solicitudes_titulacion to anon;
grant select, insert, update, delete on public.solicitudes_titulacion to authenticated;
grant select on public.solicitud_estado_historial to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.v_solicitudes_titulacion_detalle, public.v_metricas_mensuales to authenticated;

grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.can_read_titulacion() to authenticated;
grant execute on function private.can_write_titulacion() to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.niveles_estudio enable row level security;
alter table public.facultades enable row level security;
alter table public.carreras enable row level security;
alter table public.tramites enable row level security;
alter table public.solicitudes_titulacion enable row level security;
alter table public.solicitud_estado_historial enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists "profiles_insert_self_as_consulta" on public.profiles;
create policy "profiles_insert_self_as_consulta"
on public.profiles for insert
to authenticated
with check (
  id = (select auth.uid())
  and role = 'consulta'
);

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
on public.profiles for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles for update
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
)
with check (
  id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists "catalog_select_authenticated" on public.niveles_estudio;
create policy "catalog_select_authenticated"
on public.niveles_estudio for select
to authenticated
using ((select private.can_read_titulacion()));

drop policy if exists "catalog_select_public_active" on public.niveles_estudio;
create policy "catalog_select_public_active"
on public.niveles_estudio for select
to anon
using (activo = true);

drop policy if exists "catalog_admin_write" on public.niveles_estudio;
create policy "catalog_admin_write"
on public.niveles_estudio for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "catalog_select_authenticated" on public.facultades;
create policy "catalog_select_authenticated"
on public.facultades for select
to authenticated
using ((select private.can_read_titulacion()));

drop policy if exists "catalog_select_public_active" on public.facultades;
create policy "catalog_select_public_active"
on public.facultades for select
to anon
using (activo = true);

drop policy if exists "catalog_admin_write" on public.facultades;
create policy "catalog_admin_write"
on public.facultades for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "catalog_select_authenticated" on public.carreras;
create policy "catalog_select_authenticated"
on public.carreras for select
to authenticated
using ((select private.can_read_titulacion()));

drop policy if exists "catalog_select_public_active" on public.carreras;
create policy "catalog_select_public_active"
on public.carreras for select
to anon
using (activo = true);

drop policy if exists "catalog_admin_write" on public.carreras;
create policy "catalog_admin_write"
on public.carreras for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "catalog_select_authenticated" on public.tramites;
create policy "catalog_select_authenticated"
on public.tramites for select
to authenticated
using ((select private.can_read_titulacion()));

drop policy if exists "catalog_select_public_active" on public.tramites;
create policy "catalog_select_public_active"
on public.tramites for select
to anon
using (activo = true);

drop policy if exists "catalog_admin_write" on public.tramites;
create policy "catalog_admin_write"
on public.tramites for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "solicitudes_select_staff" on public.solicitudes_titulacion;
create policy "solicitudes_select_staff"
on public.solicitudes_titulacion for select
to authenticated
using ((select private.can_read_titulacion()));

drop policy if exists "solicitudes_insert_staff" on public.solicitudes_titulacion;
create policy "solicitudes_insert_staff"
on public.solicitudes_titulacion for insert
to authenticated
with check ((select private.can_write_titulacion()));

drop policy if exists "solicitudes_insert_public_portal" on public.solicitudes_titulacion;
create policy "solicitudes_insert_public_portal"
on public.solicitudes_titulacion for insert
to anon
with check (
  origen = 'portal_web'
  and estado = 'pendiente'
  and created_by is null
  and updated_by is null
  and btrim(alumno_nombre) <> ''
  and btrim(alumno_email) <> ''
  and btrim(telefono) <> ''
  and fecha_documentos_recibidos is null
  and fecha_recepcion_fisica is null
  and fecha_envio is null
  and reenvio = false
  and localizacion is null
  and observaciones is null
  and exists (
    select 1
    from public.tramites t
    where t.id = tramite_id
      and t.activo = true
  )
  and exists (
    select 1
    from public.niveles_estudio n
    where n.id = nivel_id
      and n.activo = true
  )
  and exists (
    select 1
    from public.facultades f
    where f.codigo = facultad_codigo
      and f.activo = true
  )
  and exists (
    select 1
    from public.carreras c
    where c.id = carrera_id
      and c.facultad_codigo = solicitudes_titulacion.facultad_codigo
      and c.nivel_id = solicitudes_titulacion.nivel_id
      and c.activo = true
  )
);

drop policy if exists "solicitudes_update_staff" on public.solicitudes_titulacion;
create policy "solicitudes_update_staff"
on public.solicitudes_titulacion for update
to authenticated
using ((select private.can_write_titulacion()))
with check ((select private.can_write_titulacion()));

drop policy if exists "solicitudes_delete_admin" on public.solicitudes_titulacion;
create policy "solicitudes_delete_admin"
on public.solicitudes_titulacion for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "historial_select_staff" on public.solicitud_estado_historial;
create policy "historial_select_staff"
on public.solicitud_estado_historial for select
to authenticated
using ((select private.can_read_titulacion()));

-- Despues de crear tu primer usuario en Supabase Auth, promuevelo a admin:
-- update public.profiles
-- set role = 'admin', display_name = 'Administracion'
-- where email = 'admin@uas.edu.mx';

commit;
