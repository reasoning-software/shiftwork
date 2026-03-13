import { Box, Text } from "ink";
import type { AgentInstance } from "../../types/agent.js";
import type { TaskInstance } from "../../types/task.js";

interface StatusViewProps {
	agents: readonly AgentInstance[];
	tasks: readonly TaskInstance[];
}

export function StatusView({ agents, tasks }: StatusViewProps) {
	return (
		<Box flexDirection="column">
			<Text bold>Agents ({agents.length})</Text>
			{agents.length === 0 && <Text dimColor> No agents running</Text>}
			{agents.map((agent) => (
				<Box key={agent.id} gap={1}>
					<Text color="blue">{agent.id}</Text>
					<Text dimColor>[{agent.driver}]</Text>
					<Text color={agent.status === "running" ? "green" : "yellow"}>{agent.status}</Text>
				</Box>
			))}
			<Text bold>Tasks ({tasks.length})</Text>
			{tasks.length === 0 && <Text dimColor> No tasks</Text>}
			{tasks.map((task) => (
				<Box key={task.definition.id} gap={1}>
					<Text>{task.definition.name}</Text>
					<Text color={task.state === "completed" ? "green" : "yellow"}>{task.state}</Text>
				</Box>
			))}
		</Box>
	);
}
