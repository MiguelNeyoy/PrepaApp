-- ==============================================================================
-- Esquema Inicial: Sistema de Certificados de Preparatoria (Sector Sur)
-- Universidad Autónoma de Sinaloa
-- ==============================================================================

begin;

-- 1. Extensiones necesarias
create extension if not exists pgcrypto;

-- 2. Roles y estados
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'operador', 'consulta');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_tramite') then
    create type public.estado_tramite as enum ('pendiente', 'recibido', 'enviado', 'aceptado', 'rechazado');
  end if;
end $$;

-- 3. Tabla de Perfiles (usuarios del sistema vinculados a Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text not null default 'Usuario',
  role public.app_role not null default 'consulta',
  active boolean not null default true,
  theme_mode text not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Tabla de Preparatorias (Sector Sur)
create table if not exists public.preparatorias (
  clave text primary key,
  nombre text not null,
  modalidades text[] not null default array['Escolarizada'],
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. Tabla de Trámites
create table if not exists public.tramites (
  id text primary key,
  nombre text not null,
  activo boolean not null default true
);

-- 6. Tabla de Configuraciones Generales (Costo base, etc.)
create table if not exists public.configuraciones (
  clave text primary key,
  valor text not null,
  updated_at timestamptz not null default now()
);

-- 7. Tabla de Solicitudes de Certificados
create table if not exists public.solicitudes_titulacion (
  id uuid primary key default gen_random_uuid(),
  alumno_nombre text not null,
  alumno_email text,
  telefono text,
  telefono_alternativo text,
  numero_cuenta text not null,
  tramite_id text references public.tramites(id) default 'certificado',
  preparatoria_clave text references public.preparatorias(clave),
  modalidad text not null default 'Escolarizada',
  turno text not null default 'Matutino',
  tipo_certificado text not null default 'Digital',
  pago_mxn numeric(10,2) not null default 500,
  generacion text,
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
  periodo_mes integer not null check (periodo_mes between 1 and 12),
  periodo_anio integer not null check (periodo_anio >= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Datos Iniciales Base
insert into public.tramites (id, nombre, activo) 
values ('certificado', 'Certificado', true)
on conflict (id) do nothing;

insert into public.configuraciones (clave, valor)
values ('costo_base_certificado', '500')
on conflict (clave) do nothing;

-- 9. Precargar las 19 Preparatorias del Sector Sur
insert into public.preparatorias (clave, nombre, modalidades, activo) values
('8210', 'Preparatoria Concordia', array['Escolarizada', 'Semiescolarizada'], true),
('8212', 'Preparatoria Concordia Extensión Potrerillos', array['Escolarizada', 'Semiescolarizada'], true),
('8213', 'Preparatoria Concordia Extensión Agua Caliente', array['Escolarizada', 'Semiescolarizada'], true),
('8215', 'Preparatoria Concordia Extensión El Verde', array['Escolarizada'], true),
('8220', 'Preparatoria El Rosario', array['Escolarizada'], true),
('8221', 'Preparatoria El Rosario Extensión Agua Verde', array['Escolarizada'], true),
('8222', 'Preparatoria El Rosario Extensión Los Pozos', array['Escolarizada'], true),
('8230', 'Preparatoria Escuinapa', array['Escolarizada', 'Semiescolarizada'], true),
('8231', 'Preparatoria Escuinapa Extensión Isla Del Bosque', array['Escolarizada'], true),
('8232', 'Preparatoria Escuinapa Extensión Teacapán', array['Escolarizada'], true),
('8240', 'Preparatoria Mazatlán', array['Escolarizada'], true),
('8242', 'Preparatoria Mazatlán Ext. La Noria', array['Escolarizada'], true),
('8250', 'Preparatoria Antonio Rosales', array['Escolarizada'], true),
('8251', 'Preparatoria Antonio Rosales Extensión Mármol', array['Escolarizada', 'Semiescolarizada'], true),
('8260', 'Preparatoria Rubén Jaramillo', array['Escolarizada', 'Nocturno'], true),
('8261', 'Preparatoria Villa Unión', array['Escolarizada'], true),
('8262', 'Preparatoria Rubén Jaramillo Extensión El Quelite', array['Escolarizada'], true),
('8270', 'Preparatoria San Ignacio', array['Escolarizada'], true),
('8271', 'Preparatoria San Ignacio Extensión Piaxtla', array['Escolarizada'], true)
on conflict (clave) do update set
  nombre = excluded.nombre,
  modalidades = excluded.modalidades,
  activo = excluded.activo;

-- 10. Habilitar RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.preparatorias enable row level security;
alter table public.tramites enable row level security;
alter table public.configuraciones enable row level security;
alter table public.solicitudes_titulacion enable row level security;

-- Políticas de lectura/escritura para usuarios autenticados
create policy "Usuarios autenticados pueden ver perfiles" on public.profiles for select to authenticated using (true);
create policy "Usuarios autenticados pueden ver preparatorias" on public.preparatorias for select to authenticated using (true);
create policy "Usuarios autenticados pueden editar preparatorias" on public.preparatorias for all to authenticated using (true);
create policy "Usuarios autenticados pueden ver trámites" on public.tramites for select to authenticated using (true);
create policy "Usuarios autenticados pueden ver configuraciones" on public.configuraciones for all to authenticated using (true);
create policy "Usuarios autenticados pueden operar solicitudes" on public.solicitudes_titulacion for all to authenticated using (true);

commit;
