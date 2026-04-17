// pty.rs — Pseudo-Terminal management for ShiftWork
//
// This module manages the lifecycle of PTY (Pseudo-Terminal) processes.
// Each terminal tab in the ShiftWork UI is backed by a PTY instance that
// runs a system shell (or an agent process). The module handles:
//
//   - Spawning new PTY processes with configurable shell and environment
//   - Streaming PTY output to the frontend via Tauri events
//   - Accepting input from the frontend and writing it to the PTY
//   - Resizing the PTY when the terminal viewport changes
//   - Graceful and forceful termination of PTY processes
//
// The PTY registry is thread-safe (using parking_lot::RwLock) and supports
// concurrent access from multiple Tauri command handlers.

use parking_lot::RwLock;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

/// Represents a single PTY session in the registry.
struct PtySession {
    /// Writer handle for sending input to the PTY.
    writer: Box<dyn Write + Send>,
    /// The master PTY handle, used for resizing.
    master: Box<dyn MasterPty + Send>,
    /// Whether this session is still alive.
    alive: bool,
}

/// Thread-safe registry of all active PTY sessions.
/// Managed as Tauri application state.
pub struct PtyRegistry {
    sessions: RwLock<HashMap<String, PtySession>>,
}

impl PtyRegistry {
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
        }
    }
}

/// Payload emitted to the frontend when a PTY produces output.
#[derive(Clone, Serialize)]
pub struct PtyOutputPayload {
    pub id: String,
    pub data: Vec<u8>,
}

/// Payload emitted to the frontend when a PTY process exits.
#[derive(Clone, Serialize)]
pub struct PtyExitPayload {
    pub id: String,
    pub code: Option<i32>,
}

/// Options for spawning a new PTY session.
#[derive(Debug, Deserialize)]
pub struct SpawnOptions {
    /// The shell or command to run. Defaults to the user's login shell.
    pub command: Option<String>,
    /// Arguments to pass to the command.
    pub args: Option<Vec<String>>,
    /// Working directory for the PTY process.
    pub cwd: Option<String>,
    /// Additional environment variables to set.
    pub env: Option<HashMap<String, String>>,
    /// Initial number of columns. Defaults to 80.
    pub cols: Option<u16>,
    /// Initial number of rows. Defaults to 24.
    pub rows: Option<u16>,
}

/// Detects the user's default shell from the environment.
fn default_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| {
        if cfg!(target_os = "windows") {
            "powershell.exe".to_string()
        } else {
            "/bin/bash".to_string()
        }
    })
}

/// Spawns a new PTY session and begins streaming its output.
///
/// Returns the unique session ID that the frontend uses to reference this PTY.
///
/// # Arguments
/// * `app` - The Tauri application handle, used for emitting events.
/// * `options` - Configuration for the new PTY session.
///
/// # Errors
/// Returns an error string if the PTY cannot be created or the command fails to spawn.
#[tauri::command]
pub fn spawn_pty(
    app: AppHandle,
    state: tauri::State<'_, Arc<PtyRegistry>>,
    options: SpawnOptions,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let cols = options.cols.unwrap_or(80);
    let rows = options.rows.unwrap_or(24);

    // Create the PTY with the requested size.
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {e}"))?;

    // Build the command to execute inside the PTY.
    let shell = options.command.unwrap_or_else(default_shell);
    let mut cmd = CommandBuilder::new(&shell);

    if let Some(args) = options.args {
        for arg in args {
            cmd.arg(arg);
        }
    }

    if let Some(cwd) = options.cwd {
        cmd.cwd(cwd);
    }

    if let Some(env_vars) = options.env {
        for (key, value) in env_vars {
            cmd.env(key, value);
        }
    }

    // Set TERM so that CLI tools render correctly.
    cmd.env("TERM", "xterm-256color");

    // Spawn the child process inside the PTY.
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn command '{shell}': {e}"))?;

    // Get a writer for sending input to the PTY.
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take PTY writer: {e}"))?;

    // Get a reader for receiving output from the PTY.
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {e}"))?;

    // Register the session.
    let session_id = id.clone();
    {
        let mut sessions = state.sessions.write();
        sessions.insert(
            session_id.clone(),
            PtySession {
                writer,
                master: pair.master,
                alive: true,
            },
        );
    }

    // Spawn a thread to read PTY output and emit it to the frontend.
    let output_id = id.clone();
    let output_app = app.clone();
    thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF — PTY closed.
                Ok(n) => {
                    let payload = PtyOutputPayload {
                        id: output_id.clone(),
                        data: buf[..n].to_vec(),
                    };
                    let _ = output_app.emit("pty:output", payload);
                }
                Err(_) => break,
            }
        }
    });

    // Spawn a thread to wait for the child process to exit.
    let exit_id = id.clone();
    let exit_app = app.clone();
    let registry = state.inner().clone();
    thread::spawn(move || {
        let status = child.wait();
        let code = status.ok().and_then(|s| {
            // portable-pty ExitStatus doesn't directly expose the code on all
            // platforms, but we can check success.
            if s.success() {
                Some(0)
            } else {
                Some(1)
            }
        });

        // Mark the session as dead.
        {
            let mut sessions = registry.sessions.write();
            if let Some(session) = sessions.get_mut(&exit_id) {
                session.alive = false;
            }
        }

        let payload = PtyExitPayload {
            id: exit_id,
            code,
        };
        let _ = exit_app.emit("pty:exit", payload);
    });

    log::info!("Spawned PTY session {id} running '{shell}'");
    Ok(id)
}

/// Writes raw input bytes to a PTY session.
///
/// This is called when the user types in the terminal. The frontend sends
/// keystrokes as raw bytes, which are written directly to the PTY's stdin.
#[tauri::command]
pub fn write_pty(
    state: tauri::State<'_, Arc<PtyRegistry>>,
    id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let mut sessions = state.sessions.write();
    let session = sessions
        .get_mut(&id)
        .ok_or_else(|| format!("PTY session '{id}' not found"))?;

    if !session.alive {
        return Err(format!("PTY session '{id}' has exited"));
    }

    session
        .writer
        .write_all(&data)
        .map_err(|e| format!("Failed to write to PTY '{id}': {e}"))?;

    session
        .writer
        .flush()
        .map_err(|e| format!("Failed to flush PTY '{id}': {e}"))?;

    Ok(())
}

/// Resizes a PTY session to match the terminal viewport dimensions.
///
/// Called when the user resizes the window or a split pane changes size.
#[tauri::command]
pub fn resize_pty(
    state: tauri::State<'_, Arc<PtyRegistry>>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.read();
    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("PTY session '{id}' not found"))?;

    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize PTY '{id}': {e}"))?;

    Ok(())
}

/// Terminates a PTY session and removes it from the registry.
///
/// This performs a graceful shutdown: the PTY master is dropped, which sends
/// a hangup signal to the child process.
#[tauri::command]
pub fn kill_pty(
    state: tauri::State<'_, Arc<PtyRegistry>>,
    id: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.write();
    let _session = sessions
        .remove(&id)
        .ok_or_else(|| format!("PTY session '{id}' not found"))?;

    // Dropping the session closes the master PTY, which sends SIGHUP to the child.
    log::info!("Killed PTY session {id}");
    Ok(())
}

/// Lists all active PTY session IDs.
///
/// Used by the frontend to reconcile its tab state with the backend.
#[tauri::command]
pub fn list_ptys(
    state: tauri::State<'_, Arc<PtyRegistry>>,
) -> Vec<String> {
    let sessions = state.sessions.read();
    sessions
        .iter()
        .filter(|(_, s)| s.alive)
        .map(|(id, _)| id.clone())
        .collect()
}
