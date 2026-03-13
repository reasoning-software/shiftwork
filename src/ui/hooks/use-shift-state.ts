import { useState } from "react";
import type { AgentInstance } from "../../types/agent.js";
import type { TaskInstance } from "../../types/task.js";

export interface ShiftState {
	agents: readonly AgentInstance[];
	tasks: readonly TaskInstance[];
	status: "idle" | "running" | "completed" | "failed";
}

export function useShiftState(): ShiftState {
	const [state] = useState<ShiftState>({
		agents: [],
		tasks: [],
		status: "idle",
	});

	return state;
}
