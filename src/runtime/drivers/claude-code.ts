// Claude Code driver — stub for Phase 1
// Will implement AgentDriver for Claude Code CLI

import type { AgentCapabilities } from "../../types/agent.js";
import type { TaskDefinition } from "../../types/task.js";
import type { AgentDriver, AgentHandle, SpawnOptions } from "../agent-driver.js";

const capabilities: AgentCapabilities = {
	sessionPersistence: true,
	structuredOutput: true,
	progressSignaling: false,
	costReporting: true,
	healthCheck: false,
	directoryScoping: true,
};

export const claudeCodeDriver: AgentDriver = {
	name: "claude-code",
	capabilities,

	async spawn(
		_task: TaskDefinition,
		_worktreePath: string,
		_options?: SpawnOptions,
	): Promise<AgentHandle> {
		throw new Error("Claude Code driver not yet implemented — Phase 1");
	},
};
