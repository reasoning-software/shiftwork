/**
 * setup.ts — Test setup and Tauri API mocks.
 *
 * Since frontend tests run in jsdom (not inside a Tauri webview), we need
 * to mock the Tauri IPC layer. This provides predictable responses for
 * the PTY commands so that component and store tests can run without a
 * real Rust backend.
 */

import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @tauri-apps/api/core
// ---------------------------------------------------------------------------

let mockInvokeHandler: ((cmd: string, args?: Record<string, unknown>) => unknown) | null = null;

/**
 * Set a custom invoke handler for a specific test.
 * Call with `null` to reset to the default handler.
 */
export function setMockInvokeHandler(
  handler: ((cmd: string, args?: Record<string, unknown>) => unknown) | null,
) {
  mockInvokeHandler = handler;
}

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
    if (mockInvokeHandler) {
      return mockInvokeHandler(cmd, args);
    }

    // Default mock responses for PTY commands.
    switch (cmd) {
      case "spawn_pty":
        return "mock-pty-id-" + Math.random().toString(36).slice(2, 8);
      case "write_pty":
        return undefined;
      case "resize_pty":
        return undefined;
      case "kill_pty":
        return undefined;
      case "list_ptys":
        return [];
      default:
        throw new Error(`Unmocked Tauri command: ${cmd}`);
    }
  }),
}));

// ---------------------------------------------------------------------------
// Mock @tauri-apps/api/event
// ---------------------------------------------------------------------------

const eventListeners = new Map<string, Set<(event: unknown) => void>>();

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (event: string, handler: (event: unknown) => void) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(handler);

    // Return an unlisten function.
    return () => {
      eventListeners.get(event)?.delete(handler);
    };
  }),
  emit: vi.fn(async () => {}),
}));

/**
 * Simulate emitting a Tauri event in tests.
 */
export function emitMockEvent(event: string, payload: unknown) {
  const listeners = eventListeners.get(event);
  if (listeners) {
    for (const listener of listeners) {
      listener({ payload });
    }
  }
}

// ---------------------------------------------------------------------------
// Cleanup between tests
// ---------------------------------------------------------------------------

afterEach(() => {
  mockInvokeHandler = null;
  eventListeners.clear();
});
