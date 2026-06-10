import { AlertTriangle, Lock, ShieldAlert, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { CycleSummary } from "../../domain";

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">
      {label}
      <span className="font-mono text-foreground">{value}</span>
    </span>
  );
}

function DeleteCycleModal({
  cycle,
  onClose,
  onDelete,
}: {
  cycle: CycleSummary;
  onClose: () => void;
  onDelete: (cicloAnioFin: number) => Promise<void> | void;
}) {
  const requiredText = `BORRAR CICLO ${cycle.label}`;
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirmed = confirmation.trim() === requiredText;

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    try {
      await onDelete(cycle.cicloAnioFin);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar el ciclo.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/75 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-xl bg-card border border-red-500/25 rounded-xl shadow-xl overflow-hidden app-modal-in">
        <div className="px-5 py-4 border-b border-red-500/20 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Borrar ciclo {cycle.label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Esta acción elimina solicitudes e historial relacionado.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            Se borrarán {cycle.total} registros del ciclo {cycle.label}.
          </div>

          <div className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            Se recomienda exportar un respaldo antes de continuar si necesitas conservar evidencia del ciclo.
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Confirmación requerida
            </label>
            <input
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              placeholder={requiredText}
              className="h-10 rounded-lg border border-border bg-secondary/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40"
            />
            <p className="text-xs text-muted-foreground">
              Escribe <span className="font-mono font-bold text-foreground">{requiredText}</span> para habilitar el borrado.
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-border bg-secondary/20 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!confirmed || deleting}
            className="h-9 px-4 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Borrando..." : "Borrar ciclo"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MantenimientoTab({
  cycles,
  onDeleteCycle,
}: {
  cycles: CycleSummary[];
  onDeleteCycle: (cicloAnioFin: number) => Promise<void> | void;
}) {
  const [selectedCycle, setSelectedCycle] = useState<CycleSummary | null>(null);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {selectedCycle && (
        <DeleteCycleModal
          cycle={selectedCycle}
          onClose={() => setSelectedCycle(null)}
          onDelete={onDeleteCycle}
        />
      )}

      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">Mantenimiento</h1>
          <p className="text-xs text-muted-foreground mt-1">Limpieza de datos históricos por ciclo escolar.</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Zona de acciones críticas</p>
          <p className="text-xs text-muted-foreground mt-1">
            El ciclo actual está protegido. Solo pueden borrarse ciclos anteriores y siempre con doble confirmación.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 z-10 bg-secondary text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-bold">Ciclo</th>
              <th className="px-4 py-3 text-left font-bold">Solicitudes</th>
              <th className="px-4 py-3 text-left font-bold">Estados</th>
              <th className="px-4 py-3 text-left font-bold">Protección</th>
              <th className="px-4 py-3 text-right font-bold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {cycles.map(cycle => (
              <tr key={cycle.cicloAnioFin} className="hover:bg-secondary/35 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-bold text-foreground">{cycle.label}</p>
                  <p className="text-xs text-muted-foreground">Agosto {cycle.cicloAnioFin - 1} a Julio {cycle.cicloAnioFin}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-lg font-bold text-foreground">{cycle.total}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <CountPill label="Pend." value={cycle.pendiente} />
                    <CountPill label="Rec." value={cycle.recibido} />
                    <CountPill label="Env." value={cycle.enviado} />
                    <CountPill label="Acep." value={cycle.aceptado} />
                    <CountPill label="Rech." value={cycle.rechazado} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  {cycle.isCurrent ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                      <Lock className="h-3 w-3" />
                      Ciclo actual
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                      Ciclo anterior
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedCycle(cycle)}
                    disabled={cycle.isCurrent}
                    className="h-8 px-3 rounded-lg border border-red-500/25 bg-red-500/10 text-xs font-semibold text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:hover:bg-red-500/10 disabled:hover:text-red-600 dark:text-red-300 inline-flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
            {cycles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No hay solicitudes registradas para resumir ciclos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
