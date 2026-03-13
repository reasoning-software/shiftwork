import type { AgentDriver } from "../agent-driver.js";
import { claudeCodeDriver } from "./claude-code.js";

const drivers = new Map<string, AgentDriver>([["claude-code", claudeCodeDriver]]);

export function getDriver(name: string): AgentDriver {
	const driver = drivers.get(name);
	if (!driver) {
		throw new Error(`Unknown agent driver: ${name}. Available: ${[...drivers.keys()].join(", ")}`);
	}
	return driver;
}

export function listDrivers(): string[] {
	return [...drivers.keys()];
}
