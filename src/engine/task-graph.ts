// Task DAG — stub for Phase 2
// Models task dependencies as a directed acyclic graph

import type { TaskDefinition, TaskId } from "../types/task.js";

export interface TaskGraph {
	readonly tasks: ReadonlyMap<TaskId, TaskDefinition>;
	getReady(): TaskDefinition[];
	markCompleted(id: TaskId): void;
	markFailed(id: TaskId): void;
}

export function createTaskGraph(_tasks: TaskDefinition[]): TaskGraph {
	throw new Error("Task graph not yet implemented — Phase 2");
}
