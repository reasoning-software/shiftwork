/**
 * TerminalPane.tsx — Renders a single terminal session.
 *
 * This component is the bridge between the xterm.js terminal emulator and the
 * Rust PTY backend. It handles:
 *
 *   - Mounting an xterm.js instance into a DOM container
 *   - Connecting the terminal to a PTY session via Tauri IPC events
 *   - Forwarding user keystrokes to the PTY
 *   - Auto-fitting the terminal when the container resizes
 *   - Cleaning up listeners and the PTY on unmount
 *
 * Each TerminalPane corresponds to one tab in the workspace UI. The PTY
 * session ID is provided by the parent component (which manages tab state).
 */

import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { writePty, resizePty, onPtyOutput, onPtyExit } from "../lib/pty";
import "@xterm/xterm/css/xterm.css";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TerminalPaneProps {
  /** The PTY session ID this terminal is connected to. */
  ptyId: string;
  /** Called when the PTY process exits. */
  onExit?: (code: number | null) => void;
  /** Whether this pane is currently visible/focused. */
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TerminalPane({ ptyId, onExit, isActive = true }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Stable reference for the fit function, used by ResizeObserver.
  const fitTerminal = useCallback(() => {
    const fitAddon = fitAddonRef.current;
    const terminal = terminalRef.current;
    if (!fitAddon || !terminal) return;

    try {
      fitAddon.fit();
      // Notify the backend of the new dimensions so the PTY can
      // update its internal size (important for curses apps, vim, etc.)
      resizePty(ptyId, terminal.cols, terminal.rows).catch((err) => {
        console.warn(`Failed to resize PTY ${ptyId}:`, err);
      });
    } catch {
      // FitAddon can throw if the container has zero dimensions
      // (e.g., during a layout transition). Safe to ignore.
    }
  }, [ptyId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // -----------------------------------------------------------------------
    // 1. Create the xterm.js terminal instance
    // -----------------------------------------------------------------------
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Menlo, monospace",
      lineHeight: 1.2,
      scrollback: 10000,
      theme: {
        background: "#1a1b26",
        foreground: "#c0caf5",
        cursor: "#c0caf5",
        selectionBackground: "#33467c",
        black: "#15161e",
        red: "#f7768e",
        green: "#9ece6a",
        yellow: "#e0af68",
        blue: "#7aa2f7",
        magenta: "#bb9af7",
        cyan: "#7dcfff",
        white: "#a9b1d6",
        brightBlack: "#414868",
        brightRed: "#f7768e",
        brightGreen: "#9ece6a",
        brightYellow: "#e0af68",
        brightBlue: "#7aa2f7",
        brightMagenta: "#bb9af7",
        brightCyan: "#7dcfff",
        brightWhite: "#c0caf5",
      },
    });

    // -----------------------------------------------------------------------
    // 2. Load addons
    // -----------------------------------------------------------------------
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    // Open the terminal in the DOM container.
    terminal.open(container);

    // Try to load the WebGL renderer for better performance.
    // Falls back to the canvas renderer if WebGL is unavailable.
    try {
      terminal.loadAddon(new WebglAddon());
    } catch {
      console.warn("WebGL addon failed to load; using canvas renderer.");
    }

    // Store refs for the resize handler.
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initial fit.
    fitAddon.fit();

    // -----------------------------------------------------------------------
    // 3. Connect terminal input → PTY (user keystrokes)
    // -----------------------------------------------------------------------
    const onDataDisposable = terminal.onData((data) => {
      const encoded = new TextEncoder().encode(data);
      writePty(ptyId, encoded).catch((err) => {
        console.error(`Failed to write to PTY ${ptyId}:`, err);
      });
    });

    // -----------------------------------------------------------------------
    // 4. Connect PTY output → terminal (process output)
    // -----------------------------------------------------------------------
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    const setupListeners = async () => {
      unlistenOutput = await onPtyOutput(ptyId, (data) => {
        terminal.write(data);
      });

      unlistenExit = await onPtyExit(ptyId, (code) => {
        terminal.writeln(`\r\n\x1b[90m[Process exited with code ${code ?? "unknown"}]\x1b[0m`);
        onExit?.(code);
      });
    };

    setupListeners();

    // -----------------------------------------------------------------------
    // 5. Observe container resizes
    // -----------------------------------------------------------------------
    const resizeObserver = new ResizeObserver(() => {
      // Debounce slightly to avoid excessive resize calls during drag.
      requestAnimationFrame(() => fitTerminal());
    });
    resizeObserver.observe(container);

    // Notify the backend of the initial terminal size.
    resizePty(ptyId, terminal.cols, terminal.rows).catch(() => {});

    // -----------------------------------------------------------------------
    // 6. Cleanup on unmount
    // -----------------------------------------------------------------------
    return () => {
      resizeObserver.disconnect();
      onDataDisposable.dispose();
      unlistenOutput?.();
      unlistenExit?.();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [ptyId, onExit, fitTerminal]);

  // Re-fit when the pane becomes active (e.g., tab switch).
  useEffect(() => {
    if (isActive) {
      // Small delay to let the layout settle before fitting.
      const timer = setTimeout(() => fitTerminal(), 50);
      return () => clearTimeout(timer);
    }
  }, [isActive, fitTerminal]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    />
  );
}
