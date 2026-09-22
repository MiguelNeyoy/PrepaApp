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
  MESES,
  MESES_SHORT,
  MODALIDADES,
  PREPARATORIAS,
  TIPOS_CERTIFICADO,
  TURNOS,
  exportFormatoControlSolicitudesXlsx,
  exportToCSV,
  exportTramiteTituloXlsx,
  fmtCurrency,
  fmtDate,
  getCicloEscolarAnioFin,
  getCicloEscolarAnioFinFromPeriodo,
  getCicloEscolarLabel,
  getPeriodoAnioForCiclo,
} from "../../domain";
import type {
  Alumno,
  AlumnoBulkChanges,
  Catalogos,
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
  return /^\d{8}$/.test(nc.trim());
}

function emptyAlumno(mes: number, anio: number, catalogos?: Catalogos): Alumno {
  const prepas = catalogos?.preparatorias?.length ? catalogos.preparatorias : PREPARATORIAS;
  const defaultPrepa = prepas[0];
  const today = new Date();
  const fechaHoy = fmtDate(today.getDate(), mes, anio);

  return {
    id: `new-${Date.now()}`,
    numeroCuenta: "",
    nombre: "",
    preparatoriaClave: defaultPrepa.clave,
    preparatoriaNombre: defaultPrepa.nombre,
    modalidad: defaultPrepa.modalidades[0] || "Escolarizada",
    turno: "Matutino",
    tipoCertificado: "Digital",
    tramite: "Certificado",
    tramiteId: "certificado",
    pago: COSTO_BASE_CERTIFICADO,
    email: "",
    telefono: "",
    telefonoAlt: "",
    generacion: `${anio - 3}-${anio}`,
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
  };
}

// -- Date field helper in modal -------------------------------------------------

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

  const clear = () => {
    onChange("");
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
          className="w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-xs text-foreground flex items-center justify-between hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-amber-400/25 transition-all text-left"
        >
          <span className={value ? "text-foreground font-mono" : "text-muted-foreground/40"}>
            {value || "dd/mes/aaaa"}
          </span>
          <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-2" />
        </button>

        {open &&
          createPortal(
            <div
              ref={dropdownRef}
              style={{ position: "fixed", top: pos.top, left: pos.left }}
              className="z-[9999] bg-card border border-border rounded-xl shadow-xl p-2 flex flex-col gap-1 min-w-[140px] text-xs app-dropdown-in"
            >
              <button
                type="button"
                onClick={setToday}
                className="px-3 py-1.5 rounded-lg text-left hover:bg-secondary text-foreground flex items-center gap-2 font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Hoy
              </button>
              {value && (
                <button
                  type="button"
                  onClick={clear}
                  className="px-3 py-1.5 rounded-lg text-left hover:bg-secondary text-red-400 flex items-center gap-2 font-medium border-t border-border/50"
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
  onSave,
  onClose,
}: {
  alumno: Alumno | null; // null = add mode
  mes: number;
  anio: number;
  catalogos?: Catalogos;
  onSave: (a: Alumno) => Promise<void> | void;
  onClose: () => void;
}) {
  const prepas = useMemo(
    () => (catalogos?.preparatorias?.length ? catalogos.preparatorias : PREPARATORIAS),
    [catalogos]
  );

  const [form, setForm] = useState<Alumno>(alumno ?? emptyAlumno(mes, anio, catalogos));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const isAdd = alumno === null;

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 140);
  };

  const set = <K extends keyof Alumno>(k: K, v: Alumno[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  // When preparatoria changes, update name and reset modalidad to first available
  const handlePrepaChange = (clave: string) => {
    const selected = prepas.find(p => p.clave === clave);
    if (!selected) return;
    setForm(prev => ({
      ...prev,
      preparatoriaClave: selected.clave,
      preparatoriaNombre: selected.nombre,
      modalidad: selected.modalidades[0] || "Escolarizada",
    }));
  };

  const selectedPrepa = prepas.find(p => p.clave === form.preparatoriaClave) || prepas[0];
  const modalidadOptions = selectedPrepa.modalidades.map(m => ({ value: m, label: m }));

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
      setError("El Número de Cuenta debe tener exactamente 8 dígitos numéricos sin guion.");
      return;
    }
    if (!form.nombre.trim()) {
      setError("Completa el Nombre Completo del alumno.");
      return;
    }
    if (!form.generacion.trim()) {
      setError("Completa la Generación (ej. 2021-2024).");
      return;
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
                Nivel Medio Superior — Sector Sur
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
          {/* Section 1: Alumno */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-2">
              Datos del Alumno
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>
                  Número de Cuenta (8 dígitos){requiredMark}
                </label>
                <input
                  className={`${fieldCls} font-mono font-bold text-amber-500 tracking-wider`}
                  value={form.numeroCuenta}
                  onChange={e => set("numeroCuenta", e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="20210041"
                  inputMode="numeric"
                  maxLength={8}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Nombre Completo{requiredMark}</label>
                <input
                  className={fieldCls}
                  value={form.nombre}
                  onChange={e => set("nombre", e.target.value.toUpperCase())}
                  placeholder="APELLIDO PATERNO MATERNO NOMBRE(S)"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Preparatoria y Modalidad */}
          <div className="border-t border-border/50 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-2">
              Adscripción y Programa Educativo
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Unidad Académica (Preparatoria){requiredMark}</label>
                <CustomSelect
                  value={form.preparatoriaClave}
                  onChange={handlePrepaChange}
                  options={prepaOptions}
                  placeholder="Seleccionar preparatoria..."
                  searchable
                  searchPlaceholder="Buscar por clave o nombre..."
                />
              </div>
              <div>
                <label className={labelCls}>Modalidad Ofertada{requiredMark}</label>
                <CustomSelect
                  value={form.modalidad}
                  onChange={v => set("modalidad", v as ModalidadPrepa)}
                  options={modalidadOptions}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Datos del Trámite */}
          <div className="border-t border-border/50 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-2">
              Detalles del Certificado
            </p>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Tipo de Certificado{requiredMark}</label>
                <CustomSelect
                  value={form.tipoCertificado}
                  onChange={v => set("tipoCertificado", v as TipoCertificado)}
                  options={TIPOS_CERTIFICADO.map(t => ({ value: t, label: t }))}
                />
              </div>

              <div>
                <label className={labelCls}>Turno{requiredMark}</label>
                <CustomSelect
                  value={form.turno}
                  onChange={v => set("turno", v as Turno)}
                  options={TURNOS.map(t => ({ value: t, label: t }))}
                />
              </div>

              <div>
                <label className={labelCls}>Generación{requiredMark}</label>
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
                <label className={labelCls}>
                  Costo ($ MXN){requiredMark}
                </label>
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
            </div>
          </div>

          {/* Section 4: Contacto (Opcional) */}
          <div className="border-t border-border/50 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Contacto con el Alumno (Opcional)
            </p>
            <div className="grid grid-cols-3 gap-4">
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
          </div>

          {/* Section 5: Fechas y Seguimiento */}
          <div className="border-t border-border/50 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Fechas y Seguimiento Físico
            </p>
            <div className="grid grid-cols-3 gap-4">
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

            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <label className={labelCls}>Carta Poder / Trámite</label>
                <input
                  className={fieldCls}
                  value={form.cartaPoder}
                  onChange={e => set("cartaPoder", e.target.value)}
                  placeholder="CP-3041"
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
              <div>
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
            </div>

            <div className="mt-3">
              <label className={labelCls}>Observaciones de Ventanilla</label>
              <textarea
                className={`${fieldCls} resize-none`}
                rows={2}
                value={form.observaciones}
                onChange={e => set("observaciones", e.target.value)}
                placeholder="Observaciones de documentos, cotejo o validación..."
              />
            </div>
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
  onUpdate,
  onBulkUpdate,
  onDelete,
  onAdd,
  onToast,
}: {
  alumnos: Alumno[];
  catalogos?: Catalogos;
  onUpdate: (a: Alumno) => Promise<void> | void;
  onBulkUpdate: (ids: string[], changes: AlumnoBulkChanges) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onAdd: (a: Alumno) => Promise<void> | void;
  onToast?: (msg: string, variant?: "success" | "info" | "error") => void;
}) {
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
          a.modalidad.toLowerCase().includes(q)
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
    setSelectedIds(new Set());
    onToast?.(`${ids.length} trámites marcados como recibidos`, "success");
  };

  const handleBulkEnviados = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const todayStr = fmtDate(today.getDate(), today.getMonth() + 1, today.getFullYear());
    await onBulkUpdate(ids, { estado: "enviado", envio: todayStr, localizacion: "Culiacán" });
    setSelectedIds(new Set());
    onToast?.(`${ids.length} trámites marcados como enviados`, "success");
  };

  // Metrics for header
  const totalMes = mesAlumnos.length;
  const pendientesMes = mesAlumnos.filter(a => a.estado === "pendiente").length;
  const recibidosMes = mesAlumnos.filter(a => a.estado === "recibido").length;
  const enviadosMes = mesAlumnos.filter(a => a.estado === "enviado").length;
  const aceptadosMes = mesAlumnos.filter(a => a.estado === "aceptado").length;
  const ingresoTotal = mesAlumnos.reduce((sum, a) => sum + (a.pago || 0), 0);

  const prepas = catalogos?.preparatorias?.length ? catalogos.preparatorias : PREPARATORIAS;
  const isModalOpen = editTarget !== (undefined as never);

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {isModalOpen && (
        <EditModal
          alumno={editTarget === null ? null : (editTarget as Alumno)}
          mes={selectedMes}
          anio={selectedMonthYear}
          catalogos={catalogos}
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
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cuenta, nombre o prepa..."
              className="w-full h-9 bg-card border border-border rounded-lg pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
            />
          </div>

          <select
            value={filterPrepa}
            onChange={e => setFilterPrepa(e.target.value)}
            className="h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 max-w-[200px]"
          >
            <option value="">Todas las preparatorias</option>
            {prepas.map(p => (
              <option key={p.clave} value={p.clave}>
                {p.clave} - {p.nombre}
              </option>
            ))}
          </select>

          <select
            value={filterModalidad}
            onChange={e => setFilterModalidad(e.target.value)}
            className="h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25"
          >
            <option value="">Todas las modalidades</option>
            {MODALIDADES.map(m => (
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
            onClick={() => exportToCSV(filtered, selectedMes, selectedMonthYear)}
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
                <th className="px-3 py-2.5">Preparatoria</th>
                <th className="px-3 py-2.5">Modalidad</th>
                <th className="px-3 py-2.5">Turno</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Generación</th>
                <th className="px-3 py-2.5 text-right">Costo</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-muted-foreground text-xs">
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
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary font-bold mr-1.5 text-muted-foreground">
                          {a.preparatoriaClave}
                        </span>
                        {a.preparatoriaNombre}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            a.modalidad === "Escolarizada"
                              ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                              : a.modalidad === "Semiescolarizada"
                              ? "bg-purple-500/10 border-purple-500/20 text-purple-500"
                              : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                          }`}
                        >
                          {a.modalidad}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {a.turno}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            a.tipoCertificado === "Digital"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          {a.tipoCertificado}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {a.generacion}
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
