import { createClient } from "@supabase/supabase-js";
import {
  FACULTADES_LICENCIATURA,
  MESES_ABR,
  PREPARATORIAS,
  UNIDADES_ACADEMICAS,
  COSTO_BASE_CERTIFICADO_DEFAULT,
  fmtDate,
  getCicloEscolarAnioFin,
  getCicloEscolarAnioFinFromPeriodo,
  getCicloEscolarLabel,
  getDefaultCarreraCodigo,
  getDivisionFromClave,
  loadSavedCostoBase,
  saveCostoBaseToLocal,
} from "../domain";
import type {
  AccesoDivision,
  Account,
  Alumno,
  AlumnoBulkChanges,
  Catalogos,
  CycleSummary,
  DivisionAcademica,
  EstadoTramite,
  ManagedProfile,
  ManagedRole,
  ModalidadPrepa,
  Preparatoria,
  TipoCertificado,
  TramiteCatalogo,
  Turno,
} from "../domain";

const IS_DEV = Boolean(import.meta.env.DEV);

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

// En producción limpiamos cualquier bandera residual de modo mock guardada previamente
if (!IS_DEV && typeof window !== "undefined") {
  window.localStorage.removeItem("app_force_mock");
  window.localStorage.removeItem("app_mock_division");
}

const forceMock =
  IS_DEV &&
  (import.meta.env.VITE_USE_MOCK === "true" ||
    import.meta.env.VITE_USE_MOCK === "1" ||
    (typeof window !== "undefined" && window.localStorage.getItem("app_force_mock") === "true"));

export let isMockMode = IS_DEV && Boolean(forceMock || !supabaseUrl || !supabaseKey);

export function enableMockMode(mockDivision?: AccesoDivision) {
  if (!IS_DEV) return;
  isMockMode = true;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("app_mock_signed_out");
    window.localStorage.setItem("app_force_mock", "true");
    if (mockDivision) {
      window.localStorage.setItem("app_mock_division", mockDivision);
    }
  }
}

export function disableMockMode() {
  isMockMode = IS_DEV && Boolean(!supabaseUrl || !supabaseKey);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("app_force_mock");
    window.localStorage.removeItem("app_mock_division");
  }
}

function assertSupabaseConfigured() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Falta configurar la conexión a Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).");
  }
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);

function normalizeAccesoDivision(
  rawDivision?: string | null,
  role?: "admin" | "operador" | "consulta"
): AccesoDivision {
  if (rawDivision === "bachillerato" || rawDivision === "licenciatura" || rawDivision === "ambas") {
    return rawDivision;
  }
  return role === "admin" ? "ambas" : "bachillerato";
}

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  role: "admin" | "operador" | "consulta";
  division?: AccesoDivision | null;
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
  division?: DivisionAcademica | null;
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
  folio_recibo?: string | null;
  ciclo_recibo?: string | null;
  numero_cuenta?: string | null;
  matricula?: string | null;
  curp?: string | null;
  tramite_id?: string;
  nombre?: string;
  alumno_nombre?: string;
  email?: string | null;
  alumno_email?: string | null;
  telefono?: string | null;
  telefono_alt?: string | null;
  telefono_alternativo?: string | null;
  tramite?: string;
  pago?: number;
  pago_mxn?: number;
  preparatoria_clave?: string;
  preparatoria_nombre?: string;
  modalidad?: ModalidadPrepa;
  carrera_codigo?: string | number | null;
  plan_estudio?: string | null;
  microfilm?: string | null;
  reviso_historial?: boolean | null;
  reviso_kardex?: boolean | null;
  turno?: Turno;
  tipo_certificado?: TipoCertificado;
  generacion?: string | null;
  recibio?: string | null;
  fecha_documentos_recibidos?: string | null;
  ingreso?: string | null;
  fecha_ingreso_sistema?: string | null;
  recibido?: string | null;
  fecha_recepcion_fisica?: string | null;
  envio?: string | null;
  fecha_envio?: string | null;
  reenvio?: boolean;
  carta_poder?: string | null;
  carta_porte?: string | null;
  localizacion?: string | null;
  observaciones?: string | null;
  estado: EstadoTramite;
  mes?: number;
  periodo_mes?: number;
  anio?: number;
  periodo_anio?: number;
  division?: DivisionAcademica | null;
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
    division: normalizeAccesoDivision(row.division, row.role),
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
    curp: "LOHJ050910HSLRRLA3",
    folioRecibo: "14495580",
    cicloRecibo: "2025-2026",
    preparatoriaClave: "8240",
    preparatoriaNombre: "Preparatoria Mazatlán",
    modalidad: "Escolarizada",
    carreraCodigo: 1,
    planEstudio: "18",
    microfilm: "824020210041",
    revisoHistorial: true,
    revisoKardex: true,
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
    estado: "aceptado",
    mes: MOCK_CURRENT_MONTH,
    anio: MOCK_CURRENT_YEAR,
    division: "bachillerato",
  },
  {
    id: "al-8210-002",
    numeroCuenta: "20210152",
    nombre: "SÁNCHEZ MORALES DANIELA",
    curp: "SAMD060408MSLLLNA7",
    folioRecibo: "15099342",
    cicloRecibo: "2025-2026",
    preparatoriaClave: "8210",
    preparatoriaNombre: "Preparatoria Concordia",
    modalidad: "Semiescolarizada",
    carreraCodigo: 2,
    planEstudio: "23",
    microfilm: "2182100086",
    revisoHistorial: true,
    revisoKardex: true,
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
    curp: "RATJ051206HSLSZGA2",
    folioRecibo: "15088153",
    cicloRecibo: "2025-2026",
    preparatoriaClave: "8260",
    preparatoriaNombre: "Preparatoria Rubén Jaramillo",
    modalidad: "Nocturno",
    carreraCodigo: 3,
    planEstudio: "14",
    microfilm: "2282600277",
    revisoHistorial: true,
    revisoKardex: true,
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
    curp: "GAVS060801MSLNLLA9",
    folioRecibo: "15104951",
    cicloRecibo: "2025-2026",
    preparatoriaClave: "8220",
    preparatoriaNombre: "Preparatoria El Rosario",
    modalidad: "Escolarizada",
    carreraCodigo: 1,
    planEstudio: "18",
    microfilm: "822020210415",
    revisoHistorial: true,
    revisoKardex: true,
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
    curp: "BEOC050710HSLRRSA6",
    folioRecibo: "15119313",
    cicloRecibo: "2025-2026",
    preparatoriaClave: "8230",
    preparatoriaNombre: "Preparatoria Escuinapa",
    modalidad: "Escolarizada",
    carreraCodigo: 1,
    planEstudio: "15",
    microfilm: "823020210567",
    revisoHistorial: true,
    revisoKardex: true,
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
    division: "bachillerato",
  },
  {
    id: "al-4800-001",
    numeroCuenta: "20194801",
    nombre: "MENDÍVIL CASTRO ALEJANDRA",
    curp: "MECA010315MSLRRLA9",
    folioRecibo: "15201044",
    cicloRecibo: "2025-2026",
    preparatoriaClave: "4800",
    preparatoriaNombre: "FAC. DE INFORMÁTICA MAZATLÁN",
    modalidad: "LICENCIATURA EN INFORMÁTICA",
    carreraCodigo: "",
    planEstudio: "20",
    microfilm: "480020194801",
    revisoHistorial: true,
    revisoKardex: true,
    turno: "Matutino",
    tipoCertificado: "Digital",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: 500,
    email: "alejandramendivil@uas.edu.mx",
    telefono: "6691457820",
    telefonoAlt: "",
    generacion: "2020-2025",
    recibio: fmtDate(11, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    ingreso: fmtDate(11, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    recibido: fmtDate(12, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    envio: "",
    reenvio: false,
    cartaPoder: "",
    cartaPorte: "",
    localizacion: "Mazatlán",
    observaciones: "Expediente completo de licenciatura.",
    estado: "recibido",
    mes: MOCK_CURRENT_MONTH,
    anio: MOCK_CURRENT_YEAR,
    division: "licenciatura",
  },
  {
    id: "al-4520-002",
    numeroCuenta: "20194522",
    nombre: "VALDEZ LIZÁRRAGA ROBERTO",
    curp: "VALR001122HSLVZRA4",
    folioRecibo: "15201899",
    cicloRecibo: "2025-2026",
    preparatoriaClave: "4520",
    preparatoriaNombre: "FAC. DE DERECHO MAZATLÁN",
    modalidad: "LICENCIATURA EN DERECHO",
    carreraCodigo: "",
    planEstudio: "18",
    microfilm: "452020194522",
    revisoHistorial: true,
    revisoKardex: true,
    turno: "Vespertino",
    tipoCertificado: "Físico",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: 500,
    email: "roberto.valdez@uas.edu.mx",
    telefono: "6691889021",
    telefonoAlt: "",
    generacion: "2020-2025",
    recibio: fmtDate(14, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    ingreso: fmtDate(14, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    recibido: "",
    envio: "",
    reenvio: false,
    cartaPoder: "",
    cartaPorte: "",
    localizacion: "Mazatlán",
    observaciones: "",
    estado: "pendiente",
    mes: MOCK_CURRENT_MONTH,
    anio: MOCK_CURRENT_YEAR,
    division: "licenciatura",
  },
  {
    id: "al-5820-003",
    numeroCuenta: "20195823",
    nombre: "OSUNA TIRADO MARÍA FERNANDA",
    curp: "OSTM010704MSLSNRA1",
    folioRecibo: "15202310",
    cicloRecibo: "2025-2026",
    preparatoriaClave: "5820",
    preparatoriaNombre: "FAC. DE ENFERMERÍA MAZATLÁN",
    modalidad: "LICENCIATURA EN ENFERMERÍA",
    carreraCodigo: "",
    planEstudio: "19",
    microfilm: "582020195823",
    revisoHistorial: true,
    revisoKardex: true,
    turno: "Matutino",
    tipoCertificado: "Digital",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: 500,
    email: "maria.osuna@uas.edu.mx",
    telefono: "6691904412",
    telefonoAlt: "",
    generacion: "2020-2025",
    recibio: fmtDate(16, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    ingreso: fmtDate(16, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    recibido: fmtDate(17, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    envio: fmtDate(18, MOCK_CURRENT_MONTH, MOCK_CURRENT_YEAR),
    reenvio: false,
    cartaPoder: "",
    cartaPorte: "",
    localizacion: "Culiacán",
    observaciones: "Enviado en corte URS.",
    estado: "enviado",
    mes: MOCK_CURRENT_MONTH,
    anio: MOCK_CURRENT_YEAR,
    division: "licenciatura",
  },
];

const LOCAL_STORAGE_KEY_ALUMNOS = "app-titulacion-prepa-alumnos";
const LOCAL_STORAGE_KEY_PREPAS = "app-titulacion-prepa-catalogos";
const LOCAL_STORAGE_KEY_PROFILES = "app-titulacion-mock-profiles";

const DEFAULT_MOCK_PROFILES: ManagedProfile[] = [
  {
    id: "mock-admin-01",
    email: "ventanilla.admin@uas.edu.mx",
    displayName: "Administrador General",
    role: "admin",
    division: "ambas",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mock-bach-01",
    email: "ventanilla.prepa@uas.edu.mx",
    displayName: "Encargado Bachillerato",
    role: "operador",
    division: "bachillerato",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mock-lic-01",
    email: "ventanilla.licenciatura@uas.edu.mx",
    displayName: "Encargada Licenciatura",
    role: "operador",
    division: "licenciatura",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function hydrateAlumnoRecord(a: Alumno): Alumno {
  const seed = DEFAULT_MOCK_ALUMNOS.find(s => s.id === a.id);
  const division = a.division ?? getDivisionFromClave(a.preparatoriaClave);
  const estadoValido: EstadoTramite =
    a.estado === "pendiente" ||
    a.estado === "recibido" ||
    a.estado === "enviado" ||
    a.estado === "aceptado" ||
    a.estado === "rechazado"
      ? a.estado
      : "aceptado";
  return {
    ...(seed ?? {}),
    ...a,
    estado: estadoValido,
    curp: a.curp ?? seed?.curp ?? "",
    folioRecibo: a.folioRecibo ?? seed?.folioRecibo ?? "",
    cicloRecibo:
      a.cicloRecibo ??
      seed?.cicloRecibo ??
      getCicloEscolarLabel(getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio)),
    microfilm: a.microfilm ?? seed?.microfilm ?? "",
    revisoHistorial: a.revisoHistorial ?? seed?.revisoHistorial ?? true,
    revisoKardex: a.revisoKardex ?? seed?.revisoKardex ?? true,
    division,
  };
}

function loadLocalAlumnos(): Alumno[] {
  if (typeof window === "undefined") return DEFAULT_MOCK_ALUMNOS;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY_ALUMNOS);
    if (!raw) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY_ALUMNOS, JSON.stringify(DEFAULT_MOCK_ALUMNOS));
      return DEFAULT_MOCK_ALUMNOS;
    }
    const parsed = (JSON.parse(raw) as Alumno[]).map(hydrateAlumnoRecord);
    const hasLic = parsed.some(a => (a.division ?? getDivisionFromClave(a.preparatoriaClave)) === "licenciatura");
    if (!hasLic) {
      const licSeeds = DEFAULT_MOCK_ALUMNOS.filter(a => a.division === "licenciatura");
      const merged = [...parsed, ...licSeeds];
      window.localStorage.setItem(LOCAL_STORAGE_KEY_ALUMNOS, JSON.stringify(merged));
      return merged;
    }
    return parsed;
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
  if (typeof window === "undefined") return UNIDADES_ACADEMICAS;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY_PREPAS);
    if (!raw) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY_PREPAS, JSON.stringify(UNIDADES_ACADEMICAS));
      return UNIDADES_ACADEMICAS;
    }
    const saved = (JSON.parse(raw) as Preparatoria[]).map(p => ({
      ...p,
      division: p.division ?? getDivisionFromClave(p.clave),
    }));
    const existingClaves = new Set(saved.map(p => p.clave));
    const missingUnits = UNIDADES_ACADEMICAS.filter(u => !existingClaves.has(u.clave));
    if (missingUnits.length > 0) {
      const merged = [...saved, ...missingUnits];
      window.localStorage.setItem(LOCAL_STORAGE_KEY_PREPAS, JSON.stringify(merged));
      return merged;
    }
    return saved;
  } catch {
    return UNIDADES_ACADEMICAS;
  }
}

function saveLocalPreparatorias(prepas: Preparatoria[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY_PREPAS, JSON.stringify(prepas));
  } catch {}
}

function loadLocalProfiles(): ManagedProfile[] {
  if (typeof window === "undefined") return DEFAULT_MOCK_PROFILES;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY_PROFILES);
    if (!raw) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_MOCK_PROFILES));
      return DEFAULT_MOCK_PROFILES;
    }
    const saved = (JSON.parse(raw) as ManagedProfile[]).map(p => ({
      ...p,
      division: normalizeAccesoDivision(p.division, p.role),
    }));
    return saved.length > 0 ? saved : DEFAULT_MOCK_PROFILES;
  } catch {
    return DEFAULT_MOCK_PROFILES;
  }
}

function saveLocalProfiles(profiles: ManagedProfile[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch {}
}

// --------------------------------------------------------------------------------
// Catalog API Functions
// --------------------------------------------------------------------------------

function ensureAllDivisionsInCatalog(prepas: Preparatoria[]): Preparatoria[] {
  const hasBach = prepas.some(p => (p.division ?? getDivisionFromClave(p.clave)) === "bachillerato");
  const hasLic = prepas.some(p => (p.division ?? getDivisionFromClave(p.clave)) === "licenciatura");
  let result = [...prepas];
  if (!hasBach) {
    result = [...result, ...PREPARATORIAS];
  }
  if (!hasLic) {
    result = [...result, ...FACULTADES_LICENCIATURA];
  }
  return result;
}

export async function fetchCatalogos(): Promise<Catalogos> {
  if (isMockMode) {
    const prepas = loadLocalPreparatorias().filter(p => p.activo !== false);
    return {
      preparatorias: prepas,
      tramites: [{ id: "certificado", nombre: "Certificado", activo: true }],
    };
  }

  assertSupabaseConfigured();

  let [prepasResult, tramitesResult] = await Promise.all([
    supabase.from("preparatorias").select("clave,nombre,modalidades,division,activo").eq("activo", true).order("clave"),
    supabase.from("tramites").select("id,nombre,activo").eq("activo", true).order("nombre"),
  ]);

  if (prepasResult.error && isMissingColumnError(prepasResult.error)) {
    prepasResult = await supabase
      .from("preparatorias")
      .select("clave,nombre,modalidades,activo")
      .eq("activo", true)
      .order("clave");
  }

  if (prepasResult.error) {
    if (IS_DEV) {
      console.warn("Error consultando unidades académicas de Supabase en dev, usando catálogo local:", prepasResult.error);
      return {
        preparatorias: loadLocalPreparatorias().filter(p => p.activo !== false),
        tramites: [{ id: "certificado", nombre: "Certificado", activo: true }],
      };
    }
    throw prepasResult.error;
  }

  const prepas: Preparatoria[] = (prepasResult.data ?? []).map((row: PreparatoriaRow) => {
    const division = row.division ?? getDivisionFromClave(row.clave);
    const defaultModalidades =
      division === "licenciatura"
        ? FACULTADES_LICENCIATURA.find(f => f.clave === row.clave)?.modalidades ?? []
        : (["Escolarizada"] as ModalidadPrepa[]);
    return {
      clave: row.clave,
      nombre: row.nombre,
      modalidades: (row.modalidades as ModalidadPrepa[])?.length
        ? (row.modalidades as ModalidadPrepa[])
        : defaultModalidades,
      division,
      activo: row.activo,
    };
  });

  const tramites: TramiteCatalogo[] = (tramitesResult.data ?? [{ id: "certificado", nombre: "Certificado", activo: true }]).map(
    (row: TramiteRow) => ({
      id: row.id,
      nombre: row.nombre,
      activo: row.activo,
    })
  );

  return {
    preparatorias: ensureAllDivisionsInCatalog(prepas),
    tramites,
  };
}

export async function fetchCatalogosAdmin(): Promise<Catalogos> {
  if (isMockMode) {
    return {
      preparatorias: loadLocalPreparatorias(),
      tramites: [{ id: "certificado", nombre: "Certificado", activo: true }],
    };
  }

  assertSupabaseConfigured();

  let [prepasResult, tramitesResult] = await Promise.all([
    supabase.from("preparatorias").select("clave,nombre,modalidades,division,activo").order("clave"),
    supabase.from("tramites").select("id,nombre,activo").order("nombre"),
  ]);

  if (prepasResult.error && isMissingColumnError(prepasResult.error)) {
    prepasResult = await supabase
      .from("preparatorias")
      .select("clave,nombre,modalidades,activo")
      .order("clave");
  }

  if (prepasResult.error) {
    if (IS_DEV) {
      return {
        preparatorias: loadLocalPreparatorias(),
        tramites: [{ id: "certificado", nombre: "Certificado", activo: true }],
      };
    }
    throw prepasResult.error;
  }

  const prepas: Preparatoria[] = (prepasResult.data ?? []).map((row: PreparatoriaRow) => {
    const division = row.division ?? getDivisionFromClave(row.clave);
    const defaultModalidades =
      division === "licenciatura"
        ? FACULTADES_LICENCIATURA.find(f => f.clave === row.clave)?.modalidades ?? []
        : (["Escolarizada"] as ModalidadPrepa[]);
    return {
      clave: row.clave,
      nombre: row.nombre,
      modalidades: (row.modalidades as ModalidadPrepa[])?.length
        ? (row.modalidades as ModalidadPrepa[])
        : defaultModalidades,
      division,
      activo: row.activo,
    };
  });

  const tramites: TramiteCatalogo[] = (tramitesResult.data ?? [{ id: "certificado", nombre: "Certificado", activo: true }]).map(
    (row: TramiteRow) => ({
      id: row.id,
      nombre: row.nombre,
      activo: row.activo,
    })
  );

  return {
    preparatorias: ensureAllDivisionsInCatalog(prepas),
    tramites,
  };
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
  const mes = Number(row.periodo_mes ?? row.mes ?? (new Date().getMonth() + 1));
  const anio = Number(row.periodo_anio ?? row.anio ?? new Date().getFullYear());
  const division = row.division ?? prepa?.division ?? getDivisionFromClave(row.preparatoria_clave);
  const modalidad =
    row.modalidad ||
    prepa?.modalidades?.[0] ||
    (division === "licenciatura" ? "" : "Escolarizada");
  return {
    id: row.id,
    numeroCuenta: row.numero_cuenta || row.matricula || "",
    nombre: row.alumno_nombre || row.nombre || "",
    curp: row.curp ?? "",
    folioRecibo: row.folio_recibo ?? row.folio ?? "",
    cicloRecibo: row.ciclo_recibo || getCicloEscolarLabel(getCicloEscolarAnioFinFromPeriodo(mes, anio)),
    preparatoriaClave: row.preparatoria_clave || "",
    preparatoriaNombre: row.preparatoria_nombre || prepa?.nombre || row.preparatoria_clave || "",
    modalidad,
    carreraCodigo: row.carrera_codigo ?? getDefaultCarreraCodigo(modalidad, division),
    planEstudio: row.plan_estudio ?? "18",
    microfilm: row.microfilm ?? "",
    revisoHistorial: row.reviso_historial ?? true,
    revisoKardex: row.reviso_kardex ?? true,
    turno: row.turno || "Matutino",
    tipoCertificado: row.tipo_certificado || "Físico",
    tramite: row.tramite || "Certificado",
    tramiteId: row.tramite_id || "certificado",
    pago: Number(row.pago_mxn ?? row.pago ?? 500),
    email: row.alumno_email ?? row.email ?? "",
    telefono: row.telefono ?? "",
    telefonoAlt: row.telefono_alternativo ?? row.telefono_alt ?? "",
    generacion: row.generacion ?? "",
    recibio: fromIsoDate(row.fecha_documentos_recibidos ?? row.recibio),
    ingreso: fromIsoDate(row.fecha_ingreso_sistema ?? row.ingreso),
    recibido: fromIsoDate(row.fecha_recepcion_fisica ?? row.recibido),
    envio: fromIsoDate(row.fecha_envio ?? row.envio),
    reenvio: Boolean(row.reenvio),
    cartaPoder: row.carta_poder ?? "",
    cartaPorte: row.carta_porte ?? "",
    localizacion: row.localizacion ?? "",
    observaciones: row.observaciones ?? "",
    estado: row.estado,
    mes,
    anio,
    division,
  };
}

function buildSolicitudBasePayload(alumno: Alumno): Record<string, unknown> {
  return {
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
}

function buildSolicitudExtendedPayload(alumno: Alumno): Record<string, unknown> {
  const division = alumno.division ?? getDivisionFromClave(alumno.preparatoriaClave);
  const rawCarrera =
    alumno.carreraCodigo !== undefined && String(alumno.carreraCodigo).trim() !== ""
      ? String(alumno.carreraCodigo).trim()
      : String(getDefaultCarreraCodigo(alumno.modalidad, division));
  return {
    ...buildSolicitudBasePayload(alumno),
    curp: alumno.curp?.trim().toUpperCase() || null,
    folio_recibo: alumno.folioRecibo?.trim() || null,
    ciclo_recibo: alumno.cicloRecibo?.trim() || null,
    carrera_codigo: rawCarrera || null,
    plan_estudio: alumno.planEstudio?.trim() || "18",
    microfilm: alumno.microfilm?.trim().toUpperCase() || null,
    reviso_historial: alumno.revisoHistorial ?? true,
    reviso_kardex: alumno.revisoKardex ?? true,
    division,
  };
}

function isMissingColumnError(error: SupabaseDbError | null): boolean {
  if (!error) return false;
  const msg = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return error.code === "42703" || error.code === "PGRST204" || msg.includes("column") || msg.includes("schema cache");
}

export async function fetchAlumnos(catalogos: Catalogos): Promise<Alumno[]> {
  if (isMockMode) {
    return loadLocalAlumnos();
  }

  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from("solicitudes_titulacion")
    .select("*")
    .order("periodo_anio", { ascending: false })
    .order("periodo_mes", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (IS_DEV) {
      console.warn("Error conectando a solicitudes de Supabase en dev, usando almacenamiento local:", error);
      return loadLocalAlumnos();
    }
    throw error;
  }

  return ((data ?? []) as SolicitudDetalleRow[]).map(row => mapSolicitud(row, catalogos));
}

export async function createAlumno(alumno: Alumno, catalogos: Catalogos): Promise<Alumno> {
  const division = alumno.division ?? getDivisionFromClave(alumno.preparatoriaClave);
  const normalizedAlumno: Alumno = { ...alumno, division };

  if (isMockMode) {
    const list = loadLocalAlumnos();
    const newAlumno: Alumno = {
      ...normalizedAlumno,
      id: `${division}-${Date.now()}`,
    };
    list.unshift(newAlumno);
    saveLocalAlumnos(list);
    return newAlumno;
  }

  assertSupabaseConfigured();

  let { data, error } = await supabase
    .from("solicitudes_titulacion")
    .insert(buildSolicitudExtendedPayload(normalizedAlumno))
    .select("id")
    .single<{ id: string }>();

  if (error && isMissingColumnError(error)) {
    const { division: _omitDivision, ...withoutDivision } = buildSolicitudExtendedPayload(normalizedAlumno);
    const retryExtended = await supabase
      .from("solicitudes_titulacion")
      .insert(withoutDivision)
      .select("id")
      .single<{ id: string }>();
    if (!retryExtended.error) {
      data = retryExtended.data;
      error = null;
    } else if (isMissingColumnError(retryExtended.error)) {
      const retryBase = await supabase
        .from("solicitudes_titulacion")
        .insert(buildSolicitudBasePayload(normalizedAlumno))
        .select("id")
        .single<{ id: string }>();
      data = retryBase.data;
      error = retryBase.error;
    } else {
      error = retryExtended.error;
    }
  }

  if (error) throw error;

  const next = await fetchAlumnos(catalogos);
  const created = next.find(item => item.id === data?.id);
  return created
    ? {
        ...normalizedAlumno,
        ...created,
        curp: created.curp || normalizedAlumno.curp,
        folioRecibo: created.folioRecibo || normalizedAlumno.folioRecibo,
        cicloRecibo: created.cicloRecibo || normalizedAlumno.cicloRecibo,
        carreraCodigo: created.carreraCodigo ?? normalizedAlumno.carreraCodigo,
        planEstudio: created.planEstudio || normalizedAlumno.planEstudio,
        microfilm: created.microfilm || normalizedAlumno.microfilm,
      }
    : normalizedAlumno;
}

export async function updateAlumno(alumno: Alumno, catalogos: Catalogos): Promise<Alumno> {
  const division = alumno.division ?? getDivisionFromClave(alumno.preparatoriaClave);
  const normalizedAlumno: Alumno = { ...alumno, division };

  if (isMockMode) {
    const list = loadLocalAlumnos();
    const index = list.findIndex(a => a.id === normalizedAlumno.id);
    if (index >= 0) {
      list[index] = { ...normalizedAlumno };
      saveLocalAlumnos(list);
    }
    return normalizedAlumno;
  }

  assertSupabaseConfigured();

  let { error } = await supabase
    .from("solicitudes_titulacion")
    .update(buildSolicitudExtendedPayload(normalizedAlumno))
    .eq("id", normalizedAlumno.id);

  if (error && isMissingColumnError(error)) {
    const { division: _omitDivision, ...withoutDivision } = buildSolicitudExtendedPayload(normalizedAlumno);
    const retryExtended = await supabase
      .from("solicitudes_titulacion")
      .update(withoutDivision)
      .eq("id", normalizedAlumno.id);
    if (!retryExtended.error) {
      error = null;
    } else if (isMissingColumnError(retryExtended.error)) {
      const retryBase = await supabase
        .from("solicitudes_titulacion")
        .update(buildSolicitudBasePayload(normalizedAlumno))
        .eq("id", normalizedAlumno.id);
      error = retryBase.error;
    } else {
      error = retryExtended.error;
    }
  }

  if (error) throw error;

  const next = await fetchAlumnos(catalogos);
  const updated = next.find(item => item.id === normalizedAlumno.id);
  return updated
    ? {
        ...normalizedAlumno,
        ...updated,
        curp: updated.curp || normalizedAlumno.curp,
        folioRecibo: updated.folioRecibo || normalizedAlumno.folioRecibo,
        cicloRecibo: updated.cicloRecibo || normalizedAlumno.cicloRecibo,
        carreraCodigo: updated.carreraCodigo ?? normalizedAlumno.carreraCodigo,
        planEstudio: updated.planEstudio || normalizedAlumno.planEstudio,
        microfilm: updated.microfilm || normalizedAlumno.microfilm,
      }
    : normalizedAlumno;
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

  assertSupabaseConfigured();

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

  assertSupabaseConfigured();

  const { error } = await supabase
    .from("solicitudes_titulacion")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// --------------------------------------------------------------------------------
// Preparatorias / Unidades Académicas Management CRUD
// --------------------------------------------------------------------------------

export async function createPreparatoria(prepa: Preparatoria) {
  const division = prepa.division ?? getDivisionFromClave(prepa.clave);
  if (isMockMode) {
    const prepas = loadLocalPreparatorias();
    if (prepas.some(p => p.clave === prepa.clave)) {
      throw new Error(`Ya existe una unidad académica con la clave ${prepa.clave}`);
    }
    prepas.push({ ...prepa, division, activo: prepa.activo ?? true });
    saveLocalPreparatorias(prepas);
    return;
  }

  assertSupabaseConfigured();

  let { error } = await supabase
    .from("preparatorias")
    .insert({
      clave: prepa.clave.trim(),
      nombre: prepa.nombre.trim(),
      modalidades: prepa.modalidades,
      division,
      activo: prepa.activo ?? true,
    });

  if (error && isMissingColumnError(error)) {
    const retry = await supabase
      .from("preparatorias")
      .insert({
        clave: prepa.clave.trim(),
        nombre: prepa.nombre.trim(),
        modalidades: prepa.modalidades,
        activo: prepa.activo ?? true,
      });
    error = retry.error;
  }

  if (error) throw error;
}

export async function updatePreparatoria(prepa: Preparatoria) {
  const division = prepa.division ?? getDivisionFromClave(prepa.clave);
  if (isMockMode) {
    const prepas = loadLocalPreparatorias();
    const index = prepas.findIndex(p => p.clave === prepa.clave);
    if (index >= 0) {
      prepas[index] = { ...prepa, division, activo: prepa.activo ?? true };
      saveLocalPreparatorias(prepas);
    }
    return;
  }

  assertSupabaseConfigured();

  let { error } = await supabase
    .from("preparatorias")
    .update({
      nombre: prepa.nombre.trim(),
      modalidades: prepa.modalidades,
      division,
      activo: prepa.activo ?? true,
    })
    .eq("clave", prepa.clave);

  if (error && isMissingColumnError(error)) {
    const retry = await supabase
      .from("preparatorias")
      .update({
        nombre: prepa.nombre.trim(),
        modalidades: prepa.modalidades,
        activo: prepa.activo ?? true,
      })
      .eq("clave", prepa.clave);
    error = retry.error;
  }

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
  assertSupabaseConfigured();
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
  assertSupabaseConfigured();
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
  assertSupabaseConfigured();
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
  const forceMockActive =
    IS_DEV &&
    isMockMode &&
    ((typeof window !== "undefined" && window.localStorage.getItem("app_force_mock") === "true") ||
      !supabaseUrl ||
      !supabaseKey);

  if (forceMockActive) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("app_mock_signed_out");
      window.localStorage.setItem("app_mock_email", email.trim().toLowerCase());
    }
    return;
  }

  disableMockMode();
  assertSupabaseConfigured();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function requestPasswordRecovery(email: string) {
  if (isMockMode) return;
  assertSupabaseConfigured();
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
  assertSupabaseConfigured();
  const { token, tokenHash } = getRecoveryToken(recoveryInput);
  if (!token && !tokenHash) throw new Error("El código o enlace de recuperación no es válido.");

  const { error: verificationError } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
    : await supabase.auth.verifyOtp({ email, token: token!, type: "recovery" });
  if (verificationError) throw verificationError;
}

export async function updatePasswordFromRecovery(password: string) {
  if (isMockMode) return;
  assertSupabaseConfigured();
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  } finally {
    await supabase.auth.signOut();
  }
}

export async function signOutAdmin() {
  if (isMockMode) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("app_mock_signed_out", "true");
      window.localStorage.removeItem("app_mock_email");
    }
    disableMockMode();
    return;
  }
  assertSupabaseConfigured();
  await supabase.auth.signOut();
}

export async function getCurrentAccount(): Promise<Account | null> {
  if (IS_DEV && isMockMode) {
    if (typeof window !== "undefined" && window.localStorage.getItem("app_mock_signed_out") === "true") {
      return null;
    }

    const profiles = loadLocalProfiles();
    const mockEmail = typeof window !== "undefined" ? window.localStorage.getItem("app_mock_email") : null;
    const mockDivision = typeof window !== "undefined"
      ? (window.localStorage.getItem("app_mock_division") as AccesoDivision | null)
      : null;

    const matched =
      (mockEmail ? profiles.find(p => p.email.toLowerCase() === mockEmail.toLowerCase()) : undefined) ??
      (mockDivision ? profiles.find(p => p.division === mockDivision) : undefined) ??
      profiles[0] ??
      DEFAULT_MOCK_PROFILES[0];

    if (!matched.active) {
      throw new Error("La cuenta está desactivada.");
    }

    return {
      id: matched.id,
      displayName: matched.displayName,
      email: matched.email,
      password: "",
      role: matched.role,
      division: normalizeAccesoDivision(matched.division, matched.role),
    };
  }

  if (!supabaseUrl || !supabaseKey) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  let { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,role,division,active")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("profiles")
      .select("id,email,display_name,role,active")
      .eq("id", user.id)
      .single<ProfileRow>();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) throw error ?? new Error("No se encontró el perfil del usuario.");
  if (!data.active) throw new Error("La cuenta está desactivada.");

  return {
    id: data.id,
    displayName: data.display_name,
    email: data.email ?? user.email ?? "",
    password: "",
    role: data.role,
    division: normalizeAccesoDivision(data.division, data.role),
  };
}

export async function updateCurrentAccount(account: Account) {
  if (isMockMode) {
    const profiles = loadLocalProfiles();
    const next = profiles.map(p =>
      p.id === account.id ? { ...p, displayName: account.displayName.trim(), updatedAt: new Date().toISOString() } : p
    );
    saveLocalProfiles(next);
    return;
  }

  assertSupabaseConfigured();
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
    return loadLocalProfiles();
  }

  assertSupabaseConfigured();

  let { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,role,division,active,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("profiles")
      .select("id,email,display_name,role,active,created_at,updated_at")
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return ((data ?? []) as ProfileAdminRow[]).map(mapManagedProfile);
}

export async function createManagedUser(input: {
  email: string;
  displayName: string;
  role: ManagedRole;
  division?: AccesoDivision;
}): Promise<ManagedProfile> {
  const role: ManagedRole = input.role === "admin" ? "admin" : "operador";
  const division = normalizeAccesoDivision(input.division, role);
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.displayName.trim();

  if (isMockMode) {
    const profiles = loadLocalProfiles();
    if (profiles.some(p => p.email.toLowerCase() === cleanEmail)) {
      throw new Error("Ya existe un usuario con ese correo electrónico.");
    }
    const now = new Date().toISOString();
    const created: ManagedProfile = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      displayName: cleanName,
      role,
      division,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    saveLocalProfiles([created, ...profiles]);
    return created;
  }

  assertSupabaseConfigured();

  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: {
      email: cleanEmail,
      displayName: cleanName,
      role,
      division,
    },
  });

  if (error) throw error;
  if (!data?.profile) throw new Error("El usuario se creó, pero la función no regresó el perfil.");

  const createdRow = data.profile as ProfileAdminRow;
  if (createdRow.division !== division) {
    const { data: updatedRow, error: divisionError } = await supabase
      .from("profiles")
      .update({ division })
      .eq("id", createdRow.id)
      .select("id,email,display_name,role,division,active,created_at,updated_at")
      .single<ProfileAdminRow>();

    if (!divisionError && updatedRow) {
      return mapManagedProfile(updatedRow);
    }

    if (divisionError && isMissingColumnError(divisionError) && division === "licenciatura") {
      throw new Error(
        "El usuario se creó, pero falta ejecutar la migración SQL (20261029_division_licenciatura_usuarios.sql) para guardar la división Licenciatura."
      );
    }
  }

  return mapManagedProfile({ ...createdRow, division });
}

export async function deleteManagedUser(userId: string) {
  if (isMockMode) {
    const profiles = loadLocalProfiles().filter(p => p.id !== userId);
    saveLocalProfiles(profiles);
    return;
  }

  assertSupabaseConfigured();
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { userId },
  });

  if (error) throw error;
  if (!data?.userId) throw new Error("La función no confirmó la eliminación del usuario.");
}

export async function updateProfileRoleActive(
  id: string,
  changes: { displayName?: string; role?: ManagedRole; division?: AccesoDivision; active?: boolean }
): Promise<ManagedProfile> {
  if (isMockMode) {
    const profiles = loadLocalProfiles();
    const existing = profiles.find(p => p.id === id);
    const nextRole = changes.role ?? existing?.role ?? "operador";
    const updated: ManagedProfile = {
      id,
      email: existing?.email ?? "ventanilla.prepa@uas.edu.mx",
      displayName: changes.displayName?.trim() || existing?.displayName || "Usuario Ventanilla",
      role: nextRole,
      division: changes.division ?? existing?.division ?? normalizeAccesoDivision(undefined, nextRole),
      active: changes.active ?? existing?.active ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextList = existing
      ? profiles.map(p => (p.id === id ? updated : p))
      : [updated, ...profiles];
    saveLocalProfiles(nextList);
    return updated;
  }

  assertSupabaseConfigured();

  const payload: Record<string, string | boolean> = {};
  if (changes.displayName !== undefined) payload.display_name = changes.displayName.trim();
  if (changes.role !== undefined) payload.role = changes.role;
  if (changes.division !== undefined) payload.division = changes.division;
  if (changes.active !== undefined) payload.active = changes.active;

  let { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select("id,email,display_name,role,division,active,created_at,updated_at")
    .single<ProfileAdminRow>();

  if (error && isMissingColumnError(error)) {
    if (changes.division !== undefined) {
      throw new Error(
        "Falta la columna 'division' en public.profiles. Ejecuta el script SQL 20261029_division_licenciatura_usuarios.sql en Supabase."
      );
    }
    const fallback = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", id)
      .select("id,email,display_name,role,active,created_at,updated_at")
      .single<ProfileAdminRow>();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) throw error ?? new Error("No se pudo actualizar el perfil.");
  return mapManagedProfile(data);
}

export function buildCycleSummaries(alumnos: Alumno[]): CycleSummary[] {
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

export async function fetchCycleSummaries(): Promise<CycleSummary[]> {
  const alumnos = isMockMode ? loadLocalAlumnos() : await fetchAlumnos(await fetchCatalogos());
  return buildCycleSummaries(alumnos);
}

export async function deletePreviousCycle(
  cicloAnioFin: number,
  division?: DivisionAcademica
): Promise<number> {
  const currentCycle = getCicloEscolarAnioFin();
  if (cicloAnioFin >= currentCycle) {
    throw new Error("El ciclo actual está protegido y no se puede borrar desde mantenimiento.");
  }

  if (isMockMode) {
    const list = loadLocalAlumnos();
    const filtered = list.filter(a => {
      const sameCycle = getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio) === cicloAnioFin;
      if (!sameCycle) return true;
      if (!division) return false;
      const itemDivision = a.division ?? getDivisionFromClave(a.preparatoriaClave);
      return itemDivision !== division;
    });
    const deleted = list.length - filtered.length;
    saveLocalAlumnos(filtered);
    return deleted;
  }

  assertSupabaseConfigured();

  const previousYear = cicloAnioFin - 1;

  const runHalfDelete = async (anio: number, mesMin: number, mesMax: number) => {
    let query = supabase
      .from("solicitudes_titulacion")
      .delete()
      .eq("periodo_anio", anio)
      .gte("periodo_mes", mesMin)
      .lte("periodo_mes", mesMax);

    if (division) {
      query = query.eq("division", division);
    }

    let result = await query.select("id");
    if (result.error && division && isMissingColumnError(result.error)) {
      let fallbackQuery = supabase
        .from("solicitudes_titulacion")
        .delete()
        .eq("periodo_anio", anio)
        .gte("periodo_mes", mesMin)
        .lte("periodo_mes", mesMax);
      fallbackQuery =
        division === "bachillerato"
          ? fallbackQuery.like("preparatoria_clave", "82%")
          : fallbackQuery.not("preparatoria_clave", "like", "82%");
      result = await fallbackQuery.select("id");
    }

    if (result.error) throw result.error;
    return result.data?.length ?? 0;
  };

  const firstCount = await runHalfDelete(previousYear, 8, 12);
  const secondCount = await runHalfDelete(cicloAnioFin, 1, 7);

  return firstCount + secondCount;
}
