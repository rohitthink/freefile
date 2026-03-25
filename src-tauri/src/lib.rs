use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Emitter};

struct AppState {
    port: u16,
    backend_process: Option<Child>,
}

/// Find a free TCP port.
fn find_free_port() -> u16 {
    portpicker::pick_unused_port().expect("No free port available")
}

/// Poll the backend health endpoint until it responds.
fn wait_for_backend(port: u16) {
    let url = format!("http://127.0.0.1:{}/api/health", port);
    let client = reqwest::blocking::Client::new();

    for _ in 0..50 {
        match client.get(&url).timeout(std::time::Duration::from_millis(500)).send() {
            Ok(resp) if resp.status().is_success() => return,
            _ => std::thread::sleep(std::time::Duration::from_millis(200)),
        }
    }
    eprintln!("Warning: Backend did not become ready within 10 seconds");
}

#[tauri::command]
fn get_backend_url(state: tauri::State<Mutex<AppState>>) -> String {
    let s = state.lock().unwrap();
    format!("http://127.0.0.1:{}/api", s.port)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![get_backend_url])
        .setup(|app| {
            let port = find_free_port();

            // App data directory for database
            let data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data directory");
            std::fs::create_dir_all(&data_dir).ok();

            // Locate the backend binary in bundled resources
            let resource_dir = app.path().resource_dir()
                .expect("Failed to resolve resource directory");
            let backend_dir = resource_dir.join("binaries").join("freefile-backend");
            let backend_exe = backend_dir.join("freefile-backend");

            // Fallback for dev mode: check dist/ directory
            let backend_exe = if backend_exe.exists() {
                backend_exe
            } else {
                // Development: use the dist/ output directly
                let dev_exe = std::env::current_dir()
                    .unwrap_or_default()
                    .join("dist")
                    .join("freefile-backend")
                    .join("freefile-backend");
                if dev_exe.exists() {
                    dev_exe
                } else {
                    eprintln!("Backend binary not found at {:?} or {:?}", backend_exe, dev_exe);
                    return Ok(());
                }
            };

            // Spawn the backend process
            let child = Command::new(&backend_exe)
                .args(["--port", &port.to_string(), "--data-dir", &data_dir.to_string_lossy()])
                .spawn()
                .expect("Failed to spawn backend process");

            app.manage(Mutex::new(AppState {
                port,
                backend_process: Some(child),
            }));

            // Wait for backend ready in background thread
            let port_clone = port;
            let handle: AppHandle = app.handle().clone();
            std::thread::spawn(move || {
                wait_for_backend(port_clone);
                let _ = handle.emit("backend-ready", port_clone);
            });

            // Inject API base URL into the webview
            if let Some(window) = app.get_webview_window("main") {
                let js = format!(
                    "window.__FREEFILE_API_BASE__ = 'http://127.0.0.1:{}/api';",
                    port
                );
                window.eval(&js).ok();
            }

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Backend process is killed when AppState is dropped
            }
        })
        .run(tauri::generate_context!())
        .expect("Error while running FreeFile");
}

impl Drop for AppState {
    fn drop(&mut self) {
        if let Some(ref mut child) = self.backend_process {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
