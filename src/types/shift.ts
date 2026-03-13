import type { ShiftEventType } from "./events.js";
import type { TaskInstance } from "./task.js";

export type ShiftId = string & { readonly __brand: "ShiftId" };

export function shiftId(id: string): ShiftId {
	return id as ShiftId;
}

export interface ShiftInstance {
	readonly id: ShiftId;
	readonly startedAt: Date;
	readonly tasks: readonly TaskInstance[];
	readonly status: "running" | "completed" | "failed" | "cancelled";
}

export interface ShiftEvent {
	readonly type: ShiftEventType;
	readonly timestamp: Date;
	readonly shiftId: ShiftId;
	readonly payload: unknown;
}

export interface ShiftReport {
	readonly shiftId: ShiftId;
	readonly duration: number;
	readonly tasksCompleted: number;
	readonly tasksFailed: number;
	readonly events: readonly ShiftEvent[];
}
