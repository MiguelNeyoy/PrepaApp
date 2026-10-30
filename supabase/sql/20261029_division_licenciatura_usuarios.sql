-- ==============================================================================
-- Migración: División Académica (Bachillerato y Licenciatura) y Acceso Multi-Usuario
-- Sistema de Certificados (Sector Sur) - Universidad Autónoma de Sinaloa
-- ==============================================================================
-- NOTA: No modifica ni restringe políticas RLS existentes; el filtrado por
-- división se gestiona desde la aplicación según la columna profiles.division.

begin;

-- 1. Agregar columna de división a perfiles de usuario (bachillerato | licenciatura | ambas)
alter table public.profiles
  add column if not exists division text not null default 'bachillerato';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_division_check'
  ) then
    alter table public.profiles
      add constraint profiles_division_check
      check (division in ('bachillerato', 'licenciatura', 'ambas'));
  end if;
end $$;

-- Asignación inicial para usuarios existentes:
--   * Administradores -> 'ambas' (pueden alternar entre Bachillerato y Licenciatura)
--   * Operadores / Asistentes existentes -> 'bachillerato' por defecto
--   * Para asignar cuentas existentes a Licenciatura, usar Usuarios en el panel
--     de administración o descomentar y ajustar el correo abajo:
update public.profiles
set division = 'ambas'
where role = 'admin';

-- Ejemplo para marcar cuentas existentes de Licenciatura:
-- update public.profiles
-- set division = 'licenciatura'
-- where lower(email) in ('encargada.licenciatura@uas.edu.mx');

-- 2. Agregar columna de división al catálogo de Unidades Académicas (public.preparatorias)
alter table public.preparatorias
  add column if not exists division text not null default 'bachillerato';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'preparatorias_division_check'
  ) then
    alter table public.preparatorias
      add constraint preparatorias_division_check
      check (division in ('bachillerato', 'licenciatura'));
  end if;
end $$;

update public.preparatorias
set division = 'bachillerato'
where clave like '82%';

-- 3. Precargar las 18 Facultades y Escuelas de Licenciatura (Sector Sur) con sus 42 carreras
insert into public.preparatorias (clave, nombre, modalidades, division, activo)
values
  ('2206', 'FAC. DE MEDICINA (EXT. MAZATLAN)', array[
    'MÉDICO GENERAL'
  ], 'licenciatura', true),
  ('4500', 'FAC. DE CIENCIAS SOCIALES MAZATLÁN', array[
    'LICENCIATURA EN CIENCIAS DE LA COMUNICACIÓN',
    'LICENCIATURA EN COMERCIO INTERNACIONAL',
    'LICENCIATURA EN ECONOMÍA',
    'LICENCIATURA EN SOCIOLOGÍA'
  ], 'licenciatura', true),
  ('4510', 'FAC. DE CIENCIAS ECONÓMICO ADMINISTRATIVAS DE MAZATLÁN', array[
    'LICENCIATURA EN ADMINISTRACIÓN DE EMPRESAS',
    'LICENCIATURA EN ADMINISTRACIÓN DE RECURSOS HUMANOS',
    'LICENCIATURA EN CONTADURÍA PÚBLICA',
    'LICENCIATURA EN MERCADOTECNIA'
  ], 'licenciatura', true),
  ('4520', 'FAC. DE DERECHO MAZATLÁN', array[
    'LICENCIATURA EN CRIMINALÍSTICA Y CIENCIAS FORENSES',
    'LICENCIATURA EN DERECHO',
    'LICENCIATURA EN DERECHO MODALIDAD SEMIESCOLARIZADA'
  ], 'licenciatura', true),
  ('4530', 'FAC. DE PSICOLOGÍA MAZATLÁN', array[
    'LICENCIATURA EN PSICOLOGÍA',
    'LICENCIATURA EN PSICOLOGÍA SEMIESCOLARIZADA'
  ], 'licenciatura', true),
  ('4540', 'UA DE GASTRONOMÍA Y NUTRICIÓN MAZATLÁN', array[
    'LICENCIATURA EN GASTRONOMÍA',
    'LICENCIATURA EN NUTRICIÓN'
  ], 'licenciatura', true),
  ('4550', 'FAC. DE ARQUITECTURA Y DISEÑO INDUSTRIAL', array[
    'LICENCIATURA EN ARQUITECTURA',
    'LICENCIATURA EN DISEÑO INDUSTRIAL'
  ], 'licenciatura', true),
  ('4560', 'UA DE EDUCACIÓN FÍSICA Y DEPORTE MAZATLAN', array[
    'LICENCIATURA EN EDUCACIÓN DEPORTIVA (SEMIESCOLARIZADA)',
    'LICENCIATURA EN EDUCACIÓN FÍSICA'
  ], 'licenciatura', true),
  ('4570', 'UA DE CIENCIAS DE LA EDUCACIÓN', array[
    'LICENCIATURA EN CIENCIAS DE LA EDUCACIÓN',
    'LICENCIATURA EN CIENCIAS DE LA EDUCACIÓN SEMIESCOLARIZADA',
    'LICENCIATURA EN EDUCACIÓN MEDIA EN EL AREA DE ESPAÑOL',
    'LICENCIATURA EN EDUCACIÓN MEDIA EN EL ÁREA DE ESPAÑOL, MODALIDAD SEMIESCOLARIZADA'
  ], 'licenciatura', true),
  ('4610', 'ESCUELA DE TURISMO MAZATLÁN', array[
    'LICENCIATURA EN TURISMO'
  ], 'licenciatura', true),
  ('4700', 'FAC. DE INGENIERÍA Y TECNOLOGÍA DE MAZATLÁN', array[
    'LICENCIATURA EN INGENIERÍA CIVIL',
    'LICENCIATURA EN INGENIERIA EN ENERGÍAS RENOVABLES',
    'LICENCIATURA EN INGENIERÍA EN PROCESOS INDUSTRIALES'
  ], 'licenciatura', true),
  ('4800', 'FAC. DE INFORMÁTICA MAZATLÁN', array[
    'LICENCIATURA EN INFORMÁTICA',
    'LICENCIATURA EN INGENIERÍA EN SISTEMAS DE INFORMACIÓN',
    'LICENCIATURA EN INGENIERÍA EN SISTEMAS DE INFORMACIÓN (MODALIDAD VIRTUAL)'
  ], 'licenciatura', true),
  ('4900', 'FAC. DE CIENCIAS DEL MAR', array[
    'LICENCIATURA EN BIOLOGÍA ACUÍCOLA',
    'LICENCIATURA EN BIOLOGÍA PESQUERA',
    'LICENCIATURA EN GESTIÓN DE ZONA COSTERA',
    'LICENCIATURA EN INGENIERÍA BIOTECNOLOGÍA ACUÁTICA'
  ], 'licenciatura', true),
  ('4920', 'CENTRO DE ESTUDIOS SUPERIORES DE EL ROSARIO', array[
    'LICENCIATURA EN ADMINISTRACIÓN DE EMPRESAS',
    'LICENCIATURA EN INGENIERÍA AGRONÓMICA'
  ], 'licenciatura', true),
  ('5810', 'FAC. DE TRABAJO SOCIAL MAZATLÁN', array[
    'LICENCIATURA EN TRABAJO SOCIAL',
    'LICENCIATURA EN TRABAJO SOCIAL SEMIESCOLARIZADA'
  ], 'licenciatura', true),
  ('5820', 'FAC. DE ENFERMERÍA MAZATLÁN', array[
    'LICENCIATURA EN ENFERMERÍA'
  ], 'licenciatura', true),
  ('9054', 'UA DE ARTES EXTENSIÓN MAZATLÁN', array[
    'LICENCIATURA EN EDUCACIÓN ARTÍSTICA'
  ], 'licenciatura', true),
  ('9811', 'CENTRO DE ESTUDIOS DE IDIOMAS MAZATLÁN', array[
    'LICENCIATURA EN ENSEÑANZA DEL IDIOMA INGLES'
  ], 'licenciatura', true)
on conflict (clave) do update set
  nombre = excluded.nombre,
  modalidades = excluded.modalidades,
  division = excluded.division,
  activo = excluded.activo;

-- 4. Agregar columna de división a las solicitudes de certificados
alter table public.solicitudes_titulacion
  add column if not exists division text not null default 'bachillerato';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'solicitudes_titulacion_division_check'
  ) then
    alter table public.solicitudes_titulacion
      add constraint solicitudes_titulacion_division_check
      check (division in ('bachillerato', 'licenciatura'));
  end if;
end $$;

update public.solicitudes_titulacion
set division = case
  when preparatoria_clave is null or preparatoria_clave like '82%' then 'bachillerato'
  else 'licenciatura'
end;

create index if not exists solicitudes_titulacion_division_periodo_idx
on public.solicitudes_titulacion (division, periodo_anio, periodo_mes);

commit;
