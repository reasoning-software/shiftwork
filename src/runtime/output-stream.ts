// Output stream abstraction — stub for Phase 1
// Provides unified async iterable interface over agent output

import type { AgentOutput } from "./agent-driver.js";

export function createOutputStream(): {
	push(output: AgentOutput): void;
	end(): void;
	stream: AsyncIterable<AgentOutput>;
} {
	const queue: AgentOutput[] = [];
	let resolve: (() => void) | null = null;
	let done = false;

	const stream: AsyncIterable<AgentOutput> = {
		[Symbol.asyncIterator]() {
			return {
				async next() {
					while (queue.length === 0 && !done) {
						await new Promise<void>((r) => {
							resolve = r;
						});
					}
					if (queue.length > 0) {
						return { value: queue.shift() as AgentOutput, done: false };
					}
					return { value: undefined as never, done: true };
				},
			};
		},
	};

	return {
		push(output: AgentOutput) {
			queue.push(output);
			resolve?.();
			resolve = null;
		},
		end() {
			done = true;
			resolve?.();
			resolve = null;
		},
		stream,
	};
}
