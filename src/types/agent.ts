export type AgentId = string & { readonly __brand: "AgentId" };

export function agentId(id: string): AgentId {
	return id as AgentId;
}

export type AgentStatus = "idle" | "spawning" | "running" | "streaming" | "terminated" | "errored";

export interface AgentCapabilities {
	readonly sessionPersistence: boolean;
	readonly structuredOutput: boolean;
	readonly progressSignaling: boolean;
	readonly costReporting: boolean;
	readonly healthCheck: boolean;
	readonly directoryScoping: boolean;
}

export interface AgentInstance {
	readonly id: AgentId;
	readonly driver: string;
	readonly status: AgentStatus;
	readonly worktreePath: string;
	readonly capabilities: AgentCapabilities;
	readonly startedAt: Date;
	readonly pid?: number;
}
