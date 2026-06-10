-- Portal web: matricula support and one active request per student.
-- Apply manually in Supabase SQL Editor before using FormularioWEB.

begin;

alter table public.solicitudes_titulacion
  add column if not exists matricula text;

update public.solicitudes_titulacion
set matricula = nullif(upper(regexp_replace(btrim(matricula), '\s+', '', 'g')), '')
where matricula is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'solicitudes_matricula_format'
      and conrelid = 'public.solicitudes_titulacion'::regclass
  ) then
    alter table public.solicitudes_titulacion
      add constraint solicitudes_matricula_format
      check (matricula is null or matricula ~ '^[0-9]{7}-[0-9]$');
  end if;
end $$;

create unique index if not exists solicitudes_matricula_activa_unique
on public.solicitudes_titulacion (matricula)
where matricula is not null
  and estado <> 'aceptado';

create or replace function private.set_solicitud_audit_fields()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if new.matricula is not null then
    new.matricula = nullif(upper(regexp_replace(btrim(new.matricula), '\s+', '', 'g')), '');
  end if;

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
    new.carta_poder = null;
    new.carta_porte = null;
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

create or replace function public.portal_matricula_tiene_solicitud_activa(p_matricula text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_digits text;
  v_matricula text;
begin
  v_digits := regexp_replace(coalesce(p_matricula, ''), '\D+', '', 'g');

  if length(v_digits) = 8 then
    v_matricula := substr(v_digits, 1, 7) || '-' || substr(v_digits, 8, 1);
  else
    v_matricula := upper(regexp_replace(btrim(coalesce(p_matricula, '')), '\s+', '', 'g'));
  end if;

  return exists (
    select 1
    from public.solicitudes_titulacion s
    where s.matricula = v_matricula
      and s.estado <> 'aceptado'
  );
end;
$$;

revoke all on function public.portal_matricula_tiene_solicitud_activa(text) from public;
grant execute on function public.portal_matricula_tiene_solicitud_activa(text) to anon;

drop view if exists public.v_solicitudes_titulacion_detalle;

create view public.v_solicitudes_titulacion_detalle
with (security_invoker = true)
as
select
  s.id,
  s.legacy_id,
  s.folio,
  s.origen,
  s.matricula,
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

grant select on public.v_solicitudes_titulacion_detalle to authenticated;

revoke insert on public.solicitudes_titulacion from anon;
grant insert (
  matricula,
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
  generacion_licenciatura
) on public.solicitudes_titulacion to anon;

drop policy if exists "solicitudes_insert_public_portal" on public.solicitudes_titulacion;
create policy "solicitudes_insert_public_portal"
on public.solicitudes_titulacion for insert
to anon
with check (
  origen = 'portal_web'
  and estado = 'pendiente'
  and matricula is not null
  and matricula ~ '^[0-9]{7}-[0-9]$'
  and created_by is null
  and updated_by is null
  and btrim(alumno_nombre) <> ''
  and btrim(alumno_email) <> ''
  and telefono ~ '^[0-9]{7,20}$'
  and (telefono_alternativo is null or telefono_alternativo = '' or telefono_alternativo ~ '^[0-9]{7,20}$')
  and fecha_documentos_recibidos is null
  and fecha_recepcion_fisica is null
  and fecha_envio is null
  and reenvio = false
  and carta_poder is null
  and carta_porte is null
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

commit;
