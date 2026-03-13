// Scheduler — stub for Phase 2
// Assigns ready tasks to available agents based on strategy

export interface Scheduler {
	tick(): void;
	stop(): void;
}

export function createScheduler(): Scheduler {
	throw new Error("Scheduler not yet implemented — Phase 2");
}
