import { describe, expect, it } from "bun:test";
import { loadConfig } from "../../src/config/config-loader.js";
import { defineConfig } from "../../src/config/define-config.js";

describe("defineConfig", () => {
	it("should accept a plain config object", () => {
		const config = defineConfig({
			agents: {
				coder: { driver: "claude-code" },
			},
		});

		expect(config).toBeDefined();
		expect(typeof config).toBe("object");
	});

	it("should accept a factory function", () => {
		const config = defineConfig(() => ({
			agents: {
				coder: { driver: "claude-code" },
			},
		}));

		expect(typeof config).toBe("function");
	});

	it("should accept an async factory function", () => {
		const config = defineConfig(async () => ({
			workspace: "/tmp/test",
			agents: {
				coder: { driver: "claude-code", model: "opus" },
			},
		}));

		expect(typeof config).toBe("function");
	});
});

describe("loadConfig", () => {
	it("should validate and return parsed config from object", async () => {
		const config = await loadConfig({
			agents: {
				coder: { driver: "claude-code" },
			},
		});

		expect(config.agents.coder).toBeDefined();
		expect(config.agents.coder?.driver).toBe("claude-code");
	});

	it("should validate and return parsed config from factory", async () => {
		const config = await loadConfig(() => ({
			workspace: "/tmp/test",
			agents: {
				coder: { driver: "claude-code" },
			},
		}));

		expect(config.workspace).toBe("/tmp/test");
	});

	it("should apply defaults", async () => {
		const config = await loadConfig({});

		expect(config.agents).toEqual({});
	});

	it("should reject invalid config", async () => {
		await expect(loadConfig({ agents: { coder: { driver: 123 } } } as never)).rejects.toThrow();
	});
});
