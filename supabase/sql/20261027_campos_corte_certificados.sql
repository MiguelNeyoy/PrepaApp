-- ==============================================================================
-- Migración: Campos para Formato de Corte de Certificados Bachillerato URS
-- ==============================================================================

begin;

alter table public.solicitudes_titulacion
  add column if not exists curp text,
  add column if not exists folio_recibo text,
  add column if not exists ciclo_recibo text,
  add column if not exists carrera_codigo text default '1',
  add column if not exists plan_estudio text default '18',
  add column if not exists microfilm text,
  add column if not exists reviso_historial boolean not null default true,
  add column if not exists reviso_kardex boolean not null default true;

commit;
