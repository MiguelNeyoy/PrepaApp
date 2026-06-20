import { Component, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Database, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { AdminDashboard, AppTitleBar, LoginScreen } from "./features/dashboard/AdminDashboard";
import type { TitlebarToast } from "./features/dashboard/AdminDashboard";
import {
  createCarrera,
  createFacultad,
  createAlumno as createAlumnoRecord,
  createManagedUser,
  createNivel,
  createTramite,
  deleteManagedUser,
  deleteCarrera,
  deleteFacultad,
  deleteNivel,
  deletePreviousCycle as deletePreviousCycleRecord,
  deleteAlumno as deleteAlumnoRecord,
  deleteTramite,
  fetchAlumnos,
  fetchCatalogos,
  fetchCatalogosAdmin,
  fetchCycleSummaries,
  fetchProfiles,
  getCurrentAccount,
  requestPasswordRecovery,
  updatePasswordFromRecovery,
  verifyPasswordRecoveryInput,
  signInAdmin,
  signOutAdmin,
  updateCarrera,
  updateFacultad,
  updateAlumno as updateAlumnoRecord,
  updateAlumnosBulk as updateAlumnosBulkRecord,
  updateCurrentAccount,
  updateNivel,
  updateProfileRoleActive,
  updateTramite,
} from "./services/supabase";
import { isTauriRuntime, resizeDesktopWindow } from "./utils/window";
import type { Account, AdminTab, Alumno, AlumnoBulkChanges, Catalogos, CarreraCatalogo, CycleSummary, Facultad, ManagedProfile, ManagedRole, NivelCatalogo, ThemeMode, TramiteCatalogo } from "./domain";

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function getLoginErrorMessage(err: unknown) {
  const error = err as { message?: string; status?: number } | null;
  const message = error?.message?.toLowerCase() ?? "";

  if (error?.status === 429 || message.includes("rate limit") || message.includes("too many requests")) {
    return "Demasiados intentos de acceso. Espera un momento antes de volver a intentarlo.";
  }
  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "Correo o contrasena incorrectos.";
  }
  if (message.includes("email not confirmed")) {
    return "El correo aun no ha sido confirmado.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "No se pudo conectar con el servicio de inicio de sesion.";
  }

  return "No se pudo iniciar sesion. Verifica tus datos e intentalo de nuevo.";
}

function getCatalogDeleteErrorMessage(err: unknown, itemLabel: string) {
  const error = err as { code?: string; message?: string; details?: string } | null;
  const rawMessage = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  if (error?.code === "23503" || rawMessage.includes("foreign key") || rawMessage.includes("referenced")) {
    return `No se puede eliminar ${itemLabel} porque ya está en uso. Puedes desactivarlo para que deje de aparecer como opción.`;
  }

  return getErrorMessage(err, `No se pudo eliminar ${itemLabel}.`);
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <StatusScreen
          mode="offline"
          title="Algo salió mal"
          message="El panel encontró un error inesperado. Cierra y vuelve a abrir esta pantalla para continuar."
        />
      );
    }

    return this.props.children;
  }
}

function isBrowserOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

type SavedLoginCredentials = {
  email: string;
  password: string;
};

async function loadSavedLoginCredentials(): Promise<SavedLoginCredentials | null> {
  if (!isTauriRuntime()) return null;
  return invoke<SavedLoginCredentials | null>("load_saved_login_credentials");
}

async function saveLoginCredentials(credentials: SavedLoginCredentials) {
  if (!isTauriRuntime()) return;
  await invoke("save_login_credentials", credentials);
}

async function clearSavedLoginCredentials() {
  if (!isTauriRuntime()) return;
  await invoke("clear_saved_login_credentials");
}

function StatusScreen({
  title,
  message,
  mode = "loading",
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  mode?: "loading" | "offline";
  actionLabel?: string;
  onAction?: () => void;
}) {
  const Icon = mode === "offline" ? WifiOff : Database;

  return (
    <div className="h-full w-full bg-background text-foreground overflow-hidden grid place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className={`mx-auto mb-5 w-12 h-12 rounded-2xl flex items-center justify-center border ${
          mode === "offline"
            ? "bg-red-500/10 border-red-500/20 text-red-500"
            : "bg-amber-400/10 border-amber-400/20 text-amber-500"
        }`}>
          {mode === "offline" ? <Icon className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
        </div>
        <h1 className="text-base font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{message}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-background hover:bg-amber-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [appError, setAppError] = useState("");
  const [isOnline, setIsOnline] = useState(isBrowserOnline);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedLoginCredentials, setSavedLoginCredentials] = useState<SavedLoginCredentials | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("app-theme") === "dark" ? "dark" : "light";
  });
  const [account, setAccount] = useState<Account>({
    displayName: "Administración",
    email: "",
    password: "",
  });
  const [catalogos, setCatalogos] = useState<Catalogos>();
  const [catalogosAdmin, setCatalogosAdmin] = useState<Catalogos>();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [profiles, setProfiles] = useState<ManagedProfile[]>([]);
  const [cycleSummaries, setCycleSummaries] = useState<CycleSummary[]>([]);
  const [dashboardTab, setDashboardTab] = useState<AdminTab>("alumnos");
  const [titlebarRefreshing, setTitlebarRefreshing] = useState(false);
  const [titlebarToast, setTitlebarToast] = useState<TitlebarToast | null>(null);
  const titlebarToastTimer = useRef<number>();

  const showTitlebarToast = useCallback((variant: TitlebarToast["variant"], message: string) => {
    window.clearTimeout(titlebarToastTimer.current);
    setTitlebarToast({
      id: Date.now(),
      variant,
      message,
    });
    titlebarToastTimer.current = window.setTimeout(() => {
      setTitlebarToast(null);
    }, variant === "error" ? 4600 : 3200);
  }, []);

  const notifyDatabaseSuccess = useCallback((message: string, description?: string) => {
    showTitlebarToast("success", description ? `${message} - ${description}` : message);
  }, [showTitlebarToast]);

  const notifyDatabaseError = useCallback((err: unknown, fallback: string) => {
    showTitlebarToast("error", `No se pudo completar la acción - ${getErrorMessage(err, fallback)}`);
  }, [showTitlebarToast]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("app-theme", theme);
  }, [theme]);

  useEffect(() => {
    return () => window.clearTimeout(titlebarToastTimer.current);
  }, []);

  useEffect(() => {
    const preventNativeContextMenu = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", preventNativeContextMenu);
    return () => document.removeEventListener("contextmenu", preventNativeContextMenu);
  }, []);

  useEffect(() => {
    const updateOnlineState = () => {
      const online = isBrowserOnline();
      setIsOnline(online);
      if (online) setAppError("");
    };

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    updateOnlineState();

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    const size = isAuthenticated
      ? { width: 1280, height: 800, minWidth: 960, minHeight: 600, resizable: true }
      : { width: 860, height: 540, minWidth: 860, minHeight: 540, resizable: false };

    resizeDesktopWindow(size.width, size.height, size.minWidth, size.minHeight, size.resizable).catch(() => {
      // Browser preview and restricted desktop contexts can ignore window resizing.
    });
  }, [isAuthenticated]);

  const loadData = useCallback(async (includeAdminData = false) => {
    if (!isBrowserOnline()) {
      setIsOnline(false);
      throw new Error("No hay conexión a internet.");
    }

    setDataLoading(true);
    setAppError("");
    try {
      const [nextCatalogos, nextCatalogosAdmin] = await Promise.all([
        fetchCatalogos(),
        fetchCatalogosAdmin(),
      ]);
      const nextAlumnos = await fetchAlumnos(nextCatalogos);
      setCatalogos(nextCatalogos);
      setCatalogosAdmin(nextCatalogosAdmin);
      setAlumnos(nextAlumnos);
      if (includeAdminData) {
        const [nextProfiles, nextCycleSummaries] = await Promise.all([
          fetchProfiles(),
          fetchCycleSummaries(),
        ]);
        setProfiles(nextProfiles);
        setCycleSummaries(nextCycleSummaries);
      } else {
        setProfiles([]);
        setCycleSummaries([]);
      }
    } catch (err) {
      setAppError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
      throw err;
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      getCurrentAccount(),
      loadSavedLoginCredentials().catch(() => null),
    ])
      .then(async ([currentAccount, savedCredentials]) => {
        if (!active) return;
        setSavedLoginCredentials(savedCredentials);
        if (!currentAccount) {
          setIsAuthenticated(false);
          return;
        }

        setAccount(currentAccount);
        setIsAuthenticated(true);
        await loadData(currentAccount.role === "admin");
      })
      .catch(err => {
        if (!active) return;
        setAppError(err instanceof Error ? err.message : "No se pudo recuperar la sesión.");
        setIsAuthenticated(false);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [loadData]);

  const handleLogin = useCallback(async (email: string, password: string, rememberCredentials: boolean) => {
    if (!isOnline) throw new Error("No hay conexión a internet.");

    setAppError("");
    try {
      await signInAdmin(email, password);
      setLoginLoading(true);
      const currentAccount = await getCurrentAccount();
      if (!currentAccount) throw new Error("No se pudo abrir la sesión.");
      await loadData(currentAccount.role === "admin");
      setAccount(currentAccount);
      setIsAuthenticated(true);

      try {
        if (rememberCredentials) {
          const credentials = { email, password };
          await saveLoginCredentials(credentials);
          setSavedLoginCredentials(credentials);
        } else {
          await clearSavedLoginCredentials();
          setSavedLoginCredentials(null);
        }
      } catch {
        showTitlebarToast("info", "No se pudieron guardar las credenciales en este equipo.");
      }
    } catch (error) {
      throw new Error(getLoginErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  }, [loadData, showTitlebarToast]);

  const handlePasswordRecoveryRequest = useCallback(async (email: string) => {
    if (!isOnline) throw new Error("No hay conexion a internet.");
    await requestPasswordRecovery(email);
  }, [isOnline]);

  const handlePasswordRecoveryVerification = useCallback(async (email: string, recoveryInput: string) => {
    if (!isOnline) throw new Error("No hay conexion a internet.");
    await verifyPasswordRecoveryInput(email, recoveryInput);
  }, [isOnline]);

  const handlePasswordRecoveryReset = useCallback(async (email: string, password: string) => {
    if (!isOnline) throw new Error("No hay conexion a internet.");
    await updatePasswordFromRecovery(password);
    setAccount(previous => ({ ...previous, email, password: "" }));
  }, [isOnline]);

  const handleClearSavedLoginCredentials = useCallback(async () => {
    await clearSavedLoginCredentials();
    setSavedLoginCredentials(null);
  }, []);

  const addAlumno = useCallback(async (a: Alumno) => {
    if (!catalogos) throw new Error("Los catálogos todavía no están cargados.");
    try {
      const created = await createAlumnoRecord(a, catalogos);
      setAlumnos(prev => [created, ...prev]);
      notifyDatabaseSuccess("Solicitud guardada", `${created.nombre} se guardó en Base de Datos.`);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo guardar el registro.");
      throw err;
    }
  }, [catalogos]);

  const updateAlumno = useCallback(async (updated: Alumno) => {
    if (!catalogos) throw new Error("Los catálogos todavía no están cargados.");
    try {
      const saved = await updateAlumnoRecord(updated, catalogos);
      setAlumnos(prev => prev.map(a => a.id === saved.id ? saved : a));
      notifyDatabaseSuccess("Cambios guardados", `${saved.nombre} se actualizó en Base de Datos.`);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo actualizar el registro.");
      throw err;
    }
  }, [catalogos]);

  const updateAlumnosBulk = useCallback(async (ids: string[], changes: AlumnoBulkChanges) => {
    try {
      const updatedIds = await updateAlumnosBulkRecord(ids, changes);
      const updatedIdSet = new Set(updatedIds);
      setAlumnos(prev => prev.map(alumno =>
        updatedIdSet.has(alumno.id) ? { ...alumno, ...changes } : alumno
      ));
      notifyDatabaseSuccess("Cambios guardados", `${updatedIds.length} registros se actualizaron en Base de Datos.`);
    } catch (err) {
      notifyDatabaseError(err, "No se pudieron actualizar los registros.");
      throw err;
    }
  }, []);

  const deleteAlumno = useCallback(async (id: string) => {
    const alumno = alumnos.find(item => item.id === id);
    try {
      await deleteAlumnoRecord(id);
      setAlumnos(prev => prev.filter(a => a.id !== id));
      notifyDatabaseSuccess("Registro eliminado", alumno ? `${alumno.nombre} se eliminó de Base de Datos.` : "La solicitud se eliminó de Base de Datos.");
    } catch (err) {
      notifyDatabaseError(err, "No se pudo eliminar el registro.");
      throw err;
    }
  }, [alumnos]);

  const refreshCoreData = useCallback(async () => {
    if (!isBrowserOnline()) {
      setIsOnline(false);
      throw new Error("No hay conexiÃ³n a internet.");
    }

    setDataLoading(true);
    setAppError("");
    try {
      const [nextCatalogos, nextCatalogosAdmin] = await Promise.all([
        fetchCatalogos(),
        fetchCatalogosAdmin(),
      ]);
      const nextAlumnos = await fetchAlumnos(nextCatalogos);
      setCatalogos(nextCatalogos);
      setCatalogosAdmin(nextCatalogosAdmin);
      setAlumnos(nextAlumnos);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : "No se pudieron actualizar los datos.");
      throw err;
    } finally {
      setDataLoading(false);
    }
  }, []);

  const refreshProfiles = useCallback(async () => {
    if (account.role !== "admin") return;
    const nextProfiles = await fetchProfiles();
    setProfiles(nextProfiles);
  }, [account.role]);

  const refreshCycleSummaries = useCallback(async () => {
    if (account.role !== "admin") return;
    const nextCycleSummaries = await fetchCycleSummaries();
    setCycleSummaries(nextCycleSummaries);
  }, [account.role]);

  const refreshCatalogos = useCallback(async () => {
    await refreshCoreData();
  }, [refreshCoreData]);

  const handleCreateFacultad = useCallback(async (facultad: Facultad) => {
    try {
      await createFacultad(facultad);
      await refreshCatalogos();
      notifyDatabaseSuccess("Facultad guardada", `${facultad.codigo} - ${facultad.nombre}`);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo guardar la facultad.");
      throw err;
    }
  }, [refreshCatalogos]);

  const handleUpdateFacultad = useCallback(async (facultad: Facultad) => {
    try {
      await updateFacultad(facultad);
      await refreshCatalogos();
      notifyDatabaseSuccess("Facultad actualizada", `${facultad.codigo} - ${facultad.nombre}`);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo actualizar la facultad.");
      throw err;
    }
  }, [refreshCatalogos]);

  const handleDeleteFacultad = useCallback(async (facultad: Facultad) => {
    try {
      await deleteFacultad(facultad.codigo);
      await refreshCatalogos();
      notifyDatabaseSuccess("Facultad eliminada", `${facultad.codigo} - ${facultad.nombre}`);
    } catch (err) {
      const message = getCatalogDeleteErrorMessage(err, "la facultad");
      notifyDatabaseError(new Error(message), message);
      throw new Error(message);
    }
  }, [refreshCatalogos]);

  const handleCreateCarrera = useCallback(async (carrera: Omit<CarreraCatalogo, "id">) => {
    try {
      await createCarrera(carrera);
      await refreshCatalogos();
      notifyDatabaseSuccess("Carrera guardada", carrera.nombre);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo guardar la carrera.");
      throw err;
    }
  }, [refreshCatalogos]);

  const handleUpdateCarrera = useCallback(async (carrera: CarreraCatalogo) => {
    try {
      await updateCarrera(carrera);
      await refreshCatalogos();
      notifyDatabaseSuccess("Carrera actualizada", carrera.nombre);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo actualizar la carrera.");
      throw err;
    }
  }, [refreshCatalogos]);

  const handleDeleteCarrera = useCallback(async (carrera: CarreraCatalogo) => {
    try {
      await deleteCarrera(carrera.id);
      await refreshCatalogos();
      notifyDatabaseSuccess("Carrera eliminada", carrera.nombre);
    } catch (err) {
      const message = getCatalogDeleteErrorMessage(err, "la carrera");
      notifyDatabaseError(new Error(message), message);
      throw new Error(message);
    }
  }, [refreshCatalogos]);

  const handleCreateNivel = useCallback(async (nivel: NivelCatalogo) => {
    try {
      await createNivel(nivel);
      await refreshCatalogos();
      notifyDatabaseSuccess("Nivel guardado", nivel.nombre);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo guardar el nivel.");
      throw err;
    }
  }, [refreshCatalogos]);

  const handleUpdateNivel = useCallback(async (nivel: NivelCatalogo) => {
    try {
      await updateNivel(nivel);
      await refreshCatalogos();
      notifyDatabaseSuccess("Nivel actualizado", nivel.nombre);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo actualizar el nivel.");
      throw err;
    }
  }, [refreshCatalogos]);

  const handleDeleteNivel = useCallback(async (nivel: NivelCatalogo) => {
    try {
      await deleteNivel(nivel.id);
      await refreshCatalogos();
      notifyDatabaseSuccess("Nivel eliminado", nivel.nombre);
    } catch (err) {
      const message = getCatalogDeleteErrorMessage(err, "el nivel");
      notifyDatabaseError(new Error(message), message);
      throw new Error(message);
    }
  }, [refreshCatalogos]);

  const handleCreateTramite = useCallback(async (tramite: TramiteCatalogo) => {
    try {
      await createTramite(tramite);
      await refreshCatalogos();
      notifyDatabaseSuccess("Trámite guardado", tramite.nombre);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo guardar el trámite.");
      throw err;
    }
  }, [refreshCatalogos]);

  const handleUpdateTramite = useCallback(async (tramite: TramiteCatalogo) => {
    try {
      await updateTramite(tramite);
      await refreshCatalogos();
      notifyDatabaseSuccess("Trámite actualizado", tramite.nombre);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo actualizar el trámite.");
      throw err;
    }
  }, [refreshCatalogos]);

  const handleDeleteTramite = useCallback(async (tramite: TramiteCatalogo) => {
    try {
      await deleteTramite(tramite.id);
      await refreshCatalogos();
      notifyDatabaseSuccess("Trámite eliminado", tramite.nombre);
    } catch (err) {
      const message = getCatalogDeleteErrorMessage(err, "el trámite");
      notifyDatabaseError(new Error(message), message);
      throw new Error(message);
    }
  }, [refreshCatalogos]);

  const handleCreateManagedUser = useCallback(async (input: { email: string; displayName: string; role: ManagedRole }) => {
    try {
      const created = await createManagedUser(input);
      setProfiles(prev => [created, ...prev.filter(profile => profile.id !== created.id)]);
      notifyDatabaseSuccess("Usuario creado", `${created.displayName} podrá iniciar sesión con la contraseña inicial.`);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo crear el usuario.");
      throw err;
    }
  }, []);

  const handleUpdateManagedProfile = useCallback(async (
    id: string,
    changes: { displayName?: string; role?: ManagedRole; active?: boolean }
  ) => {
    try {
      const updated = await updateProfileRoleActive(id, changes);
      setProfiles(prev => prev.map(profile => profile.id === updated.id ? updated : profile));
      notifyDatabaseSuccess("Usuario actualizado", updated.displayName);
      if (account.id === updated.id) {
        setAccount(prev => ({ ...prev, displayName: updated.displayName, role: updated.role }));
      }
    } catch (err) {
      notifyDatabaseError(err, "No se pudo actualizar el usuario.");
      throw err;
    }
  }, [account.id]);

  const handleDeleteManagedUser = useCallback(async (profile: ManagedProfile) => {
    if (profile.id === account.id) {
      throw new Error("No puedes eliminar tu propio perfil.");
    }

    try {
      await deleteManagedUser(profile.id);
      setProfiles(previous => previous.filter(item => item.id !== profile.id));
      notifyDatabaseSuccess("Usuario eliminado", profile.displayName);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo eliminar el usuario.");
      throw err;
    }
  }, [account.id, notifyDatabaseError, notifyDatabaseSuccess]);

  const handleDeletePreviousCycle = useCallback(async (cicloAnioFin: number) => {
    if (!catalogos) throw new Error("Los catálogos todavía no están cargados.");
    try {
      const deletedCount = await deletePreviousCycleRecord(cicloAnioFin);
      const [nextAlumnos, nextCycleSummaries] = await Promise.all([
        fetchAlumnos(catalogos),
        fetchCycleSummaries(),
      ]);
      setAlumnos(nextAlumnos);
      setCycleSummaries(nextCycleSummaries);
      notifyDatabaseSuccess("Ciclo eliminado", `${deletedCount} solicitudes se borraron de Base de Datos.`);
    } catch (err) {
      notifyDatabaseError(err, "No se pudo borrar el ciclo.");
      throw err;
    }
  }, [catalogos]);

  const handleAccountUpdate = useCallback(async (nextAccount: Account) => {
    try {
      await updateCurrentAccount(nextAccount);
      setAccount(prev => ({ ...prev, displayName: nextAccount.displayName, password: "" }));
      notifyDatabaseSuccess("Cuenta actualizada", "Los cambios de la cuenta se guardaron correctamente.");
    } catch (err) {
      notifyDatabaseError(err, "No se pudo guardar la cuenta.");
      throw err;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    setAppError("");
    try {
      await Promise.all([
        signOutAdmin(),
        new Promise(resolve => window.setTimeout(resolve, 450)),
      ]);
      setIsAuthenticated(false);
      setAlumnos([]);
      setProfiles([]);
      setCycleSummaries([]);
      setCatalogos(undefined);
      setCatalogosAdmin(undefined);
      setDashboardTab("alumnos");
    } catch (err) {
      setAppError(err instanceof Error ? err.message : "No se pudo cerrar la sesión.");
    } finally {
      setLogoutLoading(false);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(value => value === "dark" ? "light" : "dark");
  }, []);

  const titlebarRefreshLabel: Record<AdminTab, string> = {
    alumnos: "Actualizar alumnos",
    metricas: "Actualizar métricas",
    catalogos: "Actualizar catálogos",
    usuarios: "Actualizar usuarios",
    mantenimiento: "Actualizar ciclos",
  };

  const handleTitlebarRefresh = useCallback(async () => {
    if (titlebarRefreshing) return;
    setTitlebarRefreshing(true);
    try {
      if (dashboardTab === "usuarios") {
        await refreshProfiles();
      } else if (dashboardTab === "mantenimiento") {
        await refreshCycleSummaries();
      } else {
        await refreshCoreData();
      }
      showTitlebarToast("success", "Datos actualizados");
    } catch (err) {
      notifyDatabaseError(err, "No se pudieron actualizar los datos.");
    } finally {
      setTitlebarRefreshing(false);
    }
  }, [
    dashboardTab,
    notifyDatabaseError,
    refreshCoreData,
    refreshCycleSummaries,
    refreshProfiles,
    showTitlebarToast,
    titlebarRefreshing,
  ]);

  if (initializing) {
    return (
      <div className="h-screen bg-background text-foreground overflow-hidden">
        <StatusScreen
          title="Preparando el sistema"
          message="Estamos verificando tu sesión y preparando la conexión con la base de datos."
        />
      </div>
    );
  }

  if (logoutLoading) {
    return (
      <div className="h-screen bg-background text-foreground overflow-hidden flex flex-col">
        <AppTitleBar seamless theme={theme} toast={titlebarToast} onToggleTheme={toggleTheme} />
        <div className="flex-1 min-h-0">
          <StatusScreen
            title="Cerrando sesión"
            message="Estamos cerrando tu sesión y limpiando la información temporal del panel."
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!isOnline) {
      return (
        <div className="h-screen bg-background text-foreground overflow-hidden relative">
          <StatusScreen
            mode="offline"
            title="Sin conexión a internet"
            message="No podemos conectar con la Base de Datos en este momento. Revisa tu conexión y vuelve a intentarlo."
            actionLabel="Reintentar"
            onAction={() => setIsOnline(isBrowserOnline())}
          />
          <AppTitleBar compact floating theme={theme} toast={titlebarToast} onToggleTheme={toggleTheme} />
        </div>
      );
    }

    if (loginLoading) {
      return (
        <div className="h-screen bg-background text-foreground overflow-hidden relative">
          <StatusScreen
            title="Cargando información"
            message="Inicio de sesión correcto. Estamos descargando catálogos, solicitudes y métricas antes de abrir el panel."
          />
          <AppTitleBar compact floating theme={theme} toast={titlebarToast} onToggleTheme={toggleTheme} />
        </div>
      );
    }

    return (
      <div className="h-screen bg-background text-foreground overflow-hidden relative">
        <LoginScreen
          account={account}
          savedCredentials={savedLoginCredentials}
          onLogin={handleLogin}
          onNotify={showTitlebarToast}
          onRequestPasswordRecovery={handlePasswordRecoveryRequest}
          onVerifyPasswordRecovery={handlePasswordRecoveryVerification}
          onResetPassword={handlePasswordRecoveryReset}
          onClearSavedCredentials={handleClearSavedLoginCredentials}
        />
        <AppTitleBar compact floating theme={theme} toast={titlebarToast} onToggleTheme={toggleTheme} />
        {appError && (
          <div className="absolute left-1/2 bottom-5 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-950/20">
            {appError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden flex flex-col">
      <AppTitleBar
        seamless
        theme={theme}
        toast={titlebarToast}
        onToggleTheme={toggleTheme}
        refreshAction={isOnline ? {
          label: titlebarRefreshLabel[dashboardTab],
          loading: titlebarRefreshing,
          disabled: dataLoading,
          onRefresh: handleTitlebarRefresh,
        } : undefined}
      />
      <div className="flex-1 min-h-0">
        {isOnline ? (
          <>
            <AppErrorBoundary>
              <AdminDashboard
                alumnos={alumnos}
                catalogos={catalogos}
                catalogosAdmin={catalogosAdmin}
                onUpdate={updateAlumno}
                onBulkUpdate={updateAlumnosBulk}
                onDelete={deleteAlumno}
                onAdd={addAlumno}
                onCreateFacultad={handleCreateFacultad}
                onUpdateFacultad={handleUpdateFacultad}
                onDeleteFacultad={handleDeleteFacultad}
                onCreateCarrera={handleCreateCarrera}
                onUpdateCarrera={handleUpdateCarrera}
                onDeleteCarrera={handleDeleteCarrera}
                onCreateNivel={handleCreateNivel}
                onUpdateNivel={handleUpdateNivel}
                onDeleteNivel={handleDeleteNivel}
                onCreateTramite={handleCreateTramite}
                onUpdateTramite={handleUpdateTramite}
                onDeleteTramite={handleDeleteTramite}
                profiles={profiles}
                cycleSummaries={cycleSummaries}
                onCreateUser={handleCreateManagedUser}
                onUpdateProfile={handleUpdateManagedProfile}
                onDeleteUser={handleDeleteManagedUser}
                onDeletePreviousCycle={handleDeletePreviousCycle}
                account={account}
                onAccountUpdate={handleAccountUpdate}
                onLogout={handleLogout}
                onToast={showTitlebarToast}
                tab={dashboardTab}
                onTabChange={setDashboardTab}
              />
            </AppErrorBoundary>
            {dataLoading && (
              <div className="fixed right-4 bottom-4 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
                Sincronizando con Base de Datos...
              </div>
            )}
          </>
        ) : (
          <StatusScreen
            mode="offline"
            title="La app está sin conexión"
            message="El panel necesita internet para consultar y guardar solicitudes. Cuando vuelva la conexión podrás continuar trabajando."
            actionLabel="Reintentar conexión"
            onAction={() => setIsOnline(isBrowserOnline())}
          />
        )}
        {appError && (
          <div className="fixed left-1/2 bottom-4 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 shadow-sm dark:border-red-500/20 dark:bg-red-950/20">
            {appError}
          </div>
        )}
      </div>
    </div>
  );
}
