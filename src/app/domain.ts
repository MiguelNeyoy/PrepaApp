import type * as ExcelJSTypes from "exceljs";
import { saveCsvFile } from "../platform/saveCsv";
import { saveXlsxFile } from "../platform/saveXlsx";
import tramiteTituloTemplateUrl from "../../FORMATO TRAMITE TITULO.xlsx?url";
import formatoControlSolicitudesTemplateUrl from "../../FormatoControlSolicitudes.xlsx?url";
import reporteProductividadTemplateUrl from "../../FORMATO REPORTE DE PRODUCTIVIDAD DE TITULO PROFESIONAL.xlsx?url";

// -- Types ----------------------------------------------------------------------

export type NivelEstudio = string;

export type Turno = "Matutino" | "Vespertino" | "Nocturno" | "Mixto";
export type EstadoTramite = "pendiente" | "recibido" | "enviado" | "aceptado" | "rechazado";
export type AdminTab = "alumnos" | "metricas" | "catalogos" | "usuarios" | "mantenimiento";
export type ThemeMode = "light" | "dark";

export interface Account {
  id?: string;
  displayName: string;
  email: string;
  password: string;
  role?: "admin" | "operador" | "consulta";
}

export type ManagedRole = "admin" | "operador" | "consulta";

export interface ManagedProfile {
  id: string;
  email: string;
  displayName: string;
  role: ManagedRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CycleSummary {
  cicloAnioFin: number;
  label: string;
  isCurrent: boolean;
  total: number;
  pendiente: number;
  recibido: number;
  enviado: number;
  aceptado: number;
  rechazado: number;
}

export interface Alumno {
  id: string;
  carreraId?: string;
  nivelId?: string;
  tramiteId?: string;
  matricula: string;
  nombre: string;
  carrera: string;
  nivel: NivelEstudio;
  turno: Turno;
  pago: number;        // kept for financial metrics, not shown in form/table
  email: string;
  telefono: string;
  telefonoAlt: string;
  escuela: string;
  tramite: string;     // folio number e.g. "T-24-0001"
  prepaUAS: boolean;   // attended UAS preparatoria
  prepa: string;       // preparatoria certificate number
  lic: string;         // cédula / licenciatura certificate number
  recibio: string;     // date documents were received
  ingreso: string;     // date entered into system
  recibido: string;    // date physical documentation was received
  envio: string;       // date documents were sent (may be empty)
  reenvio: boolean;    // true if tramite was returned and resent
  cartaPoder: string;  // power of attorney doc reference (may be empty)
  cartaPorte: string;
  localizacion: string;
  observaciones: string;
  estado: EstadoTramite;
  mes: number;
  anio: number;
}

export type AlumnoBulkChanges = Partial<Pick<
  Alumno,
  | "estado"
  | "recibio"
  | "recibido"
  | "envio"
  | "reenvio"
  | "localizacion"
  | "observaciones"
>>;

export interface CarreraCatalogo {
  id: string;
  facultadCodigo: string;
  nivelId: string;
  nombre: string;
  activo: boolean;
}

export interface NivelCatalogo {
  id: string;
  nombre: NivelEstudio;
  abreviatura: string;
  pago: number;
  colorHex: string;
  orden: number;
  activo: boolean;
}

export interface TramiteCatalogo {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Catalogos {
  niveles: NivelCatalogo[];
  facultades: Facultad[];
  carreras: CarreraCatalogo[];
  tramites: TramiteCatalogo[];
}

// -- Constants ------------------------------------------------------------------

export const NIVELES: NivelEstudio[] = [
  "Técnico",
  "Subprofesional",
  "Técnico Superior Universitario",
  "Licenciatura",
  "Maestría",
  "Doctorado",
  "Otras Zonas Licenciatura",
  "Otras Zonas Posgrado",
];

export const NIVEL_PAGO: Record<NivelEstudio, number> = {
  "Técnico": 1500,
  "Subprofesional": 1500,
  "Técnico Superior Universitario": 2000,
  "Licenciatura": 3000,
  "Maestría": 3500,
  "Doctorado": 4000,
  "Otras Zonas Licenciatura": 3000,
  "Otras Zonas Posgrado": 3500,
};

export const NIVEL_ABREV: Record<NivelEstudio, string> = {
  "Licenciatura": "Lic.",
  "Maestría": "Maest.",
  "Doctorado": "Doc.",
  "Técnico": "Téc.",
  "Subprofesional": "Sub.",
  "Técnico Superior Universitario": "TSU",
  "Otras Zonas Licenciatura": "OZL",
  "Otras Zonas Posgrado": "OZP",
};

export const NIVEL_COLOR: Record<NivelEstudio, string> = {
  "Licenciatura": "#3b82f6",
  "Maestría": "#8b5cf6",
  "Doctorado": "#10b981",
  "Técnico": "#f59e0b",
  "Subprofesional": "#fb923c",
  "Técnico Superior Universitario": "#06b6d4",
  "Otras Zonas Licenciatura": "#6366f1",
  "Otras Zonas Posgrado": "#ec4899",
};

export interface Facultad {
  codigo: string;
  nombre: string;
  carreras: string[];
  activo?: boolean;
}

export const FACULTADES: Facultad[] = [
  {
    codigo: "4510",
    nombre: "Facultad de Ciencias Económicas y Sociales",
    carreras: ["Economía", "Sociología", "Trabajo Social", "Comunicación", "Pedagogía"],
  },
  {
    codigo: "4520",
    nombre: "Facultad de Contaduría y Administración",
    carreras: ["Contaduría Pública", "Administración de Empresas", "Mercadotecnia", "Informática Administrativa", "Ingeniería en Gestión Empresarial"],
  },
  {
    codigo: "4530",
    nombre: "Facultad de Psicología",
    carreras: ["Psicología"],
  },
  {
    codigo: "4560",
    nombre: "Facultad de Enfermería Culiacán",
    carreras: ["Enfermería", "Nutrición"],
  },
  {
    codigo: "4610",
    nombre: "Facultad de Medicina Veterinaria y Zootecnia",
    carreras: ["Medicina Veterinaria y Zootecnia"],
  },
  {
    codigo: "4700",
    nombre: "Facultad de Derecho Culiacán",
    carreras: ["Derecho"],
  },
  {
    codigo: "4800",
    nombre: "Facultad de Ingeniería",
    carreras: ["Ingeniería Civil", "Ingeniería Industrial", "Ingeniería en Sistemas Computacionales", "Arquitectura"],
  },
  {
    codigo: "5810",
    nombre: "Facultad de Contaduría y Administración Mazatlán",
    carreras: ["Contaduría Pública", "Administración de Empresas", "Turismo", "Mercadotecnia"],
  },
  {
    codigo: "5820",
    nombre: "Facultad de Ingeniería Mazatlán",
    carreras: ["Ingeniería Civil", "Ingeniería Industrial", "Ingeniería en Sistemas Computacionales"],
  },
];

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const MESES_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export const CICLO_MESES = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7];

export function getCicloEscolarAnioFin(date = new Date()) {
  const mes = date.getMonth() + 1;
  return mes >= 8 ? date.getFullYear() + 1 : date.getFullYear();
}

export function getCicloEscolarAnioFinFromPeriodo(mes: number, anio: number) {
  return mes >= 8 ? anio + 1 : anio;
}

export function getPeriodoAnioForCiclo(mes: number, cicloAnioFin: number) {
  return mes >= 8 ? cicloAnioFin - 1 : cicloAnioFin;
}

export function getCicloEscolarLabel(cicloAnioFin: number) {
  return `${cicloAnioFin - 1}-${cicloAnioFin}`;
}

// -- Utilities ------------------------------------------------------------------

export function cleanStr(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export const MESES_ABR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export function fmtDate(day: number, mes: number, anio: number): string {
  return `${String(day).padStart(2, "0")}/${MESES_ABR[mes - 1]}/${anio}`;
}

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", minimumFractionDigits: 0,
  }).format(n);
}

export async function exportMetricsToCSV(
  rows: { nivel: NivelEstudio; total: number; ingreso: number }[],
  totalCount: number,
  totalIncome: number,
  label: string
) {
  const headers = ["Nivel", "Cantidad", "Ingreso (MXN)", "% del Total"];
  const dataRows = rows.map(r => {
    const pct = totalIncome > 0 ? ((r.ingreso / totalIncome) * 100).toFixed(1) : "0.0";
    return [r.nivel, r.total, r.ingreso, `${pct}%`];
  });
  const totalPct = "100.0%";
  const totalRow = ["TOTAL", totalCount, totalIncome, totalPct];
  const csv = [headers, ...dataRows, totalRow]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  await saveCsvFile(`reporte_ingresos_${label}.csv`, csv);
}

export async function exportToCSV(alumnos: Alumno[], mes: number, anio: number) {
  const headers = [
    "No.", "Nombre del Egresado", "Carrera", "Nivel", "Facultad",
    "Trámite", "Prepa UAS", "Prepa", "Lic", "Teléfono", "Tel. Alternativo", "E-Mail",
    "Ingreso", "Recibido", "Envío", "Reenvío", "Carta Poder",
  ];
  const rows = alumnos.map((a, i) => [
    i + 1, a.nombre, a.carrera, a.nivel, a.escuela,
    a.tramite, a.prepaUAS ? "Sí" : "No", a.prepa, a.lic,
    a.telefono, a.telefonoAlt, a.email,
    a.ingreso, a.recibido, a.envio, a.reenvio ? "Sí" : "No", a.cartaPoder,
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  await saveCsvFile(`titulacion_${MESES[mes - 1]}_${anio}.csv`, csv);
}

type ExcelCellStyle = Partial<ExcelJSTypes.Style>;

type ExcelRowTemplate = {
  height?: number;
  styles: ExcelCellStyle[];
};

const FORMATO_FIRST_DATA_ROW = 3;
const FORMATO_LAST_COLUMN = 18;
const CONTROL_SOLICITUDES_FIRST_DATA_ROW = 7;
const CONTROL_SOLICITUDES_ROWS_PER_PAGE = 20;
const ESTADO_STYLE_ROWS: Partial<Record<EstadoTramite, number>> = {
  enviado: 3,
  aceptado: 4,
  pendiente: 5,
  recibido: 6,
  rechazado: 7,
};

const ESTADO_FILLS: Record<EstadoTramite, ExcelJSTypes.Fill> = {
  pendiente: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } },
  recibido: { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDD6FE" } },
  enviado: { type: "pattern", pattern: "solid", fgColor: { argb: "FFBAE6FD" } },
  aceptado: { type: "pattern", pattern: "solid", fgColor: { argb: "FFBBF7D0" } },
  rechazado: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFED7AA" } },
};

function cloneExcelValue<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function captureRowTemplate(sheet: ExcelJSTypes.Worksheet, rowNumber: number): ExcelRowTemplate {
  const row = sheet.getRow(rowNumber);
  return {
    height: row.height,
    styles: Array.from({ length: FORMATO_LAST_COLUMN }, (_, index) =>
      cloneExcelValue(sheet.getCell(rowNumber, index + 1).style)
    ),
  };
}

function applyRowTemplate(row: ExcelJSTypes.Row, template: ExcelRowTemplate) {
  row.height = template.height;
  for (let col = 1; col <= FORMATO_LAST_COLUMN; col++) {
    row.getCell(col).style = cloneExcelValue(template.styles[col - 1] ?? {});
  }
}

function sameFill(a?: ExcelJSTypes.Fill, b?: ExcelJSTypes.Fill) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function hasVisibleFill(fill?: ExcelJSTypes.Fill) {
  if (!fill || fill.type !== "pattern" || fill.pattern === "none") return false;
  const fgColor = fill.fgColor;
  if (!fgColor) return true;
  if ("theme" in fgColor && fgColor.theme === 0 && !fgColor.tint) return false;
  if ("rgb" in fgColor && (fgColor.rgb === "FFFFFFFF" || fgColor.rgb === "00FFFFFF")) return false;
  if ("argb" in fgColor && fgColor.argb === "FFFFFFFF") return false;
  return true;
}

function collectMonthFills(sheet: ExcelJSTypes.Worksheet): ExcelJSTypes.Fill[] {
  const fills: ExcelJSTypes.Fill[] = [];

  for (let row = FORMATO_FIRST_DATA_ROW; row <= 7; row++) {
    for (let col = 1; col <= 4; col++) {
      const fill = sheet.getCell(row, col).fill;
      if (!hasVisibleFill(fill)) continue;
      if (!fills.some(existing => sameFill(existing, fill))) fills.push(cloneExcelValue(fill));
    }
  }

  if (fills.length > 0) return fills;

  return [
    { type: "pattern", pattern: "solid", fgColor: { theme: 9, tint: 0.7999816888943144 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 8, tint: 0.5999938962981048 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 6, tint: -0.249977111117893 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 7, tint: 0.5999938962981048 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 9, tint: 0.3999755851924192 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 5, tint: 0.7999816888943144 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 7, tint: 0.7999816888943144 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 4, tint: 0.7999816888943144 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 2, tint: -0.0999786370433668 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 5, tint: 0.5999938962981048 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 9, tint: 0.5999938962981048 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 3, tint: 0.3999755851924192 }, bgColor: { indexed: 64 } },
    { type: "pattern", pattern: "solid", fgColor: { theme: 5, tint: 0.3999755851924192 }, bgColor: { indexed: 64 } },
  ] as ExcelJSTypes.Fill[];
}

function withFallbackFill(style: ExcelCellStyle, fill: ExcelJSTypes.Fill): ExcelCellStyle {
  return {
    ...style,
    fill: hasVisibleFill(style.fill) ? style.fill : cloneExcelValue(fill),
  };
}

function normalizeToken(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatAppDateForExcel(value: string): string {
  const match = value.trim().match(/^(\d{1,2})\/([A-Za-zÁÉÍÓÚáéíóúÑñ]{3})\/(\d{4})$/);
  if (!match) return value;

  const month = MESES_ABR.findIndex(mes => normalizeToken(mes) === normalizeToken(match[2]));
  if (month < 0) return value;

  return `${match[1].padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${match[3]}`;
}

function formatNivelForExcel(nivel: NivelEstudio) {
  const normalized = normalizeToken(nivel);
  if (normalized.includes("doctor")) return "DOCTORADO";
  if (normalized.includes("maestr")) return "MAESTRIA";
  if (normalized.includes("superior")) return "TSU";
  if (normalized.includes("tecnico")) return "TECNICO";
  if (normalized.includes("subprof")) return "SUBPROF";
  if (normalized.includes("posgrado")) return "POSGRADO";
  if (normalized.includes("licenciatura")) return "LIC";
  return nivel.toUpperCase();
}

function formatEstadoForExcel(estado: EstadoTramite) {
  if (estado === "recibido") return "Recibido";
  if (estado === "enviado") return "Enviado";
  if (estado === "aceptado") return "Aceptado";
  if (estado === "rechazado") return "Rechazado";
  return "Pendiente";
}

function setPhoneValue(cell: ExcelJSTypes.Cell, principal: string, secundario: string) {
  const main = principal.trim();
  const alt = secundario.trim();
  if (!main || !alt) {
    cell.value = main || alt;
    return;
  }

  const baseFont = cloneExcelValue(cell.font ?? {});
  cell.value = {
    richText: [
      { text: main, font: { ...baseFont, color: { argb: "FF0563C1" } } },
      { text: "/", font: baseFont },
      { text: alt, font: baseFont },
    ],
  };
}

function applyMonthFill(row: ExcelJSTypes.Row, fill: ExcelJSTypes.Fill) {
  for (let col = 1; col <= 4; col++) {
    row.getCell(col).fill = cloneExcelValue(fill);
  }
}

function getMonthFill(fills: ExcelJSTypes.Fill[], mes: number) {
  const cycleIndex = CICLO_MESES.indexOf(mes);
  const fallbackIndex = Math.max(1, mes) - 1;
  return fills[(cycleIndex >= 0 ? cycleIndex : fallbackIndex) % fills.length];
}

function applyCellStyle(cell: ExcelJSTypes.Cell, style?: ExcelCellStyle) {
  if (!style) return;

  const nextStyle = cloneExcelValue(style);
  cell.style = nextStyle;

  if (nextStyle.fill) cell.fill = cloneExcelValue(nextStyle.fill);
  if (nextStyle.font) cell.font = cloneExcelValue(nextStyle.font);
  if (nextStyle.border) cell.border = cloneExcelValue(nextStyle.border);
  if (nextStyle.alignment) cell.alignment = cloneExcelValue(nextStyle.alignment);
  if (nextStyle.numFmt) cell.numFmt = nextStyle.numFmt;
  if (nextStyle.protection) cell.protection = cloneExcelValue(nextStyle.protection);
}

function copyImageRange(range: unknown) {
  const sourceRange = range as {
    tl: { col: number; row: number };
    br?: { col: number; row: number };
    ext?: { width: number; height: number };
    editAs?: string;
    hyperlinks?: unknown;
  };

  return {
    tl: { col: sourceRange.tl.col, row: sourceRange.tl.row },
    ...(sourceRange.br ? { br: { col: sourceRange.br.col, row: sourceRange.br.row } } : {}),
    ...(sourceRange.ext ? { ext: cloneExcelValue(sourceRange.ext) } : {}),
    ...(sourceRange.editAs ? { editAs: sourceRange.editAs } : {}),
    ...(sourceRange.hyperlinks ? { hyperlinks: cloneExcelValue(sourceRange.hyperlinks) } : {}),
  };
}

function copyWorksheetTemplate(
  workbook: ExcelJSTypes.Workbook,
  source: ExcelJSTypes.Worksheet,
  name: string
) {
  const target = workbook.addWorksheet(name);
  target.properties = cloneExcelValue(source.properties);
  target.pageSetup = cloneExcelValue(source.pageSetup);
  target.headerFooter = cloneExcelValue(source.headerFooter);
  target.views = cloneExcelValue(source.views);
  target.state = source.state;

  source.columns.forEach((sourceColumn, index) => {
    const targetColumn = target.getColumn(index + 1);
    targetColumn.width = sourceColumn.width;
    targetColumn.hidden = sourceColumn.hidden;
    targetColumn.outlineLevel = sourceColumn.outlineLevel;
    targetColumn.style = cloneExcelValue(sourceColumn.style);
  });

  for (let rowNumber = 1; rowNumber <= source.rowCount; rowNumber++) {
    const sourceRow = source.getRow(rowNumber);
    const targetRow = target.getRow(rowNumber);
    targetRow.height = sourceRow.height;
    targetRow.hidden = sourceRow.hidden;
    targetRow.outlineLevel = sourceRow.outlineLevel;
    targetRow.style = cloneExcelValue(sourceRow.style);

    for (let colNumber = 1; colNumber <= source.columnCount; colNumber++) {
      const sourceCell = sourceRow.getCell(colNumber);
      const targetCell = targetRow.getCell(colNumber);
      targetCell.value = cloneExcelValue(sourceCell.value);
      targetCell.style = cloneExcelValue(sourceCell.style);
    }
  }

  source.model.merges.forEach(range => target.mergeCells(range));
  source.getImages().forEach(image => {
    target.addImage(image.imageId, copyImageRange(image.range) as Parameters<ExcelJSTypes.Worksheet["addImage"]>[1]);
  });

  return target;
}

function formatSpanishLongDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

function formatDateForFilename(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function clearFormatoControlRow(sheet: ExcelJSTypes.Worksheet, rowNumber: number) {
  for (let col = 2; col <= 6; col++) {
    sheet.getRow(rowNumber).getCell(col).value = null;
  }
}

function fillFormatoControlSheet(
  sheet: ExcelJSTypes.Worksheet,
  alumnos: Alumno[],
  pageIndex: number,
  totalPages: number,
  emissionDate: string
) {
  sheet.getCell("G5").value = null;
  sheet.getCell("B32").value = emissionDate;
  sheet.getCell("G31").value = `Página ${pageIndex + 1} de ${totalPages}`;

  for (let offset = 0; offset < CONTROL_SOLICITUDES_ROWS_PER_PAGE; offset++) {
    const rowNumber = CONTROL_SOLICITUDES_FIRST_DATA_ROW + offset;
    const alumno = alumnos[offset];

    clearFormatoControlRow(sheet, rowNumber);
    if (!alumno) continue;

    const row = sheet.getRow(rowNumber);
    row.getCell(2).value = pageIndex * CONTROL_SOLICITUDES_ROWS_PER_PAGE + offset + 1;
    row.getCell(3).value = alumno.nombre.trim().toUpperCase();
    row.getCell(4).value = alumno.carrera.trim().toUpperCase();
    row.getCell(5).value = formatNivelForExcel(alumno.nivel);
    row.getCell(6).value = "T.TITULO";
  }
}

export async function exportFormatoControlSolicitudesXlsx(alumnos: Alumno[]) {
  const ExcelJS = (await import("exceljs")).default;
  const response = await fetch(formatoControlSolicitudesTemplateUrl);
  if (!response.ok) throw new Error("No se pudo cargar la plantilla de control de solicitudes.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());

  const templateSheet = workbook.worksheets[0];
  if (!templateSheet) throw new Error("La plantilla de control no contiene una hoja válida.");

  const ordered = [...alumnos];
  const totalPages = Math.max(1, Math.ceil(ordered.length / CONTROL_SOLICITUDES_ROWS_PER_PAGE));
  const sheets = [templateSheet];

  templateSheet.name = "Página 1";
  for (let pageIndex = 1; pageIndex < totalPages; pageIndex++) {
    sheets.push(copyWorksheetTemplate(workbook, templateSheet, `Página ${pageIndex + 1}`));
  }

  const generatedAt = new Date();
  const emissionDate = formatSpanishLongDate(generatedAt);

  sheets.forEach((sheet, pageIndex) => {
    const start = pageIndex * CONTROL_SOLICITUDES_ROWS_PER_PAGE;
    const pageAlumnos = ordered.slice(start, start + CONTROL_SOLICITUDES_ROWS_PER_PAGE);
    fillFormatoControlSheet(sheet, pageAlumnos, pageIndex, totalPages, emissionDate);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  await saveXlsxFile(
    `formato_control_solicitudes_${formatDateForFilename(generatedAt)}.xlsx`,
    new Uint8Array(buffer as ArrayBuffer)
  );
}

const PRODUCTIVIDAD_FIRST_DATA_ROW = 7;
const PRODUCTIVIDAD_MAIN_LAST_COLUMN = 41;
const PRODUCTIVIDAD_CYCLE_TOTAL_COL = 40;
const PRODUCTIVIDAD_CYCLE_INGRESO_COL = 41;
const PRODUCTIVIDAD_MONTH_BLOCKS = CICLO_MESES.map((mes, index) => ({
  mes,
  totalCol: 4 + index * 3,
  ingresoCol: 5 + index * 3,
  facultadTotalCol: 6 + index * 3,
}));

const PRODUCTIVIDAD_MENSUAL_BLOCKS = CICLO_MESES.map((mes, index) => ({
  mes,
  totalCol: 2 + index * 2,
  ingresoCol: 3 + index * 2,
}));
const PRODUCTIVIDAD_MENSUAL_LAST_COLUMN = 27;
const PRODUCTIVIDAD_MENSUAL_TOTAL_COL = 26;
const PRODUCTIVIDAD_MENSUAL_INGRESO_COL = 27;

const REPORT_FACULTAD_FILLS: ExcelJSTypes.Fill[] = [
  { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFCC" } },
  { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } },
];

const REPORT_EMPTY_FILL: ExcelJSTypes.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
};

const REPORT_TOTAL_FILL: ExcelJSTypes.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F4E78" },
};

const REPORT_CYCLE_TOTAL_FILL: ExcelJSTypes.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFC00000" },
};

type ReportMetric = { total: number; ingreso: number };
type ProductividadFacultyBlock = {
  startRow: number;
  endRow: number;
  fill: ExcelJSTypes.Fill;
};

function getShortCycleLabel(cicloAnioFin: number) {
  return `${String(cicloAnioFin - 1).slice(-2)}-${String(cicloAnioFin).slice(-2)}`;
}

function getReportMonthName(mes: number) {
  return MESES[mes - 1].toUpperCase();
}

function getReportMonthShortName(mes: number) {
  return MESES_SHORT[mes - 1].toUpperCase();
}

function unmergeRowsFrom(sheet: ExcelJSTypes.Worksheet, firstRow: number) {
  const merges = [...sheet.model.merges];
  for (const merge of merges) {
    const rows = merge.match(/\d+/g)?.map(Number) ?? [];
    if (rows.some(row => row >= firstRow)) sheet.unMergeCells(merge);
  }
}

function clearRowsFrom(sheet: ExcelJSTypes.Worksheet, firstRow: number) {
  unmergeRowsFrom(sheet, firstRow);
  if (sheet.rowCount >= firstRow) {
    sheet.spliceRows(firstRow, sheet.rowCount - firstRow + 1);
  }
}

function applyReportCellBase(cell: ExcelJSTypes.Cell, fill?: ExcelJSTypes.Fill) {
  cell.style = {
    border: {
      top: { style: "thin", color: { argb: "FFB7C4D6" } },
      left: { style: "thin", color: { argb: "FFB7C4D6" } },
      bottom: { style: "thin", color: { argb: "FFB7C4D6" } },
      right: { style: "thin", color: { argb: "FFB7C4D6" } },
    },
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
    font: { name: "Arial", size: 9, color: { argb: "FF000000" } },
    fill: fill ? cloneExcelValue(fill) : { type: "pattern", pattern: "none" },
  };
}

function applyReportRowBase(row: ExcelJSTypes.Row, lastColumn: number, fill?: ExcelJSTypes.Fill) {
  row.height = 20;
  for (let col = 1; col <= lastColumn; col++) {
    applyReportCellBase(row.getCell(col), fill);
  }
}

function setCurrencyCell(cell: ExcelJSTypes.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '"$"#,##0';
}

function markReportEmptyCell(cell: ExcelJSTypes.Cell) {
  cell.value = null;
  applyReportCellBase(cell, REPORT_EMPTY_FILL);
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

function applyFillToRange(
  sheet: ExcelJSTypes.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  fill: ExcelJSTypes.Fill
) {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      sheet.getCell(row, col).fill = cloneExcelValue(fill);
    }
  }
}

function clearFillToRange(
  sheet: ExcelJSTypes.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
) {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      sheet.getCell(row, col).fill = { type: "pattern", pattern: "none" };
    }
  }
}

function setTotalRowStyle(row: ExcelJSTypes.Row, lastColumn: number) {
  for (let col = 1; col <= lastColumn; col++) {
    const cell = row.getCell(col);
    applyReportCellBase(cell, REPORT_TOTAL_FILL);
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  }
}

function getReportDataFill(sheet: ExcelJSTypes.Worksheet, rowNumber: number, colNumber: number) {
  const fill = sheet.getCell(rowNumber, colNumber).fill;
  if (fill?.type === "pattern") return cloneExcelValue(fill);
  return undefined;
}

function isReportCellEmpty(cell: ExcelJSTypes.Cell) {
  return cell.value === null || cell.value === undefined || cell.value === "";
}

function normalizeProductividadMainSheetStyles(
  sheet: ExcelJSTypes.Worksheet,
  facultyBlocks: ProductividadFacultyBlock[]
) {
  facultyBlocks.forEach(block => {
    for (let rowNumber = block.startRow; rowNumber <= block.endRow; rowNumber++) {
      const claveCell = sheet.getCell(rowNumber, 1);
      const facultadCell = sheet.getCell(rowNumber, 2);
      const carreraCell = sheet.getCell(rowNumber, 3);

      applyReportCellBase(claveCell, block.fill);
      applyReportCellBase(facultadCell, block.fill);
      applyReportCellBase(carreraCell, block.fill);

      claveCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      facultadCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      carreraCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      claveCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };
      facultadCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };
      carreraCell.font = { name: "Arial", size: 9, color: { argb: "FF000000" } };

      PRODUCTIVIDAD_MONTH_BLOCKS.forEach(monthBlock => {
        const totalCell = sheet.getCell(rowNumber, monthBlock.totalCol);
        const ingresoCell = sheet.getCell(rowNumber, monthBlock.ingresoCol);
        const facultadTotalCell = sheet.getCell(rowNumber, monthBlock.facultadTotalCol);

        applyReportCellBase(totalCell, block.fill);
        applyReportCellBase(ingresoCell, block.fill);

        if (isReportCellEmpty(totalCell)) markReportEmptyCell(totalCell);
        if (isReportCellEmpty(ingresoCell)) markReportEmptyCell(ingresoCell);
        if (!isReportCellEmpty(ingresoCell)) ingresoCell.numFmt = '"$"#,##0';

        applyReportCellBase(facultadTotalCell);
        facultadTotalCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };
      });
    }
  });
}

function matchesCareer(alumno: Alumno, carrera: CarreraCatalogo) {
  if (alumno.carreraId) return alumno.carreraId === carrera.id;
  return alumno.escuela === carrera.facultadCodigo && cleanStr(alumno.carrera) === cleanStr(carrera.nombre);
}

function matchesNivel(alumno: Alumno, nivel: NivelCatalogo) {
  if (alumno.nivelId) return alumno.nivelId === nivel.id;
  return cleanStr(alumno.nivel) === cleanStr(nivel.nombre);
}

function metricFor(alumnos: Alumno[]) {
  return {
    total: alumnos.length,
    ingreso: alumnos.reduce((sum, alumno) => sum + alumno.pago, 0),
  };
}

function writeProductividadMainSheet(
  sheet: ExcelJSTypes.Worksheet,
  alumnosCiclo: Alumno[],
  catalogos: Catalogos,
  cicloAnioFin: number
) {
  const fullCycleLabel = getCicloEscolarLabel(cicloAnioFin);
  const shortCycleLabel = getShortCycleLabel(cicloAnioFin);
  sheet.name = shortCycleLabel;
  sheet.getCell("A3").value = `CICLO ESCOLAR ${fullCycleLabel}`;

  PRODUCTIVIDAD_MONTH_BLOCKS.forEach(block => {
    sheet.getCell(5, block.totalCol).value = getReportMonthName(block.mes);
    sheet.getCell(6, block.totalCol).value = "TOTAL TRÁMITES";
    sheet.getCell(6, block.ingresoCol).value = "TOTAL INGRESOS $";
    sheet.getCell(6, block.facultadTotalCol).value = null;
  });
  sheet.getCell(6, PRODUCTIVIDAD_CYCLE_TOTAL_COL).value = "TOTAL";
  sheet.getCell(6, PRODUCTIVIDAD_CYCLE_INGRESO_COL).value = "INGRESO";

  clearRowsFrom(sheet, PRODUCTIVIDAD_FIRST_DATA_ROW);

  const facultades = catalogos.facultades.filter(facultad => facultad.activo !== false);
  const carreras = catalogos.carreras.filter(carrera => carrera.activo);
  const activeFacultyCodes = new Set(facultades.map(facultad => facultad.codigo));
  const visibleCarreras = carreras.filter(carrera => activeFacultyCodes.has(carrera.facultadCodigo));
  const facultyBlocks: ProductividadFacultyBlock[] = [];
  let rowNumber = PRODUCTIVIDAD_FIRST_DATA_ROW;
  let visibleFacultadIndex = 0;

  facultades.forEach(facultad => {
    const facultadCarreras = visibleCarreras
      .filter(carrera => carrera.facultadCodigo === facultad.codigo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    if (facultadCarreras.length === 0) return;

    const fill = REPORT_FACULTAD_FILLS[visibleFacultadIndex % REPORT_FACULTAD_FILLS.length];
    visibleFacultadIndex++;
    const startRow = rowNumber;

    facultadCarreras.forEach(carrera => {
      const row = sheet.getRow(rowNumber);
      applyReportRowBase(row, PRODUCTIVIDAD_MAIN_LAST_COLUMN);

      for (let col = 1; col <= 3; col++) {
        row.getCell(col).fill = cloneExcelValue(fill);
      }
      row.getCell(3).value = carrera.nombre;
      row.getCell(3).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

      PRODUCTIVIDAD_MONTH_BLOCKS.forEach(block => {
        const alumnosCarreraMes = alumnosCiclo.filter(alumno =>
          alumno.mes === block.mes && matchesCareer(alumno, carrera)
        );
        const stats = metricFor(alumnosCarreraMes);
        const totalCell = row.getCell(block.totalCol);
        const ingresoCell = row.getCell(block.ingresoCol);

        if (stats.total === 0) {
          markReportEmptyCell(totalCell);
          markReportEmptyCell(ingresoCell);
        } else {
          totalCell.fill = cloneExcelValue(fill);
          ingresoCell.fill = cloneExcelValue(fill);
          totalCell.value = stats.total;
          setCurrencyCell(ingresoCell, stats.ingreso);
        }
        row.getCell(block.facultadTotalCol).fill = { type: "pattern", pattern: "none" };
      });

      rowNumber++;
    });

    const endRow = rowNumber - 1;
    applyFillToRange(sheet, startRow, 1, endRow, 3, fill);
    if (startRow < endRow) {
      sheet.mergeCells(startRow, 1, endRow, 1);
      sheet.mergeCells(startRow, 2, endRow, 2);
    }

    const claveCell = sheet.getCell(startRow, 1);
    const facultadCell = sheet.getCell(startRow, 2);
    claveCell.value = facultad.codigo;
    facultadCell.value = facultad.nombre;
    claveCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    facultadCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    claveCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };
    facultadCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };

    PRODUCTIVIDAD_MONTH_BLOCKS.forEach(block => {
      const totalFacultadMes = alumnosCiclo.filter(alumno =>
        alumno.mes === block.mes &&
        alumno.escuela === facultad.codigo &&
        facultadCarreras.some(carrera => matchesCareer(alumno, carrera))
      ).length;

      if (startRow < endRow) {
        clearFillToRange(sheet, startRow, block.facultadTotalCol, endRow, block.facultadTotalCol);
        sheet.mergeCells(startRow, block.facultadTotalCol, endRow, block.facultadTotalCol);
      }
      const cell = sheet.getCell(startRow, block.facultadTotalCol);
      applyReportCellBase(cell);
      cell.value = totalFacultadMes;
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };
    });

    const alumnosFacultadCiclo = alumnosCiclo.filter(alumno =>
      alumno.escuela === facultad.codigo &&
      facultadCarreras.some(carrera => matchesCareer(alumno, carrera))
    );
    const facultadCycleStats = metricFor(alumnosFacultadCiclo);

    if (startRow < endRow) {
      sheet.mergeCells(startRow, PRODUCTIVIDAD_CYCLE_TOTAL_COL, endRow, PRODUCTIVIDAD_CYCLE_TOTAL_COL);
      sheet.mergeCells(startRow, PRODUCTIVIDAD_CYCLE_INGRESO_COL, endRow, PRODUCTIVIDAD_CYCLE_INGRESO_COL);
    }

    const cycleTotalCell = sheet.getCell(startRow, PRODUCTIVIDAD_CYCLE_TOTAL_COL);
    const cycleIngresoCell = sheet.getCell(startRow, PRODUCTIVIDAD_CYCLE_INGRESO_COL);
    applyReportCellBase(cycleTotalCell);
    applyReportCellBase(cycleIngresoCell);
    cycleTotalCell.value = facultadCycleStats.total;
    setCurrencyCell(cycleIngresoCell, facultadCycleStats.ingreso);
    cycleTotalCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };
    cycleIngresoCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF000000" } };

    facultyBlocks.push({ startRow, endRow, fill });
  });

  normalizeProductividadMainSheetStyles(sheet, facultyBlocks);

  const totalRow = sheet.getRow(rowNumber);
  setTotalRowStyle(totalRow, PRODUCTIVIDAD_MAIN_LAST_COLUMN);
  sheet.mergeCells(rowNumber, 1, rowNumber, 3);
  totalRow.getCell(1).value = "TOTAL";
  totalRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  PRODUCTIVIDAD_MONTH_BLOCKS.forEach(block => {
    const visibleAlumnosMes = alumnosCiclo.filter(alumno =>
      alumno.mes === block.mes &&
      visibleCarreras.some(carrera => matchesCareer(alumno, carrera))
    );
    const stats = metricFor(visibleAlumnosMes);
    totalRow.getCell(block.totalCol).value = stats.total;
    setCurrencyCell(totalRow.getCell(block.ingresoCol), stats.ingreso);
    totalRow.getCell(block.facultadTotalCol).value = stats.total;
  });

  const visibleAlumnosCiclo = alumnosCiclo.filter(alumno =>
    visibleCarreras.some(carrera => matchesCareer(alumno, carrera))
  );
  const cycleStats = metricFor(visibleAlumnosCiclo);
  totalRow.getCell(PRODUCTIVIDAD_CYCLE_TOTAL_COL).value = cycleStats.total;
  setCurrencyCell(totalRow.getCell(PRODUCTIVIDAD_CYCLE_INGRESO_COL), cycleStats.ingreso);
  applyReportCellBase(totalRow.getCell(PRODUCTIVIDAD_CYCLE_TOTAL_COL), REPORT_CYCLE_TOTAL_FILL);
  applyReportCellBase(totalRow.getCell(PRODUCTIVIDAD_CYCLE_INGRESO_COL), REPORT_CYCLE_TOTAL_FILL);
  totalRow.getCell(PRODUCTIVIDAD_CYCLE_TOTAL_COL).font = {
    name: "Arial",
    size: 9,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  totalRow.getCell(PRODUCTIVIDAD_CYCLE_INGRESO_COL).font = {
    name: "Arial",
    size: 9,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  totalRow.getCell(PRODUCTIVIDAD_CYCLE_INGRESO_COL).numFmt = '"$"#,##0';

  totalRow.commit();
}

function writeProductividadMensualSheet(
  sheet: ExcelJSTypes.Worksheet,
  alumnosCiclo: Alumno[],
  catalogos: Catalogos,
  cicloAnioFin: number
) {
  const fullCycleLabel = getCicloEscolarLabel(cicloAnioFin);
  const shortCycleLabel = getShortCycleLabel(cicloAnioFin);
  sheet.name = `Mensual ${shortCycleLabel}`;
  sheet.getCell("A3").value = `CICLO ${fullCycleLabel}`;

  PRODUCTIVIDAD_MENSUAL_BLOCKS.forEach(block => {
    sheet.getCell(5, block.totalCol).value = getReportMonthShortName(block.mes);
    sheet.getCell(6, block.totalCol).value = "Total";
    sheet.getCell(6, block.ingresoCol).value = "Ingreso";
  });
  sheet.getCell(6, PRODUCTIVIDAD_MENSUAL_TOTAL_COL).value = "TOTAL";
  sheet.getCell(6, PRODUCTIVIDAD_MENSUAL_INGRESO_COL).value = "INGRESO";

  const monthlyColumnFills = PRODUCTIVIDAD_MENSUAL_BLOCKS.map(block =>
    getReportDataFill(sheet, PRODUCTIVIDAD_FIRST_DATA_ROW, block.totalCol) ??
    REPORT_FACULTAD_FILLS[(block.totalCol / 2) % REPORT_FACULTAD_FILLS.length]
  );
  const monthlyCycleTotalFill =
    getReportDataFill(sheet, PRODUCTIVIDAD_FIRST_DATA_ROW, PRODUCTIVIDAD_MENSUAL_TOTAL_COL) ??
    REPORT_FACULTAD_FILLS[0];

  clearRowsFrom(sheet, PRODUCTIVIDAD_FIRST_DATA_ROW);

  const niveles = catalogos.niveles
    .filter(nivel => nivel.activo)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));

  let rowNumber = PRODUCTIVIDAD_FIRST_DATA_ROW;
  niveles.forEach(nivel => {
    const row = sheet.getRow(rowNumber);
    applyReportRowBase(row, PRODUCTIVIDAD_MENSUAL_LAST_COLUMN);
    row.getCell(1).value = nivel.nombre;
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

    let totalNivel = 0;
    let ingresoNivel = 0;
    PRODUCTIVIDAD_MENSUAL_BLOCKS.forEach((block, blockIndex) => {
      const stats = metricFor(alumnosCiclo.filter(alumno =>
        alumno.mes === block.mes && matchesNivel(alumno, nivel)
      ));
      totalNivel += stats.total;
      ingresoNivel += stats.ingreso;
      applyReportCellBase(row.getCell(block.totalCol), monthlyColumnFills[blockIndex]);
      applyReportCellBase(row.getCell(block.ingresoCol), monthlyColumnFills[blockIndex]);
      row.getCell(block.totalCol).value = stats.total;
      setCurrencyCell(row.getCell(block.ingresoCol), stats.ingreso);
    });

    applyReportCellBase(row.getCell(PRODUCTIVIDAD_MENSUAL_TOTAL_COL), monthlyCycleTotalFill);
    applyReportCellBase(row.getCell(PRODUCTIVIDAD_MENSUAL_INGRESO_COL), monthlyCycleTotalFill);
    row.getCell(PRODUCTIVIDAD_MENSUAL_TOTAL_COL).value = totalNivel;
    setCurrencyCell(row.getCell(PRODUCTIVIDAD_MENSUAL_INGRESO_COL), ingresoNivel);
    row.commit();
    rowNumber++;
  });

  const totalRow = sheet.getRow(rowNumber);
  setTotalRowStyle(totalRow, PRODUCTIVIDAD_MENSUAL_LAST_COLUMN);
  totalRow.getCell(1).value = "TOTAL";

  PRODUCTIVIDAD_MENSUAL_BLOCKS.forEach(block => {
    const stats = metricFor(alumnosCiclo.filter(alumno => alumno.mes === block.mes));
    totalRow.getCell(block.totalCol).value = stats.total;
    setCurrencyCell(totalRow.getCell(block.ingresoCol), stats.ingreso);
  });

  totalRow.getCell(PRODUCTIVIDAD_MENSUAL_TOTAL_COL).value = alumnosCiclo.length;
  setCurrencyCell(
    totalRow.getCell(PRODUCTIVIDAD_MENSUAL_INGRESO_COL),
    alumnosCiclo.reduce((sum, alumno) => sum + alumno.pago, 0)
  );
  totalRow.commit();
}

export async function exportReporteProductividadTituloXlsx(
  alumnos: Alumno[],
  catalogos: Catalogos,
  cicloAnioFin: number
) {
  const ExcelJS = (await import("exceljs")).default;
  const response = await fetch(reporteProductividadTemplateUrl);
  if (!response.ok) throw new Error("No se pudo cargar la plantilla del reporte de productividad.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());

  const mainSheet = workbook.getWorksheet("22-23") ?? workbook.worksheets[0];
  const monthlySheet = workbook.getWorksheet("Mensual 22-23") ?? workbook.worksheets[1];
  if (!mainSheet || !monthlySheet) throw new Error("La plantilla del reporte no contiene las hojas esperadas.");

  const alumnosCiclo = alumnos.filter(alumno =>
    getCicloEscolarAnioFinFromPeriodo(alumno.mes, alumno.anio) === cicloAnioFin
  );

  writeProductividadMainSheet(mainSheet, alumnosCiclo, catalogos, cicloAnioFin);
  writeProductividadMensualSheet(monthlySheet, alumnosCiclo, catalogos, cicloAnioFin);

  const buffer = await workbook.xlsx.writeBuffer();
  await saveXlsxFile(
    `reporte_productividad_titulo_${getCicloEscolarLabel(cicloAnioFin)}.xlsx`,
    new Uint8Array(buffer as ArrayBuffer)
  );
}

export async function exportTramiteTituloXlsx(alumnos: Alumno[], cicloAnioFin: number) {
  const ExcelJS = (await import("exceljs")).default;
  const response = await fetch(tramiteTituloTemplateUrl);
  if (!response.ok) throw new Error("No se pudo cargar la plantilla del formato Excel.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());

  const sheet = workbook.getWorksheet("GENERAL") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("La plantilla no contiene una hoja válida.");

  const baseRowTemplate = captureRowTemplate(sheet, FORMATO_FIRST_DATA_ROW);
  const monthFills = collectMonthFills(sheet);
  const estadoStyles = Object.fromEntries(
    Object.entries(ESTADO_STYLE_ROWS).map(([estado, row]) => [
      estado,
      withFallbackFill(
        cloneExcelValue(sheet.getCell(row, 18).style),
        ESTADO_FILLS[estado as EstadoTramite]
      ),
    ])
  ) as Record<EstadoTramite, ExcelCellStyle>;

  if (sheet.rowCount >= FORMATO_FIRST_DATA_ROW) {
    sheet.spliceRows(FORMATO_FIRST_DATA_ROW, sheet.rowCount - FORMATO_FIRST_DATA_ROW + 1);
  }

  const ordered = [...alumnos].sort((a, b) =>
    a.anio - b.anio || a.mes - b.mes || a.nombre.localeCompare(b.nombre, "es")
  );

  ordered.forEach((alumno, index) => {
    const rowNumber = FORMATO_FIRST_DATA_ROW + index;
    const row = sheet.getRow(rowNumber);
    applyRowTemplate(row, baseRowTemplate);
    applyMonthFill(row, getMonthFill(monthFills, alumno.mes));

    row.getCell(1).value = index + 1;
    row.getCell(2).value = alumno.nombre;
    row.getCell(3).value = alumno.carrera;
    row.getCell(4).value = formatNivelForExcel(alumno.nivel);
    row.getCell(5).value = alumno.escuela;
    row.getCell(6).value = alumno.tramite;
    row.getCell(7).value = alumno.prepaUAS ? "S" : "N";
    row.getCell(8).value = alumno.prepa;
    row.getCell(9).value = alumno.lic;
    setPhoneValue(row.getCell(10), alumno.telefono, alumno.telefonoAlt);
    row.getCell(11).value = alumno.email;
    row.getCell(12).value = alumno.ingreso ? formatAppDateForExcel(alumno.ingreso) : "";
    row.getCell(13).value = alumno.recibido ? formatAppDateForExcel(alumno.recibido) : "";
    row.getCell(14).value = alumno.envio ? formatAppDateForExcel(alumno.envio) : "";
    row.getCell(15).value = alumno.reenvio ? "SI" : "";
    row.getCell(16).value = alumno.cartaPoder;
    row.getCell(17).value = alumno.localizacion;
    row.getCell(18).value = formatEstadoForExcel(alumno.estado);
    applyCellStyle(row.getCell(18), estadoStyles[alumno.estado]);
    row.commit();
  });

  const buffer = await workbook.xlsx.writeBuffer();
  await saveXlsxFile(
    `titulacion_ciclo_${getCicloEscolarLabel(cicloAnioFin)}.xlsx`,
    new Uint8Array(buffer as ArrayBuffer)
  );
}

