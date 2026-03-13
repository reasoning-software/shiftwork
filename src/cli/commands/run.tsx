// shiftwork run — runs a full shift from config
// Stub for Phase 2

import type { Command } from "commander";

export function registerRunCommand(program: Command) {
	program
		.command("run")
		.description("Run a shift from config file")
		.option("-c, --config <path>", "Path to shiftwork config file")
		.option("--json", "Output as JSON")
		.action(async (options: { config?: string; json?: boolean }) => {
			const { output } = await import("../output.js");
			const data = { status: "not-implemented", config: options.config };

			await output(options, data, async () => {
				const React = await import("react");
				const { Text } = await import("ink");
				return React.createElement(
					Text,
					{ color: "yellow" },
					"run command not yet implemented — Phase 2",
				);
			});
		});
}
