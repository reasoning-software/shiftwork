import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";

// Worktree manager — git-native workspace lifecycle helper
// Manages git worktree creation, cleanup, and enumeration per task

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

const DEFAULT_BASE_BRANCH = "main";

export function createWorktreeManager(repoRoot: string): WorktreeManager {
	const worktreeRoot = join(repoRoot, ".shiftwork");
	const registry = new Map<string, WorktreeInfo>();

	async function ensureWorktreeRoot() {
		await mkdir(worktreeRoot, { recursive: true });
	}

	function sanitizeTaskId(taskId: string) {
		return taskId.replace(/[^a-zA-Z0-9-_]/g, "-");
	}

	return {
		async create(taskId, baseBranch = DEFAULT_BASE_BRANCH) {
			await ensureWorktreeRoot();
			const sanitized = sanitizeTaskId(taskId);
			const branch = `shiftwork/${sanitized}`;
			const worktreePath = join(worktreeRoot, sanitized);

			await $`git -C ${repoRoot} worktree add ${worktreePath} -b ${branch} ${baseBranch}`;

			const info: WorktreeInfo = { path: worktreePath, branch, taskId };
			registry.set(worktreePath, info);
			return info;
		},

		async remove(path) {
			const info = registry.get(path);
			await $`git -C ${repoRoot} worktree remove ${path}`;
			if (info?.branch) {
				try {
					await $`git -C ${repoRoot} branch -D ${info.branch}`;
				} catch (error) {
					// Branch might already be gone—surface the original worktree removal result instead
					console.warn(`[shiftwork] Unable to delete branch ${info.branch}:`, error);
				}
			}
			registry.delete(path);
		},

		async list() {
			return Array.from(registry.values());
		},
	};
}
