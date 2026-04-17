// lib.rs — ShiftWork Tauri application entry point
//
// This module initializes the Tauri application, registers the PTY management
// commands, and sets up shared application state. The architecture follows
// Tauri v2 conventions:
//
//   - Rust backend manages PTY processes and system-level operations
//   - React frontend renders the terminal UI via xterm.js
//   - Communication flows through Tauri's IPC (commands + events)
//
// The PTY registry is shared across all command handlers via Tauri's
// managed state system, wrapped in an Arc for thread-safe access.

mod pty;

#[cfg(test)]
mod pty_tests;

use pty::PtyRegistry;
use std::sync::Arc;

/// Configures and runs the Tauri application.
///
/// This function is called from `main.rs` and sets up:
/// - The PTY registry as managed state
/// - All IPC command handlers
/// - The shell plugin for opening external URLs
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Arc::new(PtyRegistry::new()))
        .invoke_handler(tauri::generate_handler![
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::kill_pty,
            pty::list_ptys,
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run ShiftWork");
}
