import { useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { BookOpen, Building2, Check, ClipboardList, Edit3, Layers3, Plus, Search, X } from "lucide-react";
import { CustomSelect } from "../../components/controls";
import type { Catalogos, CarreraCatalogo, Facultad, NivelCatalogo, TramiteCatalogo } from "../../domain";

type CatalogTab = "facultades" | "carreras" | "niveles" | "tramites";
type StatusFilter = "todos" | "activos" | "inactivos";
type PanelMode = "create" | "edit";

type PanelState =
  | { tab: "facultades"; mode: PanelMode; value: Facultad }
  | { tab: "carreras"; mode: PanelMode; value: CarreraCatalogo | Omit<CarreraCatalogo, "id"> }
  | { tab: "niveles"; mode: PanelMode; value: NivelCatalogo }
  | { tab: "tramites"; mode: PanelMode; value: TramiteCatalogo };

export function CatalogosTab({
  catalogos,
  canManage,
  onCreateFacultad,
  onUpdateFacultad,
  onCreateCarrera,
  onUpdateCarrera,
  onCreateNivel,
  onUpdateNivel,
  onCreateTramite,
  onUpdateTramite,
}: {
  catalogos?: Catalogos;
  canManage: boolean;
  onCreateFacultad: (facultad: Facultad) => Promise<void> | void;
  onUpdateFacultad: (facultad: Facultad) => Promise<void> | void;
  onCreateCarrera: (carrera: Omit<CarreraCatalogo, "id">) => Promise<void> | void;
  onUpdateCarrera: (carrera: CarreraCatalogo) => Promise<void> | void;
  onCreateNivel: (nivel: NivelCatalogo) => Promise<void> | void;
  onUpdateNivel: (nivel: NivelCatalogo) => Promise<void> | void;
  onCreateTramite: (tramite: TramiteCatalogo) => Promise<void> | void;
  onUpdateTramite: (tramite: TramiteCatalogo) => Promise<void> | void;
}) {
  const [tab, setTab] = useState<CatalogTab>("facultades");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const data = catalogos ?? { niveles: [], facultades: [], carreras: [], tramites: [] };
  const normalizedQuery = normalize(query);

  const filtered = useMemo(() => {
    const matchesStatus = (activo?: boolean) =>
      status === "todos" || (status === "activos" ? activo !== false : activo === false);

    if (tab === "facultades") {
      return data.facultades.filter(item =>
        matchesStatus(item.activo) &&
        normalize(`${item.codigo} ${item.nombre}`).includes(normalizedQuery)
      );
    }

    if (tab === "carreras") {
      return data.carreras.filter(item => {
        const facultad = data.facultades.find(f => f.codigo === item.facultadCodigo);
        const nivel = data.niveles.find(n => n.id === item.nivelId);
        return matchesStatus(item.activo) &&
          normalize(`${item.nombre} ${item.facultadCodigo} ${facultad?.nombre ?? ""} ${nivel?.nombre ?? ""}`).includes(normalizedQuery);
      });
    }

    if (tab === "niveles") {
      return data.niveles.filter(item =>
        matchesStatus(item.activo) &&
        normalize(`${item.id} ${item.nombre} ${item.abreviatura}`).includes(normalizedQuery)
      );
    }

    return data.tramites.filter(item =>
      matchesStatus(item.activo) &&
      normalize(`${item.id} ${item.nombre}`).includes(normalizedQuery)
    );
  }, [data, normalizedQuery, status, tab]);

  const openCreate = () => {
    setError("");
    if (tab === "facultades") {
      setPanel({ tab, mode: "create", value: { codigo: "", nombre: "", carreras: [], activo: true } });
    } else if (tab === "carreras") {
      setPanel({
        tab,
        mode: "create",
        value: {
          facultadCodigo: data.facultades.find(f => f.activo !== false)?.codigo ?? "",
          nivelId: data.niveles.find(n => n.activo)?.id ?? "",
          nombre: "",
          activo: true,
        },
      });
    } else if (tab === "niveles") {
      const nextOrden = Math.max(0, ...data.niveles.map(n => n.orden)) + 10;
      setPanel({
        tab,
        mode: "create",
        value: { id: "", nombre: "", abreviatura: "", pago: 0, colorHex: "#3b82f6", orden: nextOrden, activo: true },
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
      if (panel.tab === "facultades") {
        panel.mode === "create"
          ? await onCreateFacultad(nextValue as Facultad)
          : await onUpdateFacultad(nextValue as Facultad);
      } else if (panel.tab === "carreras") {
        panel.mode === "create"
          ? await onCreateCarrera(nextValue as Omit<CarreraCatalogo, "id">)
          : await onUpdateCarrera(nextValue as CarreraCatalogo);
      } else if (panel.tab === "niveles") {
        panel.mode === "create"
          ? await onCreateNivel(nextValue as NivelCatalogo)
          : await onUpdateNivel(nextValue as NivelCatalogo);
      } else {
        panel.mode === "create"
          ? await onCreateTramite(nextValue as TramiteCatalogo)
          : await onUpdateTramite(nextValue as TramiteCatalogo);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el catálogo.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: CatalogTab; label: string; icon: ElementType; count: number }[] = [
    { id: "facultades", label: "Facultades", icon: Building2, count: data.facultades.length },
    { id: "carreras", label: "Carreras", icon: BookOpen, count: data.carreras.length },
    { id: "niveles", label: "Niveles", icon: Layers3, count: data.niveles.length },
    { id: "tramites", label: "Trámites", icon: ClipboardList, count: data.tramites.length },
  ];

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      {panel && (
        <CatalogPanel
          panel={panel}
          catalogos={data}
          error={error}
          saving={saving}
          canManage={canManage}
          onClose={() => setPanel(null)}
          onChange={value => {
            setError("");
            setPanel(prev => prev ? ({ ...prev, value } as PanelState) : prev);
          }}
          onSubmit={submitPanel}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Catálogos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Administración de facultades, carreras, niveles y trámites</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className="h-9 px-4 rounded-lg bg-amber-400 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-secondary/20 border border-border rounded-xl p-1">
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
                ? "bg-amber-400 text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
            <span className="font-mono text-[10px] opacity-70">{item.count}</span>
          </button>
        ))}
      </div>

      {!canManage && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-200">
          No tienes permisos para administrar catálogos. Puedes consultarlos, pero solo un administrador puede guardar cambios.
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Buscar..."
            className="w-full h-9 bg-secondary/50 border border-border rounded-lg pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40 transition-all"
          />
        </div>
        <CustomSelect
          size="sm"
          value={status}
          onChange={value => setStatus(value as StatusFilter)}
          options={[
            { label: "Todos", value: "todos" },
            { label: "Activos", value: "activos" },
            { label: "Inactivos", value: "inactivos" },
          ]}
          className="w-36"
        />
      </div>

      <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card">
        <div className="h-full overflow-auto">
          {tab === "facultades" && (
            <FacultadesTable rows={filtered as Facultad[]} canManage={canManage} onEdit={openEdit} />
          )}
          {tab === "carreras" && (
            <CarrerasTable rows={filtered as CarreraCatalogo[]} catalogos={data} canManage={canManage} onEdit={openEdit} />
          )}
          {tab === "niveles" && (
            <NivelesTable rows={filtered as NivelCatalogo[]} canManage={canManage} onEdit={openEdit} />
          )}
          {tab === "tramites" && (
            <TramitesTable rows={filtered as TramiteCatalogo[]} canManage={canManage} onEdit={openEdit} />
          )}
        </div>
      </div>
    </div>
  );
}

function FacultadesTable({ rows, canManage, onEdit }: {
  rows: Facultad[];
  canManage: boolean;
  onEdit: (value: Facultad) => void;
}) {
  return (
    <CatalogTable headers={["Código", "Facultad", "Carreras", "Estado", ""]}>
      {rows.map(row => (
        <tr
          key={row.codigo}
          tabIndex={0}
          onClick={() => onEdit(row)}
          onKeyDown={event => handleRowKey(event, () => onEdit(row))}
          className="border-b border-border/60 hover:bg-secondary/30 focus:bg-secondary/30 focus:outline-none cursor-pointer transition-colors"
        >
          <Cell mono>{row.codigo}</Cell>
          <Cell strong>{row.nombre}</Cell>
          <Cell>{row.carreras.length}</Cell>
          <Cell><StatusBadge active={row.activo !== false} /></Cell>
          <ActionCell canManage={canManage} onClick={() => onEdit(row)} />
        </tr>
      ))}
      {rows.length === 0 && <EmptyRow colSpan={5} />}
    </CatalogTable>
  );
}

function CarrerasTable({ rows, catalogos, canManage, onEdit }: {
  rows: CarreraCatalogo[];
  catalogos: Catalogos;
  canManage: boolean;
  onEdit: (value: CarreraCatalogo) => void;
}) {
  return (
    <CatalogTable headers={["Carrera", "Facultad", "Nivel", "Estado", ""]}>
      {rows.map(row => {
        const facultad = catalogos.facultades.find(f => f.codigo === row.facultadCodigo);
        const nivel = catalogos.niveles.find(n => n.id === row.nivelId);
        return (
          <tr
            key={row.id}
            tabIndex={0}
            onClick={() => onEdit(row)}
            onKeyDown={event => handleRowKey(event, () => onEdit(row))}
            className="border-b border-border/60 hover:bg-secondary/30 focus:bg-secondary/30 focus:outline-none cursor-pointer transition-colors"
          >
            <Cell strong>{row.nombre}</Cell>
            <Cell>{facultad ? `${facultad.codigo} - ${facultad.nombre}` : row.facultadCodigo}</Cell>
            <Cell>{nivel?.nombre ?? row.nivelId}</Cell>
            <Cell><StatusBadge active={row.activo} /></Cell>
            <ActionCell canManage={canManage} onClick={() => onEdit(row)} />
          </tr>
        );
      })}
      {rows.length === 0 && <EmptyRow colSpan={5} />}
    </CatalogTable>
  );
}

function NivelesTable({ rows, canManage, onEdit }: {
  rows: NivelCatalogo[];
  canManage: boolean;
  onEdit: (value: NivelCatalogo) => void;
}) {
  return (
    <CatalogTable headers={["Orden", "Nivel", "Pago", "Color", "Estado", ""]}>
      {rows.map(row => (
        <tr
          key={row.id}
          tabIndex={0}
          onClick={() => onEdit(row)}
          onKeyDown={event => handleRowKey(event, () => onEdit(row))}
          className="border-b border-border/60 hover:bg-secondary/30 focus:bg-secondary/30 focus:outline-none cursor-pointer transition-colors"
        >
          <Cell mono>{row.orden}</Cell>
          <Cell>
            <div className="font-semibold text-foreground">{row.nombre}</div>
            <div className="text-[10px] text-muted-foreground">{row.id} - {row.abreviatura}</div>
          </Cell>
          <Cell mono>${row.pago.toLocaleString("es-MX")}</Cell>
          <Cell>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-4 h-4 rounded border border-border" style={{ backgroundColor: row.colorHex }} />
              {row.colorHex}
            </span>
          </Cell>
          <Cell><StatusBadge active={row.activo} /></Cell>
          <ActionCell canManage={canManage} onClick={() => onEdit(row)} />
        </tr>
      ))}
      {rows.length === 0 && <EmptyRow colSpan={6} />}
    </CatalogTable>
  );
}

function TramitesTable({ rows, canManage, onEdit }: {
  rows: TramiteCatalogo[];
  canManage: boolean;
  onEdit: (value: TramiteCatalogo) => void;
}) {
  return (
    <CatalogTable headers={["ID", "Trámite", "Estado", ""]}>
      {rows.map(row => (
        <tr
          key={row.id}
          tabIndex={0}
          onClick={() => onEdit(row)}
          onKeyDown={event => handleRowKey(event, () => onEdit(row))}
          className="border-b border-border/60 hover:bg-secondary/30 focus:bg-secondary/30 focus:outline-none cursor-pointer transition-colors"
        >
          <Cell mono>{row.id}</Cell>
          <Cell strong>{row.nombre}</Cell>
          <Cell><StatusBadge active={row.activo} /></Cell>
          <ActionCell canManage={canManage} onClick={() => onEdit(row)} />
        </tr>
      ))}
      {rows.length === 0 && <EmptyRow colSpan={4} />}
    </CatalogTable>
  );
}

function CatalogPanel({
  panel,
  catalogos,
  canManage,
  saving,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  panel: PanelState;
  catalogos: Catalogos;
  canManage: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onChange: (value: PanelState["value"]) => void;
  onSubmit: (value: PanelState["value"]) => Promise<boolean> | boolean;
}) {
  const title = `${panel.mode === "create" ? "Nuevo" : "Editar"} ${tabSingular(panel.tab)}`;
  const value = panel.value;
  const [closing, setClosing] = useState(false);

  const update = (patch: Record<string, unknown>) => onChange({ ...value, ...patch } as PanelState["value"]);
  const toggleActive = () => update({ activo: !(value as { activo: boolean }).activo });
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 150);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex justify-end ${closing ? "app-overlay-out" : "app-overlay-in"}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <form
        onSubmit={async event => {
          event.preventDefault();
          const saved = await onSubmit(value);
          if (saved) requestClose();
        }}
        className={`h-full w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col ${closing ? "app-sidepanel-out" : "app-sidepanel-in"}`}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Los cambios se guardan directamente en Base de Datos.</p>
          </div>
          <button type="button" onClick={requestClose} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {panel.tab === "facultades" && (
            <>
              <TextField label="Código" value={(value as Facultad).codigo} disabled={panel.mode === "edit"} onChange={codigo => update({ codigo })} />
              <TextField label="Nombre" value={(value as Facultad).nombre} onChange={nombre => update({ nombre })} />
            </>
          )}

          {panel.tab === "carreras" && (
            <>
              <SelectBox
                label="Facultad"
                value={(value as CarreraCatalogo).facultadCodigo}
                onChange={facultadCodigo => update({ facultadCodigo })}
                options={catalogos.facultades.map(f => ({ value: f.codigo, label: `${f.codigo} - ${f.nombre}` }))}
              />
              <SelectBox
                label="Nivel"
                value={(value as CarreraCatalogo).nivelId}
                onChange={nivelId => update({ nivelId })}
                options={catalogos.niveles.map(n => ({ value: n.id, label: n.nombre }))}
              />
              <TextField label="Nombre" value={(value as CarreraCatalogo).nombre} onChange={nombre => update({ nombre })} />
            </>
          )}

          {panel.tab === "niveles" && (
            <>
              <TextField
                label="Nombre"
                value={(value as NivelCatalogo).nombre}
                onChange={nombre => update({
                  nombre,
                  id: panel.mode === "create" ? slugify(nombre) : (value as NivelCatalogo).id,
                })}
              />
              <TextField label="Abreviatura" value={(value as NivelCatalogo).abreviatura} onChange={abreviatura => update({ abreviatura })} />
              <NumberField label="Pago MXN" value={(value as NivelCatalogo).pago} onChange={pago => update({ pago })} />
              <NumberField label="Orden" value={(value as NivelCatalogo).orden} onChange={orden => update({ orden })} />
              <div className="grid grid-cols-[56px_1fr] gap-2">
                <input
                  type="color"
                  value={(value as NivelCatalogo).colorHex}
                  onChange={event => update({ colorHex: event.target.value })}
                  className="h-10 w-14 rounded-lg border border-border bg-secondary/50 p-1"
                />
                <TextField label="Color" value={(value as NivelCatalogo).colorHex} onChange={colorHex => update({ colorHex })} />
              </div>
            </>
          )}

          {panel.tab === "tramites" && (
            <>
              <TextField label="ID" value={(value as TramiteCatalogo).id} disabled={panel.mode === "edit"} onChange={id => update({ id: slugify(id) })} />
              <TextField
                label="Nombre"
                value={(value as TramiteCatalogo).nombre}
                onChange={nombre => update({
                  nombre,
                  id: panel.mode === "create" && !(value as TramiteCatalogo).id ? slugify(nombre) : (value as TramiteCatalogo).id,
                })}
              />
            </>
          )}

          <button
            type="button"
            onClick={toggleActive}
            disabled={!canManage}
            className={`w-full h-10 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
              (value as { activo: boolean }).activo
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600"
                : "border-red-500/25 bg-red-500/10 text-red-500"
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {(value as { activo: boolean }).activo ? "Activo" : "Inactivo"}
          </button>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-border bg-secondary/20 flex justify-end gap-2">
          <button type="button" onClick={requestClose} className="h-9 px-4 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canManage || saving}
            className="h-9 px-4 rounded-lg bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CatalogTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <table className="w-full text-left">
      <thead className="sticky top-0 z-10 bg-secondary/70 backdrop-blur border-b border-border">
        <tr>
          {headers.map(header => (
            <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Cell({ children, mono, strong }: { children: ReactNode; mono?: boolean; strong?: boolean }) {
  return (
    <td className={`px-4 py-3 text-xs text-foreground align-middle ${mono ? "font-mono" : ""} ${strong ? "font-semibold" : ""}`}>
      {children}
    </td>
  );
}

function ActionCell({ canManage, onClick }: { canManage: boolean; onClick: () => void }) {
  return (
    <td className="px-4 py-3 text-right">
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onClick();
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title={canManage ? "Editar" : "Ver detalle"}
        aria-label={canManage ? "Editar" : "Ver detalle"}
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </td>
  );
}

function handleRowKey(event: React.KeyboardEvent<HTMLTableRowElement>, action: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-xs text-muted-foreground">
        No hay registros para mostrar.
      </td>
    </tr>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold ${
      active
        ? "bg-emerald-500/10 text-emerald-600"
        : "bg-red-500/10 text-red-500"
    }`}>
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function TextField({ label, value, onChange, disabled }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        className="w-full h-10 bg-secondary/50 border border-border rounded-lg px-3 text-sm text-foreground disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40 transition-all"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full h-10 bg-secondary/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40 transition-all"
      />
    </label>
  );
}

function SelectBox({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <CustomSelect value={value} onChange={onChange} options={options} />
    </label>
  );
}

function validateCatalog(tab: CatalogTab, mode: PanelMode, value: PanelState["value"], catalogos: Catalogos) {
  if (tab === "facultades") {
    const item = value as Facultad;
    if (!/^\d{4}$/.test(item.codigo.trim())) return "El código debe tener exactamente 4 dígitos.";
    if (!item.nombre.trim()) return "El nombre de la facultad es obligatorio.";
    const duplicate = catalogos.facultades.some(f => f.codigo !== item.codigo && normalize(f.nombre) === normalize(item.nombre));
    if (duplicate) return "Ya existe una facultad con ese nombre.";
  }

  if (tab === "carreras") {
    const item = value as CarreraCatalogo;
    if (!item.facultadCodigo) return "Selecciona una facultad.";
    if (!item.nivelId) return "Selecciona un nivel.";
    if (!item.nombre.trim()) return "El nombre de la carrera es obligatorio.";
    const duplicate = catalogos.carreras.some(c =>
      (mode === "create" || c.id !== item.id) &&
      c.facultadCodigo === item.facultadCodigo &&
      c.nivelId === item.nivelId &&
      normalize(c.nombre) === normalize(item.nombre)
    );
    if (duplicate) return "Ya existe esa carrera para la facultad y nivel seleccionados.";
  }

  if (tab === "niveles") {
    const item = value as NivelCatalogo;
    if (!/^[a-z0-9_]+$/.test(item.id.trim())) return "El ID solo puede usar minúsculas, números y guiones bajos.";
    if (!item.nombre.trim()) return "El nombre del nivel es obligatorio.";
    if (!item.abreviatura.trim()) return "La abreviatura es obligatoria.";
    if (item.pago < 0) return "El pago no puede ser negativo.";
    if (!/^#[0-9A-Fa-f]{6}$/.test(item.colorHex)) return "El color debe tener formato #RRGGBB.";
    if (!Number.isFinite(item.orden)) return "El orden debe ser numérico.";
    const duplicateId = catalogos.niveles.some(n => mode === "create" && n.id === item.id);
    if (duplicateId) return "Ya existe un nivel con ese ID.";
    const duplicateName = catalogos.niveles.some(n => n.id !== item.id && normalize(n.nombre) === normalize(item.nombre));
    if (duplicateName) return "Ya existe un nivel con ese nombre.";
  }

  if (tab === "tramites") {
    const item = value as TramiteCatalogo;
    if (!/^[a-z0-9_]+$/.test(item.id.trim())) return "El ID solo puede usar minúsculas, números y guiones bajos.";
    if (!item.nombre.trim()) return "El nombre del trámite es obligatorio.";
    const duplicateId = catalogos.tramites.some(t => mode === "create" && t.id === item.id);
    if (duplicateId) return "Ya existe un trámite con ese ID.";
    const duplicateName = catalogos.tramites.some(t => t.id !== item.id && normalize(t.nombre) === normalize(item.nombre));
    if (duplicateName) return "Ya existe un trámite con ese nombre.";
  }

  return "";
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function tabSingular(tab: CatalogTab) {
  if (tab === "facultades") return "facultad";
  if (tab === "carreras") return "carrera";
  if (tab === "niveles") return "nivel";
  return "trámite";
}


