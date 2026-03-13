import type { AgentDriver } from "../agent-driver.js";
import type { TaskDefinition } from "../../types/task.js";
import { createProcessManager } from "../agent-process.js";

interface ClaudeCodeDriverOptions {
	readonly binary?: string;
	readonly args?: string[];
	readonly model?: string;
}

const defaultCapabilities = {
	sessionPersistence: false,
	structuredOutput: true,
	progressSignaling: false,
	costReporting: true,
	healthCheck: false,
	directoryScoping: true,
} as const;

function buildArgs(task: TaskDefinition, _worktreePath: string, options: ClaudeCodeDriverOptions) {
	const baseArgs = options.args ?? process.env.CLAUDE_CODE_ARGS?.split(" ").filter(Boolean) ?? [];
	const fullArgs = [...baseArgs];

	fullArgs.push("--print");
	fullArgs.push("--output-format", "json");
	fullArgs.push("--no-session-persistence");

	const model = options.model ?? process.env.CLAUDE_CODE_MODEL;
	if (model) {
		fullArgs.push("--model", model);
	}

	fullArgs.push(task.prompt);
	return fullArgs;
}

export function createClaudeCodeDriver(options: ClaudeCodeDriverOptions = {}): AgentDriver {
	const processManager = createProcessManager();
	const binary = options.binary ?? process.env.CLAUDE_CODE_BIN ?? "claude";

	return {
		name: "claude-code",
		capabilities: defaultCapabilities,
		spawn(task, worktreePath, spawnOptions) {
			const args = buildArgs(task, worktreePath, options);
			return processManager.spawn(binary, args, worktreePath, spawnOptions);
		},
	};
}
