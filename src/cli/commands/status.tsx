// shiftwork status — displays current shift status

import type { Command } from "commander";

export function registerStatusCommand(program: Command) {
	program
		.command("status")
		.description("Show current shift status")
		.option("--json", "Output as JSON")
		.action(async (options: { json?: boolean }) => {
			const { output } = await import("../output.js");
			const data = {
				status: "idle",
				agents: [],
				tasks: [],
			};

			await output(options, data, async () => {
				const React = await import("react");
				const { App } = await import("../../ui/app.js");
				return React.createElement(App, null);
			});
		});
}
