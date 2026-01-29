#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    GlobalShortcutManager, WindowEvent
};

mod config;
mod auth;

#[tauri::command]
async fn save_config(key: String, value: String) -> Result<(), String> {
    config::save_setting(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_config(key: String) -> Result<String, String> {
    config::load_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_token(token: String) -> Result<(), String> {
    auth::save_device_token(&token).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_token() -> Result<String, String> {
    auth::load_device_token().map_err(|e| e.to_string())
}

#[tauri::command]
async fn pair_device(server_url: String, pair_code: String, device_name: String) -> Result<String, String> {
    auth::pair_device(&server_url, &pair_code, &device_name).await.map_err(|e| e.to_string())
}

fn create_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    SystemTray::new().with_menu(tray_menu)
}

fn main() {
    tauri::Builder::default()
        .system_tray(create_tray())
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            let window_clone = window.clone();
            
            // Register global shortcut
            let mut shortcut_manager = app.global_shortcut_manager();
            if let Err(e) = shortcut_manager.register("CmdOrCtrl+Space", move || {
                if window_clone.is_visible().unwrap() {
                    window_clone.hide().unwrap();
                } else {
                    window_clone.show().unwrap();
                    window_clone.set_focus().unwrap();
                }
            }) {
                eprintln!("Failed to register global shortcut: {}", e);
            }
            
            // Show window on startup for debugging
            window.show().unwrap();
            window.set_focus().unwrap();
            
            Ok(())
        })
        .on_window_event(|event| match event.event() {
            WindowEvent::CloseRequested { api, .. } => {
                event.window().hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            save_config,
            load_config,
            save_token,
            load_token,
            pair_device
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}