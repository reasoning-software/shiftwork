import type { AgentCapabilities } from "../types/agent.js";
import type { TaskDefinition } from "../types/task.js";

export interface AgentOutput {
	readonly type: "stdout" | "stderr" | "status" | "progress";
	readonly data: string;
	readonly timestamp: Date;
}

export interface AgentResult {
	readonly success: boolean;
	readonly exitCode: number;
	readonly duration: number;
	readonly output?: string;
	readonly error?: string;
}

export interface SpawnOptions {
	readonly env?: Record<string, string>;
	readonly timeout?: number;
	readonly signal?: AbortSignal;
}

export interface AgentHandle {
	readonly pid: number | undefined;
	readonly output: AsyncIterable<AgentOutput>;
	readonly completion: Promise<AgentResult>;
	terminate(): Promise<void>;
	sendInput?(input: string): Promise<void>;
}

export interface AgentDriver {
	readonly name: string;
	readonly capabilities: AgentCapabilities;
	spawn(task: TaskDefinition, worktreePath: string, options?: SpawnOptions): Promise<AgentHandle>;
}
