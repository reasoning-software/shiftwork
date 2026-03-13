import { describe, expect, it } from "bun:test";
import { canTransition, transition } from "../../src/engine/state-machine.js";

describe("Task State Machine", () => {
	it("should allow pending → assigned", () => {
		expect(canTransition("pending", "assigned")).toBe(true);
		expect(transition("pending", "assigned")).toBe("assigned");
	});

	it("should allow assigned → running", () => {
		expect(canTransition("assigned", "running")).toBe(true);
	});

	it("should allow assigned → pending (unassign)", () => {
		expect(canTransition("assigned", "pending")).toBe(true);
	});

	it("should allow running → completed", () => {
		expect(canTransition("running", "completed")).toBe(true);
	});

	it("should allow running → failed", () => {
		expect(canTransition("running", "failed")).toBe(true);
	});

	it("should allow running → review", () => {
		expect(canTransition("running", "review")).toBe(true);
	});

	it("should allow failed → pending (retry)", () => {
		expect(canTransition("failed", "pending")).toBe(true);
	});

	it("should allow review → completed", () => {
		expect(canTransition("review", "completed")).toBe(true);
	});

	it("should allow review → failed", () => {
		expect(canTransition("review", "failed")).toBe(true);
	});

	it("should allow review → pending", () => {
		expect(canTransition("review", "pending")).toBe(true);
	});

	it("should NOT allow completed → any state", () => {
		expect(canTransition("completed", "pending")).toBe(false);
		expect(canTransition("completed", "running")).toBe(false);
		expect(canTransition("completed", "failed")).toBe(false);
	});

	it("should NOT allow pending → running (must go through assigned)", () => {
		expect(canTransition("pending", "running")).toBe(false);
	});

	it("should throw on invalid transition", () => {
		expect(() => transition("pending", "completed")).toThrow("Invalid task state transition");
	});
});
