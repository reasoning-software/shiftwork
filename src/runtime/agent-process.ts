import type { Subprocess } from "bun";
import { createOutputStream } from "./output-stream.js";
import type { AgentHandle, AgentResult, SpawnOptions } from "./agent-driver.js";

export interface ProcessInfo {
	readonly pid: number;
	readonly startedAt: Date;
	readonly worktreePath: string;
	readonly command: readonly string[];
}

export interface ProcessManager {
	readonly processes: Map<number, ProcessInfo>;
	spawn(command: string, args: string[], worktreePath: string, options?: SpawnOptions): AgentHandle;
}

export function createProcessManager(): ProcessManager {
	const processes = new Map<number, { subprocess: Subprocess; info: ProcessInfo }>();

	function register(subprocess: Subprocess, info: ProcessInfo) {
		processes.set(subprocess.pid, { subprocess, info });
	}

	function unregister(pid: number) {
		processes.delete(pid);
	}

	return {
		processes,

		spawn(command, args, worktreePath, options) {
			const startedAt = new Date();
			const subprocess = Bun.spawn({
				cmd: [command, ...args],
				cwd: worktreePath,
				env: { ...process.env, ...options?.env },
				stdin: "pipe",
				stdout: "pipe",
				stderr: "pipe",
			});

			const info: ProcessInfo = {
				pid: subprocess.pid,
				startedAt,
				worktreePath,
				command: [command, ...args],
			};

			register(subprocess, info);

			const output = createOutputStream();
			const decoder = new TextDecoder();

			async function pump(stream: ReadableStream<Uint8Array> | undefined, type: "stdout" | "stderr") {
				if (!stream) return;
				const reader = stream.getReader();
				while (true) {
					const { value, done } = await reader.read();
					if (done) break;
					output.push({ type, data: decoder.decode(value), timestamp: new Date() });
				}
				reader.releaseLock();
			}

			pump(subprocess.stdout, "stdout").catch((error) => {
				output.push({ type: "stderr", data: error.message, timestamp: new Date() });
			});
			pump(subprocess.stderr, "stderr").catch((error) => {
				output.push({ type: "stderr", data: error.message, timestamp: new Date() });
			});

			const completion = (async (): Promise<AgentResult> => {
				const exitCode = await subprocess.exited;
				const duration = Date.now() - startedAt.getTime();
				output.end();
				unregister(subprocess.pid);
				return {
					success: exitCode === 0,
					exitCode,
					duration,
				};
			})();

			if (options?.signal) {
				options.signal.addEventListener(
					"abort",
					() => {
						subprocess.kill();
					},
					{ once: true },
				);
			}

			if (options?.timeout) {
				setTimeout(() => {
					if (!processes.has(subprocess.pid)) return;
					subprocess.kill();
				}, options.timeout).unref?.();
			}

			const handle: AgentHandle = {
				pid: subprocess.pid,
				output: output.stream,
				completion,
				async terminate() {
					subprocess.kill();
					await completion;
				},
			};

			return handle;
		},
	};
}
