import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { Building2, Check, ClipboardList, DollarSign, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { COSTO_BASE_CERTIFICADO, MODALIDADES } from "../../domain";
import type { Catalogos, ModalidadPrepa, Preparatoria, TramiteCatalogo } from "../../domain";

type CatalogTab = "preparatorias" | "tramites";
type StatusFilter = "todos" | "activos" | "inactivos";
type PanelMode = "create" | "edit";

type PanelState =
  | { tab: "preparatorias"; mode: PanelMode; value: Preparatoria }
  | { tab: "tramites"; mode: PanelMode; value: TramiteCatalogo };

export function CatalogosTab({
  catalogos,
  canManage,
  onCreatePreparatoria,
  onUpdatePreparatoria,
  onDeletePreparatoria,
  onCreateTramite,
  onUpdateTramite,
  onDeleteTramite,
}: {
  catalogos?: Catalogos;
  canManage: boolean;
  onCreatePreparatoria: (prepa: Preparatoria) => Promise<void> | void;
  onUpdatePreparatoria: (prepa: Preparatoria) => Promise<void> | void;
  onDeletePreparatoria: (prepa: Preparatoria) => Promise<void> | void;
  onCreateTramite: (tramite: TramiteCatalogo) => Promise<void> | void;
  onUpdateTramite: (tramite: TramiteCatalogo) => Promise<void> | void;
  onDeleteTramite: (tramite: TramiteCatalogo) => Promise<void> | void;
}) {
  const [tab, setTab] = useState<CatalogTab>("preparatorias");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const data = catalogos ?? { preparatorias: [], tramites: [] };
  const normalizedQuery = normalize(query);

  const filtered = useMemo(() => {
    const matchesStatus = (activo?: boolean) =>
      status === "todos" || (status === "activos" ? activo !== false : activo === false);

    if (tab === "preparatorias") {
      return (data.preparatorias || []).filter(item =>
        matchesStatus(item.activo) &&
        normalize(`${item.clave} ${item.nombre} ${(item.modalidades || []).join(" ")}`).includes(normalizedQuery)
      );
    }

    return (data.tramites || []).filter(item =>
      matchesStatus(item.activo) &&
      normalize(`${item.id} ${item.nombre}`).includes(normalizedQuery)
    );
  }, [data, normalizedQuery, status, tab]);

  const openCreate = () => {
    setError("");
    if (tab === "preparatorias") {
      setPanel({
        tab,
        mode: "create",
        value: { clave: "", nombre: "", modalidades: ["Escolarizada"], activo: true },
      });
    } else {
      setPanel({ tab, mode: "create", value: { id: "", nombre: "", activo: true } });
    }
  };

  const openEdit = (value: PanelState["value"]) => {
    setError("");
    setPanel({ tab, mode: "edit", value } as PanelState);
  };

  const submitPanel = async (nextValue: PanelState["value"]) => {
    if (!panel) return false;
    const validation = validateCatalog(panel.tab, panel.mode, nextValue, data);
    if (validation) {
      setError(validation);
      return false;
    }

    setSaving(true);
    setError("");
    try {
      if (panel.tab === "preparatorias") {
        panel.mode === "create"
          ? await onCreatePreparatoria(nextValue as Preparatoria)
          : await onUpdatePreparatoria(nextValue as Preparatoria);
      } else {
        panel.mode === "create"
          ? await onCreateTramite(nextValue as TramiteCatalogo)
          : await onUpdateTramite(nextValue as TramiteCatalogo);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando el registro.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deletePanel = async (target: PanelState["value"]) => {
    if (!panel) return false;
    setError("");
    try {
      if (panel.tab === "preparatorias") {
        await onDeletePreparatoria(target as Preparatoria);
      } else {
        await onDeleteTramite(target as TramiteCatalogo);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el registro.");
      return false;
    }
  };

  const tabs: { id: CatalogTab; label: string; icon: ElementType; count: number }[] = [
    { id: "preparatorias", label: "Preparatorias (Sector Sur)", icon: Building2, count: (data.preparatorias || []).length },
    { id: "tramites", label: "Trámites", icon: ClipboardList, count: (data.tramites || []).length },
  ];

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      {panel && (
        <SidePanel
          panel={panel}
          catalogos={data}
          saving={saving}
          error={error}
          canManage={canManage}
          onClose={() => setPanel(null)}
          onChange={value => {
            setError("");
            setPanel(prev => (prev ? ({ ...prev, value } as PanelState) : prev));
          }}
          onSubmit={submitPanel}
          onDelete={deletePanel}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Catálogos de Preparatoria</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestión de unidades académicas del Sector Sur, modalidades educativas y trámites
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="font-semibold">Costo Base Certificado:</span>
            <span className="font-mono font-bold">${COSTO_BASE_CERTIFICADO}.00 MXN</span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className="h-9 px-4 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Preparatoria
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-secondary/20 border border-border rounded-xl p-1 flex-shrink-0">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setQuery("");
              setStatus("todos");
            }}
            className={`flex-1 h-9 rounded-lg px-3 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              tab === item.id
                ? "bg-amber-400 text-slate-900 shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
            <span className="font-mono text-[10px] px-1.5 py-0.2 bg-black/10 dark:bg-white/10 rounded-full">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {!canManage && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-200 flex-shrink-0">
          No tienes permisos de administrador. Puedes consultar los catálogos, pero solo un administrador puede guardar cambios.
        </div>
      )}

      {/* Search and filter toolbar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Buscar por clave, nombre o modalidad..."
            className="w-full h-9 bg-secondary/50 border border-border rounded-lg pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40 transition-all"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as StatusFilter)}
          className="h-9 px-3 bg-secondary/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25"
        >
          <option value="todos">Todos los estados</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="h-full overflow-auto">
          {tab === "preparatorias" && (
            <PreparatoriasTable
              rows={filtered as Preparatoria[]}
              canManage={canManage}
              onEdit={openEdit}
            />
          )}
          {tab === "tramites" && (
            <TramitesTable
              rows={filtered as TramiteCatalogo[]}
              canManage={canManage}
              onEdit={openEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// Sub-Tables
// --------------------------------------------------------------------------------

function PreparatoriasTable({
  rows,
  canManage,
  onEdit,
}: {
  rows: Preparatoria[];
  canManage: boolean;
  onEdit: (value: Preparatoria) => void;
}) {
  return (
    <CatalogTable headers={["Clave", "Unidad Académica (Preparatoria)", "Programas / Modalidades", "Estado", ""]}>
      {rows.map(row => (
        <tr
          key={row.clave}
          tabIndex={0}
          onClick={() => onEdit(row)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onEdit(row);
            }
          }}
          className="border-b border-border/60 hover:bg-secondary/30 focus:bg-secondary/30 focus:outline-none cursor-pointer transition-colors"
        >
          <Cell mono className="font-bold text-amber-500">{row.clave}</Cell>
          <Cell strong>{row.nombre}</Cell>
          <Cell>
            <div className="flex flex-wrap gap-1">
              {(row.modalidades || []).map(m => (
                <span
                  key={m}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    m === "Escolarizada"
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                      : m === "Semiescolarizada"
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-500"
                      : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                  }`}
                >
                  {m}
                </span>
              ))}
            </div>
          </Cell>
          <Cell>
            <StatusBadge active={row.activo !== false} />
          </Cell>
          <ActionCell canManage={canManage} onClick={() => onEdit(row)} />
        </tr>
      ))}
      {rows.length === 0 && <EmptyRow colSpan={5} />}
    </CatalogTable>
  );
}

function TramitesTable({
  rows,
  canManage,
  onEdit,
}: {
  rows: TramiteCatalogo[];
  canManage: boolean;
  onEdit: (value: TramiteCatalogo) => void;
}) {
  return (
    <CatalogTable headers={["Identificador", "Nombre del Trámite", "Estado", ""]}>
      {rows.map(row => (
        <tr
          key={row.id}
          tabIndex={0}
          onClick={() => onEdit(row)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onEdit(row);
            }
          }}
          className="border-b border-border/60 hover:bg-secondary/30 focus:bg-secondary/30 focus:outline-none cursor-pointer transition-colors"
        >
          <Cell mono>{row.id}</Cell>
          <Cell strong>{row.nombre}</Cell>
          <Cell>
            <StatusBadge active={row.activo !== false} />
          </Cell>
          <ActionCell canManage={canManage} onClick={() => onEdit(row)} />
        </tr>
      ))}
      {rows.length === 0 && <EmptyRow colSpan={4} />}
    </CatalogTable>
  );
}

// --------------------------------------------------------------------------------
// SidePanel Form Drawer
// --------------------------------------------------------------------------------

function SidePanel({
  panel,
  saving,
  error,
  canManage,
  onClose,
  onChange,
  onSubmit,
  onDelete,
}: {
  panel: PanelState;
  catalogos: Catalogos;
  saving: boolean;
  error: string;
  canManage: boolean;
  onClose: () => void;
  onChange: (value: PanelState["value"]) => void;
  onSubmit: (value: PanelState["value"]) => Promise<boolean>;
  onDelete: (value: PanelState["value"]) => Promise<boolean>;
}) {
  const [closing, setClosing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const value = panel.value;
  const isPrepa = panel.tab === "preparatorias";
  const title = panel.mode === "create"
    ? isPrepa ? "Nueva Preparatoria" : "Nuevo Trámite"
    : isPrepa ? "Editar Preparatoria" : "Editar Trámite";

  const update = (patch: Record<string, unknown>) =>
    onChange({ ...value, ...patch } as PanelState["value"]);

  const toggleActive = () =>
    update({ activo: !(value as { activo?: boolean }).activo });

  const requestClose = () => {
    if (closing || deleting) return;
    setClosing(true);
    window.setTimeout(onClose, 150);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const deleted = await onDelete(value);
    setDeleting(false);
    if (deleted) requestClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex justify-end ${
        closing ? "app-overlay-out" : "app-overlay-in"
      }`}
      onMouseDown={e => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <form
        onSubmit={async e => {
          e.preventDefault();
          const saved = await onSubmit(value);
          if (saved) requestClose();
        }}
        className={`h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col ${
          closing ? "app-sidepanel-out" : "app-sidepanel-in"
        }`}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sector Sur — Nivel Medio Superior</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isPrepa && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Clave de la Escuela <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  value={(value as Preparatoria).clave}
                  disabled={panel.mode === "edit"}
                  onChange={e => update({ clave: e.target.value.trim() })}
                  placeholder="Ej. 8210"
                  className="w-full h-9 bg-secondary/50 border border-border rounded-lg px-3 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Nombre de la Unidad Académica <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  value={(value as Preparatoria).nombre}
                  onChange={e => update({ nombre: e.target.value })}
                  placeholder="Ej. Preparatoria Concordia"
                  className="w-full h-9 bg-secondary/50 border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Modalidades Educativas Ofertadas <span className="text-amber-500">*</span>
                </label>
                <div className="space-y-2 bg-secondary/20 p-3 rounded-xl border border-border">
                  {MODALIDADES.map(mod => {
                    const currentMods = (value as Preparatoria).modalidades || [];
                    const isChecked = currentMods.includes(mod);
                    return (
                      <label key={mod} className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...currentMods, mod]
                              : currentMods.filter(m => m !== mod);
                            update({ modalidades: next });
                          }}
                          className="w-4 h-4 rounded border-border text-amber-500 focus:ring-amber-400/20"
                        />
                        <span className="font-medium">{mod}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!isPrepa && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Identificador ID
                </label>
                <input
                  type="text"
                  value={(value as TramiteCatalogo).id}
                  disabled={panel.mode === "edit"}
                  onChange={e => update({ id: slugify(e.target.value) })}
                  placeholder="certificado"
                  className="w-full h-9 bg-secondary/50 border border-border rounded-lg px-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Nombre del Trámite
                </label>
                <input
                  type="text"
                  value={(value as TramiteCatalogo).nombre}
                  onChange={e => update({ nombre: e.target.value })}
                  placeholder="Certificado"
                  className="w-full h-9 bg-secondary/50 border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                />
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={toggleActive}
              disabled={!canManage || saving || deleting}
              className={`w-full h-10 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                (value as { activo?: boolean }).activo !== false
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-500"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {(value as { activo?: boolean }).activo !== false ? "Registro Activo" : "Registro Inactivo"}
            </button>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        {confirmDelete && (
          <div className="mx-6 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5">
            <p className="text-xs font-bold text-red-600 dark:text-red-300">
              ¿Eliminar {(value as { nombre: string }).nombre}?
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="h-8 px-3 rounded-lg border border-border bg-card text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-8 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirmar
              </button>
            </div>
          </div>
        )}

        <div className="p-6 border-t border-border flex items-center justify-between gap-3 bg-secondary/10">
          <div>
            {panel.mode === "edit" && canManage && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
                className="h-9 px-3 rounded-lg border border-red-500/25 text-red-500 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving || deleting}
              className="h-9 px-4 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            {canManage && (
              <button
                type="submit"
                disabled={saving || deleting}
                className="h-9 px-5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// --------------------------------------------------------------------------------
// Utility Components & Helpers
// --------------------------------------------------------------------------------

function CatalogTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-xs text-left">
      <thead className="sticky top-0 bg-secondary/90 backdrop-blur-sm border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="px-4 py-2.5">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">{children}</tbody>
    </table>
  );
}

function Cell({
  children,
  strong,
  mono,
  className = "",
}: {
  children: React.ReactNode;
  strong?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3 text-xs ${
        strong ? "font-semibold text-foreground" : "text-muted-foreground"
      } ${mono ? "font-mono" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

function ActionCell({ canManage, onClick }: { canManage: boolean; onClick: () => void }) {
  return (
    <td className="px-4 py-3 text-right">
      {canManage && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onClick();
              }}
              className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors inline-flex"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Editar registro</TooltipContent>
        </Tooltip>
      )}
    </td>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        active
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/10 border-red-500/20 text-red-500"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-red-500"}`} />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-xs text-muted-foreground">
        No se encontraron registros que coincidan con la búsqueda.
      </td>
    </tr>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugify(text: string) {
  return normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function validateCatalog(
  tab: CatalogTab,
  _mode: PanelMode,
  value: PanelState["value"],
  _catalogos: Catalogos
): string | null {
  if (tab === "preparatorias") {
    const p = value as Preparatoria;
    if (!p.clave.trim()) return "La clave de la preparatoria es obligatoria.";
    if (!p.nombre.trim()) return "El nombre de la preparatoria es obligatorio.";
    if (!p.modalidades || p.modalidades.length === 0) return "Debes seleccionar al menos una modalidad.";
  } else {
    const t = value as TramiteCatalogo;
    if (!t.nombre.trim()) return "El nombre del trámite es obligatorio.";
  }
  return null;
}
