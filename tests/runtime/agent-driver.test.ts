import { describe, expect, it } from "bun:test";
import type {
	AgentDriver,
	AgentHandle,
	AgentOutput,
	AgentResult,
} from "../../src/runtime/agent-driver.js";
import { createOutputStream } from "../../src/runtime/output-stream.js";
import type { TaskDefinition } from "../../src/types/task.js";
import { taskId } from "../../src/types/task.js";

const mockTask: TaskDefinition = {
	id: taskId("test-task-1"),
	name: "Test Task",
	description: "A test task",
	prompt: "Do something",
	dependencies: [],
};

function createMockDriver(): AgentDriver {
	return {
		name: "mock",
		capabilities: {
			sessionPersistence: false,
			structuredOutput: false,
			progressSignaling: false,
			costReporting: false,
			healthCheck: false,
			directoryScoping: true,
		},

		async spawn(_task, _worktreePath, _options) {
			const outputStream = createOutputStream();

			outputStream.push({
				type: "stdout",
				data: "Hello from mock agent",
				timestamp: new Date(),
			});
			outputStream.end();

			const handle: AgentHandle = {
				pid: 12345,
				output: outputStream.stream,
				completion: Promise.resolve({
					success: true,
					exitCode: 0,
					duration: 100,
					output: "Done",
				}),
				async terminate() {},
			};

			return handle;
		},
	};
}

describe("AgentDriver", () => {
	it("should have a name and capabilities", () => {
		const driver = createMockDriver();
		expect(driver.name).toBe("mock");
		expect(driver.capabilities.directoryScoping).toBe(true);
		expect(driver.capabilities.sessionPersistence).toBe(false);
	});

	it("should spawn and return an AgentHandle", async () => {
		const driver = createMockDriver();
		const handle = await driver.spawn(mockTask, "/tmp/worktree");

		expect(handle.pid).toBe(12345);
	});

	it("should stream output via async iterable", async () => {
		const driver = createMockDriver();
		const handle = await driver.spawn(mockTask, "/tmp/worktree");

		const outputs: AgentOutput[] = [];
		for await (const output of handle.output) {
			outputs.push(output);
		}

		expect(outputs).toHaveLength(1);
		expect(outputs[0]?.data).toBe("Hello from mock agent");
		expect(outputs[0]?.type).toBe("stdout");
	});

	it("should resolve completion with AgentResult", async () => {
		const driver = createMockDriver();
		const handle = await driver.spawn(mockTask, "/tmp/worktree");

		const result: AgentResult = await handle.completion;
		expect(result.success).toBe(true);
		expect(result.exitCode).toBe(0);
	});
});
