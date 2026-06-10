-- Cambios recomendados para los módulos Usuarios y Mantenimiento.
-- Ejecutar manualmente en Supabase SQL Editor.

begin;

-- Evita que una actualización deje el sistema sin administradores activos.
create or replace function private.prevent_last_active_admin()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  remaining_active_admins integer;
begin
  if old.role = 'admin'
    and old.active is true
    and (
      new.role is distinct from 'admin'
      or new.active is distinct from true
    )
  then
    select count(*)
      into remaining_active_admins
    from public.profiles
    where id <> old.id
      and role = 'admin'
      and active is true;

    if remaining_active_admins = 0 then
      raise exception 'Debe existir al menos un administrador activo.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_last_active_admin_on_profiles on public.profiles;

create trigger prevent_last_active_admin_on_profiles
before update of role, active on public.profiles
for each row
execute function private.prevent_last_active_admin();

-- Ayuda a que los resúmenes y borrados por ciclo escolar sean más rápidos.
create index if not exists solicitudes_titulacion_periodo_idx
on public.solicitudes_titulacion (periodo_anio, periodo_mes);

commit;
