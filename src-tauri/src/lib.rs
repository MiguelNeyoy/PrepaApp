use tauri::Manager;
use serde::{Deserialize, Serialize};

const LOGIN_CREDENTIAL_SERVICE: &str = "com.apptitulacion.desktop";
const LOGIN_CREDENTIAL_ACCOUNT: &str = "saved-login";

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedLoginCredentials {
    email: String,
    password: String,
}

fn login_credentials_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(LOGIN_CREDENTIAL_SERVICE, LOGIN_CREDENTIAL_ACCOUNT)
        .map_err(|error| format!("No se pudo acceder al almacenamiento seguro: {error}"))
}

#[tauri::command]
fn load_saved_login_credentials() -> Result<Option<SavedLoginCredentials>, String> {
    let entry = login_credentials_entry()?;
    match entry.get_password() {
        Ok(value) => serde_json::from_str(&value)
            .map(Some)
            .map_err(|error| format!("No se pudieron leer las credenciales guardadas: {error}")),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("No se pudieron leer las credenciales guardadas: {error}")),
    }
}

#[tauri::command]
fn save_login_credentials(email: String, password: String) -> Result<(), String> {
    let value = serde_json::to_string(&SavedLoginCredentials { email, password })
        .map_err(|error| format!("No se pudieron preparar las credenciales: {error}"))?;
    login_credentials_entry()?
        .set_password(&value)
        .map_err(|error| format!("No se pudieron guardar las credenciales: {error}"))
}

#[tauri::command]
fn clear_saved_login_credentials() -> Result<(), String> {
    let entry = login_credentials_entry()?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("No se pudieron eliminar las credenciales guardadas: {error}")),
    }
}

#[tauri::command]
fn open_repository_url() -> Result<(), String> {
    let url = "https://github.com/Frankz1997/app-titulacion.git";

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = std::process::Command::new("cmd");
        command.args(["/C", "start", "", url]);
        command
    };

    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = std::process::Command::new("open");
        command.arg(url);
        command
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut command = std::process::Command::new("xdg-open");
        command.arg(url);
        command
    };

    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("No se pudo abrir el repositorio: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            clear_saved_login_credentials,
            load_saved_login_credentials,
            open_repository_url,
            save_login_credentials,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
