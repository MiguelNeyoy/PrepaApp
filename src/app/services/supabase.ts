import { createClient } from "@supabase/supabase-js";
import { MESES_ABR, fmtDate, getCicloEscolarAnioFin, getCicloEscolarAnioFinFromPeriodo, getCicloEscolarLabel } from "../domain";
import type { Account, Alumno, AlumnoBulkChanges, Catalogos, CarreraCatalogo, CycleSummary, EstadoTramite, Facultad, ManagedProfile, ManagedRole, NivelCatalogo, NivelEstudio, TramiteCatalogo } from "../domain";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  role: "admin" | "operador" | "consulta";
  active: boolean;
};

type ProfileAdminRow = ProfileRow & {
  created_at: string;
  updated_at: string;
};

type CycleSolicitudRow = {
  periodo_mes: number;
  periodo_anio: number;
  estado: EstadoTramite;
};

type NivelRow = {
  id: string;
  nombre: string;
  abreviatura: string;
  pago_mxn: number;
  color_hex: string;
  orden: number;
  activo: boolean;
};

type FacultadRow = {
  codigo: string;
  nombre: string;
  activo: boolean;
};

type CarreraRow = {
  id: string;
  facultad_codigo: string;
  nivel_id: string;
  nombre: string;
  activo: boolean;
};

type TramiteRow = {
  id: string;
  nombre: string;
  activo: boolean;
};

type SolicitudDetalleRow = {
  id: string;
  legacy_id: string | null;
  folio: string | null;
  matricula?: string | null;
  tramite_id: string;
  nombre: string;
  email: string;
  telefono: string;
  telefono_alt: string | null;
  tramite: string;
  nivel_id: string;
  nivel: string;
  pago: number;
  escuela: string;
  carrera_id: string;
  carrera: string;
  prepa_uas: boolean;
  prepa: string | null;
  lic: string | null;
  recibio: string | null;
  ingreso: string | null;
  recibido: string | null;
  envio: string | null;
  reenvio: boolean;
  carta_poder: string | null;
  carta_porte: string | null;
  localizacion: string | null;
  observaciones: string | null;
  estado: EstadoTramite;
  mes: number;
  anio: number;
};

type SupabaseDbError = {
  code?: string;
  message?: string;
  details?: string;
};

function toNivelEstudio(value: string): NivelEstudio {
  return value as NivelEstudio;
}

function fromIsoDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return fmtDate(day, month, year);
}

function toIsoDate(value: string): string | null {
  if (!value.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = value.match(/^(\d{1,2})\/([A-Za-zÁÉÍÓÚáéíóúÑñ]{3})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = MESES_ABR.findIndex(mes => mes.toLowerCase() === match[2].toLowerCase()) + 1;
  const year = Number(match[3]);
  if (!day || !month || !year) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function mapManagedProfile(row: ProfileAdminRow): ManagedProfile {
  return {
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isRemovingActiveAdmin(profile: ManagedProfile, changes: { role?: ManagedRole; active?: boolean }) {
  if (profile.role !== "admin" || !profile.active) return false;
  if (changes.active === false) return true;
  if (changes.role && changes.role !== "admin") return true;
  return false;
}

async function assertActiveAdminWillRemain(id: string, changes: { role?: ManagedRole; active?: boolean }) {
  const profiles = await fetchProfiles();
  const target = profiles.find(profile => profile.id === id);
  if (!target || !isRemovingActiveAdmin(target, changes)) return;

  const activeAdminCount = profiles.filter(profile => profile.role === "admin" && profile.active).length;
  if (activeAdminCount <= 1) {
    throw new Error("No puedes dejar el sistema sin al menos un administrador activo.");
  }
}

function mapSolicitud(row: SolicitudDetalleRow, catalogos: Catalogos): Alumno {
  const nivel = toNivelEstudio(row.nivel);
  const nivelId = row.nivel_id ?? catalogos.niveles.find(item => item.nombre === nivel)?.id;

  return {
    id: row.id,
    carreraId: row.carrera_id,
    nivelId,
    tramiteId: row.tramite_id ?? "titulo",
    matricula: row.matricula ?? "",
    nombre: row.nombre,
    carrera: row.carrera,
    nivel,
    turno: "Matutino",
    pago: row.pago,
    email: row.email,
    telefono: row.telefono,
    telefonoAlt: row.telefono_alt ?? "",
    escuela: row.escuela,
    tramite: row.tramite,
    prepaUAS: row.prepa_uas,
    prepa: row.prepa ?? "",
    lic: row.lic ?? "",
    recibio: fromIsoDate(row.recibio),
    ingreso: fromIsoDate(row.ingreso),
    recibido: fromIsoDate(row.recibido),
    envio: fromIsoDate(row.envio),
    reenvio: row.reenvio,
    cartaPoder: row.carta_poder ?? "",
    cartaPorte: row.carta_porte ?? "",
    localizacion: row.localizacion ?? "",
    observaciones: row.observaciones ?? "",
    estado: row.estado,
    mes: row.mes,
    anio: row.anio,
  };
}

function findNivelId(alumno: Alumno, catalogos: Catalogos): string {
  const nivelId = alumno.nivelId ?? catalogos.niveles.find(nivel => nivel.nombre === alumno.nivel)?.id;
  if (!nivelId) throw new Error(`No encontré el nivel "${alumno.nivel}" en Base de Datos.`);
  return nivelId;
}

function findCarreraId(alumno: Alumno, catalogos: Catalogos, nivelId: string): string {
  const carreraId = alumno.carreraId ?? catalogos.carreras.find(carrera =>
    carrera.facultadCodigo === alumno.escuela &&
    carrera.nivelId === nivelId &&
    carrera.nombre === alumno.carrera
  )?.id;

  if (!carreraId) throw new Error(`No encontré la carrera "${alumno.carrera}" para ${alumno.escuela}.`);
  return carreraId;
}

function toSolicitudPayload(alumno: Alumno, catalogos: Catalogos) {
  const nivelId = findNivelId(alumno, catalogos);
  const carreraId = findCarreraId(alumno, catalogos, nivelId);

  const payload: Record<string, string | number | boolean | null> = {
    alumno_nombre: alumno.nombre.trim(),
    alumno_email: alumno.email.trim(),
    telefono: alumno.telefono.trim(),
    telefono_alternativo: alumno.telefonoAlt.trim() || null,
    tramite_id: alumno.tramiteId ?? "titulo",
    nivel_id: nivelId,
    facultad_codigo: alumno.escuela,
    carrera_id: carreraId,
    prepa_uas: alumno.prepaUAS,
    generacion_prepa: alumno.prepa.trim() || null,
    generacion_licenciatura: alumno.lic.trim() || null,
    fecha_documentos_recibidos: toIsoDate(alumno.recibio),
    fecha_ingreso_sistema: toIsoDate(alumno.ingreso),
    fecha_recepcion_fisica: toIsoDate(alumno.recibido),
    fecha_envio: toIsoDate(alumno.envio),
    reenvio: alumno.reenvio,
    carta_poder: alumno.cartaPoder.trim() || null,
    carta_porte: alumno.cartaPorte.trim() || null,
    localizacion: alumno.localizacion.trim() || null,
    observaciones: alumno.observaciones.trim() || null,
    estado: alumno.estado,
    periodo_mes: alumno.mes,
    periodo_anio: alumno.anio,
  };

  payload.matricula = alumno.matricula.trim() || null;

  return payload;
}

function getSolicitudSaveError(error: unknown) {
  const dbError = error as SupabaseDbError | null;
  const raw = `${dbError?.message ?? ""} ${dbError?.details ?? ""}`.toLowerCase();

  if (
    dbError?.code === "23505" &&
    (raw.includes("solicitudes_matricula_activa_unique") || raw.includes("matricula"))
  ) {
    return new Error("Ya existe una solicitud activa para esta matricula.");
  }

  if (
    dbError?.code === "23514" &&
    (raw.includes("solicitudes_matricula_format") || raw.includes("matricula"))
  ) {
    return new Error("La matricula debe tener el formato 1234567-8 o dejarse vacia.");
  }

  return error;
}

function toSolicitudPatch(changes: AlumnoBulkChanges) {
  const payload: Record<string, string | boolean | null> = {};

  if (changes.estado !== undefined) payload.estado = changes.estado;
  if (changes.recibio !== undefined) payload.fecha_documentos_recibidos = toIsoDate(changes.recibio);
  if (changes.recibido !== undefined) payload.fecha_recepcion_fisica = toIsoDate(changes.recibido);
  if (changes.envio !== undefined) payload.fecha_envio = toIsoDate(changes.envio);
  if (changes.reenvio !== undefined) payload.reenvio = changes.reenvio;
  if (changes.localizacion !== undefined) payload.localizacion = changes.localizacion.trim() || null;
  if (changes.observaciones !== undefined) payload.observaciones = changes.observaciones.trim() || null;

  return payload;
}

export async function signInAdmin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function requestPasswordRecovery(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

function getRecoveryToken(input: string) {
  const value = input.trim();
  try {
    const url = new URL(value);
    return {
      token: null,
      tokenHash: url.searchParams.get("token_hash") ?? url.searchParams.get("token"),
    };
  } catch {
    return { token: value, tokenHash: null };
  }
}

export async function verifyPasswordRecoveryInput(email: string, recoveryInput: string) {
  const { token, tokenHash } = getRecoveryToken(recoveryInput);
  if (!token && !tokenHash) throw new Error("El codigo o enlace de recuperacion no es valido.");

  const { error: verificationError } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
    : await supabase.auth.verifyOtp({ email, token: token!, type: "recovery" });
  if (verificationError) throw verificationError;
}

export async function updatePasswordFromRecovery(password: string) {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  } finally {
    await supabase.auth.signOut();
  }
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

export async function getCurrentAccount(): Promise<Account | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,role,active")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (error) throw error;
  if (!data.active) throw new Error("La cuenta está desactivada.");

  return {
    id: data.id,
    displayName: data.display_name,
    email: data.email ?? user.email ?? "",
    password: "",
    role: data.role,
  };
}

export async function updateCurrentAccount(account: Account) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error("No hay una sesión activa.");

  if (account.password.trim()) {
    const { error } = await supabase.auth.updateUser({ password: account.password });
    if (error) throw error;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: account.displayName.trim() })
    .eq("id", user.id);

  if (error) throw error;
}

export async function fetchProfiles(): Promise<ManagedProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,role,active,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ProfileAdminRow[]).map(mapManagedProfile);
}

export async function createManagedUser(input: {
  email: string;
  displayName: string;
  role: ManagedRole;
}): Promise<ManagedProfile> {
  const role = input.role === "admin" ? "admin" : "operador";
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: {
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      role,
    },
  });

  if (error) throw error;
  if (!data?.profile) throw new Error("El usuario se creó, pero la función no regresó el perfil.");

  return mapManagedProfile(data.profile as ProfileAdminRow);
}

export async function deleteManagedUser(userId: string) {
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { userId },
  });

  if (error) throw error;
  if (!data?.userId) throw new Error("La funcion no confirmo la eliminacion del usuario.");
}

export async function updateProfileRoleActive(
  id: string,
  changes: { displayName?: string; role?: ManagedRole; active?: boolean }
): Promise<ManagedProfile> {
  await assertActiveAdminWillRemain(id, changes);

  const payload: Record<string, string | boolean> = {};
  if (changes.displayName !== undefined) payload.display_name = changes.displayName.trim();
  if (changes.role !== undefined) payload.role = changes.role;
  if (changes.active !== undefined) payload.active = changes.active;

  if (Object.keys(payload).length === 0) {
    const profile = (await fetchProfiles()).find(item => item.id === id);
    if (!profile) throw new Error("No se encontró el perfil.");
    return profile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select("id,email,display_name,role,active,created_at,updated_at")
    .single<ProfileAdminRow>();

  if (error) throw error;
  return mapManagedProfile(data);
}

export async function fetchCycleSummaries(): Promise<CycleSummary[]> {
  const { data, error } = await supabase
    .from("solicitudes_titulacion")
    .select("periodo_mes,periodo_anio,estado");

  if (error) throw error;

  const currentCycle = getCicloEscolarAnioFin();
  const summaries = new Map<number, CycleSummary>();

  for (const row of (data ?? []) as CycleSolicitudRow[]) {
    const cicloAnioFin = getCicloEscolarAnioFinFromPeriodo(row.periodo_mes, row.periodo_anio);
    const existing = summaries.get(cicloAnioFin) ?? {
      cicloAnioFin,
      label: getCicloEscolarLabel(cicloAnioFin),
      isCurrent: cicloAnioFin === currentCycle,
      total: 0,
      pendiente: 0,
      recibido: 0,
      enviado: 0,
      aceptado: 0,
      rechazado: 0,
    };

    existing.total += 1;
    existing[row.estado] += 1;
    summaries.set(cicloAnioFin, existing);
  }

  return Array.from(summaries.values()).sort((a, b) => b.cicloAnioFin - a.cicloAnioFin);
}

export async function deletePreviousCycle(cicloAnioFin: number): Promise<number> {
  const currentCycle = getCicloEscolarAnioFin();
  if (cicloAnioFin >= currentCycle) {
    throw new Error("El ciclo actual está protegido y no se puede borrar desde mantenimiento.");
  }

  const previousYear = cicloAnioFin - 1;
  const firstHalf = await supabase
    .from("solicitudes_titulacion")
    .delete()
    .eq("periodo_anio", previousYear)
    .gte("periodo_mes", 8)
    .lte("periodo_mes", 12)
    .select("id");

  if (firstHalf.error) throw firstHalf.error;

  const secondHalf = await supabase
    .from("solicitudes_titulacion")
    .delete()
    .eq("periodo_anio", cicloAnioFin)
    .gte("periodo_mes", 1)
    .lte("periodo_mes", 7)
    .select("id");

  if (secondHalf.error) throw secondHalf.error;

  return (firstHalf.data?.length ?? 0) + (secondHalf.data?.length ?? 0);
}

function mapCatalogos(
  nivelesRows: NivelRow[],
  facultadesRows: FacultadRow[],
  carrerasRows: CarreraRow[],
  tramitesRows: TramiteRow[]
): Catalogos {
  const niveles: NivelCatalogo[] = nivelesRows.map(row => ({
    id: row.id,
    nombre: toNivelEstudio(row.nombre),
    abreviatura: row.abreviatura,
    pago: row.pago_mxn,
    colorHex: row.color_hex,
    orden: row.orden,
    activo: row.activo,
  }));

  const carreras = carrerasRows.map<CarreraCatalogo>(row => ({
    id: row.id,
    facultadCodigo: row.facultad_codigo,
    nivelId: row.nivel_id,
    nombre: row.nombre,
    activo: row.activo,
  }));

  const facultades = facultadesRows.map<Facultad>(row => ({
    codigo: row.codigo,
    nombre: row.nombre,
    activo: row.activo,
    carreras: carreras
      .filter(carrera => carrera.facultadCodigo === row.codigo)
      .map(carrera => carrera.nombre),
  }));

  const tramites = tramitesRows.map<TramiteCatalogo>(row => ({
    id: row.id,
    nombre: row.nombre,
    activo: row.activo,
  }));

  return { niveles, facultades, carreras, tramites };
}

export async function fetchCatalogos(): Promise<Catalogos> {
  const [nivelesResult, facultadesResult, carrerasResult, tramitesResult] = await Promise.all([
    supabase.from("niveles_estudio").select("id,nombre,abreviatura,pago_mxn,color_hex,orden,activo").eq("activo", true).order("orden"),
    supabase.from("facultades").select("codigo,nombre,activo").eq("activo", true).order("codigo"),
    supabase.from("carreras").select("id,facultad_codigo,nivel_id,nombre,activo").eq("activo", true).order("nombre"),
    supabase.from("tramites").select("id,nombre,activo").eq("activo", true).order("nombre"),
  ]);

  if (nivelesResult.error) throw nivelesResult.error;
  if (facultadesResult.error) throw facultadesResult.error;
  if (carrerasResult.error) throw carrerasResult.error;
  if (tramitesResult.error) throw tramitesResult.error;

  return mapCatalogos(
    (nivelesResult.data ?? []) as NivelRow[],
    (facultadesResult.data ?? []) as FacultadRow[],
    (carrerasResult.data ?? []) as CarreraRow[],
    (tramitesResult.data ?? []) as TramiteRow[]
  );
}

export async function fetchCatalogosAdmin(): Promise<Catalogos> {
  const [nivelesResult, facultadesResult, carrerasResult, tramitesResult] = await Promise.all([
    supabase.from("niveles_estudio").select("id,nombre,abreviatura,pago_mxn,color_hex,orden,activo").order("orden"),
    supabase.from("facultades").select("codigo,nombre,activo").order("codigo"),
    supabase.from("carreras").select("id,facultad_codigo,nivel_id,nombre,activo").order("nombre"),
    supabase.from("tramites").select("id,nombre,activo").order("nombre"),
  ]);

  if (nivelesResult.error) throw nivelesResult.error;
  if (facultadesResult.error) throw facultadesResult.error;
  if (carrerasResult.error) throw carrerasResult.error;
  if (tramitesResult.error) throw tramitesResult.error;

  return mapCatalogos(
    (nivelesResult.data ?? []) as NivelRow[],
    (facultadesResult.data ?? []) as FacultadRow[],
    (carrerasResult.data ?? []) as CarreraRow[],
    (tramitesResult.data ?? []) as TramiteRow[]
  );
}

export async function fetchAlumnos(catalogos: Catalogos): Promise<Alumno[]> {
  const { data, error } = await supabase
    .from("v_solicitudes_titulacion_detalle")
    .select("*")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as SolicitudDetalleRow[]).map(row => mapSolicitud(row, catalogos));
}

export async function createAlumno(alumno: Alumno, catalogos: Catalogos): Promise<Alumno> {
  const payload = toSolicitudPayload(alumno, catalogos);
  const { data, error } = await supabase
    .from("solicitudes_titulacion")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error) throw getSolicitudSaveError(error);

  const next = await fetchAlumnos(catalogos);
  const created = next.find(item => item.id === data.id);
  if (!created) throw new Error("La solicitud se guardó, pero no pude leerla de vuelta.");
  return created;
}

export async function updateAlumno(alumno: Alumno, catalogos: Catalogos): Promise<Alumno> {
  const payload = toSolicitudPayload(alumno, catalogos);
  const { error } = await supabase
    .from("solicitudes_titulacion")
    .update(payload)
    .eq("id", alumno.id);

  if (error) throw getSolicitudSaveError(error);

  const next = await fetchAlumnos(catalogos);
  const updated = next.find(item => item.id === alumno.id);
  if (!updated) throw new Error("La solicitud se actualizó, pero no pude leerla de vuelta.");
  return updated;
}

export async function updateAlumnosBulk(ids: string[], changes: AlumnoBulkChanges): Promise<string[]> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const payload = toSolicitudPatch(changes);
  if (Object.keys(payload).length === 0) return [];

  const { data, error } = await supabase
    .from("solicitudes_titulacion")
    .update(payload)
    .in("id", uniqueIds)
    .select("id");

  if (error) throw error;

  const updatedIds = ((data ?? []) as { id: string }[]).map(row => row.id);
  if (updatedIds.length !== uniqueIds.length) {
    throw new Error("No se pudieron actualizar todos los registros seleccionados.");
  }

  return updatedIds;
}

export async function deleteAlumno(id: string) {
  const { error } = await supabase
    .from("solicitudes_titulacion")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createFacultad(facultad: Facultad) {
  const { error } = await supabase
    .from("facultades")
    .insert({
      codigo: facultad.codigo.trim(),
      nombre: facultad.nombre.trim(),
      activo: facultad.activo ?? true,
    });

  if (error) throw error;
}

export async function updateFacultad(facultad: Facultad) {
  const { error } = await supabase
    .from("facultades")
    .update({
      nombre: facultad.nombre.trim(),
      activo: facultad.activo ?? true,
    })
    .eq("codigo", facultad.codigo);

  if (error) throw error;
}

export async function deleteFacultad(codigo: string) {
  const { error } = await supabase
    .from("facultades")
    .delete()
    .eq("codigo", codigo);

  if (error) throw error;
}

export async function createCarrera(carrera: Omit<CarreraCatalogo, "id">) {
  const { error } = await supabase
    .from("carreras")
    .insert({
      facultad_codigo: carrera.facultadCodigo,
      nivel_id: carrera.nivelId,
      nombre: carrera.nombre.trim(),
      activo: carrera.activo,
    });

  if (error) throw error;
}

export async function updateCarrera(carrera: CarreraCatalogo) {
  const { error } = await supabase
    .from("carreras")
    .update({
      facultad_codigo: carrera.facultadCodigo,
      nivel_id: carrera.nivelId,
      nombre: carrera.nombre.trim(),
      activo: carrera.activo,
    })
    .eq("id", carrera.id);

  if (error) throw error;
}

export async function deleteCarrera(id: string) {
  const { error } = await supabase
    .from("carreras")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createNivel(nivel: NivelCatalogo) {
  const { error } = await supabase
    .from("niveles_estudio")
    .insert({
      id: nivel.id.trim(),
      nombre: nivel.nombre.trim(),
      abreviatura: nivel.abreviatura.trim(),
      pago_mxn: nivel.pago,
      color_hex: nivel.colorHex,
      orden: nivel.orden,
      activo: nivel.activo,
    });

  if (error) throw error;
}

export async function updateNivel(nivel: NivelCatalogo) {
  const { error } = await supabase
    .from("niveles_estudio")
    .update({
      nombre: nivel.nombre.trim(),
      abreviatura: nivel.abreviatura.trim(),
      pago_mxn: nivel.pago,
      color_hex: nivel.colorHex,
      orden: nivel.orden,
      activo: nivel.activo,
    })
    .eq("id", nivel.id);

  if (error) throw error;
}

export async function deleteNivel(id: string) {
  const { error } = await supabase
    .from("niveles_estudio")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createTramite(tramite: TramiteCatalogo) {
  const { error } = await supabase
    .from("tramites")
    .insert({
      id: tramite.id.trim(),
      nombre: tramite.nombre.trim(),
      activo: tramite.activo,
    });

  if (error) throw error;
}

export async function deleteTramite(id: string) {
  const { error } = await supabase
    .from("tramites")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updateTramite(tramite: TramiteCatalogo) {
  const { error } = await supabase
    .from("tramites")
    .update({
      nombre: tramite.nombre.trim(),
      activo: tramite.activo,
    })
    .eq("id", tramite.id);

  if (error) throw error;
}
