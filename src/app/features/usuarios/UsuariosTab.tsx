import React, { useMemo, useState } from "react";
import { Pencil, Save, Search, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import { CustomSelect, Field } from "../../components/controls";
import type { Account, ManagedProfile, ManagedRole } from "../../domain";

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Asistente", value: "operador" },
];

function roleLabel(role: ManagedRole) {
  if (role === "admin") return "Admin";
  if (role === "consulta") return "Consulta";
  return "Asistente";
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold ${
      active
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        : "bg-muted text-muted-foreground"
    }`}>
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function RoleBadge({ role }: { role: ManagedRole }) {
  const isAdmin = role === "admin";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${
      isAdmin
        ? "bg-amber-400/15 text-amber-700 dark:text-amber-300"
        : "bg-blue-500/10 text-blue-600 dark:text-blue-300"
    }`}>
      {isAdmin && <ShieldCheck className="h-3 w-3" />}
      {roleLabel(role)}
    </span>
  );
}

function UserFormModal({
  mode,
  profile,
  currentAccount,
  profiles,
  onClose,
  onCreate,
  onUpdate,
}: {
  mode: "create" | "edit";
  profile?: ManagedProfile;
  currentAccount: Account;
  profiles: ManagedProfile[];
  onClose: () => void;
  onCreate: (input: { email: string; displayName: string; role: ManagedRole }) => Promise<void> | void;
  onUpdate: (id: string, changes: { displayName?: string; role?: ManagedRole; active?: boolean }) => Promise<void> | void;
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [role, setRole] = useState<ManagedRole>(profile?.role === "admin" ? "admin" : "operador");
  const [active, setActive] = useState(profile?.active ?? true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const activeAdminCount = profiles.filter(item => item.role === "admin" && item.active).length;
  const isLastActiveAdmin = Boolean(profile && profile.role === "admin" && profile.active && activeAdminCount <= 1);
  const disablesLastAdmin = mode === "edit" && isLastActiveAdmin && (role !== "admin" || !active);
  const isCurrentUser = Boolean(profile?.id && currentAccount.id === profile.id);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!displayName.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    if (mode === "create" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresa un correo válido.");
      return;
    }

    if (disablesLastAdmin) {
      setError("Debe existir al menos un administrador activo.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (mode === "create") {
        await onCreate({ email: email.trim(), displayName: displayName.trim(), role });
      } else if (profile) {
        await onUpdate(profile.id, { displayName: displayName.trim(), role, active });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-5">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl overflow-hidden app-modal-in">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">{mode === "create" ? "Nuevo usuario" : "Editar usuario"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === "create" ? "Alta de perfil interno con acceso al sistema." : profile?.email}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Nombre" value={displayName} onChange={setDisplayName} required />
          {mode === "create" ? (
            <Field label="Correo" value={email} onChange={setEmail} type="email" placeholder="usuario@uas.edu.mx" required />
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Correo</label>
              <div className="h-10 flex items-center rounded-lg border border-border bg-secondary/30 px-3 text-sm text-muted-foreground">
                {email}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Rol</label>
              <CustomSelect value={role} onChange={value => setRole(value as ManagedRole)} options={ROLE_OPTIONS} />
            </div>

            {mode === "edit" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Estado</label>
                <button
                  type="button"
                  onClick={() => setActive(value => !value)}
                  className={`h-10 rounded-lg border px-3 text-sm font-semibold flex items-center justify-between transition-colors ${
                    active
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      : "border-border bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {active ? "Activo" : "Inactivo"}
                  <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${active ? "bg-emerald-500" : "bg-muted-foreground/30"}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${active ? "translate-x-4" : ""}`} />
                  </span>
                </button>
              </div>
            )}
          </div>

          {mode === "create" && (
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Contraseña inicial: <span className="font-mono font-bold">123456</span>
            </div>
          )}

          {isCurrentUser && mode === "edit" && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-600 dark:text-blue-300">
              Estás editando tu propio perfil. Si cambias permisos, la próxima carga del panel aplicará el nuevo acceso.
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-border bg-secondary/20 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving || disablesLastAdmin} className="h-9 px-4 rounded-lg bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 transition-colors">
            <Save className="w-3.5 h-3.5" />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function UserDeleteModal({
  profile,
  onClose,
  onDelete,
}: {
  profile: ManagedProfile;
  onClose: () => void;
  onDelete: (profile: ManagedProfile) => Promise<void> | void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await onDelete(profile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el usuario.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="delete-user-title" className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-xl app-modal-in">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="delete-user-title" className="text-base font-bold text-foreground">Eliminar usuario</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Esta accion no se puede deshacer.</p>
          </div>
          <button type="button" onClick={onClose} disabled={deleting} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50" aria-label="Cerrar eliminacion de usuario">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-sm leading-relaxed text-foreground">Eliminaras el acceso de <strong>{profile.displayName}</strong>.</p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-secondary/20 px-5 py-4">
          <button type="button" onClick={onClose} disabled={deleting} className="h-9 rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="inline-flex h-9 items-center gap-2 rounded-lg bg-destructive px-4 text-xs font-bold text-white transition-colors hover:bg-destructive/90 disabled:opacity-60">
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function UsuariosTab({
  profiles,
  account,
  onCreateUser,
  onUpdateProfile,
  onDeleteUser,
}: {
  profiles: ManagedProfile[];
  account: Account;
  onCreateUser: (input: { email: string; displayName: string; role: ManagedRole }) => Promise<void> | void;
  onUpdateProfile: (id: string, changes: { displayName?: string; role?: ManagedRole; active?: boolean }) => Promise<void> | void;
  onDeleteUser: (profile: ManagedProfile) => Promise<void> | void;
}) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; profile: ManagedProfile } | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<ManagedProfile | null>(null);

  const filteredProfiles = useMemo(() => {
    const needle = normalizeText(query);
    if (!needle) return profiles;
    return profiles.filter(profile =>
      normalizeText(profile.displayName).includes(needle) ||
      normalizeText(profile.email).includes(needle) ||
      normalizeText(roleLabel(profile.role)).includes(needle)
    );
  }, [profiles, query]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {modal && (
        <UserFormModal
          mode={modal.mode}
          profile={modal.mode === "edit" ? modal.profile : undefined}
          currentAccount={account}
          profiles={profiles}
          onClose={() => setModal(null)}
          onCreate={onCreateUser}
          onUpdate={onUpdateProfile}
        />
      )}
      {profileToDelete && (
        <UserDeleteModal
          profile={profileToDelete}
          onClose={() => setProfileToDelete(null)}
          onDelete={onDeleteUser}
        />
      )}

      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">Usuarios</h1>
          <p className="text-xs text-muted-foreground mt-1">Alta y administración de perfiles internos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setModal({ mode: "create" })} className="h-9 px-3 rounded-lg bg-amber-400 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 transition-colors">
            <UserPlus className="w-3.5 h-3.5" />
            Nuevo usuario
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Buscar por nombre, correo o rol"
          className="h-8 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 z-10 bg-secondary text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-bold">Usuario</th>
              <th className="px-4 py-3 text-left font-bold">Rol</th>
              <th className="px-4 py-3 text-left font-bold">Estado</th>
              <th className="px-4 py-3 text-right font-bold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {filteredProfiles.map(profile => (
              <tr key={profile.id} className="hover:bg-secondary/35 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{profile.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={profile.role} /></td>
                <td className="px-4 py-3"><StatusBadge active={profile.active} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button type="button" onClick={() => setModal({ mode: "edit", profile })} className="h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileToDelete(profile)}
                      disabled={profile.id === account.id}
                      title={profile.id === account.id ? "No puedes eliminar tu propio perfil" : "Eliminar usuario"}
                      aria-label={profile.id === account.id ? "No puedes eliminar tu propio perfil" : `Eliminar a ${profile.displayName}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-card disabled:hover:text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProfiles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No hay usuarios que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
