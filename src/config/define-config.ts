import type { ShiftworkConfigInput } from "./schema.js";

type ConfigFactory = () => ShiftworkConfigInput | Promise<ShiftworkConfigInput>;

export function defineConfig(
	config: ShiftworkConfigInput | ConfigFactory,
): ShiftworkConfigInput | ConfigFactory {
	return config;
}
