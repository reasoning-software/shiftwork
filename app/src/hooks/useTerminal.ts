/**
 * useTerminal.ts — Hook for managing the PTY lifecycle of a terminal tab.
 *
 * This hook bridges the workspace store (which tracks tab metadata) with the
 * PTY backend (which manages actual terminal processes). When a tab is created,
 * this hook:
 *
 *   1. Spawns a new PTY session via the Rust backend
 *   2. Binds the PTY session ID to the tab in the store
 *   3. Handles PTY exit by updating the tab's exited state
 *   4. Cleans up the PTY when the tab is removed
 *
 * Usage: Call this hook in the component that renders a terminal tab.
 * It returns the PTY session ID (or null if not yet spawned) and a
 * boolean indicating whether the PTY is still alive.
 */

import { useEffect, useRef, useState } from "react";
import { spawnPty, killPty } from "../lib/pty";
import { useWorkspaceStore } from "../stores/workspace-store";
import type { Tab } from "../types/workspace";

interface UseTerminalOptions {
  /** The workspace ID containing this tab. */
  workspaceId: string;
  /** The tab to manage. */
  tab: Tab;
}

interface UseTerminalResult {
  /** The PTY session ID, or null if not yet spawned. */
  ptyId: string | null;
  /** Whether the PTY is still running. */
  isAlive: boolean;
  /** Any error that occurred during spawn. */
  error: string | null;
}

export function useTerminal({
  workspaceId,
  tab,
}: UseTerminalOptions): UseTerminalResult {
  const [error, setError] = useState<string | null>(null);
  const spawnedRef = useRef(false);
  const bindPty = useWorkspaceStore((s) => s.bindPty);
  const markTabExited = useWorkspaceStore((s) => s.markTabExited);

  useEffect(() => {
    // Only spawn once per tab, and only if no PTY is bound yet.
    if (spawnedRef.current || tab.ptyId) return;
    spawnedRef.current = true;

    const doSpawn = async () => {
      try {
        const ptyId = await spawnPty({
          command: tab.agentDriver ? undefined : undefined, // Use default shell
          cwd: tab.cwd,
          env: tab.agentDriver
            ? { SHIFTWORK_AGENT: tab.agentDriver }
            : undefined,
        });
        bindPty(workspaceId, tab.id, ptyId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error(`Failed to spawn PTY for tab ${tab.id}:`, message);
      }
    };

    doSpawn();
  }, [workspaceId, tab.id, tab.ptyId, tab.cwd, tab.agentDriver, bindPty]);

  // Cleanup: kill the PTY when the component unmounts (tab closed).
  useEffect(() => {
    return () => {
      if (tab.ptyId && !tab.exited) {
        killPty(tab.ptyId).catch((err) => {
          console.warn(`Failed to kill PTY ${tab.ptyId}:`, err);
        });
      }
    };
  }, [tab.ptyId, tab.exited]);

  return {
    ptyId: tab.ptyId,
    isAlive: !tab.exited,
    error,
  };
}
