// The shell only owns windows. Timer rules live in src/lib/timer.ts and every window
// reads the same stored TimerState; nothing here counts time.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, WebviewWindowBuilder};
use tauri_plugin_window_state::StateFlags;

/// Focuses a window declared in tauri.conf.json, recreating it if it was closed.
/// Must stay async: building a webview from a synchronous command deadlocks on Windows.
#[tauri::command]
async fn show_window(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.unminimize();
        let _ = window.show();
        return window.set_focus().map_err(|e| e.to_string());
    }
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == label)
        .cloned()
        .ok_or_else(|| format!("unknown window: {label}"))?;
    WebviewWindowBuilder::from_config(&app, &config)
        .and_then(|builder| builder.build())
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        // Remember where each window was left; sizes are owned by the config and the mini window itself.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![show_window])
        .run(tauri::generate_context!())
        .expect("failed to start the desktop shell");
}
