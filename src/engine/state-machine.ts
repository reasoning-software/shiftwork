// Task state machine — manages valid state transitions
import type { TaskState } from "../types/task.js";

const validTransitions: Record<TaskState, readonly TaskState[]> = {
	pending: ["assigned"],
	assigned: ["running", "pending"],
	running: ["completed", "failed", "review"],
	completed: [],
	failed: ["pending"],
	review: ["completed", "failed", "pending"],
};

export function canTransition(from: TaskState, to: TaskState): boolean {
	return validTransitions[from].includes(to);
}

export function transition(from: TaskState, to: TaskState): TaskState {
	if (!canTransition(from, to)) {
		throw new Error(`Invalid task state transition: ${from} → ${to}`);
	}
	return to;
}
