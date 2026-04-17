/**
 * Sidebar.tsx — Workspace navigation sidebar.
 *
 * Displays the list of workspaces with visual indicators and provides
 * controls for creating, switching, and removing workspaces. The design
 * follows the cmux pattern: a vertical sidebar on the left edge of the
 * window with workspace entries that show name, color accent, and tab count.
 */

import { useWorkspaceStore } from "../stores/workspace-store";
import type { Workspace } from "../types/workspace";

export function Sidebar() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const createTab = useWorkspaceStore((s) => s.createTab);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);

  const handleNewWorkspace = () => {
    const wsId = createWorkspace();
    createTab(wsId);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">ShiftWork</span>
      </div>

      <nav className="sidebar-workspaces">
        {workspaces.map((ws) => (
          <WorkspaceEntry
            key={ws.id}
            workspace={ws}
            isActive={ws.id === activeWorkspaceId}
            onSelect={() => setActiveWorkspace(ws.id)}
            onRemove={() => removeWorkspace(ws.id)}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-new-workspace"
          onClick={handleNewWorkspace}
          title="New Workspace (Cmd+N)"
        >
          + New Workspace
        </button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Workspace Entry
// ---------------------------------------------------------------------------

interface WorkspaceEntryProps {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function WorkspaceEntry({
  workspace,
  isActive,
  onSelect,
  onRemove,
}: WorkspaceEntryProps) {
  const activeTabs = workspace.tabs.filter((t) => !t.exited).length;
  const totalTabs = workspace.tabs.length;

  return (
    <div
      className={`sidebar-workspace-entry ${isActive ? "active" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      <div
        className="workspace-color-indicator"
        style={{ backgroundColor: workspace.color }}
      />
      <div className="workspace-info">
        <span className="workspace-name">{workspace.name}</span>
        <span className="workspace-tab-count">
          {activeTabs}/{totalTabs} tabs
        </span>
      </div>
      {!isActive && (
        <button
          className="workspace-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove workspace"
        >
          ×
        </button>
      )}
    </div>
  );
}
