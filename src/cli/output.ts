import type { ReactElement } from "react";

interface OutputOptions {
	json?: boolean;
}

export async function output(
	options: OutputOptions,
	data: unknown,
	component: () => ReactElement | Promise<ReactElement>,
): Promise<void> {
	if (options.json) {
		console.log(JSON.stringify(data, null, 2));
		return;
	}

	const { render } = await import("ink");
	render(await component());
}
