/**
 * pty.ts — Frontend bindings for the Rust PTY backend.
 *
 * This module provides a typed interface to the Tauri IPC commands that manage
 * pseudo-terminal sessions. It handles:
 *
 *   - Spawning new PTY sessions (shells or agent processes)
 *   - Writing user input to a PTY
 *   - Resizing a PTY when the terminal viewport changes
 *   - Killing a PTY session
 *   - Listening for PTY output and exit events
 *
 * All functions are thin wrappers around `@tauri-apps/api/core.invoke()` and
 * `@tauri-apps/api/event.listen()`, providing type safety and a clean API
 * for the React components to consume.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for spawning a new PTY session. */
export interface SpawnOptions {
  /** Shell or command to run. Defaults to the user's login shell. */
  command?: string;
  /** Arguments to pass to the command. */
  args?: string[];
  /** Working directory for the PTY process. */
  cwd?: string;
  /** Additional environment variables. */
  env?: Record<string, string>;
  /** Initial terminal width in columns. Defaults to 80. */
  cols?: number;
  /** Initial terminal height in rows. Defaults to 24. */
  rows?: number;
}

/** Payload received when a PTY produces output. */
export interface PtyOutputPayload {
  /** The PTY session ID. */
  id: string;
  /** Raw output bytes from the PTY. */
  data: number[];
}

/** Payload received when a PTY process exits. */
export interface PtyExitPayload {
  /** The PTY session ID. */
  id: string;
  /** Exit code, if available. */
  code: number | null;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Spawns a new PTY session on the Rust backend.
 *
 * @returns The unique session ID for the new PTY.
 */
export async function spawnPty(options: SpawnOptions = {}): Promise<string> {
  return invoke<string>("spawn_pty", { options });
}

/**
 * Writes raw input data to a PTY session.
 *
 * Called when the user types in the terminal. The data is typically a UTF-8
 * encoded string, but can include raw escape sequences for special keys.
 */
export async function writePty(id: string, data: Uint8Array): Promise<void> {
  return invoke("write_pty", { id, data: Array.from(data) });
}

/**
 * Resizes a PTY session to match the terminal viewport.
 *
 * Called when the xterm.js fit addon detects a size change.
 */
export async function resizePty(
  id: string,
  cols: number,
  rows: number,
): Promise<void> {
  return invoke("resize_pty", { id, cols, rows });
}

/**
 * Terminates a PTY session and removes it from the backend registry.
 */
export async function killPty(id: string): Promise<void> {
  return invoke("kill_pty", { id });
}

/**
 * Lists all active PTY session IDs.
 */
export async function listPtys(): Promise<string[]> {
  return invoke<string[]>("list_ptys");
}

// ---------------------------------------------------------------------------
// Event Listeners
// ---------------------------------------------------------------------------

/**
 * Subscribes to output events from a specific PTY session.
 *
 * The callback receives raw bytes that should be written to the xterm.js
 * terminal instance via `terminal.write(new Uint8Array(data))`.
 *
 * @returns An unlisten function to remove the subscription.
 */
export async function onPtyOutput(
  ptyId: string,
  callback: (data: Uint8Array) => void,
): Promise<UnlistenFn> {
  return listen<PtyOutputPayload>("pty:output", (event) => {
    if (event.payload.id === ptyId) {
      callback(new Uint8Array(event.payload.data));
    }
  });
}

/**
 * Subscribes to exit events from a specific PTY session.
 *
 * @returns An unlisten function to remove the subscription.
 */
export async function onPtyExit(
  ptyId: string,
  callback: (code: number | null) => void,
): Promise<UnlistenFn> {
  return listen<PtyExitPayload>("pty:exit", (event) => {
    if (event.payload.id === ptyId) {
      callback(event.payload.code);
    }
  });
}
