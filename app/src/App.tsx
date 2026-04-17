/**
 * App.tsx — Root application component for ShiftWork.
 *
 * Composes the sidebar (workspace navigation) and the main content area
 * (active workspace view). On first launch, creates a default workspace
 * with a single terminal tab so the user immediately has a working shell.
 *
 * Keyboard shortcuts:
 *   Cmd/Ctrl+N         — New workspace
 *   Cmd/Ctrl+T         — New terminal tab
 *   Cmd/Ctrl+W         — Close active tab
 *   Cmd/Ctrl+Shift+A   — Spawn agent dialog
 *   Cmd/Ctrl+1-9       — Switch workspace by index
 *
 * Layout:
 * ┌──────────┬──────────────────────────────────────┐
 * │          │  Tab Bar                              │
 * │ Sidebar  ├──────────────────────────────────────┤
 * │          │                                      │
 * │          │  Terminal Pane                        │
 * │          │                                      │
 * └──────────┴──────────────────────────────────────┘
 */

import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceView } from "./components/WorkspaceView";
import { SpawnAgentDialog } from "./components/SpawnAgentDialog";
import { useWorkspaceStore } from "./stores/workspace-store";
import "./styles/app.css";
import "./styles/dialog.css";

export function App() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const createTab = useWorkspaceStore((s) => s.createTab);

  const [showAgentDialog, setShowAgentDialog] = useState(false);

  // On first launch, create a default workspace with one terminal tab.
  useEffect(() => {
    if (workspaces.length === 0) {
      const wsId = createWorkspace("Default");
      createTab(wsId, { name: "Terminal 1" });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // Register global keyboard shortcuts.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+N — New workspace
      if (isMeta && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        const wsId = createWorkspace();
        createTab(wsId);
      }

      // Cmd/Ctrl+T — New tab in active workspace
      if (isMeta && e.key === "t") {
        e.preventDefault();
        if (activeWorkspaceId) {
          createTab(activeWorkspaceId);
        }
      }

      // Cmd/Ctrl+W — Close active tab
      if (isMeta && e.key === "w" && !e.shiftKey) {
        e.preventDefault();
        if (activeWorkspace?.activeTabId) {
          const store = useWorkspaceStore.getState();
          const tab = activeWorkspace.tabs.find(
            (t) => t.id === activeWorkspace.activeTabId,
          );
          if (tab?.ptyId && !tab.exited) {
            import("./lib/pty").then(({ killPty }) => {
              killPty(tab.ptyId!).catch(() => {});
            });
          }
          store.removeTab(activeWorkspace.id, activeWorkspace.activeTabId);
        }
      }

      // Cmd/Ctrl+Shift+A — Spawn agent dialog
      if (isMeta && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (activeWorkspaceId) {
          setShowAgentDialog(true);
        }
      }

      // Cmd/Ctrl+1-9 — Switch to workspace by index
      if (isMeta && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const ws = workspaces[index];
        if (ws) {
          useWorkspaceStore.getState().setActiveWorkspace(ws.id);
        }
      }

      // Escape — Close dialogs
      if (e.key === "Escape") {
        setShowAgentDialog(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    createWorkspace,
    createTab,
  ]);

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        {activeWorkspace ? (
          <WorkspaceView workspace={activeWorkspace} />
        ) : (
          <div className="no-workspace">
            <p>No workspace selected</p>
          </div>
        )}
      </main>

      {showAgentDialog && activeWorkspaceId && (
        <SpawnAgentDialog
          workspaceId={activeWorkspaceId}
          onClose={() => setShowAgentDialog(false)}
        />
      )}
    </div>
  );
}
