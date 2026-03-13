import { Box, Text } from "ink";
import type { AgentOutput } from "../../runtime/agent-driver.js";

interface OutputPanelProps {
	agentId: string;
	lines: readonly AgentOutput[];
	maxLines?: number;
}

export function OutputPanel({ agentId, lines, maxLines = 20 }: OutputPanelProps) {
	const visible = lines.slice(-maxLines);
	return (
		<Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
			<Text bold color="blue">
				{agentId}
			</Text>
			{visible.map((line) => (
				<Text key={line.timestamp.toISOString()} color={line.type === "stderr" ? "red" : undefined}>
					{line.data}
				</Text>
			))}
			{lines.length === 0 && <Text dimColor>Waiting for output...</Text>}
		</Box>
	);
}
