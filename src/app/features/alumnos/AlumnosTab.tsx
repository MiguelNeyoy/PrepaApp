import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, CalendarCheck, Check, ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, MoreHorizontal, Pencil, Save, Search, Trash2, UserPlus, X } from "lucide-react";
import { CustomSelect } from "../../components/controls";
import {
  CICLO_MESES,
  FACULTADES,
  MESES,
  MESES_SHORT,
  NIVEL_ABREV,
  NIVEL_COLOR,
  NIVEL_PAGO,
  NIVELES,
  exportFormatoControlSolicitudesXlsx,
  exportTramiteTituloXlsx,
  fmtDate,
  getCicloEscolarAnioFin,
  getCicloEscolarAnioFinFromPeriodo,
  getCicloEscolarLabel,
  getPeriodoAnioForCiclo,
} from "../../domain";
import type { Alumno, AlumnoBulkChanges, Catalogos, EstadoTramite, Facultad, NivelEstudio } from "../../domain";

// -- Styled checkbox ------------------------------------------------------------

function Checkbox({
  checked, indeterminate, onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
        checked || indeterminate
          ? "bg-amber-400 border-amber-400"
          : "bg-card border-border hover:border-amber-400/60"
      }`}
    >
      {indeterminate && !checked
        ? <span className="w-2 h-0.5 rounded-full bg-white" />
        : checked
        ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        : null}
    </button>
  );
}

// -- Checkbox cell helper -------------------------------------------------------

function Chk({ val, border }: { val: boolean; border?: boolean }) {
  return (
    <td className={`px-3 py-2 text-center ${border ? "border-l border-border/30" : ""}`}>
      {val ? (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/30">
          <Check className="w-2.5 h-2.5 text-emerald-400" strokeWidth={3} />
        </span>
      ) : (
        <span className="inline-block w-4 h-4" />
      )}
    </td>
  );
}

// -- Academic catalog -----------------------------------------------------------

const NIVEL_LIC = NIVELES.find(n => n === "Licenciatura") ?? NIVELES[0];
const NIVEL_MAE = NIVELES.find(n => n.includes("Maestr")) ?? NIVELES[0];
const NIVEL_DOC = NIVELES.find(n => n === "Doctorado") ?? NIVELES[0];
const NIVEL_TSU = NIVELES.find(n => n.includes("Superior")) ?? NIVELES[0];
const NIVEL_TEC = NIVELES.find(n => n.includes("cnico") && !n.includes("Superior")) ?? NIVELES[0];
const NIVEL_SUB = NIVELES.find(n => n === "Subprofesional") ?? NIVELES[0];
const NIVEL_OZL = NIVELES.find(n => n.includes("Licenciatura") && n.includes("Otras")) ?? NIVELES[0];
const NIVEL_OZP = NIVELES.find(n => n.includes("Posgrado")) ?? NIVELES[0];

type AcademicCatalogItem = Facultad & {
  carrerasPorNivel: Partial<Record<NivelEstudio, string[]>>;
};

const buildGraduateCareers = (prefix: string, careers: string[]) =>
  careers.slice(0, 2).map(career => `${prefix} ${career}`);

function buildAcademicCatalog(catalogos?: Catalogos): AcademicCatalogItem[] {
  if (catalogos) {
    return catalogos.facultades.map(facultad => {
      const carrerasPorNivel: Partial<Record<NivelEstudio, string[]>> = {};

      for (const carrera of catalogos.carreras.filter(c => c.facultadCodigo === facultad.codigo)) {
        const nivel = catalogos.niveles.find(n => n.id === carrera.nivelId)?.nombre;
        if (!nivel) continue;
        carrerasPorNivel[nivel] = [...(carrerasPorNivel[nivel] ?? []), carrera.nombre];
      }

      return { ...facultad, carrerasPorNivel };
    });
  }

  return FACULTADES.map(facultad => {
  const carrerasPorNivel: Partial<Record<NivelEstudio, string[]>> = {
    [NIVEL_LIC]: facultad.carreras,
  };

  if (facultad.carreras.some(carrera => /Ingenier|Enfermer|Inform/.test(carrera))) {
    carrerasPorNivel[NIVEL_TSU] = facultad.carreras.filter(carrera => /Ingenier|Enfermer|Inform/.test(carrera));
  }

  if (facultad.carreras.some(carrera => /Trabajo Social|Turismo|Mercadotecnia/.test(carrera))) {
    carrerasPorNivel[NIVEL_TEC] = facultad.carreras.filter(carrera => /Trabajo Social|Turismo|Mercadotecnia/.test(carrera));
    carrerasPorNivel[NIVEL_SUB] = facultad.carreras.filter(carrera => /Trabajo Social|Turismo/.test(carrera));
  }

  if (facultad.carreras.length > 1) {
    carrerasPorNivel[NIVEL_MAE] = buildGraduateCareers("Maestria en", facultad.carreras);
  }

  if (/Ingenier|Derecho|Contadur|Psicolog/.test(facultad.nombre)) {
    carrerasPorNivel[NIVEL_DOC] = buildGraduateCareers("Doctorado en", facultad.carreras).slice(0, 1);
  }

  if (/Mazatl/.test(facultad.nombre)) {
    carrerasPorNivel[NIVEL_OZL] = facultad.carreras;
    carrerasPorNivel[NIVEL_OZP] = carrerasPorNivel[NIVEL_MAE] ?? buildGraduateCareers("Maestria en", facultad.carreras);
  }

  return { ...facultad, carrerasPorNivel };
  });
}

const DEFAULT_ACADEMIC_CATALOG = buildAcademicCatalog();

const TRAMITES = ["TITULO"];

function getNivelOptions(catalogos?: Catalogos) {
  return catalogos?.niveles.filter(nivel => nivel.activo).map(nivel => nivel.nombre) ?? NIVELES;
}

function getTramiteOptions(catalogos?: Catalogos) {
  return catalogos?.tramites.filter(tramite => tramite.activo).map(tramite => tramite.nombre) ?? TRAMITES;
}

function getNivelPago(nivel: NivelEstudio, catalogos?: Catalogos) {
  return catalogos?.niveles.find(item => item.nombre === nivel)?.pago ?? NIVEL_PAGO[nivel] ?? 0;
}

function getNivelMeta(nivel: NivelEstudio, catalogos?: Catalogos) {
  const item = catalogos?.niveles.find(n => n.nombre === nivel);
  return {
    abreviatura: item?.abreviatura ?? NIVEL_ABREV[nivel] ?? nivel.slice(0, 4),
    color: item?.colorHex ?? NIVEL_COLOR[nivel] ?? "#64748b",
  };
}

function getTramiteId(nombre: string, catalogos?: Catalogos) {
  return catalogos?.tramites.find(tramite => tramite.nombre === nombre)?.id;
}

function facultySupportsNivel(facultad: AcademicCatalogItem, nivel: NivelEstudio) {
  return (facultad.carrerasPorNivel[nivel] ?? []).length > 0;
}

function getCareerOptions(nivel: NivelEstudio, escuela: string, catalog: AcademicCatalogItem[]) {
  const facultad = catalog.find(f => f.codigo === escuela);
  return facultad?.carrerasPorNivel[nivel] ?? [];
}

function getFacultyOptions(nivel: NivelEstudio, catalog: AcademicCatalogItem[]) {
  return catalog
    .filter(facultad => facultySupportsNivel(facultad, nivel))
    .map(facultad => ({ value: facultad.codigo, label: `${facultad.codigo} - ${facultad.nombre}` }));
}

function normalizeAcademicSelection(form: Alumno, catalog: AcademicCatalogItem[]): Alumno {
  const validFaculties = getFacultyOptions(form.nivel, catalog);
  const currentFacultyIsValid = validFaculties.some(option => option.value === form.escuela);
  const escuela = currentFacultyIsValid ? form.escuela : "";
  const careerOptions = escuela ? getCareerOptions(form.nivel, escuela, catalog) : [];
  const carrera = careerOptions.includes(form.carrera) ? form.carrera : "";
  return { ...form, escuela, carrera, carreraId: carrera ? form.carreraId : undefined };
}

// -- Date picker ----------------------------------------------------------------

function parseAppDate(value: string) {
  const match = value.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (!match) return null;
  const monthIndex = MESES_SHORT.findIndex(mes => mes.toLowerCase() === match[2].toLowerCase());
  if (monthIndex < 0) return null;
  const day = Number(match[1]);
  const year = Number(match[3]);
  const parsed = new Date(year, monthIndex, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAppDate(date: Date) {
  return fmtDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
}

function getInvalidFormatDateAlumno(alumnos: Alumno[], envioDate: Date) {
  const envioDay = new Date(envioDate.getFullYear(), envioDate.getMonth(), envioDate.getDate()).getTime();

  return alumnos.find(alumno => {
    const recibidoDate = parseAppDate(alumno.recibido);
    if (!recibidoDate) return false;

    const recibidoDay = new Date(
      recibidoDate.getFullYear(),
      recibidoDate.getMonth(),
      recibidoDate.getDate()
    ).getTime();

    return recibidoDay > envioDay;
  });
}

function formatGeneration(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

function formatMatricula(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 7) return digits;
  return `${digits.slice(0, 7)}-${digits.slice(7)}`;
}

function isValidMatricula(value: string) {
  return /^\d{7}-\d$/.test(value);
}

function DateField({
  label,
  value,
  onChange,
  placeholder = "dd/Mmm/aaaa",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const selectedDate = parseAppDate(value);
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 256;
    const estimatedHeight = 316;
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const left = Math.min(Math.max(rect.left, margin), maxLeft);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < estimatedHeight && rect.top > estimatedHeight
      ? rect.top - estimatedHeight - 6
      : rect.bottom + 6;
    setPosition({ top: Math.max(margin, top), left });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const moveMonth = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => {
          updatePosition();
          setOpen(value => !value);
        }}
        className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40 flex items-center justify-between gap-2 transition-all"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground/40"}>
          {value || placeholder}
        </span>
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[80] w-64 bg-card border border-border rounded-xl shadow-xl shadow-black/10 p-3"
          style={{ top: position.top, left: position.left }}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-xs font-bold text-foreground">
              {MESES[month]} {year}
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map(day => (
              <span key={day} className="text-[10px] font-semibold text-muted-foreground/60 py-1">
                {day}
              </span>
            ))}
            {days.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="h-7" />;
              const date = new Date(year, month, day);
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    onChange(formatAppDate(date));
                    setOpen(false);
                  }}
                  className={`h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                    isSelected
                      ? "bg-amber-400 text-white"
                      : isToday
                      ? "bg-amber-400/10 text-amber-600 dark:text-amber-300"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange(formatAppDate(today));
                setViewDate(today);
                setOpen(false);
              }}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-400/10 text-amber-600 dark:text-amber-300 hover:bg-amber-400/15 transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function FloatingTextTooltip({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 240, placement: "above" as "above" | "below", align: "center" as "center" | "left" | "right" });

  const updatePosition = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 10;
    const width = Math.min(360, window.innerWidth - margin * 2);
    const anchorCenter = rect.left + rect.width / 2;
    const minCenter = margin + width / 2;
    const maxCenter = window.innerWidth - margin - width / 2;
    const left = Math.min(Math.max(anchorCenter, minCenter), maxCenter);
    const align = anchorCenter < minCenter ? "left" : anchorCenter > maxCenter ? "right" : "center";
    const useAbove = rect.top > window.innerHeight - rect.bottom;
    const availableHeight = useAbove ? rect.top - margin * 2 : window.innerHeight - rect.bottom - margin * 2;
    const maxHeight = Math.max(120, Math.min(320, availableHeight));
    const top = useAbove ? rect.top - 8 : rect.bottom + 8;
    setPosition({ top, left, maxHeight, placement: useAbove ? "above" : "below", align });
  };

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        className="text-muted-foreground truncate block text-xs cursor-default focus:outline-none focus:text-foreground"
      >
        {value}
      </span>
      {open && createPortal(
        <div
          className="fixed z-[90] w-max max-w-[min(360px,calc(100vw-20px))] overflow-auto rounded-lg bg-foreground px-3 py-2 text-[11px] leading-snug text-background shadow-xl whitespace-pre-wrap break-words"
          style={{
            top: position.top,
            left: position.left,
            maxHeight: position.maxHeight,
            transform: [
              position.align === "center" ? "translateX(-50%)" : "",
              position.align === "right" ? "translateX(-100%)" : "",
              position.placement === "above" ? "translateY(-100%)" : "",
            ].filter(Boolean).join(" ") || undefined,
          }}
        >
          {value}
        </div>,
        document.body
      )}
    </>
  );
}

// -- Edit / Add Modal -----------------------------------------------------------

function emptyAlumno(mes: number, anio: number, catalogos?: Catalogos): Alumno {
  const defaultNivel = getNivelOptions(catalogos)[0] ?? "Licenciatura";
  const defaultTramite = getTramiteOptions(catalogos)[0] ?? "TITULO";
  return {
    id: `new-${Date.now()}`,
    matricula: "",
    nombre: "", carrera: "", nivel: defaultNivel, nivelId: catalogos?.niveles.find(n => n.nombre === defaultNivel)?.id, turno: "Matutino",
    pago: getNivelPago(defaultNivel, catalogos), email: "", telefono: "", telefonoAlt: "",
    escuela: "", tramite: defaultTramite, tramiteId: getTramiteId(defaultTramite, catalogos) ?? "titulo", prepaUAS: false, prepa: "", lic: "",
    recibio: "", ingreso: "", recibido: "", envio: "", reenvio: false,
    cartaPoder: "", cartaPorte: "",
    localizacion: "", observaciones: "",
    estado: "pendiente", mes, anio,
  };
}

function EditModal({
  alumno, mes, anio, academicCatalog, catalogos, onSave, onClose,
}: {
  alumno: Alumno | null; // null = add mode
  mes: number; anio: number;
  academicCatalog: AcademicCatalogItem[];
  catalogos?: Catalogos;
  onSave: (a: Alumno) => Promise<void> | void;
  onClose: () => void;
}) {
  const nivelOptions = getNivelOptions(catalogos);
  const tramiteOptions = getTramiteOptions(catalogos);
  const [form, setForm] = useState<Alumno>(
    normalizeAcademicSelection(alumno ?? emptyAlumno(mes, anio, catalogos), academicCatalog)
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 140);
  };

  const set = <K extends keyof Alumno>(k: K, v: Alumno[K]) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === "carrera") next.carreraId = undefined;
      if (k === "nivel") {
        next.nivelId = catalogos?.niveles.find(nivel => nivel.nombre === v)?.id;
        next.pago = getNivelPago(v as NivelEstudio, catalogos);
      }
      if (k === "tramite") {
        next.tramiteId = getTramiteId(v as string, catalogos) ?? next.tramiteId;
      }
      return k === "nivel" || k === "escuela" ? normalizeAcademicSelection(next, academicCatalog) : next;
    });
  };

  const isAdd = alumno === null;
  const facultyOptions = getFacultyOptions(form.nivel, academicCatalog);
  const careerOptions = form.escuela ? getCareerOptions(form.nivel, form.escuela, academicCatalog) : [];

  const fieldCls = "w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40";
  const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1";
  const requiredMark = <span className="text-amber-400 ml-1">*</span>;
  const requiredFields: { key: keyof Alumno; label: string }[] = [
    { key: "nombre", label: "Nombre completo" },
    { key: "carrera", label: "Carrera" },
    { key: "nivel", label: "Nivel" },
    { key: "escuela", label: "Facultad" },
    { key: "telefono", label: "Tel\u00e9fono personal" },
    { key: "email", label: "E-Mail" },
    { key: "tramite", label: "Tr\u00e1mite" },
    { key: "prepa", label: "Prepa" },
    { key: "lic", label: "Lic" },
  ];

  const handleSaveClick = async () => {
    const missing = requiredFields.find(({ key }) => {
      const value = form[key];
      return typeof value === "string" ? value.trim() === "" : value === undefined || value === null;
    });

    if (missing) {
      setError(`Completa el campo ${missing.label}.`);
      return;
    }

    const matricula = form.matricula.trim();
    if (matricula && !isValidMatricula(matricula)) {
      setError("La matricula debe tener el formato 1234567-8 o dejarse vacia.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await onSave(form);
      requestClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el registro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${closing ? "app-overlay-out" : "app-overlay-in"}`}
      style={{ background: "rgba(15,25,60,0.35)", backdropFilter: "blur(6px)" }}
      onMouseDown={event => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className={`bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl ${closing ? "app-modal-out" : "app-modal-in"}`}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${isAdd ? "bg-blue-400/10 border-blue-400/25" : "bg-amber-400/10 border-amber-400/25"}`}>
              {isAdd ? <UserPlus className="w-3.5 h-3.5 text-blue-400" /> : <Pencil className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">
                {isAdd ? "Agregar Registro" : "Editar Registro"}
              </p>
              {!isAdd && (
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{alumno.id}</p>
              )}
            </div>
          </div>
          <button onClick={requestClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div className="grid grid-cols-3 gap-x-4 gap-y-4">
            {/* Row 1 */}
            <div className="col-span-2">
              <label className={labelCls}>Nombre Completo{requiredMark}</label>
              <input className={fieldCls} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Apellido Paterno Apellido Materno Nombre(s)" />
            </div>
            <div>
              <label className={labelCls}>Matricula</label>
              <input
                className={fieldCls}
                value={form.matricula}
                onChange={e => set("matricula", formatMatricula(e.target.value))}
                placeholder="1234567-8"
                inputMode="numeric"
                maxLength={9}
              />
            </div>

            <div>
              <label className={labelCls}>Nivel{requiredMark}</label>
              <CustomSelect
                value={form.nivel}
                onChange={v => set("nivel", v as NivelEstudio)}
                options={nivelOptions}
              />
            </div>
            <div>
              <label className={labelCls}>Facultad{requiredMark}</label>
              <CustomSelect
                value={form.escuela}
                onChange={v => set("escuela", v)}
                options={facultyOptions}
                placeholder="Seleccionar facultad..."
                searchable
                searchPlaceholder="Buscar facultad..."
              />
            </div>
            <div>
              <label className={labelCls}>Carrera{requiredMark}</label>
              <CustomSelect
                value={form.carrera}
                onChange={v => set("carrera", v)}
                options={careerOptions}
                placeholder={form.escuela ? "Seleccionar carrera..." : "Selecciona facultad primero"}
                disabled={!form.escuela}
                searchable
                searchPlaceholder="Buscar carrera..."
              />
            </div>
            <div>
              <label className={labelCls}>Teléfono Personal{requiredMark}</label>
              <input className={fieldCls} value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="10 dígitos" />
            </div>
            <div>
              <label className={labelCls}>Teléfono Alternativo</label>
              <input className={fieldCls} value={form.telefonoAlt} onChange={e => set("telefonoAlt", e.target.value)} placeholder="10 dígitos" />
            </div>
            <div>
              <label className={labelCls}>E-Mail{requiredMark}</label>
              <input className={fieldCls} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="correo@ejemplo.com" />
            </div>

            {/* Divider */}
            <div className="col-span-3 border-t border-border/50 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Documentación y Seguimiento</p>
            </div>

            <div>
              <label className={labelCls}>Trámite{requiredMark}</label>
              <CustomSelect
                value={form.tramite}
                onChange={v => set("tramite", v)}
                options={tramiteOptions}
                placeholder="Seleccionar trámite..."
              />
            </div>
            <div>
              <label className={labelCls}>Generación Prepa{requiredMark}</label>
              <input
                className={fieldCls}
                value={form.prepa}
                onChange={e => set("prepa", formatGeneration(e.target.value))}
                placeholder="2016-2019"
                inputMode="numeric"
                maxLength={9}
              />
            </div>
            <div>
              <label className={labelCls}>Generación Lic.{requiredMark}</label>
              <input
                className={fieldCls}
                value={form.lic}
                onChange={e => set("lic", formatGeneration(e.target.value))}
                placeholder="2019-2023"
                inputMode="numeric"
                maxLength={9}
              />
            </div>

            {!isAdd && (
              <>
                <div>
                  <DateField label="Ingreso" value={form.ingreso} onChange={v => set("ingreso", v)} />
                </div>
                <div>
                  <DateField label="Recibido" value={form.recibido} onChange={v => set("recibido", v)} />
                </div>
                <div>
                  <DateField label="Envío" value={form.envio} onChange={v => set("envio", v)} />
                </div>
              </>
            )}

            <div>
              <label className={labelCls}>Carta Poder</label>
              <input className={fieldCls} value={form.cartaPoder} onChange={e => set("cartaPoder", e.target.value)} placeholder="CP-3041" />
            </div>

            {!isAdd && (
              <div>
                <label className={labelCls}>Localización</label>
                <CustomSelect
                  value={form.localizacion}
                  onChange={v => set("localizacion", v)}
                  options={[
                    { value: "", label: "Sin ubicación" },
                    { value: "Mazatlán", label: "Mazatlán" },
                    { value: "Culiacán", label: "Culiacán" },
                  ]}
                  placeholder="Seleccionar..."
                />
              </div>
            )}

            <div className="col-span-3">
              <label className={labelCls}>Observaciones</label>
              <textarea
                className={`${fieldCls} resize-none`}
                rows={2}
                value={form.observaciones}
                onChange={e => set("observaciones", e.target.value)}
                placeholder="Motivo de rechazo u observaciones relevantes..."
              />
            </div>

            {/* Prepa UAS toggle */}
            <div className="flex flex-col justify-end">
              <label className={labelCls}>Prepa UAS</label>
              <button
                type="button"
                onClick={() => set("prepaUAS", !form.prepaUAS)}
                className="flex items-center gap-2 h-[30px]"
              >
                <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form.prepaUAS ? "bg-amber-400" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-150 ${form.prepaUAS ? "translate-x-4" : ""}`} />
                </div>
                <span className="text-xs text-muted-foreground">{form.prepaUAS ? "Sí" : "No"}</span>
              </button>
            </div>

            {/* Reenvío toggle */}
            <div className="flex flex-col justify-end">
              <label className={labelCls}>Reenvío</label>
              <button
                type="button"
                onClick={() => set("reenvio", !form.reenvio)}
                className="flex items-center gap-2 h-[30px]"
              >
                <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form.reenvio ? "bg-emerald-500" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-150 ${form.reenvio ? "translate-x-4" : ""}`} />
                </div>
                <span className="text-xs text-muted-foreground">{form.reenvio ? "Sí" : "No"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <p className="text-xs text-destructive min-h-4">{error}</p>
          <div className="flex items-center justify-end gap-2">
          <button
            onClick={requestClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 border border-border rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-background rounded-lg transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Guardando..." : isAdd ? "Agregar" : "Guardar cambios"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Row Actions Menu -----------------------------------------------------------

function RowActions({
  onEdit, onDelete, estado, localizacion, onChangeEstado,
}: {
  onEdit: () => void;
  onDelete: () => void;
  estado: EstadoTramite;
  localizacion: string;
  onChangeEstado: (e: EstadoTramite, observaciones?: string, localizacion?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showRejection, setShowRejection] = useState(false);
  const [rejectionText, setRejectionText] = useState("");
  const [rejectionLoc, setRejectionLoc] = useState("");
  const [rejectionClosing, setRejectionClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const act = (fn: () => void) => { fn(); setOpen(false); };

  const handleMarcarRechazado = () => {
    setOpen(false);
    setRejectionText("");
    setRejectionLoc(localizacion);
    setRejectionClosing(false);
    setShowRejection(true);
  };

  const closeRejection = () => {
    if (rejectionClosing) return;
    setRejectionClosing(true);
    window.setTimeout(() => {
      setShowRejection(false);
      setRejectionText("");
      setRejectionLoc("");
      setRejectionClosing(false);
    }, 140);
  };

  const confirmRejection = () => {
    onChangeEstado("rechazado", rejectionText, rejectionLoc);
    closeRejection();
  };

  return (
    <>
    {showRejection && (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${rejectionClosing ? "app-overlay-out" : "app-overlay-in"}`}
        style={{ background: "rgba(15,25,60,0.35)", backdropFilter: "blur(6px)" }}
        onMouseDown={event => {
          if (event.target === event.currentTarget) closeRejection();
        }}
      >
        <div className={`bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl ${rejectionClosing ? "app-modal-out" : "app-modal-in"}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <p className="text-sm font-bold text-foreground">Motivo de Rechazo</p>
            </div>
            <button onClick={closeRejection} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Localización de documentos</label>
              <CustomSelect
                value={rejectionLoc}
                onChange={setRejectionLoc}
                options={[
                  { value: "", label: "Sin ubicación" },
                  { value: "Mazatlán", label: "Mazatlán" },
                  { value: "Culiacán", label: "Culiacán" },
                ]}
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Motivo de rechazo <span className="text-muted-foreground/40 normal-case tracking-normal">(opcional)</span></label>
              <textarea
                value={rejectionText}
                onChange={e => setRejectionText(e.target.value)}
                placeholder="Ej. Firma no coincide con identificación oficial..."
                rows={3}
                className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400/40 resize-none transition-all"
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
            <button
              onClick={closeRejection}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 border border-border rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmRejection}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Confirmar Rechazo
            </button>
          </div>
        </div>
      </div>
    )}
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg shadow-black/8 overflow-hidden w-44">
          <button
            onClick={() => act(onEdit)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-amber-400" />
            Editar
          </button>

          <div className="h-px bg-border mx-2" />

          {/* pendiente ? recibido */}
          {estado === "pendiente" && (
            <button
              onClick={() => act(() => onChangeEstado("recibido"))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-violet-500 hover:bg-violet-500/8 transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Marcar Recibido
            </button>
          )}

          {/* recibido ? en_proceso → rechazado → pendiente */}
          {estado === "recibido" && (<>
            <button
              onClick={() => act(() => onChangeEstado("enviado"))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-sky-500 hover:bg-sky-500/8 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Marcar Enviado
            </button>
            <button
              onClick={handleMarcarRechazado}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-orange-500 hover:bg-orange-500/8 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Marcar Rechazado
            </button>
            <button
              onClick={() => act(() => onChangeEstado("pendiente"))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary/60 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              Revertir a Pendiente
            </button>
          </>)}

          {/* enviado ? aceptado → rechazado → recibido */}
          {estado === "enviado" && (<>
            <button
              onClick={() => act(() => onChangeEstado("aceptado"))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/8 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Marcar Aceptado
            </button>
            <button
              onClick={handleMarcarRechazado}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-orange-500 hover:bg-orange-500/8 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Marcar Rechazado
            </button>
            <button
              onClick={() => act(() => onChangeEstado("recibido"))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-violet-500 hover:bg-violet-500/8 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              Revertir a Recibido
            </button>
          </>)}

          {/* aceptado ? enviado (revertir) */}
          {estado === "aceptado" && (<>
            <button
              onClick={() => act(() => onChangeEstado("enviado"))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-sky-500 hover:bg-sky-500/8 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              Revertir a Enviado
            </button>
          </>)}

          {/* rechazado ? en_proceso → recibido */}
          {estado === "rechazado" && (<>
            <button
              onClick={() => act(() => onChangeEstado("enviado"))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-sky-500 hover:bg-sky-500/8 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Marcar Enviado
            </button>
            <button
              onClick={() => act(() => onChangeEstado("recibido"))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-violet-500 hover:bg-violet-500/8 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              Revertir a Recibido
            </button>
          </>)}

          <div className="h-px bg-border mx-2" />
          <button
            onClick={() => act(onDelete)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-500 hover:bg-red-500/8 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      )}
    </div>
    </>
  );
}

function AlumnoContextMenu({
  alumno,
  x,
  y,
  onClose,
  onEdit,
  onDelete,
  onChangeEstado,
}: {
  alumno: Alumno;
  x: number;
  y: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeEstado: (e: EstadoTramite, observaciones?: string, localizacion?: string) => void;
}) {
  const [showRejection, setShowRejection] = useState(false);
  const [rejectionText, setRejectionText] = useState("");
  const [rejectionLoc, setRejectionLoc] = useState("");
  const [rejectionClosing, setRejectionClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const width = 176;
  const estimatedHeight = 310;
  const left = Math.min(Math.max(x, 8), Math.max(8, window.innerWidth - width - 8));
  const top = Math.min(Math.max(y, 8), Math.max(8, window.innerHeight - estimatedHeight - 8));

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const act = (fn: () => void) => { fn(); onClose(); };
  const handleMarcarRechazado = () => {
    setRejectionText("");
    setRejectionLoc(alumno.localizacion);
    setRejectionClosing(false);
    setShowRejection(true);
  };
  const closeRejection = () => {
    if (rejectionClosing) return;
    setRejectionClosing(true);
    window.setTimeout(() => {
      setShowRejection(false);
      onClose();
    }, 140);
  };
  const confirmRejection = () => {
    onChangeEstado("rechazado", rejectionText, rejectionLoc);
    closeRejection();
  };

  return createPortal(
    <>
      {showRejection && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${rejectionClosing ? "app-overlay-out" : "app-overlay-in"}`}
          style={{ background: "rgba(15,25,60,0.35)", backdropFilter: "blur(6px)" }}
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeRejection();
          }}
        >
          <div className={`bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl ${rejectionClosing ? "app-modal-out" : "app-modal-in"}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <p className="text-sm font-bold text-foreground">Motivo de Rechazo</p>
              </div>
              <button onClick={closeRejection} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Localización de documentos</label>
                <CustomSelect
                  value={rejectionLoc}
                  onChange={setRejectionLoc}
                  options={[
                    { value: "", label: "Sin ubicación" },
                    { value: "Mazatlán", label: "Mazatlán" },
                    { value: "Culiacán", label: "Culiacán" },
                  ]}
                  placeholder="Seleccionar..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Motivo de rechazo <span className="text-muted-foreground/40 normal-case tracking-normal">(opcional)</span></label>
                <textarea
                  value={rejectionText}
                  onChange={e => setRejectionText(e.target.value)}
                  placeholder="Ej. Firma no coincide con identificación oficial..."
                  rows={3}
                  className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400/40 resize-none transition-all"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
              <button onClick={closeRejection} className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 border border-border rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={confirmRejection} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
      {!showRejection && (
        <div
          ref={ref}
          className="fixed z-[85] bg-card border border-border rounded-xl shadow-lg shadow-black/8 overflow-hidden w-44 app-modal-in"
          style={{ left, top }}
          onClick={event => event.stopPropagation()}
        >
          <button onClick={() => act(onEdit)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors">
            <Pencil className="w-3.5 h-3.5 text-amber-400" />
            Editar
          </button>
          <div className="h-px bg-border mx-2" />
          {alumno.estado === "pendiente" && (
            <button onClick={() => act(() => onChangeEstado("recibido"))} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-violet-500 hover:bg-violet-500/8 transition-colors">
              <CalendarCheck className="w-3.5 h-3.5" />
              Marcar Recibido
            </button>
          )}
          {alumno.estado === "recibido" && (<>
            <button onClick={() => act(() => onChangeEstado("enviado"))} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-sky-500 hover:bg-sky-500/8 transition-colors">
              <Check className="w-3.5 h-3.5" />
              Marcar Enviado
            </button>
            <button onClick={handleMarcarRechazado} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-orange-500 hover:bg-orange-500/8 transition-colors">
              <X className="w-3.5 h-3.5" />
              Marcar Rechazado
            </button>
            <button onClick={() => act(() => onChangeEstado("pendiente"))} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary/60 transition-colors">
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              Revertir a Pendiente
            </button>
          </>)}
          {alumno.estado === "enviado" && (<>
            <button onClick={() => act(() => onChangeEstado("aceptado"))} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/8 transition-colors">
              <Check className="w-3.5 h-3.5" />
              Marcar Aceptado
            </button>
            <button onClick={handleMarcarRechazado} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-orange-500 hover:bg-orange-500/8 transition-colors">
              <X className="w-3.5 h-3.5" />
              Marcar Rechazado
            </button>
            <button onClick={() => act(() => onChangeEstado("recibido"))} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-violet-500 hover:bg-violet-500/8 transition-colors">
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              Revertir a Recibido
            </button>
          </>)}
          {alumno.estado === "aceptado" && (
            <button onClick={() => act(() => onChangeEstado("enviado"))} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-sky-500 hover:bg-sky-500/8 transition-colors">
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              Revertir a Enviado
            </button>
          )}
          {alumno.estado === "rechazado" && (<>
            <button onClick={() => act(() => onChangeEstado("enviado"))} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-sky-500 hover:bg-sky-500/8 transition-colors">
              <Check className="w-3.5 h-3.5" />
              Marcar Enviado
            </button>
            <button onClick={() => act(() => onChangeEstado("recibido"))} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-violet-500 hover:bg-violet-500/8 transition-colors">
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              Revertir a Recibido
            </button>
          </>)}
          <div className="h-px bg-border mx-2" />
          <button onClick={() => act(onDelete)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-500 hover:bg-red-500/8 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      )}
    </>,
    document.body
  );
}

// -- Admin: Alumnos Tab ---------------------------------------------------------

export function AlumnosTab({ alumnos, catalogos, onUpdate, onBulkUpdate, onDelete, onAdd, onToast }: {
  alumnos: Alumno[];
  catalogos?: Catalogos;
  onUpdate: (a: Alumno) => Promise<void> | void;
  onBulkUpdate: (ids: string[], changes: AlumnoBulkChanges) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onAdd: (a: Alumno) => Promise<void> | void;
  onToast?: (variant: "success" | "error" | "info", message: string) => void;
}) {
  const today = new Date();
  const [selectedMes, setSelectedMes] = useState(today.getMonth() + 1);
  const [selectedCicloAnioFin, setSelectedCicloAnioFin] = useState(getCicloEscolarAnioFin(today));
  const [search, setSearch] = useState("");
  const [filterEscuela, setFilterEscuela] = useState("");
  const [filterCarrera, setFilterCarrera] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterEstado, setFilterEstado] = useState<EstadoTramite | "">("");
  const [editTarget, setEditTarget] = useState<Alumno | null | "new">(undefined as never);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ alumno: Alumno; x: number; y: number } | null>(null);
  const academicCatalog = useMemo(() => buildAcademicCatalog(catalogos), [catalogos]);

  const openAdd = () => setEditTarget(null);
  const openEdit = (a: Alumno) => setEditTarget(a);
  const closeModal = () => setEditTarget(undefined as never);

  const handleSave = async (a: Alumno) => {
    if (editTarget === null) await onAdd(a);
    else await onUpdate(a);
  };

  const queueUpdate = (a: Alumno) => {
    void Promise.resolve(onUpdate(a)).catch(() => {});
  };

  const queueDelete = (id: string) => {
    void Promise.resolve(onDelete(id)).catch(() => {});
  };

  const runBulkUpdate = (ids: string[], changes: AlumnoBulkChanges) => {
    if (ids.length === 0 || bulkUpdating) return;
    setBulkUpdating(true);
    void Promise.resolve(onBulkUpdate(ids, changes))
      .then(() => setSelectedIds(new Set()))
      .catch(() => {})
      .finally(() => setBulkUpdating(false));
  };

  const changeAlumnoEstado = (
    alumno: Alumno,
    nuevoEstado: EstadoTramite,
    observaciones?: string,
    localizacion?: string,
  ) => {
    const today = new Date();
    const fechaHoy = fmtDate(today.getDate(), today.getMonth() + 1, today.getFullYear());
    const prev = alumno.estado;
    const fields: Partial<Alumno> = { estado: nuevoEstado };

    if (prev === "pendiente" && nuevoEstado === "recibido") {
      fields.recibido = fechaHoy;
      fields.localizacion = "Mazatlán";
    } else if (prev === "recibido" && nuevoEstado === "enviado") {
      fields.envio = fechaHoy;
      fields.reenvio = false;
      fields.localizacion = "Culiacán";
    } else if (prev === "recibido" && nuevoEstado === "pendiente") {
      fields.recibido = "";
      fields.localizacion = "";
    } else if (prev === "enviado" && nuevoEstado === "recibido") {
      fields.envio = "";
      fields.reenvio = false;
      fields.localizacion = "Mazatlán";
    } else if (prev === "rechazado" && nuevoEstado === "enviado") {
      fields.envio = fechaHoy;
      fields.reenvio = true;
      fields.localizacion = "Culiacán";
    } else if (prev === "rechazado" && nuevoEstado === "recibido") {
      fields.envio = "";
      fields.reenvio = false;
      fields.localizacion = "Mazatlán";
    }

    if (nuevoEstado === "aceptado") {
      fields.localizacion = "Culiacán";
    } else if (prev === "aceptado" && nuevoEstado === "enviado") {
      fields.localizacion = "Culiacán";
    }

    if (nuevoEstado === "rechazado") {
      if (observaciones !== undefined) fields.observaciones = observaciones;
      if (localizacion !== undefined) fields.localizacion = localizacion;
    }

    queueUpdate({ ...alumno, ...fields });
  };

  const selectedMonthYear = getPeriodoAnioForCiclo(selectedMes, selectedCicloAnioFin);
  const selectedCycleLabel = getCicloEscolarLabel(selectedCicloAnioFin);
  const currentMonth = today.getMonth() + 1;
  const currentCycleAnioFin = getCicloEscolarAnioFin(today);

  const availableCycles = useMemo(() => {
    const ciclos = new Set(alumnos.map(a => getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio)));
    ciclos.add(selectedCicloAnioFin);
    ciclos.add(getCicloEscolarAnioFin());
    return Array.from(ciclos).sort((a, b) => a - b);
  }, [alumnos, selectedCicloAnioFin]);

  const cicloAlumnos = useMemo(() =>
    alumnos.filter(a => getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio) === selectedCicloAnioFin),
    [alumnos, selectedCicloAnioFin]
  );

  const availableMonths = useMemo(() => {
    const ms = new Set(cicloAlumnos.map(a => a.mes));
    return Array.from(ms).sort((a, b) => a - b);
  }, [cicloAlumnos]);

  const mesAlumnos = useMemo(() =>
    cicloAlumnos.filter(a => a.mes === selectedMes),
    [cicloAlumnos, selectedMes]
  );

  const escuelasEnMes = useMemo(() => {
    const codes = Array.from(new Set(mesAlumnos.map(a => a.escuela))).sort();
    return codes.map(code => {
      const fac = academicCatalog.find(f => f.codigo === code);
      return { value: code, label: fac ? `${code} — ${fac.nombre}` : code };
    });
  }, [academicCatalog, mesAlumnos]);

  const carrerasEnMes = useMemo(() => {
    const base = filterEscuela
      ? mesAlumnos.filter(a => a.escuela === filterEscuela)
      : mesAlumnos;
    return Array.from(new Set(base.map(a => a.carrera))).sort();
  }, [mesAlumnos, filterEscuela]);

  const filtered = useMemo(() => {
    let result = mesAlumnos;
    if (filterEscuela) result = result.filter(a => a.escuela === filterEscuela);
    if (filterCarrera) result = result.filter(a => a.carrera === filterCarrera);
    if (filterEstado)  result = result.filter(a => a.estado === filterEstado);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.nombre.toLowerCase().includes(q) ||
        a.matricula.toLowerCase().includes(q) ||
        a.carrera.toLowerCase().includes(q) ||
        a.nivel.toLowerCase().includes(q) ||
        a.escuela.toLowerCase().includes(q)
      );
    }
    return result;
  }, [mesAlumnos, filterEscuela, filterCarrera, filterEstado, search]);

  const isModalOpen = editTarget !== (undefined as never);

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      {/* Edit / Add Modal */}
      {isModalOpen && (
        <EditModal
          alumno={editTarget === null ? null : (editTarget as Alumno)}
          mes={selectedMes}
          anio={selectedMonthYear}
          academicCatalog={academicCatalog}
          catalogos={catalogos}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {contextMenu && (
        <AlumnoContextMenu
          alumno={contextMenu.alumno}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={() => openEdit(contextMenu.alumno)}
          onDelete={() => setDeletingId(contextMenu.alumno.id)}
          onChangeEstado={(nuevoEstado, observaciones, localizacion) => {
            changeAlumnoEstado(contextMenu.alumno, nuevoEstado, observaciones, localizacion);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Alumnos Registrados</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Consulta y gestiona los registros mensuales</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Ciclo
          </span>
          <CustomSelect
            size="sm"
            className="w-28"
            value={String(selectedCicloAnioFin)}
            onChange={v => { setSelectedCicloAnioFin(Number(v)); setSelectedIds(new Set()); }}
            options={availableCycles.map(ciclo => ({
              value: String(ciclo),
              label: getCicloEscolarLabel(ciclo),
            }))}
          />
          {filterEstado === "enviado" && selectedIds.size > 0 && (
            <>
              <button
                disabled={bulkUpdating}
                onClick={() => runBulkUpdate(Array.from(selectedIds), { estado: "aceptado", localizacion: "Culiacán" })}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Marcar Aceptados
                <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] leading-none">{selectedIds.size}</span>
              </button>
              <button
                disabled={bulkUpdating}
                onClick={() => runBulkUpdate(Array.from(selectedIds), { estado: "rechazado" })}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
                Marcar Rechazados
                <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] leading-none">{selectedIds.size}</span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              void exportTramiteTituloXlsx(cicloAlumnos, selectedCicloAnioFin).catch(err => {
                onToast?.("error", `No se pudo generar el Excel - ${err instanceof Error ? err.message : "Intenta de nuevo."}`);
              });
            }}
            disabled={cicloAlumnos.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar Excel
          </button>
          {(() => {
            const alumnosElegibles = cicloAlumnos.filter(a =>
              selectedIds.has(a.id) && (a.estado === "recibido" || a.estado === "rechazado")
            );
            const elegibles = alumnosElegibles.map(a => a.id);
            const hojas = Math.ceil(elegibles.length / 20);
            const activo = elegibles.length > 0;
            return (
              <button
                disabled={!activo || bulkUpdating}
                onClick={() => {
                  if (bulkUpdating) return;
                  const today = new Date();
                  const fechaHoy = fmtDate(today.getDate(), today.getMonth() + 1, today.getFullYear());
                  const invalidAlumno = getInvalidFormatDateAlumno(alumnosElegibles, today);

                  if (invalidAlumno) {
                    onToast?.(
                      "error",
                      `No se generó el formato: ${invalidAlumno.nombre} tiene Recibido ${invalidAlumno.recibido}, posterior al Envío ${fechaHoy}.`
                    );
                    return;
                  }

                  setBulkUpdating(true);
                  void exportFormatoControlSolicitudesXlsx(alumnosElegibles)
                    .then(() => {
                      const recibidos = alumnosElegibles.filter(alumno => alumno.estado === "recibido").map(alumno => alumno.id);
                      const rechazados = alumnosElegibles.filter(alumno => alumno.estado === "rechazado").map(alumno => alumno.id);
                      return Promise.all([
                        recibidos.length > 0
                          ? onBulkUpdate(recibidos, { estado: "enviado", envio: fechaHoy, localizacion: "Culiacán", reenvio: false })
                          : Promise.resolve(),
                        rechazados.length > 0
                          ? onBulkUpdate(rechazados, { estado: "enviado", envio: fechaHoy, localizacion: "Culiacán", reenvio: true })
                          : Promise.resolve(),
                      ]);
                    })
                    .then(() => {
                      setSelectedIds(new Set());
                    })
                    .catch(err => {
                      onToast?.("error", `No se pudo generar el formato - ${err instanceof Error ? err.message : "Intenta de nuevo."}`);
                    })
                    .finally(() => setBulkUpdating(false));
                }}
                title={!activo ? "Selecciona alumnos recibidos o rechazados para generar formatos" : `Generar ${hojas} formato(s) con ${elegibles.length} alumno(s)`}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors shadow-sm ${
                  activo
                    ? "bg-accent hover:bg-accent/80 text-white"
                    : "bg-accent/10 border border-accent/25 text-accent opacity-40 cursor-not-allowed"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Generar Formato
                {activo && (
                  <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                    {elegibles.length} — {hojas} hoja{hojas !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Month tabs — all 12 months, dots indicate months with data */}
      <div className="flex-shrink-0">
        <div className="flex gap-1 bg-secondary/20 border border-border rounded-xl p-1">
          {CICLO_MESES.map(mes => {
            const hasData = availableMonths.includes(mes);
            const isActive = mes === selectedMes;
            const isCurrentMonth =
              mes === currentMonth &&
              selectedCicloAnioFin === currentCycleAnioFin;
            const showCurrentMonthIndicator = isCurrentMonth && !isActive;
            return (
              <button
                key={mes}
                onClick={() => { setSelectedMes(mes); setSelectedIds(new Set()); }}
                title={isCurrentMonth ? `${MESES[mes - 1]} es el mes actual` : MESES[mes - 1]}
                aria-label={isCurrentMonth ? `${MESES[mes - 1]}, mes actual` : MESES[mes - 1]}
                className={`relative flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-amber-400 text-background shadow"
                    : showCurrentMonthIndicator
                    ? "text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  {MESES_SHORT[mes - 1]}
                  {showCurrentMonthIndicator && (
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500/40" />
                  )}
                </span>
                {hasData && !isActive && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400/60" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters: Facultad ? Carrera */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Filtrar por</span>
        <CustomSelect
          size="sm"
          value={filterEscuela}
          onChange={v => { setFilterEscuela(v); setFilterCarrera(""); setSelectedIds(new Set()); }}
          options={[{ value: "", label: "Todas las facultades" }, ...escuelasEnMes]}
          placeholder="Facultad..."
          className="w-72"
          searchable
          searchPlaceholder="Buscar facultad..."
        />
        <CustomSelect
          size="sm"
          value={filterCarrera}
          onChange={v => { setFilterCarrera(v); setSelectedIds(new Set()); }}
          options={[{ value: "", label: "Todas las carreras" }, ...carrerasEnMes.map(c => ({ value: c, label: c }))]}
          placeholder="Carrera..."
          disabled={!filterEscuela}
          className="w-80 max-w-[38vw]"
          searchable
          searchPlaceholder="Buscar carrera..."
        />
        {(filterEscuela || filterCarrera) && (
          <button
            onClick={() => { setFilterEscuela(""); setFilterCarrera(""); setSelectedIds(new Set()); }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Estado legend — clickable color chips */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {([
          { value: "",          label: "Todos",     dot: "bg-border",          ring: "border-border",           text: "text-muted-foreground" },
          { value: "pendiente", label: "Pendiente", dot: "bg-slate-400",        ring: "border-slate-400",         text: "text-slate-500" },
          { value: "recibido",  label: "Recibido",  dot: "bg-violet-400",       ring: "border-violet-400",        text: "text-violet-500" },
          { value: "enviado",   label: "Enviado",   dot: "bg-sky-400",          ring: "border-sky-400",           text: "text-sky-500" },
          { value: "aceptado",  label: "Aceptado",  dot: "bg-emerald-500",      ring: "border-emerald-500",       text: "text-emerald-600" },
          { value: "rechazado", label: "Rechazado", dot: "bg-orange-400",       ring: "border-orange-400",        text: "text-orange-500" },
        ] as { value: EstadoTramite | ""; label: string; dot: string; ring: string; text: string }[]).map(({ value, label, dot, ring, text }) => {
          const isActive = filterEstado === value;
          const count = value === "" ? mesAlumnos.length : mesAlumnos.filter(a => a.estado === value).length;
          return (
            <button
              key={value}
              onClick={() => { setFilterEstado(isActive && value !== "" ? "" : value); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isActive
                  ? `${ring} bg-card shadow-sm ${text}`
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              {label}
              <span className={`text-[10px] font-mono ${isActive ? "opacity-70" : "opacity-40"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por matricula, nombre, carrera, nivel o escuela..."
            className="w-full bg-secondary/40 border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </span>
        {selectedIds.size > 0 && [...selectedIds].some(id => alumnos.find(a => a.id === id)?.estado === "pendiente") && (
          <button
            onClick={() => {
              const today = new Date();
              const fechaHoy = fmtDate(today.getDate(), today.getMonth() + 1, today.getFullYear());
              const pendientes = Array.from(selectedIds).filter(id => alumnos.find(a => a.id === id)?.estado === "pendiente");
              runBulkUpdate(pendientes, { estado: "recibido", recibido: fechaHoy, localizacion: "Mazatlán" });
            }}
            disabled={bulkUpdating}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors shadow-sm whitespace-nowrap"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Marcar Recibidos
            <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] leading-none">
              {[...selectedIds].filter(id => alumnos.find(a => a.id === id)?.estado === "pendiente").length}
            </span>
          </button>
        )}
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-400 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>

      {/* Table — fills remaining vertical space */}
      <div className="flex-1 min-h-0 -mx-6 -mb-6 bg-card border-t border-border overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-secondary border-b border-border">
                {/* Select-all checkbox */}
                <th className="pl-3 pr-1 py-2.5 w-8">
                  <Checkbox
                    checked={(() => { const s = filtered.filter(a => a.estado !== "enviado" && a.estado !== "aceptado" || filterEstado === "enviado"); return s.length > 0 && s.every(a => selectedIds.has(a.id)); })()}
                    indeterminate={filtered.some(a => selectedIds.has(a.id)) && !filtered.filter(a => a.estado !== "enviado" && a.estado !== "aceptado" || filterEstado === "enviado").every(a => selectedIds.has(a.id))}
                    onChange={checked => {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (checked) filtered.filter(a => a.estado !== "enviado" && a.estado !== "aceptado" || filterEstado === "enviado").forEach(a => next.add(a.id));
                        else filtered.forEach(a => next.delete(a.id));
                        return next;
                      });
                    }}
                  />
                </th>
                {[
                  "No.", "Matricula", "Nombre de Egresado", "Nivel", "Facultad", "Carrera",
                  "Trámite", "Prepa UAS", "Prepa", "Lic",
                  "Teléfono", "Tel. Alt.", "E-Mail",
                  "Ingreso", "Recibido", "Envío", "Reenvío", "Carta Poder",
                  "Localización", "Observaciones", "",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={23} className="px-4 py-12 text-center text-muted-foreground">
                    No hay registros para {MESES[selectedMes - 1]} {selectedMonthYear} del ciclo {selectedCycleLabel}
                    {search ? " con ese criterio de búsqueda" : ""}.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 200).map((a, i) => {
                  const isDeleting = deletingId === a.id;
                  const isSelected = selectedIds.has(a.id);
                  const selectable = a.estado !== "enviado" && a.estado !== "aceptado" || filterEstado === "enviado";
                  const nivelMeta = getNivelMeta(a.nivel, catalogos);
                  return (
                    <tr
                      key={a.id}
                      onClick={() => { if (!isDeleting) openEdit(a); }}
                      onContextMenu={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (isDeleting) return;
                        setContextMenu({ alumno: a, x: event.clientX, y: event.clientY });
                      }}
                      className={`border-b border-border/30 transition-colors group cursor-pointer ${
                        isDeleting
                          ? "bg-red-500/8"
                          : a.estado === "aceptado"
                          ? "bg-emerald-500/20"
                          : a.estado === "enviado"
                          ? "bg-sky-500/10"
                          : a.estado === "recibido"
                          ? "bg-violet-500/10"
                          : a.estado === "rechazado"
                          ? "bg-orange-500/8"
                          : isSelected
                          ? "bg-amber-400/8"
                          : i % 2 !== 0 ? "bg-secondary/5 hover:bg-secondary/20" : "hover:bg-secondary/20"
                      }`}
                    >
                      {isDeleting ? (
                        <td colSpan={23} className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <Trash2 className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                            <span className="text-xs text-red-400 font-medium flex-1">
                              ¿Eliminar el registro de <strong>{a.nombre}</strong>? Esta acción no se puede deshacer.
                            </span>
                            <button
                              onClick={() => { queueDelete(a.id); setDeletingId(null); }}
                              className="px-3 py-1 bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded text-[11px] font-semibold transition-colors"
                            >
                              Eliminar
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-3 py-1 bg-secondary/40 hover:bg-secondary/70 border border-border text-muted-foreground rounded text-[11px] font-semibold transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="pl-3 pr-1 py-2 w-8" onClick={e => e.stopPropagation()}>
                            {selectable ? (
                              <Checkbox
                                checked={isSelected}
                                onChange={checked => {
                                  setSelectedIds(prev => {
                                    const next = new Set(prev);
                                    if (checked) next.add(a.id);
                                    else next.delete(a.id);
                                    return next;
                                  });
                                }}
                              />
                            ) : (
                              <span className="w-4 h-4 block" />
                            )}
                          </td>
                          <td className="px-2 py-2 font-mono text-muted-foreground/40 select-none text-center w-8">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap text-sm">{a.matricula || <span className="text-muted-foreground/30">—</span>}</td>
                          <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{a.nombre}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="relative inline-block group/niv">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap cursor-default"
                                style={{
                                  backgroundColor: `${nivelMeta.color}18`,
                                  color: nivelMeta.color,
                                  border: `1px solid ${nivelMeta.color}30`,
                                }}
                              >
                                {nivelMeta.abreviatura}
                              </span>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-foreground text-background text-[11px] leading-snug rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover/niv:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                                {a.nivel}
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground font-mono text-center text-sm">
                            <div className="relative inline-block group/fac">
                              <span className="cursor-default">{a.escuela}</span>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-foreground text-background text-[11px] leading-snug rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover/fac:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                                {academicCatalog.find(f => f.codigo === a.escuela)?.nombre ?? a.escuela}
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[140px]">
                            <div className="relative inline-block max-w-full group/car">
                              <span className="block truncate cursor-default">{a.carrera}</span>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-xs px-2.5 py-1.5 bg-foreground text-background text-[11px] leading-snug rounded-lg shadow-lg opacity-0 group-hover/car:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                                {a.carrera}
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-foreground/70 text-center whitespace-nowrap">{a.tramite || <span className="text-muted-foreground/30">—</span>}</td>
                          <Chk val={a.prepaUAS} />
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{a.prepa || <span className="text-muted-foreground/30">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{a.lic || <span className="text-muted-foreground/30">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono whitespace-nowrap text-sm">{a.telefono}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono whitespace-nowrap text-sm">{a.telefonoAlt || <span className="text-muted-foreground/30">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[150px] truncate">{a.email}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{a.ingreso || <span className="text-muted-foreground/30">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{a.recibido || <span className="text-muted-foreground/30">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{a.envio || <span className="text-muted-foreground/30">—</span>}</td>
                          <Chk val={a.reenvio} />
                          <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">{a.cartaPoder || <span className="text-muted-foreground/30">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap text-xs">
                            {a.localizacion || <span className="text-muted-foreground/30">—</span>}
                          </td>
                          <td className="px-3 py-2 max-w-[160px]">
                            {a.observaciones
                              ? <FloatingTextTooltip value={a.observaciones} />
                              : <span className="text-muted-foreground/30">—</span>}
                          </td>
                          {/* Actions */}
                          <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <RowActions
                                onEdit={() => openEdit(a)}
                                onDelete={() => setDeletingId(a.id)}
                                estado={a.estado}
                                localizacion={a.localizacion}
                                onChangeEstado={(nuevoEstado, observaciones, localizacion) => {
                                  changeAlumnoEstado(a, nuevoEstado, observaciones, localizacion);
                                }}
                              />
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && (
          <div className="px-4 py-2.5 border-t border-border text-[11px] text-muted-foreground text-center bg-secondary/10 flex-shrink-0">
            Mostrando 200 de {filtered.length} registros. Exporta el archivo para ver todos.
          </div>
        )}
      </div>
    </div>
  );
}

// -- Admin: Métricas Tab --------------------------------------------------------
