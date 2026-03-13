#!/usr/bin/env bun

import { Command } from "commander";

const program = new Command();

program
	.name("shiftwork")
	.description("Agent-agnostic CLI orchestration platform for AI coding agents")
	.version("0.1.0");

// Lazy-load commands for fast startup
const { registerSpawnCommand } = await import("./cli/commands/spawn.js");
const { registerRunCommand } = await import("./cli/commands/run.js");
const { registerStatusCommand } = await import("./cli/commands/status.js");

registerSpawnCommand(program);
registerRunCommand(program);
registerStatusCommand(program);

program.parse();
