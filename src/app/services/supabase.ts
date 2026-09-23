import { createClient } from "@supabase/supabase-js";
import { MESES_ABR, PREPARATORIAS, COSTO_BASE_CERTIFICADO_DEFAULT, fmtDate, getCicloEscolarAnioFin, getCicloEscolarAnioFinFromPeriodo, getCicloEscolarLabel, loadSavedCostoBase, saveCostoBaseToLocal } from "../domain";
import type {
  Account,
  Alumno,
  AlumnoBulkChanges,
  Catalogos,
  CycleSummary,
  EstadoTramite,
  ManagedProfile,
  ManagedRole,
  ModalidadPrepa,
  Preparatoria,
  TipoCertificado,
  TramiteCatalogo,
  Turno,
} from "../domain";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

const forceMock =
  import.meta.env.VITE_USE_MOCK === "true" ||
  import.meta.env.VITE_USE_MOCK === "1" ||
  (typeof window !== "undefined" && window.localStorage.getItem("app_force_mock") === "true");

export let isMockMode = Boolean(forceMock || !supabaseUrl || !supabaseKey);

export function enableMockMode() {
  isMockMode = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("app_force_mock", "true");
  }
}

export function disableMockMode() {
  isMockMode = !supabaseUrl || !supabaseKey;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("app_force_mock");
  }
}

export const supabase = !isMockMode && supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);

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

type PreparatoriaRow = {
  clave: string;
  nombre: string;
  modalidades?: string[];
  activo: boolean;
};

type TramiteRow = {
  id: string;
  nombre: string;
  activo: boolean;
};

type SolicitudDetalleRow = {
  id: string;
  legacy_id?: string | null;
  folio?: string | null;
  numero_cuenta?: string | null;
  matricula?: string | null;
  tramite_id?: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  telefono_alt?: string | null;
  tramite: string;
  pago?: number;
  preparatoria_clave?: string;
  preparatoria_nombre?: string;
  modalidad?: ModalidadPrepa;
  turno?: Turno;
  tipo_certificado?: TipoCertificado;
  generacion?: string | null;
  recibio?: string | null;
  ingreso?: string | null;
  recibido?: string | null;
  envio?: string | null;
  reenvio?: boolean;
  carta_poder?: string | null;
  carta_porte?: string | null;
  localizacion?: string | null;
  observaciones?: string | null;
  estado: EstadoTramite;
  mes: number;
  anio: number;
};

type SupabaseDbError = {
  code?: string;
  message?: string;
  details?: string;
};

function fromIsoDate(value?: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return fmtDate(day, month, year);
}

function toIsoDate(value?: string | null): string | null {
  if (!value || !value.trim()) return null;
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

// --------------------------------------------------------------------------------
// Mock State Store (Enables 100% offline local development without backend errors)
// --------------------------------------------------------------------------------

const MOCK_CURRENT_YEAR = new Date().getFullYear();
const MOCK_CURRENT_MONTH = new Date().getMonth() + 1;

const DEFAULT_MOCK_ALUMNOS: Alumno[] = [
  {
    id: "al-8240-001",
    numeroCuenta: "20210041",
    nombre: "LÓPEZ HERNÁNDEZ JUAN CARLOS",
    preparatoriaClave: "8240",
    preparatoriaNombre: "Preparatoria Mazatlán",
    modalidad: "Escolarizada",
    turno: "Matutino",
    tipoCertificado: "Digital",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: 500,
    email: "juan.lopez@uas.edu.mx",
    telefono: "6699123456",
    telefonoAlt: "",
    generacion: "2021-2024",
    recibio: fmtDate(5, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    ingreso: fmtDate(5, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    recibido: fmtDate(6, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    envio: fmtDate(8, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    reenvio: false,
    cartaPoder: "",
    cartaPorte: "",
    localizacion: "Mazatlán",
    observaciones: "Documentación completa y cotejada.",
    estado: "entregado" as EstadoTramite,
    mes: MOCK_CURRENT_MONTH,
    anio: MOCK_CURRENT_YEAR,
  },
  {
    id: "al-8210-002",
    numeroCuenta: "20210152",
    nombre: "SÁNCHEZ MORALES DANIELA",
    preparatoriaClave: "8210",
    preparatoriaNombre: "Preparatoria Concordia",
    modalidad: "Semiescolarizada",
    turno: "Mixto",
    tipoCertificado: "Físico",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: 500,
    email: "daniela.sanchez@gmail.com",
    telefono: "6699876543",
    telefonoAlt: "6691238901",
    generacion: "2021-2024",
    recibio: fmtDate(10, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    ingreso: fmtDate(10, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    recibido: fmtDate(12, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    envio: "",
    reenvio: false,
    cartaPoder: "CP-102",
    cartaPorte: "",
    localizacion: "Concordia",
    observaciones: "",
    estado: "recibido",
    mes: MOCK_CURRENT_MONTH,
    anio: MOCK_CURRENT_YEAR,
  },
  {
    id: "al-8260-003",
    numeroCuenta: "20210389",
    nombre: "RAMÍREZ TORRES JESÚS ALBERTO",
    preparatoriaClave: "8260",
    preparatoriaNombre: "Preparatoria Rubén Jaramillo",
    modalidad: "Nocturno",
    turno: "Nocturno",
    tipoCertificado: "Físico",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: 500,
    email: "",
    telefono: "6692223344",
    telefonoAlt: "",
    generacion: "2020-2023",
    recibio: fmtDate(15, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    ingreso: fmtDate(15, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    recibido: "",
    envio: "",
    reenvio: false,
    cartaPoder: "",
    cartaPorte: "",
    localizacion: "",
    observaciones: "Falta copia de acta de nacimiento.",
    estado: "pendiente",
    mes: MOCK_CURRENT_MONTH,
    anio: MOCK_CURRENT_YEAR,
  },
  {
    id: "al-8220-004",
    numeroCuenta: "20210415",
    nombre: "GARCÍA VEGA SOFÍA VALENTINA",
    preparatoriaClave: "8220",
    preparatoriaNombre: "Preparatoria El Rosario",
    modalidad: "Escolarizada",
    turno: "Vespertino",
    tipoCertificado: "Digital",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: 500,
    email: "sofia.garcia@outlook.com",
    telefono: "6949521122",
    telefonoAlt: "",
    generacion: "2021-2024",
    recibio: fmtDate(18, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    ingreso: fmtDate(18, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    recibido: fmtDate(19, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    envio: fmtDate(20, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    reenvio: false,
    cartaPoder: "",
    cartaPorte: "",
    localizacion: "El Rosario",
    observaciones: "",
    estado: "enviado",
    mes: MOCK_CURRENT_MONTH,
    anio: MOCK_CURRENT_YEAR,
  },
  {
    id: "al-8230-005",
    numeroCuenta: "20210567",
    nombre: "BELTRÁN OSUNA CARLOS MANUEL",
    preparatoriaClave: "8230",
    preparatoriaNombre: "Preparatoria Escuinapa",
    modalidad: "Escolarizada",
    turno: "Matutino",
    tipoCertificado: "Físico",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: 500,
    email: "carlos.beltran@uas.edu.mx",
    telefono: "6959530011",
    telefonoAlt: "",
    generacion: "2021-2024",
    recibio: fmtDate(22, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    ingreso: fmtDate(22, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    recibido: fmtDate(22, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    envio: fmtDate(23, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    reenvio: false,
    cartaPoder: "",
    cartaPorte: "",
    localizacion: "Escuinapa",
    observaciones: "Validado.",
    estado: "aceptado",
    mes: MOCK_CURRENT_MONTH,
    anio: MOCK_CURRENT_YEAR,
  },
];

const LOCAL_STORAGE_KEY_ALUMNOS = "app-titulacion-prepa-alumnos";
const LOCAL_STORAGE_KEY_PREPAS = "app-titulacion-prepa-catalogos";

function loadLocalAlumnos(): Alumno[] {
  if (typeof window === "undefined") return DEFAULT_MOCK_ALUMNOS;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY_ALUMNOS);
    if (!raw) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY_ALUMNOS, JSON.stringify(DEFAULT_MOCK_ALUMNOS));
      return DEFAULT_MOCK_ALUMNOS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_MOCK_ALUMNOS;
  }
}

function saveLocalAlumnos(alumnos: Alumno[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY_ALUMNOS, JSON.stringify(alumnos));
  } catch {}
}

function loadLocalPreparatorias(): Preparatoria[] {
  if (typeof window === "undefined") return PREPARATORIAS;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY_PREPAS);
    if (!raw) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY_PREPAS, JSON.stringify(PREPARATORIAS));
      return PREPARATORIAS;
    }
    return JSON.parse(raw);
  } catch {
    return PREPARATORIAS;
  }
}

function saveLocalPreparatorias(prepas: Preparatoria[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY_PREPAS, JSON.stringify(prepas));
  } catch {}
}

// --------------------------------------------------------------------------------
// Catalog API Functions
// --------------------------------------------------------------------------------

export async function fetchCatalogos(): Promise<Catalogos> {
  if (isMockMode) {
    const prepas = loadLocalPreparatorias().filter(p => p.activo !== false);
    return {
      preparatorias: prepas,
      tramites: [{ id: "certificado", nombre: "Certificado", activo: true }],
    };
  }

  const [prepasResult, tramitesResult] = await Promise.all([
    supabase.from("preparatorias").select("clave,nombre,modalidades,activo").eq("activo", true).order("clave"),
    supabase.from("tramites").select("id,nombre,activo").eq("activo", true).order("nombre"),
  ]);

  if (prepasResult.error) {
    console.warn("Error consultando preparatorias de Supabase, usando catálogo base:", prepasResult.error);
    return {
      preparatorias: loadLocalPreparatorias(),
      tramites: [{ id: "certificado", nombre: "Certificado", activo: true }],
    };
  }

  const prepas: Preparatoria[] = (prepasResult.data ?? []).map((row: PreparatoriaRow) => ({
    clave: row.clave,
    nombre: row.nombre,
    modalidades: (row.modalidades as ModalidadPrepa[]) || ["Escolarizada"],
    activo: row.activo,
  }));

  const tramites: TramiteCatalogo[] = (tramitesResult.data ?? [{ id: "certificado", nombre: "Certificado", activo: true }]).map(
    (row: TramiteRow) => ({
      id: row.id,
      nombre: row.nombre,
      activo: row.activo,
    })
  );

  return { preparatorias: prepas.length > 0 ? prepas : loadLocalPreparatorias(), tramites };
}

export async function fetchCatalogosAdmin(): Promise<Catalogos> {
  if (isMockMode) {
    return {
      preparatorias: loadLocalPreparatorias(),
      tramites: [{ id: "certificado", nombre: "Certificado", activo: true }],
    };
  }

  const [prepasResult, tramitesResult] = await Promise.all([
    supabase.from("preparatorias").select("clave,nombre,modalidades,activo").order("clave"),
    supabase.from("tramites").select("id,nombre,activo").order("nombre"),
  ]);

  if (prepasResult.error) {
    return {
      preparatorias: loadLocalPreparatorias(),
      tramites: [{ id: "certificado", nombre: "Certificado", activo: true }],
    };
  }

  const prepas: Preparatoria[] = (prepasResult.data ?? []).map((row: PreparatoriaRow) => ({
    clave: row.clave,
    nombre: row.nombre,
    modalidades: (row.modalidades as ModalidadPrepa[]) || ["Escolarizada"],
    activo: row.activo,
  }));

  const tramites: TramiteCatalogo[] = (tramitesResult.data ?? [{ id: "certificado", nombre: "Certificado", activo: true }]).map(
    (row: TramiteRow) => ({
      id: row.id,
      nombre: row.nombre,
      activo: row.activo,
    })
  );

  return { preparatorias: prepas.length > 0 ? prepas : loadLocalPreparatorias(), tramites };
}

export async function fetchCostoBase(): Promise<number> {
  if (isMockMode) {
    return loadSavedCostoBase();
  }
  try {
    const { data, error } = await supabase
      .from("configuraciones")
      .select("valor")
      .eq("clave", "costo_base_certificado")
      .maybeSingle();

    if (error || !data) {
      return loadSavedCostoBase();
    }
    const num = Number(data.valor);
    return !isNaN(num) && num > 0 ? num : loadSavedCostoBase();
  } catch {
    return loadSavedCostoBase();
  }
}

export async function updateCostoBase(nuevoCosto: number): Promise<void> {
  saveCostoBaseToLocal(nuevoCosto);
  if (isMockMode) return;
  try {
    await supabase
      .from("configuraciones")
      .upsert({ clave: "costo_base_certificado", valor: String(nuevoCosto) });
  } catch (err) {
    console.warn("No se pudo sincronizar el costo base con Supabase:", err);
  }
}

// --------------------------------------------------------------------------------
// Alumnos / Certificados API Functions
// --------------------------------------------------------------------------------

function mapSolicitud(row: SolicitudDetalleRow, catalogos: Catalogos): Alumno {
  const prepa = catalogos.preparatorias.find(p => p.clave === row.preparatoria_clave);
  return {
    id: row.id,
    numeroCuenta: row.numero_cuenta || row.matricula || "",
    nombre: row.nombre,
    preparatoriaClave: row.preparatoria_clave || "",
    preparatoriaNombre: row.preparatoria_nombre || prepa?.nombre || row.preparatoria_clave || "",
    modalidad: row.modalidad || "Escolarizada",
    turno: row.turno || "Matutino",
    tipoCertificado: row.tipo_certificado || "Físico",
    tramite: row.tramite || "Certificado",
    tramiteId: row.tramite_id || "certificado",
    pago: row.pago ?? 500,
    email: row.email ?? "",
    telefono: row.telefono ?? "",
    telefonoAlt: row.telefono_alt ?? "",
    generacion: row.generacion ?? "",
    recibio: fromIsoDate(row.recibio),
    ingreso: fromIsoDate(row.ingreso),
    recibido: fromIsoDate(row.recibido),
    envio: fromIsoDate(row.envio),
    reenvio: Boolean(row.reenvio),
    cartaPoder: row.carta_poder ?? "",
    cartaPorte: row.carta_porte ?? "",
    localizacion: row.localizacion ?? "",
    observaciones: row.observaciones ?? "",
    estado: row.estado,
    mes: row.mes,
    anio: row.anio,
  };
}

export async function fetchAlumnos(catalogos: Catalogos): Promise<Alumno[]> {
  if (isMockMode) {
    return loadLocalAlumnos();
  }

  const { data, error } = await supabase
    .from("solicitudes_titulacion")
    .select("*")
    .order("periodo_anio", { ascending: false })
    .order("periodo_mes", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Error conectando a solicitudes de Supabase, usando almacenamiento local:", error);
    return loadLocalAlumnos();
  }

  return ((data ?? []) as SolicitudDetalleRow[]).map(row => mapSolicitud(row, catalogos));
}

export async function createAlumno(alumno: Alumno, catalogos: Catalogos): Promise<Alumno> {
  if (isMockMode) {
    const list = loadLocalAlumnos();
    const newAlumno: Alumno = {
      ...alumno,
      id: `prepa-${Date.now()}`,
    };
    list.unshift(newAlumno);
    saveLocalAlumnos(list);
    return newAlumno;
  }

  const payload: Record<string, unknown> = {
    alumno_nombre: alumno.nombre.trim(),
    alumno_email: alumno.email?.trim() || null,
    telefono: alumno.telefono?.trim() || null,
    telefono_alternativo: alumno.telefonoAlt?.trim() || null,
    numero_cuenta: alumno.numeroCuenta.trim(),
    tramite_id: alumno.tramiteId ?? "certificado",
    preparatoria_clave: alumno.preparatoriaClave,
    modalidad: alumno.modalidad,
    turno: alumno.turno,
    tipo_certificado: alumno.tipoCertificado,
    pago_mxn: alumno.pago,
    generacion: alumno.generacion.trim() || null,
    fecha_documentos_recibidos: toIsoDate(alumno.recibio),
    fecha_ingreso_sistema: toIsoDate(alumno.ingreso),
    fecha_recepcion_fisica: toIsoDate(alumno.recibido),
    fecha_envio: toIsoDate(alumno.envio),
    reenvio: alumno.reenvio,
    carta_poder: alumno.cartaPoder?.trim() || null,
    carta_porte: alumno.cartaPorte?.trim() || null,
    localizacion: alumno.localizacion?.trim() || null,
    observaciones: alumno.observaciones?.trim() || null,
    estado: alumno.estado,
    periodo_mes: alumno.mes,
    periodo_anio: alumno.anio,
  };

  const { data, error } = await supabase
    .from("solicitudes_titulacion")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;

  const next = await fetchAlumnos(catalogos);
  const created = next.find(item => item.id === data.id);
  return created ?? alumno;
}

export async function updateAlumno(alumno: Alumno, catalogos: Catalogos): Promise<Alumno> {
  if (isMockMode) {
    const list = loadLocalAlumnos();
    const index = list.findIndex(a => a.id === alumno.id);
    if (index >= 0) {
      list[index] = { ...alumno };
      saveLocalAlumnos(list);
    }
    return alumno;
  }

  const payload: Record<string, unknown> = {
    alumno_nombre: alumno.nombre.trim(),
    alumno_email: alumno.email?.trim() || null,
    telefono: alumno.telefono?.trim() || null,
    telefono_alternativo: alumno.telefonoAlt?.trim() || null,
    numero_cuenta: alumno.numeroCuenta.trim(),
    tramite_id: alumno.tramiteId ?? "certificado",
    preparatoria_clave: alumno.preparatoriaClave,
    modalidad: alumno.modalidad,
    turno: alumno.turno,
    tipo_certificado: alumno.tipoCertificado,
    pago_mxn: alumno.pago,
    generacion: alumno.generacion.trim() || null,
    fecha_documentos_recibidos: toIsoDate(alumno.recibio),
    fecha_ingreso_sistema: toIsoDate(alumno.ingreso),
    fecha_recepcion_fisica: toIsoDate(alumno.recibido),
    fecha_envio: toIsoDate(alumno.envio),
    reenvio: alumno.reenvio,
    carta_poder: alumno.cartaPoder?.trim() || null,
    carta_porte: alumno.cartaPorte?.trim() || null,
    localizacion: alumno.localizacion?.trim() || null,
    observaciones: alumno.observaciones?.trim() || null,
    estado: alumno.estado,
    periodo_mes: alumno.mes,
    periodo_anio: alumno.anio,
  };

  const { error } = await supabase
    .from("solicitudes_titulacion")
    .update(payload)
    .eq("id", alumno.id);

  if (error) throw error;

  const next = await fetchAlumnos(catalogos);
  const updated = next.find(item => item.id === alumno.id);
  return updated ?? alumno;
}

export async function updateAlumnosBulk(ids: string[], changes: AlumnoBulkChanges): Promise<string[]> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return [];

  if (isMockMode) {
    const list = loadLocalAlumnos();
    list.forEach(a => {
      if (uniqueIds.includes(a.id)) {
        if (changes.estado !== undefined) a.estado = changes.estado;
        if (changes.recibio !== undefined) a.recibio = changes.recibio;
        if (changes.recibido !== undefined) a.recibido = changes.recibido;
        if (changes.envio !== undefined) a.envio = changes.envio;
        if (changes.reenvio !== undefined) a.reenvio = changes.reenvio;
        if (changes.localizacion !== undefined) a.localizacion = changes.localizacion;
        if (changes.observaciones !== undefined) a.observaciones = changes.observaciones;
        if (changes.pago !== undefined) a.pago = changes.pago;
        if (changes.tipoCertificado !== undefined) a.tipoCertificado = changes.tipoCertificado;
        if (changes.turno !== undefined) a.turno = changes.turno;
      }
    });
    saveLocalAlumnos(list);
    return uniqueIds;
  }

  const payload: Record<string, unknown> = {};
  if (changes.estado !== undefined) payload.estado = changes.estado;
  if (changes.recibio !== undefined) payload.fecha_documentos_recibidos = toIsoDate(changes.recibio);
  if (changes.recibido !== undefined) payload.fecha_recepcion_fisica = toIsoDate(changes.recibido);
  if (changes.envio !== undefined) payload.fecha_envio = toIsoDate(changes.envio);
  if (changes.reenvio !== undefined) payload.reenvio = changes.reenvio;
  if (changes.localizacion !== undefined) payload.localizacion = changes.localizacion.trim() || null;
  if (changes.observaciones !== undefined) payload.observaciones = changes.observaciones.trim() || null;
  if (changes.pago !== undefined) payload.pago_mxn = changes.pago;
  if (changes.tipoCertificado !== undefined) payload.tipo_certificado = changes.tipoCertificado;
  if (changes.turno !== undefined) payload.turno = changes.turno;

  const { data, error } = await supabase
    .from("solicitudes_titulacion")
    .update(payload)
    .in("id", uniqueIds)
    .select("id");

  if (error) throw error;
  return ((data ?? []) as { id: string }[]).map(row => row.id);
}

export async function deleteAlumno(id: string) {
  if (isMockMode) {
    const list = loadLocalAlumnos().filter(a => a.id !== id);
    saveLocalAlumnos(list);
    return;
  }

  const { error } = await supabase
    .from("solicitudes_titulacion")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// --------------------------------------------------------------------------------
// Preparatorias Management CRUD
// --------------------------------------------------------------------------------

export async function createPreparatoria(prepa: Preparatoria) {
  if (isMockMode) {
    const prepas = loadLocalPreparatorias();
    if (prepas.some(p => p.clave === prepa.clave)) {
      throw new Error(`Ya existe una preparatoria con la clave ${prepa.clave}`);
    }
    prepas.push({ ...prepa, activo: prepa.activo ?? true });
    saveLocalPreparatorias(prepas);
    return;
  }

  const { error } = await supabase
    .from("preparatorias")
    .insert({
      clave: prepa.clave.trim(),
      nombre: prepa.nombre.trim(),
      modalidades: prepa.modalidades,
      activo: prepa.activo ?? true,
    });

  if (error) throw error;
}

export async function updatePreparatoria(prepa: Preparatoria) {
  if (isMockMode) {
    const prepas = loadLocalPreparatorias();
    const index = prepas.findIndex(p => p.clave === prepa.clave);
    if (index >= 0) {
      prepas[index] = { ...prepa, activo: prepa.activo ?? true };
      saveLocalPreparatorias(prepas);
    }
    return;
  }

  const { error } = await supabase
    .from("preparatorias")
    .update({
      nombre: prepa.nombre.trim(),
      modalidades: prepa.modalidades,
      activo: prepa.activo ?? true,
    })
    .eq("clave", prepa.clave);

  if (error) throw error;
}

export async function deletePreparatoria(clave: string) {
  if (isMockMode) {
    const prepas = loadLocalPreparatorias().filter(p => p.clave !== clave);
    saveLocalPreparatorias(prepas);
    return;
  }

  const { error } = await supabase
    .from("preparatorias")
    .delete()
    .eq("clave", clave);

  if (error) throw error;
}

// --------------------------------------------------------------------------------
// Trámites Management CRUD
// --------------------------------------------------------------------------------

export async function createTramite(tramite: TramiteCatalogo) {
  if (isMockMode) return;
  const { error } = await supabase
    .from("tramites")
    .insert({
      id: tramite.id.trim(),
      nombre: tramite.nombre.trim(),
      activo: tramite.activo,
    });
  if (error) throw error;
}

export async function updateTramite(tramite: TramiteCatalogo) {
  if (isMockMode) return;
  const { error } = await supabase
    .from("tramites")
    .update({
      nombre: tramite.nombre.trim(),
      activo: tramite.activo,
    })
    .eq("id", tramite.id);
  if (error) throw error;
}

export async function deleteTramite(id: string) {
  if (isMockMode) return;
  const { error } = await supabase
    .from("tramites")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// --------------------------------------------------------------------------------
// Auth and User Management
// --------------------------------------------------------------------------------

export async function signInAdmin(email: string, password: string) {
  if (isMockMode) {
    // In mock mode, allow instant login
    return;
  }
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err: unknown) {
    const msg = String(err && typeof err === "object" && "message" in err ? (err as { message?: string }).message : err).toLowerCase();
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch") || msg.includes("timeout")) {
      console.warn("No se pudo conectar con el servidor de Supabase. Activando modo local/offline automáticamente:", err);
      enableMockMode();
      return;
    }
    throw err;
  }
}

export async function requestPasswordRecovery(email: string) {
  if (isMockMode) return;
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
  if (isMockMode) return;
  const { token, tokenHash } = getRecoveryToken(recoveryInput);
  if (!token && !tokenHash) throw new Error("El código o enlace de recuperación no es válido.");

  const { error: verificationError } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
    : await supabase.auth.verifyOtp({ email, token: token!, type: "recovery" });
  if (verificationError) throw verificationError;
}

export async function updatePasswordFromRecovery(password: string) {
  if (isMockMode) return;
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  } finally {
    await supabase.auth.signOut();
  }
}

export async function signOutAdmin() {
  if (isMockMode) return;
  await supabase.auth.signOut();
}

export async function getCurrentAccount(): Promise<Account | null> {
  if (isMockMode) {
    return {
      id: "mock-admin-01",
      displayName: "Administrador Ventanilla",
      email: "ventanilla.prepa@uas.edu.mx",
      password: "",
      role: "admin",
    };
  }

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
  if (isMockMode) return;
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
  if (isMockMode) {
    return [
      {
        id: "mock-admin-01",
        email: "ventanilla.prepa@uas.edu.mx",
        displayName: "Administrador Ventanilla",
        role: "admin",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

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
  if (isMockMode) {
    return {
      id: `usr-${Date.now()}`,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

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
  if (isMockMode) return;
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { userId },
  });

  if (error) throw error;
  if (!data?.userId) throw new Error("La función no confirmó la eliminación del usuario.");
}

export async function updateProfileRoleActive(
  id: string,
  changes: { displayName?: string; role?: ManagedRole; active?: boolean }
): Promise<ManagedProfile> {
  if (isMockMode) {
    return {
      id,
      email: "ventanilla.prepa@uas.edu.mx",
      displayName: changes.displayName || "Administrador Ventanilla",
      role: changes.role || "admin",
      active: changes.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const payload: Record<string, string | boolean> = {};
  if (changes.displayName !== undefined) payload.display_name = changes.displayName.trim();
  if (changes.role !== undefined) payload.role = changes.role;
  if (changes.active !== undefined) payload.active = changes.active;

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
  const alumnos = isMockMode ? loadLocalAlumnos() : await fetchAlumnos(await fetchCatalogos());
  const currentCycle = getCicloEscolarAnioFin();
  const summaries = new Map<number, CycleSummary>();

  for (const a of alumnos) {
    const cicloAnioFin = getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio);
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
    if (a.estado in existing) {
      existing[a.estado] += 1;
    }
    summaries.set(cicloAnioFin, existing);
  }

  return Array.from(summaries.values()).sort((a, b) => b.cicloAnioFin - a.cicloAnioFin);
}

export async function deletePreviousCycle(cicloAnioFin: number): Promise<number> {
  const currentCycle = getCicloEscolarAnioFin();
  if (cicloAnioFin >= currentCycle) {
    throw new Error("El ciclo actual está protegido y no se puede borrar desde mantenimiento.");
  }

  if (isMockMode) {
    const list = loadLocalAlumnos();
    const filtered = list.filter(a => getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio) !== cicloAnioFin);
    const deleted = list.length - filtered.length;
    saveLocalAlumnos(filtered);
    return deleted;
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
