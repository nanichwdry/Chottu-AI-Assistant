#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, Manager};
use std::process::Command;

fn start_services() {
    #[cfg(target_os = "windows")]
    {
        Command::new("node")
            .arg("scripts/start-chottu.js")
            .spawn()
            .expect("Failed to start Chottu services");
        
        std::thread::sleep(std::time::Duration::from_secs(3));
    }
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let tray_menu = SystemTrayMenu::new().add_item(quit);
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|_app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                if id.as_str() == "quit" {
                    std::process::exit(0);
                }
            }
            _ => {}
        })
        .setup(|_app| {
            start_services();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
