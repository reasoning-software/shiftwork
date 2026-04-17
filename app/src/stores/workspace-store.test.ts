/**
 * workspace-store.test.ts — Unit tests for the workspace Zustand store.
 *
 * Tests the core state management logic: creating/removing workspaces,
 * managing tabs, binding PTYs, and tracking exit state. These tests run
 * entirely in-memory without any Tauri or DOM dependencies.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useWorkspaceStore } from "./workspace-store";

// Reset the store before each test to ensure isolation.
beforeEach(() => {
  useWorkspaceStore.setState({
    workspaces: [],
    activeWorkspaceId: null,
  });
});

describe("Workspace Management", () => {
  it("creates a workspace with a default name and color", () => {
    const { createWorkspace } = useWorkspaceStore.getState();
    const id = createWorkspace();

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0].id).toBe(id);
    expect(state.workspaces[0].name).toBe("Workspace 1");
    expect(state.workspaces[0].color).toBeTruthy();
    expect(state.workspaces[0].tabs).toHaveLength(0);
    expect(state.activeWorkspaceId).toBe(id);
  });

  it("creates a workspace with a custom name", () => {
    const { createWorkspace } = useWorkspaceStore.getState();
    createWorkspace("My Project");

    const state = useWorkspaceStore.getState();
    expect(state.workspaces[0].name).toBe("My Project");
  });

  it("assigns different colors to successive workspaces", () => {
    const { createWorkspace } = useWorkspaceStore.getState();
    createWorkspace("A");
    createWorkspace("B");
    createWorkspace("C");

    const state = useWorkspaceStore.getState();
    const colors = state.workspaces.map((w) => w.color);
    expect(new Set(colors).size).toBe(3);
  });

  it("removes a workspace and updates active selection", () => {
    const { createWorkspace, removeWorkspace } = useWorkspaceStore.getState();
    const id1 = createWorkspace("First");
    const id2 = createWorkspace("Second");

    // Active should be the last created.
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(id2);

    // Remove the active workspace; should fall back to the remaining one.
    removeWorkspace(id2);
    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.activeWorkspaceId).toBe(id1);
  });

  it("renames a workspace", () => {
    const { createWorkspace, renameWorkspace } = useWorkspaceStore.getState();
    const id = createWorkspace("Old Name");
    renameWorkspace(id, "New Name");

    const ws = useWorkspaceStore.getState().workspaces[0];
    expect(ws.name).toBe("New Name");
  });

  it("switches active workspace", () => {
    const { createWorkspace, setActiveWorkspace } =
      useWorkspaceStore.getState();
    const id1 = createWorkspace("A");
    const id2 = createWorkspace("B");

    setActiveWorkspace(id1);
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(id1);

    setActiveWorkspace(id2);
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(id2);
  });
});

describe("Tab Management", () => {
  let workspaceId: string;

  beforeEach(() => {
    const { createWorkspace } = useWorkspaceStore.getState();
    workspaceId = createWorkspace("Test");
  });

  it("creates a tab with default name", () => {
    const { createTab } = useWorkspaceStore.getState();
    const tabId = createTab(workspaceId);

    const ws = useWorkspaceStore.getState().workspaces[0];
    expect(ws.tabs).toHaveLength(1);
    expect(ws.tabs[0].id).toBe(tabId);
    expect(ws.tabs[0].name).toBe("Terminal 1");
    expect(ws.tabs[0].type).toBe("terminal");
    expect(ws.tabs[0].ptyId).toBeNull();
    expect(ws.tabs[0].exited).toBe(false);
    expect(ws.activeTabId).toBe(tabId);
  });

  it("creates an agent tab with metadata", () => {
    const { createTab } = useWorkspaceStore.getState();
    createTab(workspaceId, {
      name: "Claude",
      type: "agent",
      agentDriver: "claude-code",
      agentPrompt: "Fix the bug",
    });

    const tab = useWorkspaceStore.getState().workspaces[0].tabs[0];
    expect(tab.type).toBe("agent");
    expect(tab.agentDriver).toBe("claude-code");
    expect(tab.agentPrompt).toBe("Fix the bug");
  });

  it("removes a tab and updates active selection", () => {
    const { createTab, removeTab } = useWorkspaceStore.getState();
    const tab1 = createTab(workspaceId, { name: "Tab 1" });
    const tab2 = createTab(workspaceId, { name: "Tab 2" });

    expect(useWorkspaceStore.getState().workspaces[0].activeTabId).toBe(tab2);

    removeTab(workspaceId, tab2);
    const ws = useWorkspaceStore.getState().workspaces[0];
    expect(ws.tabs).toHaveLength(1);
    expect(ws.activeTabId).toBe(tab1);
  });

  it("renames a tab", () => {
    const { createTab, renameTab } = useWorkspaceStore.getState();
    const tabId = createTab(workspaceId, { name: "Old" });
    renameTab(workspaceId, tabId, "New");

    const tab = useWorkspaceStore.getState().workspaces[0].tabs[0];
    expect(tab.name).toBe("New");
  });

  it("binds a PTY session ID to a tab", () => {
    const { createTab, bindPty } = useWorkspaceStore.getState();
    const tabId = createTab(workspaceId);

    expect(
      useWorkspaceStore.getState().workspaces[0].tabs[0].ptyId,
    ).toBeNull();

    bindPty(workspaceId, tabId, "pty-abc-123");

    expect(useWorkspaceStore.getState().workspaces[0].tabs[0].ptyId).toBe(
      "pty-abc-123",
    );
  });

  it("marks a tab as exited with an exit code", () => {
    const { createTab, markTabExited } = useWorkspaceStore.getState();
    const tabId = createTab(workspaceId);

    markTabExited(workspaceId, tabId, 0);

    const tab = useWorkspaceStore.getState().workspaces[0].tabs[0];
    expect(tab.exited).toBe(true);
    expect(tab.exitCode).toBe(0);
  });

  it("marks a tab as exited with null code (signal kill)", () => {
    const { createTab, markTabExited } = useWorkspaceStore.getState();
    const tabId = createTab(workspaceId);

    markTabExited(workspaceId, tabId, null);

    const tab = useWorkspaceStore.getState().workspaces[0].tabs[0];
    expect(tab.exited).toBe(true);
    expect(tab.exitCode).toBeNull();
  });
});

describe("Selectors", () => {
  it("getActiveWorkspace returns the active workspace", () => {
    const { createWorkspace, getActiveWorkspace } =
      useWorkspaceStore.getState();
    createWorkspace("Active");

    const ws = useWorkspaceStore.getState().getActiveWorkspace();
    expect(ws).not.toBeNull();
    expect(ws!.name).toBe("Active");
  });

  it("getActiveWorkspace returns null when no workspace exists", () => {
    const ws = useWorkspaceStore.getState().getActiveWorkspace();
    expect(ws).toBeNull();
  });

  it("getActiveTab returns the active tab in the active workspace", () => {
    const { createWorkspace, createTab } = useWorkspaceStore.getState();
    const wsId = createWorkspace("WS");
    createTab(wsId, { name: "My Tab" });

    const tab = useWorkspaceStore.getState().getActiveTab();
    expect(tab).not.toBeNull();
    expect(tab!.name).toBe("My Tab");
  });

  it("getActiveTab returns null when no tabs exist", () => {
    const { createWorkspace } = useWorkspaceStore.getState();
    createWorkspace("Empty");

    const tab = useWorkspaceStore.getState().getActiveTab();
    expect(tab).toBeNull();
  });
});
