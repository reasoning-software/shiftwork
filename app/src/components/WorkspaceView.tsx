/**
 * WorkspaceView.tsx — Main content area for a single workspace.
 *
 * Renders the tab bar and the active terminal pane for the currently selected
 * workspace. Manages the PTY lifecycle for each tab: spawning PTYs when tabs
 * are created and cleaning up when they're removed.
 *
 * This component is the primary composition point where the tab management UI
 * meets the terminal rendering layer.
 */

import { TabBar } from "./TabBar";
import { TerminalPane } from "./TerminalPane";
import { useTerminal } from "../hooks/useTerminal";
import { useWorkspaceStore } from "../stores/workspace-store";
import type { Workspace, Tab } from "../types/workspace";

interface WorkspaceViewProps {
  workspace: Workspace;
}

export function WorkspaceView({ workspace }: WorkspaceViewProps) {
  const activeTab = workspace.tabs.find(
    (t) => t.id === workspace.activeTabId,
  );

  return (
    <div className="workspace-view">
      <TabBar
        workspaceId={workspace.id}
        tabs={workspace.tabs}
        activeTabId={workspace.activeTabId}
      />
      <div className="workspace-terminal-area">
        {activeTab ? (
          <ActiveTerminal
            key={activeTab.id}
            workspaceId={workspace.id}
            tab={activeTab}
          />
        ) : (
          <EmptyState workspaceId={workspace.id} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Terminal — manages PTY lifecycle for the visible tab
// ---------------------------------------------------------------------------

interface ActiveTerminalProps {
  workspaceId: string;
  tab: Tab;
}

function ActiveTerminal({ workspaceId, tab }: ActiveTerminalProps) {
  const markTabExited = useWorkspaceStore((s) => s.markTabExited);

  const { ptyId, error } = useTerminal({
    workspaceId,
    tab,
  });

  const handleExit = (code: number | null) => {
    markTabExited(workspaceId, tab.id, code);
  };

  if (error) {
    return (
      <div className="terminal-error">
        <p>Failed to start terminal</p>
        <code>{error}</code>
      </div>
    );
  }

  if (!ptyId) {
    return (
      <div className="terminal-loading">
        <p>Starting terminal...</p>
      </div>
    );
  }

  return <TerminalPane ptyId={ptyId} onExit={handleExit} isActive />;
}

// ---------------------------------------------------------------------------
// Empty State — shown when a workspace has no tabs
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  workspaceId: string;
}

function EmptyState({ workspaceId }: EmptyStateProps) {
  const createTab = useWorkspaceStore((s) => s.createTab);

  return (
    <div className="workspace-empty">
      <h2>No terminals open</h2>
      <p>Create a new terminal to get started.</p>
      <button
        className="empty-new-terminal"
        onClick={() => createTab(workspaceId)}
      >
        New Terminal
      </button>
    </div>
  );
}
