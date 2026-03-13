// shiftwork spawn — Phase 1 command
// Spawns a single agent in a worktree with a task prompt

import type { Command } from "commander";

export function registerSpawnCommand(program: Command) {
	program
		.command("spawn")
		.description("Spawn an agent with a task")
		.argument("<prompt>", "Task prompt for the agent")
		.option("-d, --driver <driver>", "Agent driver to use", "claude-code")
		.option("-b, --branch <branch>", "Base branch for worktree")
		.option("--json", "Output as JSON")
		.action(
			async (prompt: string, options: { driver: string; branch?: string; json?: boolean }) => {
				const { output } = await import("../output.js");
				const data = {
					status: "not-implemented",
					prompt,
					driver: options.driver,
					branch: options.branch,
				};

				await output(options, data, async () => {
					const React = await import("react");
					const { Text } = await import("ink");
					return React.createElement(
						Text,
						{ color: "yellow" },
						"spawn command not yet implemented — Phase 1",
					);
				});
			},
		);
}
