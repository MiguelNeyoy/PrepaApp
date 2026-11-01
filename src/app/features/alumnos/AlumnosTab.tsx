import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  MoreHorizontal,
  Pencil,
  Save,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { CustomSelect } from "../../components/controls";
import {
  CICLO_MESES,
  COSTO_BASE_CERTIFICADO,
  FACULTADES_LICENCIATURA,
  MESES,
  MESES_ABR,
  MESES_SHORT,
  MODALIDADES,
  PREPARATORIAS,
  TIPOS_CERTIFICADO,
  TURNOS,
  exportFormatoControlSolicitudesXlsx,
  exportToCSV,
  fmtCurrency,
  fmtDate,
  getCicloEscolarAnioFin,
  getCicloEscolarAnioFinFromPeriodo,
  getCicloEscolarLabel,
  getDefaultCarreraCodigo,
  getPeriodoAnioForCiclo,
  loadSavedFolioCorte,
} from "../../domain";
import type {
  Alumno,
  AlumnoBulkChanges,
  Catalogos,
  DivisionAcademica,
  EstadoTramite,
  ModalidadPrepa,
  Preparatoria,
  TipoCertificado,
  Turno,
} from "../../domain";

// -- Styled checkbox ------------------------------------------------------------

function Checkbox({
  checked,
  indeterminate,
  onChange,
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
      {indeterminate && !checked ? (
        <span className="w-2 h-0.5 rounded-full bg-white" />
      ) : checked ? (
        <Check className="w-2.5 h-2.5 text-slate-900" strokeWidth={3} />
      ) : null}
    </button>
  );
}

// -- Helpers --------------------------------------------------------------------

function formatGeneration(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

function isValidNumeroCuenta(nc: string): boolean {
  return /^\d{6,8}$/.test(nc.trim());
}

function emptyAlumno(
  mes: number,
  anio: number,
  catalogos?: Catalogos,
  costoBase = COSTO_BASE_CERTIFICADO,
  division: DivisionAcademica = "bachillerato"
): Alumno {
  const fallbackList = division === "licenciatura" ? FACULTADES_LICENCIATURA : PREPARATORIAS;
  const prepas = catalogos?.preparatorias?.length ? catalogos.preparatorias : fallbackList;
  const defaultPrepa = prepas[0] ?? fallbackList[0];
  const defaultModalidad =
    defaultPrepa.modalidades[0] || (division === "licenciatura" ? "LICENCIATURA" : "Escolarizada");
  const today = new Date();
  const fechaHoy = fmtDate(today.getDate(), mes, anio);
  const cicloActual = getCicloEscolarLabel(getCicloEscolarAnioFinFromPeriodo(mes, anio));
  const aniosDuracion = division === "licenciatura" ? 5 : 3;

  return {
    id: `new-${Date.now()}`,
    numeroCuenta: "",
    nombre: "",
    curp: "",
    folioRecibo: "",
    cicloRecibo: cicloActual,
    preparatoriaClave: defaultPrepa.clave,
    preparatoriaNombre: defaultPrepa.nombre,
    modalidad: defaultModalidad,
    carreraCodigo: getDefaultCarreraCodigo(defaultModalidad, division),
    planEstudio: "18",
    microfilm: "",
    revisoHistorial: true,
    revisoKardex: true,
    turno: "Matutino",
    tipoCertificado: "Digital",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: costoBase,
    email: "",
    telefono: "",
    telefonoAlt: "",
    generacion: `${anio - aniosDuracion}-${anio}`,
    recibio: fechaHoy,
    ingreso: fechaHoy,
    recibido: "",
    envio: "",
    reenvio: false,
    cartaPoder: "",
    cartaPorte: "",
    localizacion: "",
    observaciones: "",
    estado: "pendiente",
    mes,
    anio,
    division,
  };
}

// -- Date field helper in modal -------------------------------------------------

function toHtmlDateValue(displayDate: string): string {
  if (!displayDate) return "";
  const match = displayDate.match(/^(\d{1,2})\/([A-Za-zÁÉÍÓÚáéíóúÑñ]{3})\/(\d{4})$/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const monthIdx = MESES_ABR.findIndex(m => m.toLowerCase() === match[2].toLowerCase()) + 1;
  if (!monthIdx) return "";
  const month = String(monthIdx).padStart(2, "0");
  const year = match[3];
  return `${year}-${month}-${day}`;
}

function fromHtmlDateValue(htmlDate: string): string {
  if (!htmlDate) return "";
  const [year, month, day] = htmlDate.split("-").map(Number);
  if (!year || !month || !day) return "";
  return fmtDate(day, month, year);
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const setToday = () => {
    const today = new Date();
    onChange(fmtDate(today.getDate(), today.getMonth() + 1, today.getFullYear()));
    setOpen(false);
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    onChange(fmtDate(yesterday.getDate(), yesterday.getMonth() + 1, yesterday.getFullYear()));
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setOpen(false);
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onChange("");
    } else {
      onChange(fromHtmlDateValue(val));
    }
    setOpen(false);
  };

  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </span>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-xs text-foreground flex items-center justify-between hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-amber-400/25 transition-all text-left cursor-pointer"
        >
          <span className={value ? "text-foreground font-mono font-medium" : "text-muted-foreground/40"}>
            {value || "dd/mes/aaaa"}
          </span>
          <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-2" />
        </button>

        {open &&
          createPortal(
            <div
              ref={dropdownRef}
              style={{ position: "fixed", top: pos.top, left: pos.left }}
              className="z-[9999] bg-card border border-border rounded-xl shadow-2xl p-3 flex flex-col gap-2 min-w-[210px] text-xs app-dropdown-in"
            >
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={setToday}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={setYesterday}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Ayer
                </button>
              </div>

              <div className="border-t border-border/60 pt-2 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Elegir en calendario
                </span>
                <input
                  type="date"
                  value={toHtmlDateValue(value)}
                  onChange={handleCustomDateChange}
                  className="w-full bg-secondary/80 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/25 cursor-pointer"
                />
              </div>

              {value && (
                <button
                  type="button"
                  onClick={clear}
                  className="px-2.5 py-1.5 rounded-lg text-left hover:bg-red-500/10 text-red-500 flex items-center gap-2 font-medium border-t border-border/50 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Limpiar fecha
                </button>
              )}
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}

// -- Edit / Add Modal -----------------------------------------------------------

function EditModal({
  alumno,
  mes,
  anio,
  catalogos,
  division = "bachillerato",
  costoBase = COSTO_BASE_CERTIFICADO,
  onSave,
  onClose,
}: {
  alumno: Alumno | null; // null = add mode
  mes: number;
  anio: number;
  catalogos?: Catalogos;
  division?: DivisionAcademica;
  costoBase?: number;
  onSave: (a: Alumno) => Promise<void> | void;
  onClose: () => void;
}) {
  const isLicenciatura = division === "licenciatura";
  const fallbackList = isLicenciatura ? FACULTADES_LICENCIATURA : PREPARATORIAS;
  const prepas = useMemo(
    () => (catalogos?.preparatorias?.length ? catalogos.preparatorias : fallbackList),
    [catalogos, fallbackList]
  );

  const [form, setForm] = useState<Alumno>(alumno ?? emptyAlumno(mes, anio, catalogos, costoBase, division));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showDetails, setShowDetails] = useState(() => {
    if (!alumno) return false;
    return Boolean(alumno.telefono || alumno.email || alumno.cartaPoder || alumno.recibio);
  });

  const isAdd = alumno === null;

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 140);
  };

  const set = <K extends keyof Alumno>(k: K, v: Alumno[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  // When preparatoria/facultad changes, update name and reset modalidad/carrera to first available
  const handlePrepaChange = (clave: string) => {
    const selected = prepas.find(p => p.clave === clave);
    if (!selected) return;
    const nextModalidad = selected.modalidades[0] || (isLicenciatura ? "LICENCIATURA" : "Escolarizada");
    setForm(prev => ({
      ...prev,
      preparatoriaClave: selected.clave,
      preparatoriaNombre: selected.nombre,
      modalidad: nextModalidad,
      carreraCodigo: getDefaultCarreraCodigo(nextModalidad, division),
      division,
    }));
  };

  const handleModalidadChange = (nextModalidad: ModalidadPrepa) => {
    setForm(prev => ({
      ...prev,
      modalidad: nextModalidad,
      carreraCodigo: getDefaultCarreraCodigo(nextModalidad, division),
    }));
  };

  const selectedPrepa = prepas.find(p => p.clave === form.preparatoriaClave) || prepas[0] || fallbackList[0];
  const rawModalidades = selectedPrepa.modalidades.includes(form.modalidad)
    ? selectedPrepa.modalidades
    : [form.modalidad, ...selectedPrepa.modalidades].filter(Boolean);
  const modalidadOptions = rawModalidades.map(m => ({ value: m, label: m }));

  const prepaOptions = prepas.map(p => ({
    value: p.clave,
    label: `${p.clave} — ${p.nombre}`,
  }));

  const fieldCls =
    "w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40";
  const labelCls =
    "block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1";
  const requiredMark = <span className="text-amber-400 ml-1">*</span>;

  const handleSaveClick = async () => {
    const nc = form.numeroCuenta.trim();
    if (!nc) {
      setError("Completa el Número de Cuenta del alumno.");
      return;
    }
    if (!isValidNumeroCuenta(nc)) {
      setError("El Número de Cuenta debe contener únicamente dígitos numéricos sin guion.");
      return;
    }
    if (!form.nombre.trim()) {
      setError("Completa el Nombre Completo del alumno.");
      return;
    }
    if (!form.generacion.trim()) {
      form.generacion = `${anio - 3}-${anio}`;
    }
    if (form.pago === undefined || isNaN(form.pago) || form.pago < 0) {
      setError("Indica un costo válido para el trámite.");
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
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        closing ? "app-overlay-out" : "app-overlay-in"
      }`}
      style={{ background: "rgba(15,25,60,0.45)", backdropFilter: "blur(6px)" }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        className={`bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl ${
          closing ? "app-modal-out" : "app-modal-in"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                isAdd ? "bg-amber-400/10 border-amber-400/25" : "bg-blue-400/10 border-blue-400/25"
              }`}
            >
              {isAdd ? (
                <UserPlus className="w-4 h-4 text-amber-500" />
              ) : (
                <Pencil className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">
                {isAdd ? "Captura de Certificado en Ventanilla" : "Editar Solicitud de Certificado"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isLicenciatura ? "Nivel Licenciatura — Sector Sur" : "Nivel Medio Superior — Sector Sur"}
              </p>
            </div>
          </div>
          <button
            onClick={requestClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Bloque 1: Solicitante y Recibo de Pago */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              1. Solicitante y Recibo de Pago
            </p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <label className={labelCls}>
                  No. Cuenta (sin guion){requiredMark}
                </label>
                <input
                  className={`${fieldCls} font-mono font-bold text-amber-500 tracking-wider`}
                  value={form.numeroCuenta}
                  onChange={e => set("numeroCuenta", e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="23401737"
                  inputMode="numeric"
                  maxLength={8}
                />
              </div>
              <div className="col-span-5">
                <label className={labelCls}>Nombre Completo del Solicitante{requiredMark}</label>
                <input
                  className={fieldCls}
                  value={form.nombre}
                  onChange={e => set("nombre", e.target.value.toUpperCase())}
                  placeholder="APELLIDO PATERNO MATERNO NOMBRE(S)"
                />
              </div>
              <div className="col-span-4">
                <label className={labelCls}>CURP (18 caracteres)</label>
                <input
                  className={`${fieldCls} font-mono uppercase tracking-wider`}
                  value={form.curp || ""}
                  onChange={e => set("curp", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 18))}
                  placeholder="CECG080910HNLRRLA3"
                  maxLength={18}
                />
              </div>
              <div className="col-span-6">
                <label className={labelCls}>Folio del Recibo de Pago</label>
                <input
                  className={`${fieldCls} font-mono`}
                  value={form.folioRecibo || ""}
                  onChange={e => set("folioRecibo", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="14495580"
                  inputMode="numeric"
                />
              </div>
              <div className="col-span-6">
                <label className={labelCls}>Ciclo del Recibo</label>
                <input
                  className={`${fieldCls} font-mono`}
                  value={form.cicloRecibo || ""}
                  onChange={e => set("cicloRecibo", e.target.value)}
                  placeholder="2025-2026"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Adscripción y Plan de Estudios */}
          <div className="border-t border-border/50 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              2. Adscripción y Plan de Estudios
            </p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <label className={labelCls}>Clave UA (Sincronizada)</label>
                <input
                  readOnly
                  className={`${fieldCls} font-mono font-bold bg-secondary/40 text-muted-foreground text-center cursor-not-allowed`}
                  value={form.preparatoriaClave}
                  title="Clave oficial de la Unidad Académica"
                />
              </div>
              <div className="col-span-5">
                <label className={labelCls}>
                  {isLicenciatura ? "Facultad / Unidad Académica" : "Unidad Académica (Preparatoria)"}
                  {requiredMark}
                </label>
                <CustomSelect
                  value={form.preparatoriaClave}
                  onChange={handlePrepaChange}
                  options={prepaOptions}
                  placeholder={isLicenciatura ? "Seleccionar facultad..." : "Seleccionar preparatoria..."}
                  searchable
                  searchPlaceholder="Buscar por clave o nombre..."
                />
              </div>
              <div className="col-span-4">
                <label className={labelCls}>
                  {isLicenciatura ? "Licenciatura / Carrera" : "Modalidad"}
                  {requiredMark}
                </label>
                <CustomSelect
                  value={form.modalidad}
                  onChange={v => handleModalidadChange(v as ModalidadPrepa)}
                  options={modalidadOptions}
                  searchable={isLicenciatura}
                  searchPlaceholder="Buscar carrera..."
                />
              </div>
              <div className="col-span-3">
                <label className={labelCls}>{isLicenciatura ? "Cód. Carrera" : "Carrera (Cód. 1/2/3)"}</label>
                <input
                  className={`${fieldCls} font-mono text-center font-bold`}
                  value={form.carreraCodigo ?? getDefaultCarreraCodigo(form.modalidad, division)}
                  onChange={e => set("carreraCodigo", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder={isLicenciatura ? "Opc." : "1"}
                  inputMode="numeric"
                />
              </div>
              <div className="col-span-3">
                <label className={labelCls}>Plan de Estudio</label>
                <input
                  className={`${fieldCls} font-mono text-center font-bold`}
                  value={form.planEstudio ?? "18"}
                  onChange={e => set("planEstudio", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="18"
                  inputMode="numeric"
                />
              </div>
              <div className="col-span-6">
                <label className={labelCls}># de Microfilm (Kárdex / Archivo)</label>
                <input
                  className={`${fieldCls} font-mono uppercase font-semibold`}
                  value={form.microfilm || ""}
                  onChange={e => set("microfilm", e.target.value.toUpperCase())}
                  placeholder="826020230373"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Cotejo Académico y Estado del Trámite */}
          <div className="border-t border-border/50 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              3. Cotejo Académico y Estado del Trámite
            </p>

            {/* Notas preventivas de cotejo */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer select-none">
                <Checkbox
                  checked={form.revisoHistorial !== false}
                  onChange={checked => set("revisoHistorial", checked)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Revisó Historial Académico ({form.revisoHistorial !== false ? "SI" : "NO"})
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    * Evitar doble calificación
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer select-none">
                <Checkbox
                  checked={form.revisoKardex !== false}
                  onChange={checked => set("revisoKardex", checked)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Revisó Kárdex ({form.revisoKardex !== false ? "SI" : "NO"})
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    * Evitar materias pendientes
                  </p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">
                <label className={labelCls}>Costo ($ MXN){requiredMark}</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    className={`${fieldCls} pl-6 font-mono font-bold`}
                    value={form.pago}
                    onChange={e => set("pago", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="col-span-8">
                <label className={labelCls}>Estado del Trámite</label>
                <CustomSelect
                  value={form.estado}
                  onChange={v => set("estado", v as EstadoTramite)}
                  options={[
                    { value: "pendiente", label: "Pendiente" },
                    { value: "recibido", label: "Recibido" },
                    { value: "enviado", label: "Enviado" },
                    { value: "aceptado", label: "Aceptado / Entregado" },
                    { value: "rechazado", label: "Rechazado" },
                  ]}
                />
              </div>
              <div className="col-span-12">
                <label className={labelCls}>Observaciones de Ventanilla</label>
                <textarea
                  className={`${fieldCls} resize-none`}
                  rows={2}
                  value={form.observaciones}
                  onChange={e => set("observaciones", e.target.value)}
                  placeholder="Observaciones de cotejo, documentos pendientes o incidencias..."
                />
              </div>
            </div>
          </div>

          {/* Bloque Secundario / Colapsable: Datos Adicionales de Archivo y Contacto */}
          <div className="border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={() => setShowDetails(prev => !prev)}
              className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                {showDetails ? <ChevronDown className="w-3.5 h-3.5 text-amber-500" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Datos Adicionales de Archivo y Contacto (Opcional)
              </span>
              <span className="text-[10px] lowercase text-muted-foreground/60 font-normal">
                {showDetails ? "ocultar" : "mostrar campos secundarios"}
              </span>
            </button>

            {showDetails && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Generación</label>
                    <input
                      className={fieldCls}
                      value={form.generacion}
                      onChange={e => set("generacion", formatGeneration(e.target.value))}
                      placeholder="2021-2024"
                      inputMode="numeric"
                      maxLength={9}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Tipo de Certificado</label>
                    <CustomSelect
                      value={form.tipoCertificado}
                      onChange={v => set("tipoCertificado", v as TipoCertificado)}
                      options={TIPOS_CERTIFICADO.map(t => ({ value: t, label: t }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Turno</label>
                    <CustomSelect
                      value={form.turno}
                      onChange={v => set("turno", v as Turno)}
                      options={TURNOS.map(t => ({ value: t, label: t }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Teléfono Personal</label>
                    <input
                      className={fieldCls}
                      value={form.telefono || ""}
                      onChange={e => set("telefono", e.target.value)}
                      placeholder="10 dígitos"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Teléfono Alternativo</label>
                    <input
                      className={fieldCls}
                      value={form.telefonoAlt || ""}
                      onChange={e => set("telefonoAlt", e.target.value)}
                      placeholder="10 dígitos"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Correo Electrónico</label>
                    <input
                      className={fieldCls}
                      type="email"
                      value={form.email || ""}
                      onChange={e => set("email", e.target.value)}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <DateField
                      label="Documentos Recibidos"
                      value={form.recibio}
                      onChange={v => set("recibio", v)}
                    />
                  </div>
                  <div>
                    <DateField
                      label="Recepción en Archivo"
                      value={form.recibido}
                      onChange={v => set("recibido", v)}
                    />
                  </div>
                  <div>
                    <DateField
                      label="Envío a Certificación"
                      value={form.envio}
                      onChange={v => set("envio", v)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Folio Carta Poder</label>
                    <input
                      className={fieldCls}
                      value={form.cartaPoder}
                      onChange={e => set("cartaPoder", e.target.value)}
                      placeholder="Ej. CP-102 (solo si viene apoderado)"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Localización Física</label>
                    <CustomSelect
                      value={form.localizacion}
                      onChange={v => set("localizacion", v)}
                      options={[
                        { value: "", label: "Sin ubicación" },
                        { value: "Mazatlán", label: "Mazatlán" },
                        { value: "Concordia", label: "Concordia" },
                        { value: "El Rosario", label: "El Rosario" },
                        { value: "Escuinapa", label: "Escuinapa" },
                        { value: "Culiacán", label: "Culiacán" },
                      ]}
                      placeholder="Seleccionar..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs font-semibold text-red-500">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0 bg-secondary/10">
          <button
            type="button"
            onClick={requestClose}
            className="h-9 px-4 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving}
            className="h-9 px-5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Guardando..." : isAdd ? "Guardar Trámite" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Main Component: AlumnosTab -------------------------------------------------

export function AlumnosTab({
  alumnos,
  catalogos,
  division = "bachillerato",
  costoBase,
  onUpdate,
  onBulkUpdate,
  onDelete,
  onAdd,
  onToast,
}: {
  alumnos: Alumno[];
  catalogos?: Catalogos;
  division?: DivisionAcademica;
  costoBase?: number;
  onUpdate: (a: Alumno) => Promise<void> | void;
  onBulkUpdate: (ids: string[], changes: AlumnoBulkChanges) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onAdd: (a: Alumno) => Promise<void> | void;
  onToast?: (msg: string, variant?: "success" | "info" | "error") => void;
}) {
  const isLicenciatura = division === "licenciatura";
  const today = new Date();
  const currentCycleEndYear = getCicloEscolarAnioFin();

  const [selectedCicloAnioFin, setSelectedCicloAnioFin] = useState(currentCycleEndYear);
  const [selectedMes, setSelectedMes] = useState(today.getMonth() + 1);
  const [filterPrepa, setFilterPrepa] = useState("");
  const [filterModalidad, setFilterModalidad] = useState("");
  const [filterTipoCertificado, setFilterTipoCertificado] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [editTarget, setEditTarget] = useState<Alumno | null | "new">(undefined as never);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedCycleLabel = getCicloEscolarLabel(selectedCicloAnioFin);
  const selectedMonthYear = getPeriodoAnioForCiclo(selectedMes, selectedCicloAnioFin);

  const availableCycles = useMemo(() => {
    const ciclos = new Set(alumnos.map(a => getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio)));
    ciclos.add(selectedCicloAnioFin);
    ciclos.add(currentCycleEndYear);
    return Array.from(ciclos).sort((a, b) => a - b);
  }, [alumnos, selectedCicloAnioFin, currentCycleEndYear]);

  const cicloAlumnos = useMemo(
    () =>
      alumnos.filter(a => getCicloEscolarAnioFinFromPeriodo(a.mes, a.anio) === selectedCicloAnioFin),
    [alumnos, selectedCicloAnioFin]
  );

  const mesAlumnos = useMemo(
    () => cicloAlumnos.filter(a => a.mes === selectedMes),
    [cicloAlumnos, selectedMes]
  );

  const filtered = useMemo(() => {
    let list = mesAlumnos;
    if (filterPrepa) list = list.filter(a => a.preparatoriaClave === filterPrepa);
    if (filterModalidad) list = list.filter(a => a.modalidad === filterModalidad);
    if (filterTipoCertificado) list = list.filter(a => a.tipoCertificado === filterTipoCertificado);
    if (filterEstado) list = list.filter(a => a.estado === filterEstado);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        a =>
          a.nombre.toLowerCase().includes(q) ||
          a.numeroCuenta.toLowerCase().includes(q) ||
          a.preparatoriaNombre.toLowerCase().includes(q) ||
          a.preparatoriaClave.toLowerCase().includes(q) ||
          a.modalidad.toLowerCase().includes(q) ||
          (a.curp && a.curp.toLowerCase().includes(q)) ||
          (a.folioRecibo && a.folioRecibo.toLowerCase().includes(q)) ||
          (a.cicloRecibo && a.cicloRecibo.toLowerCase().includes(q)) ||
          (a.microfilm && a.microfilm.toLowerCase().includes(q))
      );
    }
    return list;
  }, [mesAlumnos, filterPrepa, filterModalidad, filterTipoCertificado, filterEstado, search]);

  const openAdd = () => setEditTarget(null);
  const openEdit = (a: Alumno) => setEditTarget(a);
  const closeModal = () => setEditTarget(undefined as never);

  const handleSave = async (a: Alumno) => {
    if (editTarget === null) {
      await onAdd(a);
      onToast?.("Trámite registrado correctamente", "success");
    } else {
      await onUpdate(a);
      onToast?.("Trámite actualizado", "success");
    }
  };

  const handleBulkRecibidos = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const todayStr = fmtDate(today.getDate(), today.getMonth() + 1, today.getFullYear());
    await onBulkUpdate(ids, { estado: "recibido", recibido: todayStr, localizacion: "Mazatlán" });
    onToast?.(`${ids.length} trámites marcados como recibidos (listos para Generar Formato Corte)`, "success");
  };

  const handleBulkEnviados = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const todayStr = fmtDate(today.getDate(), today.getMonth() + 1, today.getFullYear());
    await onBulkUpdate(ids, { estado: "enviado", envio: todayStr, localizacion: "Culiacán" });
    setSelectedIds(new Set());
    onToast?.(`${ids.length} trámites marcados como enviados`, "success");
  };

  const [exportingFormato, setExportingFormato] = useState(false);
  const [folioCorte, setFolioCorte] = useState(() => loadSavedFolioCorte(division));

  useEffect(() => {
    setFolioCorte(loadSavedFolioCorte(division));
    setFilterPrepa("");
    setFilterModalidad("");
    setSelectedIds(new Set());
  }, [division]);

  const selectedAlumnos = useMemo(() => {
    return cicloAlumnos.filter(a => selectedIds.has(a.id));
  }, [cicloAlumnos, selectedIds]);

  const alumnosElegiblesCorte = useMemo(() => {
    return selectedAlumnos.filter(a => a.estado === "recibido" || a.estado === "rechazado");
  }, [selectedAlumnos]);

  const isOfficialCorte = alumnosElegiblesCorte.length > 0;
  const targetAlumnosExport = isOfficialCorte
    ? alumnosElegiblesCorte
    : selectedIds.size > 0
    ? selectedAlumnos
    : filtered;

  const targetCount = targetAlumnosExport.length;
  const totalHojas = Math.max(1, Math.ceil(targetCount / 20));

  const handleExportarFormatoURS = async () => {
    if (targetAlumnosExport.length === 0 || exportingFormato) return;
    setExportingFormato(true);
    try {
      const fallbackFolio = division === "licenciatura" ? "01" : "09";
      const cleanFolio = folioCorte.trim() || fallbackFolio;
      await exportFormatoControlSolicitudesXlsx(targetAlumnosExport, cleanFolio, division);

      if (isOfficialCorte) {
        const todayStr = fmtDate(today.getDate(), today.getMonth() + 1, today.getFullYear());
        const recibidos = alumnosElegiblesCorte
          .filter(a => a.estado === "recibido")
          .map(a => a.id);
        const rechazados = alumnosElegiblesCorte
          .filter(a => a.estado === "rechazado")
          .map(a => a.id);

        await Promise.all([
          recibidos.length > 0
            ? onBulkUpdate(recibidos, { estado: "enviado", envio: todayStr, localizacion: "Culiacán", reenvio: false })
            : Promise.resolve(),
          rechazados.length > 0
            ? onBulkUpdate(rechazados, { estado: "enviado", envio: todayStr, localizacion: "Culiacán", reenvio: true })
            : Promise.resolve(),
        ]);

        setSelectedIds(new Set());
        const hojas = Math.max(1, Math.ceil(alumnosElegiblesCorte.length / 20));
        onToast?.(
          `Corte Folio ${cleanFolio} generado (${alumnosElegiblesCorte.length} alumnos en ${hojas} hoja${hojas > 1 ? "s" : ""}) y enviados a Culiacán`,
          "success"
        );
      } else {
        const hojas = Math.max(1, Math.ceil(targetAlumnosExport.length / 20));
        onToast?.(
          `Reporte URS generado (${targetAlumnosExport.length} alumnos en ${hojas} hoja${hojas > 1 ? "s" : ""})`,
          "success"
        );
      }
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Error al exportar formato URS", "error");
    } finally {
      setExportingFormato(false);
    }
  };

  // Metrics for header
  const totalMes = mesAlumnos.length;
  const pendientesMes = mesAlumnos.filter(a => a.estado === "pendiente").length;
  const recibidosMes = mesAlumnos.filter(a => a.estado === "recibido").length;
  const enviadosMes = mesAlumnos.filter(a => a.estado === "enviado").length;
  const aceptadosMes = mesAlumnos.filter(a => a.estado === "aceptado").length;
  const ingresoTotal = mesAlumnos.reduce((sum, a) => sum + (a.pago || 0), 0);

  const fallbackPrepas = isLicenciatura ? FACULTADES_LICENCIATURA : PREPARATORIAS;
  const prepas = catalogos?.preparatorias?.length ? catalogos.preparatorias : fallbackPrepas;

  const filterModalidadOptions = useMemo(() => {
    if (!isLicenciatura) return MODALIDADES;
    const sourceUnits = filterPrepa ? prepas.filter(p => p.clave === filterPrepa) : prepas;
    const set = new Set<string>();
    for (const unit of sourceUnits) {
      for (const carrera of unit.modalidades) {
        if (carrera) set.add(carrera);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [filterPrepa, isLicenciatura, prepas]);

  const isModalOpen = editTarget !== (undefined as never);

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {isModalOpen && (
        <EditModal
          alumno={editTarget === null ? null : (editTarget as Alumno)}
          mes={selectedMes}
          anio={selectedMonthYear}
          catalogos={catalogos}
          division={division}
          costoBase={costoBase}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {/* Top Bar: Ciclo Escolar & Month Selector */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <select
            value={selectedCicloAnioFin}
            onChange={e => setSelectedCicloAnioFin(Number(e.target.value))}
            className="h-9 px-3 bg-card border border-border rounded-lg text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 shadow-sm"
          >
            {availableCycles.map(c => (
              <option key={c} value={c}>
                Ciclo Escolar {getCicloEscolarLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Month Tabs */}
        <div className="flex-1 flex gap-1 bg-secondary/20 border border-border rounded-xl p-1 overflow-x-auto">
          {CICLO_MESES.map(m => {
            const isCurrent = m === selectedMes;
            const count = cicloAlumnos.filter(a => a.mes === m).length;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setSelectedMes(m);
                  setSelectedIds(new Set());
                }}
                className={`flex-1 min-w-[54px] h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  isCurrent
                    ? "bg-amber-400 text-slate-900 font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {MESES_SHORT[m - 1]}
                {count > 0 && (
                  <span
                    className={`text-[9px] px-1 rounded-full ${
                      isCurrent ? "bg-slate-900/20 text-slate-900" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-6 gap-3 flex-shrink-0">
        <div className="bg-card border border-border rounded-xl px-3 py-2">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Mes</p>
          <p className="text-lg font-mono font-bold text-foreground">{totalMes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2">
          <p className="text-[10px] uppercase font-bold text-amber-500">Pendientes</p>
          <p className="text-lg font-mono font-bold text-amber-500">{pendientesMes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2">
          <p className="text-[10px] uppercase font-bold text-purple-400">Recibidos</p>
          <p className="text-lg font-mono font-bold text-purple-400">{recibidosMes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2">
          <p className="text-[10px] uppercase font-bold text-sky-400">Enviados</p>
          <p className="text-lg font-mono font-bold text-sky-400">{enviadosMes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2">
          <p className="text-[10px] uppercase font-bold text-emerald-400">Aceptados</p>
          <p className="text-lg font-mono font-bold text-emerald-400">{aceptadosMes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2">
          <p className="text-[10px] uppercase font-bold text-emerald-500">Recaudado</p>
          <p className="text-sm font-mono font-bold text-emerald-500 mt-1">{fmtCurrency(ingresoTotal)}</p>
        </div>
      </div>

      {/* Toolbar: Filters, Bulk Actions, Search, Add */}
      <div className="flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isLicenciatura ? "Buscar por cuenta, nombre, CURP, folio, microfilm..." : "Buscar por cuenta, nombre, CURP, folio, microfilm..."}
              className="w-full h-9 bg-card border border-border rounded-lg pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
            />
          </div>

          <select
            value={filterPrepa}
            onChange={e => {
              setFilterPrepa(e.target.value);
              if (isLicenciatura) setFilterModalidad("");
            }}
            className="h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 max-w-[210px]"
          >
            <option value="">{isLicenciatura ? "Todas las facultades" : "Todas las preparatorias"}</option>
            {prepas.map(p => (
              <option key={p.clave} value={p.clave}>
                {p.clave} - {p.nombre}
              </option>
            ))}
          </select>

          <select
            value={filterModalidad}
            onChange={e => setFilterModalidad(e.target.value)}
            className="h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 max-w-[220px]"
          >
            <option value="">{isLicenciatura ? "Todas las carreras" : "Todas las modalidades"}</option>
            {filterModalidadOptions.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={filterTipoCertificado}
            onChange={e => setFilterTipoCertificado(e.target.value)}
            className="h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25"
          >
            <option value="">Físico y Digital</option>
            {TIPOS_CERTIFICADO.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
            className="h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="recibido">Recibido</option>
            <option value="enviado">Enviado</option>
            <option value="aceptado">Aceptado / Entregado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-emerald-600/40 bg-emerald-600/10 overflow-hidden shadow-sm">
            <label className="flex items-center gap-1.5 pl-2.5 pr-2 h-9 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Folio:
              <input
                type="text"
                value={folioCorte}
                onChange={e => setFolioCorte(e.target.value.slice(0, 6))}
                placeholder={division === "licenciatura" ? "01" : "09"}
                className="w-11 h-6 rounded bg-card border border-emerald-500/40 px-1.5 text-center font-mono text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                title="Número de Folio del Corte (ej. 09)"
              />
            </label>
            <button
              type="button"
              disabled={exportingFormato || targetCount === 0}
              onClick={handleExportarFormatoURS}
              className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              title={
                isOfficialCorte
                  ? "Descarga el formato de Corte de Certificados URS (20 por hoja) y actualiza automáticamente el estado a Enviado (Culiacán)"
                  : "Exporta los registros actuales en el formato oficial URS (20 por hoja) sin modificar estados"
              }
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {exportingFormato
                ? "Generando..."
                : isOfficialCorte
                ? `Generar Corte (${targetCount})`
                : selectedIds.size > 0
                ? `Exportar URS (${targetCount})`
                : "Exportar URS"}
              <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">
                {totalHojas} hoja{totalHojas > 1 ? "s" : ""}
              </span>
            </button>
          </div>

          {selectedIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleBulkRecibidos}
                className="h-9 px-3 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                Marcar Recibidos ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={handleBulkEnviados}
                className="h-9 px-3 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                Marcar Enviados ({selectedIds.size})
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => exportToCSV(filtered, selectedMes, selectedMonthYear, division)}
            className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors shadow-sm"
            title="Exportar registros del mes a CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            CSV
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="h-9 px-4 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nuevo Trámite
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 z-10 bg-secondary/90 backdrop-blur-sm border-b border-border text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              <tr>
                <th className="pl-3 pr-1 py-2.5 w-8">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.every(a => selectedIds.has(a.id))}
                    indeterminate={filtered.some(a => selectedIds.has(a.id)) && !filtered.every(a => selectedIds.has(a.id))}
                    onChange={checked => {
                      if (checked) setSelectedIds(new Set(filtered.map(a => a.id)));
                      else setSelectedIds(new Set());
                    }}
                  />
                </th>
                <th className="px-2 py-2.5 w-8 text-center">#</th>
                <th className="px-3 py-2.5">No. Cuenta</th>
                <th className="px-3 py-2.5">Nombre del Alumno</th>
                <th className="px-3 py-2.5">Folio Recibo</th>
                <th className="px-3 py-2.5">Ciclo Recibo</th>
                <th className="px-3 py-2.5">{isLicenciatura ? "Clave / Facultad" : "Clave / Preparatoria"}</th>
                <th className="px-3 py-2.5">{isLicenciatura ? "Carrera" : "Modalidad"}</th>
                <th className="px-2 py-2.5 text-center">Plan</th>
                <th className="px-3 py-2.5">CURP</th>
                <th className="px-3 py-2.5"># Microfilm</th>
                <th className="px-2 py-2.5 text-center">Historial / Kárdex</th>
                <th className="px-3 py-2.5 text-right">Costo</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-muted-foreground text-xs">
                    No hay solicitudes para {MESES[selectedMes - 1]} de {selectedMonthYear}
                    {search ? " que coincidan con la búsqueda" : ""}.
                  </td>
                </tr>
              ) : (
                filtered.map((a, i) => {
                  const isSelected = selectedIds.has(a.id);
                  const isDeleting = deletingId === a.id;

                  return (
                    <tr
                      key={a.id}
                      onClick={() => openEdit(a)}
                      className={`hover:bg-secondary/30 transition-colors cursor-pointer ${
                        isSelected ? "bg-amber-400/10" : ""
                      }`}
                    >
                      <td className="pl-3 pr-1 py-2 w-8" onClick={e => e.stopPropagation()}>
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
                      </td>
                      <td className="px-2 py-2 font-mono text-muted-foreground/50 text-center select-none">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-amber-500 whitespace-nowrap">
                        {a.numeroCuenta || "—"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">
                        {a.nombre}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {a.folioRecibo || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {a.cicloRecibo || "—"}
                      </td>
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary font-bold mr-1.5 text-muted-foreground">
                          {a.preparatoriaClave}
                        </span>
                        {a.preparatoriaNombre}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          title={a.modalidad}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block max-w-[220px] truncate align-middle ${
                            isLicenciatura
                              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-300"
                              : a.modalidad === "Escolarizada"
                              ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                              : a.modalidad === "Semiescolarizada"
                              ? "bg-purple-500/10 border-purple-500/20 text-purple-500"
                              : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                          }`}
                        >
                          {a.modalidad}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-mono text-center text-muted-foreground whitespace-nowrap">
                        {a.planEstudio || "18"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground uppercase whitespace-nowrap">
                        {a.curp || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground uppercase whitespace-nowrap">
                        {a.microfilm || "—"}
                      </td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-mono text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              a.revisoHistorial !== false
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-500 border border-red-500/20"
                            }`}
                            title={a.revisoHistorial !== false ? "Historial Académico revisado" : "Historial Académico NO revisado"}
                          >
                            H:{a.revisoHistorial !== false ? "SI" : "NO"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              a.revisoKardex !== false
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-500 border border-red-500/20"
                            }`}
                            title={a.revisoKardex !== false ? "Kárdex revisado" : "Kárdex NO revisado"}
                          >
                            K:{a.revisoKardex !== false ? "SI" : "NO"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-foreground text-right whitespace-nowrap">
                        {fmtCurrency(a.pago ?? COSTO_BASE_CERTIFICADO)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            a.estado === "aceptado"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : a.estado === "enviado"
                              ? "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                              : a.estado === "recibido"
                              ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                              : a.estado === "rechazado"
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}
                        >
                          {a.estado === "aceptado" ? "Entregado" : a.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
                            title="Editar trámite"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`¿Eliminar trámite de ${a.nombre}?`)) {
                                await onDelete(a.id);
                                onToast?.("Trámite eliminado", "info");
                              }
                            }}
                            className="w-7 h-7 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                            title="Eliminar trámite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
