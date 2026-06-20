import React, { useEffect, useRef, useState } from "react";
import { BarChart3, Check, ChevronDown, Copy, Database, ExternalLink, Eye, EyeOff, Info, LogOut, Minus, Moon, RefreshCw, Save, Settings, ShieldCheck, Square, Sun, Trash2, Users, X } from "lucide-react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AlumnosTab } from "../alumnos/AlumnosTab";
import { CatalogosTab } from "../catalogos/CatalogosTab";
import { MantenimientoTab } from "../mantenimiento/MantenimientoTab";
import { MetricasTab } from "../metricas/MetricasTab";
import { UsuariosTab } from "../usuarios/UsuariosTab";
import { isTauriRuntime } from "../../utils/window";
import type { Account, AdminTab, Alumno, AlumnoBulkChanges, Catalogos, CarreraCatalogo, CycleSummary, Facultad, ManagedProfile, ManagedRole, NivelCatalogo, ThemeMode, TramiteCatalogo } from "../../domain";
import uasLogo from "../../../imports/uas.png";

export type TitlebarToast = {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
};

const ABOUT_REPO_URL = "https://github.com/Frankz1997/app-titulacion.git";

function AboutModal({ onClose }: { onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 140);
  };

  const openRepository = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (isTauriRuntime()) {
      try {
        await invoke("open_repository_url");
        return;
      } catch {
        // Browser preview and restricted desktop contexts can use the web fallback.
      }
    }
    window.open(ABOUT_REPO_URL, "_blank", "noopener,noreferrer");
  };

  const copyRepositoryUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ABOUT_REPO_URL);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = ABOUT_REPO_URL;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-5 ${closing ? "app-overlay-out" : "app-overlay-in"}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className={`w-full max-w-2xl bg-card border border-border rounded-xl shadow-xl overflow-hidden ${closing ? "app-modal-out" : "app-modal-in"}`}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="min-w-0">
            <h2 id="about-title" className="text-base font-bold text-foreground">Acerca de</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Información del proyecto y referencias para mantenimiento.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="Cerrar acerca de"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">APP Titulación</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Aplicación administrativa para gestionar y dar seguimiento a trámites de titulación, catálogos, usuarios y métricas del proceso.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-secondary/20 p-4 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Realizado por</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Francisco Castro</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Repositorio</p>
              <div className="mt-1 flex max-w-full items-center gap-2">
                <a
                  href={ABOUT_REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={event => void openRepository(event)}
                  className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-blue-700 underline-offset-4 hover:underline dark:text-blue-300"
                >
                  <span className="min-w-0 truncate select-all">github.com/Frankz1997/app-titulacion.git</span>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
                <button
                  type="button"
                  onClick={() => void copyRepositoryUrl()}
                  title={copied ? "Copiado" : "Copiar enlace"}
                  aria-label={copied ? "Enlace copiado" : "Copiar enlace del repositorio"}
                  className="w-7 h-7 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors flex-shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Para continuar el proyecto</h3>
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>La aplicación principal está concentrada en src/app.</p>
              <p>La configuración de escritorio está en src-tauri.</p>
              <p>La documentación de instalación, GitHub y Supabase está en docs.</p>
              <p>Los respaldos y scripts de base de datos están en supabase/sql.</p>
            </div>
          </section>
        </div>

        <div className="px-5 py-4 border-t border-border bg-secondary/20 flex justify-end">
          <button
            type="button"
            onClick={requestClose}
            className="h-9 px-4 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            Cerrar
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export function AppTitleBar({
  compact = false,
  floating = false,
  seamless = false,
  theme,
  toast,
  onToggleTheme,
  refreshAction,
}: {
  compact?: boolean;
  floating?: boolean;
  seamless?: boolean;
  theme: ThemeMode;
  toast?: TitlebarToast | null;
  onToggleTheme: () => void;
  refreshAction?: {
    label: string;
    loading?: boolean;
    disabled?: boolean;
    onRefresh: () => Promise<void> | void;
  };
}) {
  const appWindow = isTauriRuntime() ? getCurrentWindow() : null;
  const integratedLoginTitleBar = compact && floating;
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleToggleMaximize = () => {
    if (compact) return;
    appWindow?.toggleMaximize().catch(() => {});
  };

  const toastTone = toast?.variant === "error"
    ? "text-red-500 bg-gradient-to-r from-transparent via-red-500/10 to-transparent"
    : toast?.variant === "info"
    ? "text-blue-500 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"
    : "text-emerald-500 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent";

  return (
    <header
      className={`h-8 flex-shrink-0 overflow-hidden flex items-center select-none ${
        floating ? "absolute inset-x-0 top-0 z-30" : "relative"
      } ${
        floating ? "" : seamless ? "bg-background" : "bg-card border-b border-border"
      }`}
    >
      {toast && !integratedLoginTitleBar && (
        <div
          key={toast.id}
          data-tauri-drag-region
          className={`pointer-events-none absolute inset-y-0 left-[170px] right-[240px] z-0 flex items-center justify-center px-3 text-[11px] font-bold ${toastTone} app-titlebar-toast-in`}
        >
          <span className="mr-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
          <span className="min-w-0 truncate">{toast.message}</span>
        </div>
      )}

      <div
        data-tauri-drag-region
        className={`relative z-10 h-full min-w-0 flex items-center gap-2 px-3 ${
          integratedLoginTitleBar ? "flex-1" : "w-[170px]"
        }`}
      >
        {!integratedLoginTitleBar && (
          <>
            <img src={uasLogo} alt="UAS" className="w-[20px] h-[20px] object-contain flex-shrink-0" />
            <span className="text-[11px] font-bold text-foreground truncate">APP Titulación</span>
          </>
        )}
      </div>

      <div
        data-tauri-drag-region
        className={`${
          integratedLoginTitleBar
            ? "absolute inset-y-0 left-[46%] right-0 z-0"
            : "relative z-10 flex-1"
        } h-full min-w-0 grid place-items-center text-[10px] ${
          integratedLoginTitleBar ? "text-muted-foreground/80" : "text-muted-foreground"
        }`}
      >
        <span className={`truncate transition-opacity ${toast && !integratedLoginTitleBar ? "opacity-0" : "opacity-100"}`}>
          {compact ? "Acceso" : "Panel administrativo"}
        </span>
      </div>

      <div className="relative z-10 h-full flex">
        {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
        {refreshAction && !integratedLoginTitleBar && (
          <button
            type="button"
            onClick={() => void refreshAction.onRefresh()}
            disabled={refreshAction.loading || refreshAction.disabled}
            title={refreshAction.label}
            aria-label={refreshAction.label}
            className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshAction.loading ? "animate-spin" : ""}`} />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          title="Acerca de"
          aria-label="Acerca de"
          className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => appWindow?.minimize().catch(() => {})}
          title="Minimizar"
          aria-label="Minimizar"
          className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        {!compact && (
          <button
            type="button"
            onClick={handleToggleMaximize}
            title="Maximizar"
            aria-label="Maximizar"
            className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Square className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={() => appWindow?.close().catch(() => {})}
          title="Cerrar"
          aria-label="Cerrar"
          className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}

export function LoginScreen({
  account,
  onLogin,
}: {
  account: Account;
  onLogin: (email: string, password: string) => Promise<void> | void;
}) {
  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 860 540"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="login-blue-panel" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#1a2742" />
            <stop offset="1" stopColor="#0f1b36" />
          </linearGradient>
          <clipPath id="login-s-clip">
            <path d="M0 0 H396 C420 88 420 188 378 250 C336 312 346 430 376 540 H0 Z" />
          </clipPath>
        </defs>
        <path d="M0 0 H396 C420 88 420 188 378 250 C336 312 346 430 376 540 H0 Z" fill="url(#login-blue-panel)" />
        <g clipPath="url(#login-s-clip)">
          <circle cx="-26" cy="-38" r="170" fill="none" stroke="white" strokeOpacity="0.055" />
          <circle cx="-28" cy="-38" r="250" fill="none" stroke="white" strokeOpacity="0.04" />
          <circle cx="318" cy="436" r="86" fill="none" stroke="white" strokeOpacity="0.065" />
          <circle cx="318" cy="436" r="142" fill="none" stroke="white" strokeOpacity="0.04" />
          <circle cx="260" cy="230" r="130" fill="#f2a20c" fillOpacity="0.06" filter="blur(54px)" />
        </g>
      </svg>

      <div className="relative z-10 h-full w-full flex">
        <section className="w-[42%] flex-shrink-0 flex flex-col overflow-hidden">
          <div className="px-10 pt-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 whitespace-nowrap">
              Universidad Autónoma de Sinaloa
            </p>
          </div>

          <div className="flex-1 flex flex-col items-start justify-center px-10">
            <img
              src={uasLogo}
              alt="Universidad Autónoma de Sinaloa"
              className="w-28 h-28 object-contain mb-7 drop-shadow-2xl"
            />
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight mb-2">
              Sistema de<br />Titulación
            </h1>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              Gestión y seguimiento de trámites de titulación del personal administrativo.
            </p>

            <div className="mt-8 space-y-2">
              {[
                "Control de estados de trámite",
                "Seguimiento por facultad y carrera",
                "Reportes y métricas mensuales",
              ].map(feature => (
                <div key={feature} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 flex-shrink-0" />
                  <span className="text-[11px] text-white/35" dangerouslySetInnerHTML={{ __html: feature }} />
                </div>
              ))}
            </div>
          </div>

          <div className="px-10 pb-8">
            <p className="text-[10px] font-mono text-white/20">v1.0.0 &middot; 2026</p>
          </div>
        </section>

        <section className="ml-auto w-[58%] flex flex-col items-center justify-center px-12">
          <div className="w-full max-w-xs">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 mb-5">
              Acceso al panel
            </p>
            <p className="text-xl font-bold text-foreground tracking-tight mb-1">Iniciar sesión</p>
            <p className="text-xs text-muted-foreground mb-8">
              Ingresa tus credenciales institucionales para continuar.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="usuario@uas.edu.mx"
                  autoComplete="email"
                  className={`w-full bg-card border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/50 transition-all ${error ? "border-red-400/60" : "border-border"}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={event => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    placeholder="********"
                    autoComplete="current-password"
                    className={`w-full bg-card border rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/50 transition-all ${error ? "border-red-400/60" : "border-border"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(value => !value)}
                    tabIndex={-1}
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                  <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                  <p className="text-[11px] text-red-500">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-70 text-white rounded-lg py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm shadow-amber-400/30 mt-1"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </button>

              <p className="pt-4 text-center text-[10px] text-muted-foreground/40">
                Acceso restringido al personal autorizado
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
// -- Admin Dashboard Shell ------------------------------------------------------

function AccountSettingsModal({
  account,
  onClose,
  onSave,
}: {
  account: Account;
  onClose: () => void;
  onSave: (account: Account) => Promise<void> | void;
}) {
  const [displayName, setDisplayName] = useState(account.displayName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 140);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!displayName.trim()) {
      setError("El nombre visible no puede estar vacío.");
      return;
    }

    if (password && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      await onSave({ ...account, displayName: displayName.trim(), password });
      requestClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la cuenta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-5 ${closing ? "app-overlay-out" : "app-overlay-in"}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <form onSubmit={handleSubmit} className={`w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden ${closing ? "app-modal-out" : "app-modal-in"}`}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Configuración de cuenta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{account.email}</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="Cerrar configuración"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Nombre visible
            </label>
            <input
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
              className="h-9 bg-secondary/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="h-9 bg-secondary/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              className="h-9 bg-secondary/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40 transition-all"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-border bg-secondary/20 flex justify-end gap-2">
          <button
            type="button"
            onClick={requestClose}
            className="h-9 px-4 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-amber-400 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function UserCard({
  account,
  onOpenSettings,
  onLogout,
}: {
  account: Account;
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = account.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "AD";

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
          open
            ? "bg-secondary/70 border-transparent"
            : "bg-transparent border-transparent hover:bg-secondary/70"
        }`}
      >
        <span className="w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-foreground truncate">{account.displayName}</span>
          <span className="block text-[10px] text-muted-foreground truncate">{account.email}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-40">
          <button
            type="button"
            onClick={() => { setOpen(false); onOpenSettings(); }}
            className="w-full px-3 py-2.5 flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            Configuración de cuenta
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full px-3 py-2.5 flex items-center gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminDashboard({
  alumnos,
  catalogos,
  catalogosAdmin,
  onUpdate,
  onBulkUpdate,
  onDelete,
  onAdd,
  onCreateFacultad,
  onUpdateFacultad,
  onDeleteFacultad,
  onCreateCarrera,
  onUpdateCarrera,
  onDeleteCarrera,
  onCreateNivel,
  onUpdateNivel,
  onDeleteNivel,
  onCreateTramite,
  onUpdateTramite,
  onDeleteTramite,
  profiles,
  cycleSummaries,
  onCreateUser,
  onUpdateProfile,
  onDeletePreviousCycle,
  account,
  onAccountUpdate,
  onLogout,
  onToast,
  tab,
  onTabChange,
}: {
  alumnos: Alumno[];
  catalogos?: Catalogos;
  catalogosAdmin?: Catalogos;
  onUpdate: (a: Alumno) => Promise<void> | void;
  onBulkUpdate: (ids: string[], changes: AlumnoBulkChanges) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onAdd: (a: Alumno) => Promise<void> | void;
  onCreateFacultad: (facultad: Facultad) => Promise<void> | void;
  onUpdateFacultad: (facultad: Facultad) => Promise<void> | void;
  onDeleteFacultad: (facultad: Facultad) => Promise<void> | void;
  onCreateCarrera: (carrera: Omit<CarreraCatalogo, "id">) => Promise<void> | void;
  onUpdateCarrera: (carrera: CarreraCatalogo) => Promise<void> | void;
  onDeleteCarrera: (carrera: CarreraCatalogo) => Promise<void> | void;
  onCreateNivel: (nivel: NivelCatalogo) => Promise<void> | void;
  onUpdateNivel: (nivel: NivelCatalogo) => Promise<void> | void;
  onDeleteNivel: (nivel: NivelCatalogo) => Promise<void> | void;
  onCreateTramite: (tramite: TramiteCatalogo) => Promise<void> | void;
  onUpdateTramite: (tramite: TramiteCatalogo) => Promise<void> | void;
  onDeleteTramite: (tramite: TramiteCatalogo) => Promise<void> | void;
  profiles: ManagedProfile[];
  cycleSummaries: CycleSummary[];
  onCreateUser: (input: { email: string; displayName: string; role: ManagedRole }) => Promise<void> | void;
  onUpdateProfile: (id: string, changes: { displayName?: string; role?: ManagedRole; active?: boolean }) => Promise<void> | void;
  onDeletePreviousCycle: (cicloAnioFin: number) => Promise<void> | void;
  account: Account;
  onAccountUpdate: (account: Account) => Promise<void> | void;
  onLogout: () => Promise<void> | void;
  onToast: (variant: TitlebarToast["variant"], message: string) => void;
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isAdmin = account.role === "admin";

  useEffect(() => {
    if (!isAdmin && (tab === "usuarios" || tab === "mantenimiento")) {
      onTabChange("alumnos");
    }
  }, [isAdmin, onTabChange, tab]);

  const navSections: { title: string; items: { id: AdminTab; label: string; icon: React.ElementType }[] }[] = [
    {
      title: "Principal",
      items: [{ id: "alumnos", label: "Alumnos", icon: Users }],
    },
    {
      title: "Reportes",
      items: [{ id: "metricas", label: "Métricas", icon: BarChart3 }],
    },
    {
      title: "Administración",
      items: [
        { id: "catalogos", label: "Catálogos", icon: Database },
        ...(isAdmin ? [
          { id: "usuarios" as const, label: "Usuarios", icon: ShieldCheck },
          { id: "mantenimiento" as const, label: "Mantenimiento", icon: Trash2 },
        ] : []),
      ],
    },
  ];

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {settingsOpen && (
        <AccountSettingsModal
          account={account}
          onClose={() => setSettingsOpen(false)}
          onSave={onAccountUpdate}
        />
      )}
      {/* Sidebar — same bg as outer, no border, creates wrap illusion */}
      <aside className="w-52 flex-shrink-0 flex flex-col py-4 px-3">
        {/* Nav */}
        <nav className="flex-1 space-y-5">
          {navSections.map(section => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {section.title}
              </p>
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    tab === item.id
                      ? "bg-amber-400/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div>
          <UserCard
            account={account}
            onOpenSettings={() => setSettingsOpen(true)}
            onLogout={onLogout}
          />
        </div>
      </aside>

      {/* Main content — card with rounded left corners wrapping against sidebar */}
      <main className="flex-1 overflow-hidden my-3 mr-3 bg-card rounded-2xl flex flex-col shadow-sm">
        {tab === "alumnos" ? (
          <div className="flex-1 min-h-0 p-6 flex flex-col overflow-hidden">
            <AlumnosTab
              alumnos={alumnos}
              catalogos={catalogos}
              onUpdate={onUpdate}
              onBulkUpdate={onBulkUpdate}
              onDelete={onDelete}
              onAdd={onAdd}
              onToast={onToast}
            />
          </div>
        ) : tab === "metricas" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <MetricasTab alumnos={alumnos} catalogos={catalogos} />
          </div>
        ) : tab === "catalogos" ? (
          <div className="flex-1 min-h-0 p-6 flex flex-col overflow-hidden">
            <CatalogosTab
              catalogos={catalogosAdmin}
              canManage={isAdmin}
              onCreateFacultad={onCreateFacultad}
              onUpdateFacultad={onUpdateFacultad}
              onDeleteFacultad={onDeleteFacultad}
              onCreateCarrera={onCreateCarrera}
              onUpdateCarrera={onUpdateCarrera}
              onDeleteCarrera={onDeleteCarrera}
              onCreateNivel={onCreateNivel}
              onUpdateNivel={onUpdateNivel}
              onDeleteNivel={onDeleteNivel}
              onCreateTramite={onCreateTramite}
              onUpdateTramite={onUpdateTramite}
              onDeleteTramite={onDeleteTramite}
            />
          </div>
        ) : tab === "usuarios" && isAdmin ? (
          <div className="flex-1 min-h-0 p-6 flex flex-col overflow-hidden">
            <UsuariosTab
              profiles={profiles}
              account={account}
              onCreateUser={onCreateUser}
              onUpdateProfile={onUpdateProfile}
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 p-6 flex flex-col overflow-hidden">
            <MantenimientoTab
              cycles={cycleSummaries}
              onDeleteCycle={onDeletePreviousCycle}
            />
          </div>
        )}
      </main>
    </div>
  );
}

