// The shell only owns windows, the tray and native notices. Timer rules live in
// src/lib/timer.ts and every window reads the same stored TimerState; nothing here counts time.
// Desktop builds get the floating window, tray and single instance; Android gets one
// window plus scheduled notifications (driven from the web side, see src/adapters/alarm.ts).

#[cfg(desktop)]
mod desktop {
    use tauri::{
        menu::{Menu, MenuItem, PredefinedMenuItem},
        tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
        AppHandle, Manager, Webview, WebviewWindow, WebviewWindowBuilder, Window, WindowEvent,
    };

    /// WebView2 stops painting a hidden webview but does not report it to the page, so the
    /// page is told through the hook installed by `followShellVisibility` in src/adapters/desktop.ts.
    const SHELL_HIDDEN: &str = "window.__shellHidden?.(true)";
    const SHELL_SHOWN: &str = "window.__shellHidden?.(false)";

    /// The webview inside a window. Hiding only the window leaves the page believing it is
    /// visible, so it would keep painting its decorative animations in the tray; hiding the
    /// webview too stops rendering. Timers keep running.
    fn webview_of(window: &WebviewWindow) -> &Webview {
        window.as_ref()
    }

    /// Focuses a window declared in tauri.conf.json, recreating it if it was closed.
    /// Never call this on the main thread: building a webview there deadlocks on Windows.
    pub fn open_window(app: &AppHandle, label: &str) -> Result<(), String> {
        if let Some(window) = app.get_webview_window(label) {
            let _ = webview_of(&window).show();
            let _ = window.eval(SHELL_SHOWN);
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
        WebviewWindowBuilder::from_config(app, &config)
            .and_then(|builder| builder.build())
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn open_in_background(app: &AppHandle, label: &'static str) {
        let app = app.clone();
        std::thread::spawn(move || {
            let _ = open_window(&app, label);
        });
    }

    pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
        let menu = Menu::with_items(
            app,
            &[
                &MenuItem::with_id(app, "main", "打开主窗口", true, None::<&str>)?,
                &MenuItem::with_id(app, "mini", "打开悬浮窗", true, None::<&str>)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItem::with_id(app, "quit", "退出一刻", true, None::<&str>)?,
            ],
        )?;
        let mut tray = TrayIconBuilder::with_id("main")
            .tooltip("一刻 · 专注计时")
            .menu(&menu)
            .show_menu_on_left_click(false)
            .on_menu_event(|app, event| match event.id.as_ref() {
                "main" => open_in_background(app, "main"),
                "mini" => open_in_background(app, "mini"),
                "quit" => app.exit(0),
                _ => {}
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                    open_in_background(tray.app_handle(), "main");
                }
            });
        if let Some(icon) = app.default_window_icon() {
            tray = tray.icon(icon.clone());
        }
        tray.build(app).map(|_| ())
    }

    /// Closing the main window keeps its webview alive in the tray, so a running timer
    /// still completes on time and can notify. "退出一刻" in the tray menu really quits.
    pub fn on_window_event(window: &Window, event: &WindowEvent) {
        if window.label() != "main" {
            return;
        }
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = window.hide();
            if let Some(main) = window.app_handle().get_webview_window("main") {
                let _ = webview_of(&main).hide();
                let _ = main.eval(SHELL_HIDDEN);
            }
        }
    }
}

/// Async so that it runs off the main thread (see `desktop::open_window`).
#[tauri::command]
async fn show_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    #[cfg(desktop)]
    return desktop::open_window(&app, &label);
    #[cfg(mobile)]
    {
        let _ = (app, label);
        Err("移动端只有一个窗口".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Must be registered first: a second launch only brings the running app forward.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        desktop::open_in_background(app, "main");
    }));

    // Desktop: provides window.Notification as native notices. Android: also schedules the
    // completion notice with AlarmManager so it fires while the app is backgrounded or the
    // screen is locked.
    let builder = builder.plugin(tauri_plugin_notification::init());

    // Remember where each window was left; sizes are owned by the config and the mini window itself.
    #[cfg(desktop)]
    let builder = builder
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(tauri_plugin_window_state::StateFlags::POSITION)
                .build(),
        )
        .setup(|app| {
            desktop::build_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(desktop::on_window_event);

    builder
        .invoke_handler(tauri::generate_handler![show_window])
        .run(tauri::generate_context!())
        .expect("failed to start the app shell");
}
