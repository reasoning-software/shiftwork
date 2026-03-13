import { randomUUID } from "node:crypto";
import { $ } from "bun";
import type { Command } from "commander";
import React from "react";
import { Box, Text } from "ink";
import { output } from "../output.js";
import type { AgentHandle, AgentOutput, AgentResult } from "../../runtime/agent-driver.js";
import { createWorktreeManager } from "../../engine/worktree-manager.js";
import { taskId, type TaskDefinition } from "../../types/task.js";
import { createClaudeCodeDriver } from "../../runtime/drivers/claude-code.js";

interface SpawnCommandOptions {
	readonly driver: string;
	readonly branch?: string;
	readonly bin?: string;
	readonly json?: boolean;
}

interface DriverConfig {
	readonly binary?: string;
}

const driverRegistry = {
	"claude-code": (config?: DriverConfig) => createClaudeCodeDriver({ binary: config?.binary }),
};

function resolveDriver(name: string, config?: DriverConfig) {
	const factory = driverRegistry[name as keyof typeof driverRegistry];
	if (!factory) {
		throw new Error(`Unknown driver: ${name}`);
	}
	return factory(config);
}

async function determineBaseBranch(repoRoot: string, requested?: string) {
	if (requested) return requested;
	try {
		const git = $({ cwd: repoRoot });
		const result = await git`git rev-parse --abbrev-ref HEAD`;
		const branch = (await result.text()).trim();
		return branch || "main";
	} catch {
		return "main";
	}
}

function createAdhocTask(prompt: string): TaskDefinition {
	const id = taskId(`spawn-${randomUUID()}`);
	return {
		id,
		name: `Ad-hoc: ${prompt.slice(0, 24)}${prompt.length > 24 ? "…" : ""}`,
		description: prompt,
		prompt,
		dependencies: [],
	};
}

async function streamOutput(handle: AgentHandle, buffer: AgentOutput[], mirrorToStdout: boolean) {
	for await (const chunk of handle.output) {
		buffer.push(chunk);
		if (mirrorToStdout) {
			const prefix = chunk.type === "stderr" ? "[err]" : "";
			process.stdout.write(`${prefix}${chunk.data}`);
		}
	}
}

interface SpawnSummaryProps {
	readonly status: "success" | "failed" | "error";
	readonly driver: string;
	readonly branch: string;
	readonly worktree?: string;
	readonly duration?: number;
	readonly error?: string;
}

function SpawnSummary(props: SpawnSummaryProps) {
	const color = props.status === "success" ? "green" : props.status === "failed" ? "yellow" : "red";
	return (
		<Box flexDirection="column" padding={1} borderStyle="round" borderColor={color}>
			<Text color={color}>
				{props.status.toUpperCase()} ({props.driver})
			</Text>
			<Text dimColor>Base branch: {props.branch}</Text>
			{props.duration !== undefined ? (
				<Text dimColor>Duration: {props.duration}ms</Text>
			) : null}
			{props.error ? <Text color="red">{props.error}</Text> : null}
		</Box>
	);
}

export function registerSpawnCommand(program: Command) {
	program
		.command("spawn")
		.description("Spawn an agent with a task")
		.argument("<prompt>", "Task prompt for the agent")
		.option("-d, --driver <driver>", "Agent driver to use", "claude-code")
		.option("-b, --branch <branch>", "Base branch for worktree")
		.option("--bin <path>", "Override binary used by the driver")
		.option("--json", "Output as JSON")
		.action(async (prompt: string, options: SpawnCommandOptions) => {
			const repoRoot = process.cwd();
			const worktreeManager = createWorktreeManager(repoRoot);
			const baseBranch = await determineBaseBranch(repoRoot, options.branch);
			const task = createAdhocTask(prompt);

			let driverName = options.driver;
			let driverInstance: ReturnType<typeof resolveDriver> | null = null;

			const outputs: AgentOutput[] = [];
			let result: AgentResult | null = null;
			let status: "success" | "failed" | "error" = "success";
			let errorMessage: string | undefined;
			let worktreePath: string | undefined;
			let worktreeBranch: string | undefined;

			try {
				driverInstance = resolveDriver(options.driver, { binary: options.bin });
				driverName = driverInstance.name;
				const worktree = await worktreeManager.create(task.id, baseBranch);
				worktreePath = worktree.path;
				worktreeBranch = worktree.branch;

				if (!driverInstance) {
					throw new Error("Driver not resolved");
				}
				const handle = await driverInstance.spawn(task, worktree.path);
				await Promise.all([
					streamOutput(handle, outputs, !options.json),
					(async () => {
						result = await handle.completion;
					})(),
				]);

				if (!result) {
					throw new Error("Agent did not return a result");
				}

				status = result.success ? "success" : "failed";
			} catch (error) {
				status = "error";
				errorMessage = error instanceof Error ? error.message : String(error);
			} finally {
				if (worktreePath) {
					await worktreeManager.remove(worktreePath).catch((error) => {
						console.warn(`[shiftwork] Failed to clean worktree ${worktreePath}:`, error);
					});
				}
			}

			const data = {
				status,
				driver: driverName,
				branch: baseBranch,
				worktree: worktreeBranch,
				outputs,
				result,
				error: errorMessage,
			};

			await output(options, data, async () => (
				<SpawnSummary
					status={status}
					driver={driverName}
					branch={baseBranch}
					worktree={worktreeBranch}
					duration={result?.duration}
					error={errorMessage}
				/>
			));
		});
}
