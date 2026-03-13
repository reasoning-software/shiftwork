import { z } from "zod";

const retryPolicySchema = z.object({
	maxAttempts: z.number().int().positive().default(3),
	strategy: z.enum(["same-agent", "fresh-agent", "different-type"]).default("same-agent"),
	onExhaustion: z.enum(["fail", "review"]).default("fail"),
});

const agentConfigSchema = z.object({
	driver: z.string(),
	model: z.string().optional(),
	maxConcurrency: z.number().int().positive().optional(),
	env: z.record(z.string()).optional(),
});

const taskConfigSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	prompt: z.string(),
	agent: z.string().optional(),
	dependencies: z.array(z.string()).optional(),
	retryPolicy: retryPolicySchema.optional(),
	timeout: z.number().positive().optional(),
});

const crewConfigSchema = z.object({
	name: z.string(),
	agents: z.array(z.string()),
	coordination: z
		.enum(["shared-filesystem", "git-based", "message-bus", "artifact-passing"])
		.default("git-based"),
	maxConcurrency: z.number().int().positive().optional(),
});

export const shiftworkConfigSchema = z.object({
	workspace: z.string().optional(),
	agents: z.record(agentConfigSchema).default({}),
	crews: z.record(crewConfigSchema).optional(),
	tasks: z.array(taskConfigSchema).optional(),
	defaults: z
		.object({
			agent: z.string().optional(),
			retryPolicy: retryPolicySchema.optional(),
			timeout: z.number().positive().optional(),
		})
		.optional(),
});

export type ShiftworkConfigInput = z.input<typeof shiftworkConfigSchema>;
export type ShiftworkConfig = z.output<typeof shiftworkConfigSchema>;
