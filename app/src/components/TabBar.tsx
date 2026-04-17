/**
 * TabBar.tsx — Tab bar for terminal sessions within a workspace.
 *
 * Displays tabs horizontally across the top of the terminal area. Each tab
 * shows its name, type indicator (terminal vs agent), and status. Provides
 * controls for switching, closing, and creating tabs.
 */

import { useWorkspaceStore } from "../stores/workspace-store";
import { killPty } from "../lib/pty";
import type { Tab, WorkspaceId } from "../types/workspace";

interface TabBarProps {
  workspaceId: WorkspaceId;
  tabs: Tab[];
  activeTabId: string | null;
}

export function TabBar({ workspaceId, tabs, activeTabId }: TabBarProps) {
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const createTab = useWorkspaceStore((s) => s.createTab);
  const removeTab = useWorkspaceStore((s) => s.removeTab);

  const handleCloseTab = async (tab: Tab) => {
    // Kill the PTY if it's still running.
    if (tab.ptyId && !tab.exited) {
      try {
        await killPty(tab.ptyId);
      } catch {
        // PTY may already be dead; safe to ignore.
      }
    }
    removeTab(workspaceId, tab.id);
  };

  const handleNewTab = () => {
    createTab(workspaceId);
  };

  return (
    <div className="tab-bar">
      <div className="tab-bar-tabs">
        {tabs.map((tab) => (
          <TabEntry
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => setActiveTab(workspaceId, tab.id)}
            onClose={() => handleCloseTab(tab)}
          />
        ))}
      </div>
      <button
        className="tab-bar-new"
        onClick={handleNewTab}
        title="New Terminal (Cmd+T)"
      >
        +
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Entry
// ---------------------------------------------------------------------------

interface TabEntryProps {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function TabEntry({ tab, isActive, onSelect, onClose }: TabEntryProps) {
  const typeIcon = tab.type === "agent" ? "◆" : "›";
  const statusColor = tab.exited
    ? tab.exitCode === 0
      ? "#9ece6a" // green for clean exit
      : "#f7768e" // red for error exit
    : "#7aa2f7"; // blue for running

  return (
    <div
      className={`tab-entry ${isActive ? "active" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      <span className="tab-type-icon" style={{ color: statusColor }}>
        {typeIcon}
      </span>
      <span className="tab-name">{tab.name}</span>
      {tab.exited && (
        <span className="tab-exited-badge" title={`Exited: ${tab.exitCode}`}>
          ✓
        </span>
      )}
      <button
        className="tab-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="Close tab"
      >
        ×
      </button>
    </div>
  );
}
