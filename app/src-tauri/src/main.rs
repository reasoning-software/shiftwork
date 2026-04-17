// main.rs — Binary entry point for the ShiftWork desktop application.
//
// This is intentionally minimal. All application logic lives in lib.rs,
// following Tauri v2 conventions that separate the library (testable) from
// the binary (just a thin launcher).

// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    shiftwork_app_lib::run();
}
