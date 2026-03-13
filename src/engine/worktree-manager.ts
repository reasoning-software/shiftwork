// Worktree manager — stub for Phase 1
// Manages git worktree creation, cleanup, and merging

export interface WorktreeInfo {
	readonly path: string;
	readonly branch: string;
	readonly taskId: string;
}

export interface WorktreeManager {
	create(taskId: string, baseBranch?: string): Promise<WorktreeInfo>;
	remove(path: string): Promise<void>;
	list(): Promise<WorktreeInfo[]>;
}

export function createWorktreeManager(_repoRoot: string): WorktreeManager {
	throw new Error("Worktree manager not yet implemented — Phase 1");
}
