/**
 * SpawnAgentDialog.tsx — Dialog for spawning an AI coding agent.
 *
 * Provides a form where the user can configure and launch an agent session.
 * The agent runs inside a new terminal tab, just like a regular shell session,
 * but with the agent command pre-configured. This bridges the existing
 * ShiftWork agent driver concept with the desktop app's terminal UI.
 *
 * Supported agents (v0):
 *   - Claude Code: `claude --dangerously-skip-permissions`
 *   - More drivers can be added by extending the AGENT_CONFIGS map.
 *
 * The dialog creates a new tab of type "agent", spawns a PTY with the
 * agent's command, and optionally sends an initial prompt.
 */

import { useState } from "react";
import { useWorkspaceStore } from "../stores/workspace-store";
import { spawnPty, writePty } from "../lib/pty";

// ---------------------------------------------------------------------------
// Agent Configuration Registry
// ---------------------------------------------------------------------------

interface AgentConfig {
  /** Display name in the UI. */
  label: string;
  /** The CLI command to invoke. */
  command: string;
  /** Default arguments. */
  args: string[];
  /** Description shown in the dialog. */
  description: string;
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  "claude-code": {
    label: "Claude Code",
    command: "claude",
    args: [],
    description:
      "Launch Claude Code in interactive mode. You can give it a task prompt or work with it conversationally.",
  },
  "gemini-cli": {
    label: "Gemini CLI",
    command: "gemini",
    args: [],
    description:
      "Launch Google Gemini CLI for AI-assisted coding.",
  },
  "codex-cli": {
    label: "OpenAI Codex CLI",
    command: "codex",
    args: [],
    description:
      "Launch OpenAI Codex CLI for AI-assisted coding.",
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SpawnAgentDialogProps {
  /** The workspace to create the agent tab in. */
  workspaceId: string;
  /** Called when the dialog should close. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SpawnAgentDialog({
  workspaceId,
  onClose,
}: SpawnAgentDialogProps) {
  const [selectedAgent, setSelectedAgent] = useState("claude-code");
  const [prompt, setPrompt] = useState("");
  const [cwd, setCwd] = useState("");
  const [isSpawning, setIsSpawning] = useState(false);

  const createTab = useWorkspaceStore((s) => s.createTab);
  const bindPty = useWorkspaceStore((s) => s.bindPty);

  const agentConfig = AGENT_CONFIGS[selectedAgent];

  const handleSpawn = async () => {
    if (!agentConfig) return;
    setIsSpawning(true);

    try {
      // Create a tab for the agent.
      const tabId = createTab(workspaceId, {
        name: `${agentConfig.label}`,
        type: "agent",
        cwd: cwd || undefined,
        agentDriver: selectedAgent,
        agentPrompt: prompt || undefined,
      });

      // Build the command with args.
      const args = [...agentConfig.args];
      if (prompt) {
        // For Claude Code, the prompt can be passed as a positional argument.
        args.push(prompt);
      }

      // Spawn the PTY with the agent command.
      const ptyId = await spawnPty({
        command: agentConfig.command,
        args: args.length > 0 ? args : undefined,
        cwd: cwd || undefined,
      });

      bindPty(workspaceId, tabId, ptyId);
      onClose();
    } catch (err) {
      console.error("Failed to spawn agent:", err);
      setIsSpawning(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Spawn Agent</h2>

        <div className="dialog-field">
          <label className="dialog-label">Agent</label>
          <div className="agent-selector">
            {Object.entries(AGENT_CONFIGS).map(([key, config]) => (
              <button
                key={key}
                className={`agent-option ${selectedAgent === key ? "selected" : ""}`}
                onClick={() => setSelectedAgent(key)}
              >
                {config.label}
              </button>
            ))}
          </div>
          <p className="dialog-hint">{agentConfig?.description}</p>
        </div>

        <div className="dialog-field">
          <label className="dialog-label" htmlFor="agent-prompt">
            Task Prompt (optional)
          </label>
          <textarea
            id="agent-prompt"
            className="dialog-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the task for the agent..."
            rows={4}
          />
        </div>

        <div className="dialog-field">
          <label className="dialog-label" htmlFor="agent-cwd">
            Working Directory (optional)
          </label>
          <input
            id="agent-cwd"
            className="dialog-input"
            type="text"
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            placeholder="~/projects/my-app"
          />
        </div>

        <div className="dialog-actions">
          <button className="dialog-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="dialog-confirm"
            onClick={handleSpawn}
            disabled={isSpawning}
          >
            {isSpawning ? "Spawning..." : "Spawn Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
