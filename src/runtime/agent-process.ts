// Agent process lifecycle management — stub for Phase 1
// Handles spawning, monitoring, and terminating agent processes

export interface ProcessInfo {
	readonly pid: number;
	readonly startedAt: Date;
	readonly worktreePath: string;
}

export function createProcessManager() {
	// Stub — will manage agent process lifecycles in Phase 1
	return {
		processes: new Map<string, ProcessInfo>(),
	};
}
