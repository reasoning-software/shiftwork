export type TaskId = string & { readonly __brand: "TaskId" };

export function taskId(id: string): TaskId {
	return id as TaskId;
}

export type TaskState = "pending" | "assigned" | "running" | "completed" | "failed" | "review";

export type RetryStrategy = "same-agent" | "fresh-agent" | "different-type";

export interface RetryPolicy {
	readonly maxAttempts: number;
	readonly strategy: RetryStrategy;
	readonly onExhaustion: "fail" | "review";
}

export interface TaskDefinition {
	readonly id: TaskId;
	readonly name: string;
	readonly description: string;
	readonly prompt: string;
	readonly dependencies: readonly TaskId[];
	readonly retryPolicy?: RetryPolicy;
	readonly timeout?: number;
}

export interface TaskInstance {
	readonly definition: TaskDefinition;
	readonly state: TaskState;
	readonly assignedAgent?: string;
	readonly attempts: number;
	readonly startedAt?: Date;
	readonly completedAt?: Date;
	readonly error?: string;
}
