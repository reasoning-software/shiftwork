import {
	type ShiftworkConfig,
	type ShiftworkConfigInput,
	shiftworkConfigSchema,
} from "./schema.js";

type ConfigFactory = () => ShiftworkConfigInput | Promise<ShiftworkConfigInput>;

export async function loadConfig(
	configOrFactory: ShiftworkConfigInput | ConfigFactory,
): Promise<ShiftworkConfig> {
	const raw = typeof configOrFactory === "function" ? await configOrFactory() : configOrFactory;
	return shiftworkConfigSchema.parse(raw);
}
