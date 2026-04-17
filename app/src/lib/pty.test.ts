/**
 * pty.test.ts — Unit tests for the PTY frontend bindings.
 *
 * These tests verify that the PTY functions correctly invoke the Tauri
 * IPC commands with the right arguments. The actual Tauri backend is
 * mocked (see tests/setup.ts).
 */

import { describe, it, expect, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  spawnPty,
  writePty,
  resizePty,
  killPty,
  listPtys,
  onPtyOutput,
  onPtyExit,
} from "./pty";
import { emitMockEvent } from "../tests/setup";

describe("PTY Commands", () => {
  it("spawnPty invokes spawn_pty with options", async () => {
    const id = await spawnPty({ cols: 120, rows: 40, cwd: "/tmp" });

    expect(invoke).toHaveBeenCalledWith("spawn_pty", {
      options: { cols: 120, rows: 40, cwd: "/tmp" },
    });
    expect(typeof id).toBe("string");
  });

  it("spawnPty invokes with empty options by default", async () => {
    await spawnPty();

    expect(invoke).toHaveBeenCalledWith("spawn_pty", { options: {} });
  });

  it("writePty invokes write_pty with id and data", async () => {
    const data = new TextEncoder().encode("hello");
    await writePty("pty-123", data);

    expect(invoke).toHaveBeenCalledWith("write_pty", {
      id: "pty-123",
      data: Array.from(data),
    });
  });

  it("resizePty invokes resize_pty with dimensions", async () => {
    await resizePty("pty-123", 100, 50);

    expect(invoke).toHaveBeenCalledWith("resize_pty", {
      id: "pty-123",
      cols: 100,
      rows: 50,
    });
  });

  it("killPty invokes kill_pty with id", async () => {
    await killPty("pty-123");

    expect(invoke).toHaveBeenCalledWith("kill_pty", { id: "pty-123" });
  });

  it("listPtys invokes list_ptys and returns array", async () => {
    const result = await listPtys();

    expect(invoke).toHaveBeenCalledWith("list_ptys");
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("PTY Event Listeners", () => {
  it("onPtyOutput subscribes to pty:output and filters by id", async () => {
    const callback = vi.fn();
    const unlisten = await onPtyOutput("pty-abc", callback);

    // Emit an event for the matching PTY.
    emitMockEvent("pty:output", { id: "pty-abc", data: [72, 105] });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(new Uint8Array([72, 105]));

    // Emit an event for a different PTY — should not trigger callback.
    emitMockEvent("pty:output", { id: "pty-other", data: [66] });
    expect(callback).toHaveBeenCalledTimes(1);

    // Cleanup.
    unlisten();
  });

  it("onPtyExit subscribes to pty:exit and filters by id", async () => {
    const callback = vi.fn();
    const unlisten = await onPtyExit("pty-abc", callback);

    emitMockEvent("pty:exit", { id: "pty-abc", code: 0 });
    expect(callback).toHaveBeenCalledWith(0);

    emitMockEvent("pty:exit", { id: "pty-other", code: 1 });
    expect(callback).toHaveBeenCalledTimes(1);

    unlisten();
  });

  it("onPtyExit handles null exit code", async () => {
    const callback = vi.fn();
    const unlisten = await onPtyExit("pty-abc", callback);

    emitMockEvent("pty:exit", { id: "pty-abc", code: null });
    expect(callback).toHaveBeenCalledWith(null);

    unlisten();
  });
});
