export type CrewId = string & { readonly __brand: "CrewId" };

export function crewId(id: string): CrewId {
	return id as CrewId;
}

export type CoordinationStrategy =
	| "shared-filesystem"
	| "git-based"
	| "message-bus"
	| "artifact-passing";

export interface CrewDefinition {
	readonly id: CrewId;
	readonly name: string;
	readonly agents: readonly string[];
	readonly coordination: CoordinationStrategy;
	readonly maxConcurrency?: number;
}
