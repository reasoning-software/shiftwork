import { Box, Text } from "ink";

export function App() {
	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					ShiftWork
				</Text>
				<Text dimColor> v0.1.0</Text>
			</Box>
			<Box>
				<Text dimColor>Status: </Text>
				<Text color="green">idle</Text>
			</Box>
			<Box>
				<Text dimColor>Agents: </Text>
				<Text>0 running</Text>
			</Box>
			<Box>
				<Text dimColor>Tasks: </Text>
				<Text>0 pending</Text>
			</Box>
		</Box>
	);
}
