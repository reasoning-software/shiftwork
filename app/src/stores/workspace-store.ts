/**
 * workspace-store.ts — Global state management for workspaces and tabs.
 *
 * Uses Zustand for lightweight, reactive state management. This store is the
 * single source of truth for:
 *
 *   - Which workspaces exist and their metadata
 *   - Which tabs exist within each workspace
 *   - Which workspace and tab are currently active
 *   - Tab lifecycle (creation, PTY binding, exit tracking)
 *
 * The store exposes granular actions so that UI components and the PTY
 * lifecycle hooks can update state without knowing the internal structure.
 *
 * Future: This store will be extended with persistence (localStorage or
 * SQLite via Tauri) to restore workspace layouts across app restarts.
 */

import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  Workspace,
  WorkspaceId,
  Tab,
  TabId,
  TabType,
  WORKSPACE_COLORS,
} from "../types/workspace";

// Re-export the colors for use in the store.
const COLORS: readonly string[] = [
  "#7aa2f7",
  "#9ece6a",
  "#e0af68",
  "#f7768e",
  "#bb9af7",
  "#7dcfff",
  "#ff9e64",
  "#c0caf5",
];

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

export interface WorkspaceStore {
  /** All workspaces, keyed by ID. */
  workspaces: Workspace[];
  /** The currently active workspace ID. */
  activeWorkspaceId: WorkspaceId | null;

  // --- Workspace Actions ---

  /** Creates a new workspace with a default terminal tab. */
  createWorkspace: (name?: string) => WorkspaceId;
  /** Removes a workspace and all its tabs. */
  removeWorkspace: (id: WorkspaceId) => void;
  /** Renames a workspace. */
  renameWorkspace: (id: WorkspaceId, name: string) => void;
  /** Switches to a workspace. */
  setActiveWorkspace: (id: WorkspaceId) => void;

  // --- Tab Actions ---

  /** Creates a new tab in the specified workspace. */
  createTab: (
    workspaceId: WorkspaceId,
    options?: {
      name?: string;
      type?: TabType;
      cwd?: string;
      agentDriver?: string;
      agentPrompt?: string;
    },
  ) => TabId;
  /** Removes a tab from its workspace. */
  removeTab: (workspaceId: WorkspaceId, tabId: TabId) => void;
  /** Renames a tab. */
  renameTab: (workspaceId: WorkspaceId, tabId: TabId, name: string) => void;
  /** Sets the active tab within a workspace. */
  setActiveTab: (workspaceId: WorkspaceId, tabId: TabId) => void;
  /** Binds a PTY session ID to a tab (called after spawn). */
  bindPty: (workspaceId: WorkspaceId, tabId: TabId, ptyId: string) => void;
  /** Marks a tab's PTY as exited. */
  markTabExited: (
    workspaceId: WorkspaceId,
    tabId: TabId,
    exitCode: number | null,
  ) => void;

  // --- Selectors ---

  /** Returns the currently active workspace, or null. */
  getActiveWorkspace: () => Workspace | null;
  /** Returns the currently active tab in the active workspace, or null. */
  getActiveTab: () => Tab | null;
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => {
  // Helper to find a workspace by ID.
  const findWorkspace = (id: WorkspaceId): Workspace | undefined =>
    get().workspaces.find((w) => w.id === id);

  // Helper to update a workspace immutably.
  const updateWorkspace = (
    id: WorkspaceId,
    updater: (ws: Workspace) => Workspace,
  ) => {
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === id ? updater(ws) : ws,
      ),
    }));
  };

  return {
    workspaces: [],
    activeWorkspaceId: null,

    // --- Workspace Actions ---

    createWorkspace: (name) => {
      const id = nanoid(10);
      const colorIndex = get().workspaces.length % COLORS.length;
      const workspace: Workspace = {
        id,
        name: name ?? `Workspace ${get().workspaces.length + 1}`,
        color: COLORS[colorIndex],
        tabs: [],
        activeTabId: null,
        createdAt: Date.now(),
      };

      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        activeWorkspaceId: id,
      }));

      return id;
    },

    removeWorkspace: (id) => {
      set((state) => {
        const remaining = state.workspaces.filter((w) => w.id !== id);
        const newActive =
          state.activeWorkspaceId === id
            ? remaining[remaining.length - 1]?.id ?? null
            : state.activeWorkspaceId;

        return {
          workspaces: remaining,
          activeWorkspaceId: newActive,
        };
      });
    },

    renameWorkspace: (id, name) => {
      updateWorkspace(id, (ws) => ({ ...ws, name }));
    },

    setActiveWorkspace: (id) => {
      set({ activeWorkspaceId: id });
    },

    // --- Tab Actions ---

    createTab: (workspaceId, options = {}) => {
      const tabId = nanoid(10);
      const workspace = findWorkspace(workspaceId);
      const tabNumber = (workspace?.tabs.length ?? 0) + 1;

      const tab: Tab = {
        id: tabId,
        name: options.name ?? `Terminal ${tabNumber}`,
        type: options.type ?? "terminal",
        ptyId: null,
        cwd: options.cwd,
        exited: false,
        agentDriver: options.agentDriver,
        agentPrompt: options.agentPrompt,
        createdAt: Date.now(),
      };

      updateWorkspace(workspaceId, (ws) => ({
        ...ws,
        tabs: [...ws.tabs, tab],
        activeTabId: tabId,
      }));

      return tabId;
    },

    removeTab: (workspaceId, tabId) => {
      updateWorkspace(workspaceId, (ws) => {
        const remaining = ws.tabs.filter((t) => t.id !== tabId);
        const newActive =
          ws.activeTabId === tabId
            ? remaining[remaining.length - 1]?.id ?? null
            : ws.activeTabId;

        return {
          ...ws,
          tabs: remaining,
          activeTabId: newActive,
        };
      });
    },

    renameTab: (workspaceId, tabId, name) => {
      updateWorkspace(workspaceId, (ws) => ({
        ...ws,
        tabs: ws.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)),
      }));
    },

    setActiveTab: (workspaceId, tabId) => {
      updateWorkspace(workspaceId, (ws) => ({
        ...ws,
        activeTabId: tabId,
      }));
    },

    bindPty: (workspaceId, tabId, ptyId) => {
      updateWorkspace(workspaceId, (ws) => ({
        ...ws,
        tabs: ws.tabs.map((t) =>
          t.id === tabId ? { ...t, ptyId } : t,
        ),
      }));
    },

    markTabExited: (workspaceId, tabId, exitCode) => {
      updateWorkspace(workspaceId, (ws) => ({
        ...ws,
        tabs: ws.tabs.map((t) =>
          t.id === tabId ? { ...t, exited: true, exitCode } : t,
        ),
      }));
    },

    // --- Selectors ---

    getActiveWorkspace: () => {
      const { workspaces, activeWorkspaceId } = get();
      return workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
    },

    getActiveTab: () => {
      const workspace = get().getActiveWorkspace();
      if (!workspace) return null;
      return (
        workspace.tabs.find((t) => t.id === workspace.activeTabId) ?? null
      );
    },
  };
});
