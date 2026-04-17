/**
 * workspace.ts — Type definitions for the workspace and tab data model.
 *
 * ShiftWork organizes terminal sessions in a two-level hierarchy:
 *
 *   Workspace → Tab → Terminal (PTY)
 *
 * A workspace groups related terminal sessions (e.g., "frontend dev",
 * "agent shift #3"). Each tab within a workspace holds a single terminal
 * pane backed by a PTY process. This model mirrors the cmux/aiterm pattern
 * and provides the foundation for future split-pane support.
 *
 * The state is managed by Zustand and persisted across sessions (future).
 */

/** Unique identifier for a workspace. */
export type WorkspaceId = string;

/** Unique identifier for a tab within a workspace. */
export type TabId = string;

/** The type of content a tab can hold. */
export type TabType = "terminal" | "agent";

/** Represents a single tab within a workspace. */
export interface Tab {
  /** Unique tab identifier. */
  id: TabId;
  /** Display name shown in the tab bar. */
  name: string;
  /** The type of content in this tab. */
  type: TabType;
  /** The PTY session ID backing this tab (set after spawn). */
  ptyId: string | null;
  /** Working directory for this tab's terminal. */
  cwd?: string;
  /** Whether the PTY process has exited. */
  exited: boolean;
  /** Exit code of the PTY process, if it has exited. */
  exitCode?: number | null;
  /** For agent tabs: the agent driver type (e.g., "claude-code"). */
  agentDriver?: string;
  /** For agent tabs: the task prompt that was given to the agent. */
  agentPrompt?: string;
  /** Timestamp when the tab was created. */
  createdAt: number;
}

/** Represents a workspace containing multiple tabs. */
export interface Workspace {
  /** Unique workspace identifier. */
  id: WorkspaceId;
  /** Display name shown in the sidebar. */
  name: string;
  /** Accent color for the workspace indicator. */
  color: string;
  /** Ordered list of tabs in this workspace. */
  tabs: Tab[];
  /** ID of the currently active tab. */
  activeTabId: TabId | null;
  /** Timestamp when the workspace was created. */
  createdAt: number;
}

/** Predefined workspace colors for visual distinction. */
export const WORKSPACE_COLORS = [
  "#7aa2f7", // blue
  "#9ece6a", // green
  "#e0af68", // yellow
  "#f7768e", // red
  "#bb9af7", // purple
  "#7dcfff", // cyan
  "#ff9e64", // orange
  "#c0caf5", // white
] as const;
