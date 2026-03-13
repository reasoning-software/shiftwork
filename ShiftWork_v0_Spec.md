**SHIFTWORK**

Agent Orchestration Platform

v0 Design Specification

*reasoning.software*

March 2026

**CONFIDENTIAL --- Pre-release**

**1. Executive Summary**

ShiftWork is an agent-agnostic CLI orchestration platform that
coordinates multiple AI coding agents working concurrently on a shared
codebase. It manages the full lifecycle of parallel AI-assisted
development: task decomposition, agent assignment, workspace isolation
via git worktrees, context passing, real-time monitoring, and structured
reporting.

ShiftWork is designed to be operated by both humans (via a TUI
dashboard) and AI agents (via structured JSON output), making it
composable and recursively orchestrable. A supervisor agent can invoke
ShiftWork to manage a fleet of coding agents, enabling true Level 8
autonomous workflows while preserving human override capability at every
layer.

**1.1 Design Principles**

  --------------------- -------------------------------------------------
  **Principle**         **Implication**

  **Agent-Agnostic**    Any CLI coding agent (Claude Code, Gemini CLI,
                        Copilot CLI, etc.) can be orchestrated through a
                        uniform driver interface.

  **Dual Interface**    Every command has a human-friendly TUI mode and a
                        machine-friendly JSON mode. ShiftWork is both an
                        application and a tool.

  **Git-Native**        Worktrees are the fundamental isolation and
                        coordination primitive. All agent work happens on
                        branches in dedicated worktrees.

  **Operator Trust**    ShiftWork provides full information and warnings,
                        but trusts the operator to make decisions. No
                        silent degradation or hard refusals.

  **Observable**        Understanding what happened is as important as
                        making things happen. Every shift produces a
                        structured report with diffs, costs, and session
                        logs.
  --------------------- -------------------------------------------------

**2. Architecture**

ShiftWork is a TypeScript CLI application organized into three distinct
layers, each with clear responsibilities and boundaries.

**2.1 Layer 1 --- Agent Runtime**

The Agent Runtime manages the lifecycle of individual agent processes.
It owns spawning, input/output streaming, health monitoring, and
termination. Each supported CLI agent is represented by a driver that
implements the AgentDriver interface. The runtime knows nothing about
tasks, dependencies, or orchestration --- it manages living processes,
analogous to containerd in the container ecosystem.

**2.2 Layer 2 --- Orchestration Engine**

The Orchestration Engine is the brain of ShiftWork. It reads the
declarative config, constructs the task dependency graph, manages crew
formation, schedules tasks onto available agents, and owns the state
machine for each task's lifecycle. It communicates downward to Layer 1
to control agents and upward to Layer 3 to report status. The engine
accepts live mutations (reprioritize, reassign, inject new tasks) while
a shift is running, enabling the hybrid
declarative-plus-live-intervention model.

**2.3 Layer 3 --- Control Plane**

The Control Plane provides the human and machine interfaces to the
orchestration engine. For humans, this is the TUI dashboard showing
real-time agent status, output streams, task progress, and live control
commands. For machines, this is the structured JSON API exposed via CLI
flags. Both interfaces read the same engine state and issue the same
commands --- the TUI is porcelain, the JSON API is plumbing.

**2.4 Porcelain / Plumbing Split**

Following git's proven model, every ShiftWork command exists in two
modes. The porcelain mode is human-friendly: rich TUI output,
interactive prompts, color-coded status. The plumbing mode is
machine-friendly: structured JSON on stdout, deterministic exit codes,
no interactive prompts. An agent invoking ShiftWork uses plumbing
exclusively. A human at the dashboard uses porcelain. The engine layer
is identical in both paths.

**Key CLI pattern:** shiftwork status (TUI) vs shiftwork status \--json
(structured output for agent consumption).

**3. Git Worktree Coordination**

Git worktrees are the foundational primitive for workspace isolation in
ShiftWork. Every agent operates in its own worktree, which provides a
dedicated filesystem, an isolated branch, and a shared object store with
near-instant creation. This section details how ShiftWork leverages
worktrees across the entire task lifecycle.

**3.1 Why Worktrees Over Branches**

Traditional branch-based workflows require sequential checkout
operations --- only one branch can be active in a single working
directory at a time. This makes parallel agent execution impractical
without cloning the repository multiple times, which is disk-expensive
and creates synchronization headaches. Worktrees solve this by providing
parallel, isolated working directories that share a single git object
store. Creating a worktree is nearly instant and disk-efficient, as it
only creates the working directory and checkout metadata.

**3.2 Worktree Lifecycle**

The worktree lifecycle maps directly to the task lifecycle within
ShiftWork:

  ---------------- --------------------------- ---------------------------
  **Phase**        **ShiftWork Action**        **Git Operation**

  **Task           Creates isolated workspace  git worktree add
  Assigned**       for the agent               .shiftwork/\<task\> -b
                                               shiftwork/\<task\> \<base\>

  **Agent          Agent reads/writes freely   Normal file operations;
  Working**        within its worktree         periodic git add/commit by
                   directory                   agent

  **Task           Captures diff, runs checks, git diff, optional git
  Complete**       stages for review or        merge into target branch
                   auto-merges                 

  **Cleanup**      Removes worktree and        git worktree remove
                   optionally deletes the      .shiftwork/\<task\>
                   branch                      
  ---------------- --------------------------- ---------------------------

**3.3 Crew-Level Worktree Topology**

Crews introduce a shared worktree model. Agents within the same crew
share a single worktree and branch, enabling real-time collaboration
through the filesystem. Agents in different crews are isolated on
separate worktrees. Inter-crew handoff is accomplished by merging one
crew's branch into another crew's worktree base, making the upstream
work visible to downstream agents.

**3.4 Conflict Resolution**

When ShiftWork merges a completed task's branch, it performs a standard
three-way merge with automatic conflict detection. On a clean merge, the
result is applied immediately (or staged for human review, depending on
task policy). On conflict, ShiftWork pauses the merge and surfaces the
conflict details: in the TUI dashboard for human operators, or as a
structured JSON error for supervisor agents. The operator or supervisor
then decides whether to resolve manually, reassign the task, or discard
the work.

**3.5 Directory Scoping via Worktrees**

Worktrees provide natural directory scoping. Each agent is pointed at
its worktree's root path and physically cannot modify files outside that
directory without deliberate escape. ShiftWork can further constrain
agents by configuring path allowlists in the task definition, which the
agent driver enforces by passing directory restrictions to the
underlying CLI agent (e.g., Claude Code's allowed directories flag).

**4. Core Data Model**

**4.1 Crews**

A crew is a first-class primitive representing a group of agents working
toward a shared deliverable. Crews have a name, an assigned git branch
(and worktree), a lead agent designation (whose completion gates the
crew's status), and a coordination strategy governing how agents within
the crew share context. In v0, a crew may contain a single agent, making
crews a lightweight grouping layer that scales to multi-agent
collaboration in later versions.

**4.2 Tasks**

A task is a unit of work assignable to an agent within a crew. Each task
carries a description (which becomes the agent prompt), an optional
agent-type preference, dependencies on other tasks, a retry policy, and
scope constraints (directory allowlist, token budget). Tasks have a
lifecycle state machine:

**pending** → **assigned** → **running** → **completed** \| **failed**
\| **review**

**4.3 Agents**

An agent is a running instance of a CLI coding tool managed through its
driver. Agents have an identity (name, type, driver), a current
assignment (task, crew, worktree path), resource consumption metrics
(tokens, cost, time), and a health status. Multiple agents of the same
type can run concurrently.

**4.4 Shifts**

A shift is a complete orchestration session. It has a start time, the
immutable config that seeded it, the live state of all
crews/tasks/agents, and an eventual shift report. The config is treated
as an immutable seed --- live interventions modify session state but
never alter the original config. This keeps the state model simple for
v0 while preserving the option to add recorded patches for
reproducibility in future versions.

**5. Agent Driver Interface**

The AgentDriver is the most consequential abstraction in ShiftWork. It
normalizes the interaction model across all supported CLI agents behind
a capability-aware interface.

**5.1 Required Capabilities**

Every driver must implement these core operations:

- **spawn(task, worktreePath, options)** --- Launch the agent process
  with a task prompt, pointed at a specific worktree directory.

- **streamOutput()** --- Provide an observable stream of the agent's
  stdout/stderr for real-time monitoring.

- **detectCompletion()** --- Signal when the agent has finished its
  current task, via exit code, output parsing, or other heuristics.

- **terminate()** --- Forcefully kill the agent process with cleanup.

**5.2 Optional Capabilities**

Drivers declare which optional capabilities they support, allowing the
orchestration engine to adapt its behavior:

- **sessionPersistence** --- Can the agent receive follow-up tasks
  without restarting? Enables sequential task assignment to the same
  instance.

- **structuredOutput** --- Can the agent return JSON or typed results?
  Enables rich artifact passing between tasks.

- **progressSignaling** --- Does the agent report what it's currently
  doing? Enables granular dashboard status.

- **costReporting** --- Can the agent report token usage and cost?
  Enables per-task cost tracking.

- **healthCheck** --- Can the agent be pinged to verify responsiveness?
  Enables proactive failure detection.

- **directoryScoping** --- Can the agent be restricted to specific paths
  natively? Enables enforced directory boundaries.

**5.3 Capability-Aware Scheduling**

When a task requires a capability that the assigned agent's driver
doesn't support, ShiftWork surfaces a dashboard warning describing the
degraded behavior. The operator sees the tradeoff and decides whether to
proceed, reassign, or modify the task. ShiftWork never silently degrades
and never hard-refuses --- it informs and defers to the operator.

**5.4 v0 Implementation: Claude Code Driver**

The first driver targets Claude Code, leveraging its rich feature set as
the reference implementation. Claude Code supports session persistence
(via interactive mode), structured output (via \--output-format json),
cost reporting (via token usage in output), and directory scoping (via
allowed directories configuration). This provides a full-featured driver
that exercises every optional capability, validating the interface
design before implementing simpler drivers for agents with fewer
capabilities.

**6. Configuration Format**

ShiftWork uses a programmable TypeScript configuration file
(shiftwork.config.ts) following the pattern established by
vite.config.ts and tailwind.config.ts. Because the config is executable
TypeScript, it shares a type system with ShiftWork's core, enabling IDE
autocomplete, compile-time validation, conditional logic, helper
functions, and imported task definitions.

**6.1 Config Structure**

The configuration expresses the following top-level concerns:

- **workspace** --- The repository root and base branch. Supports
  multi-repo configuration for future expansion.

- **agents** --- Available agent definitions: driver type, binary path,
  default options, and concurrency limits.

- **crews** --- Named crew definitions with assigned agents,
  coordination strategy, and base branch.

- **tasks** --- The work items: description/prompt, crew assignment,
  dependencies, retry policy, scope constraints, and review
  requirements.

- **defaults** --- Fallback values for retry policy, review
  requirements, and agent preferences applied to tasks that don't
  specify their own.

**6.2 Programmable Config Advantages**

Because the config is TypeScript, operators can do things that static
formats cannot support:

- **Conditional logic:** generate different task sets based on
  environment variables, branch name, or git status.

- **Helper functions:** create utility functions that generate
  repetitive task patterns (e.g., a standardized
  test-then-lint-then-docs pipeline).

- **Imports:** compose configs from shared libraries of task templates,
  enabling reuse across projects.

- **Async config:** read from git state, package.json, or external APIs
  to dynamically determine what work needs doing.

**7. Context Sharing Strategies**

ShiftWork supports four layered context-sharing strategies. These are
not mutually exclusive --- they represent escalating levels of
coordination richness. The appropriate strategy is selected per-crew or
per-task-dependency edge in the configuration.

**7.1 Shared Filesystem (Passive)**

The base layer. Agents within a crew share a worktree and see each
other's file changes in real time. No explicit coordination is needed
--- agents discover changes by reading the filesystem. Best for loosely
coupled tasks within a crew where agents work on different files.

**7.2 Git-Based (Structural)**

ShiftWork manages branches and merges across worktrees. When a task
completes, its branch can be merged into downstream worktrees, making
the work available to dependent agents. Provides conflict detection,
rollback capability, and a full audit trail. Best for inter-crew
handoffs and sequential dependencies.

**7.3 Message Bus (Active)**

ShiftWork observes events across all agents (commit activity, task
completion, errors) and dispatches notifications to dependent tasks.
Implemented as an internal event system rather than external
infrastructure. An agent's driver receives context injections from the
bus, formatted appropriately for the agent's input model. Best for
real-time coordination where agents need to react to each other's
progress.

**7.4 Artifact Passing (Rich)**

ShiftWork extracts specific outputs from a completed task (a generated
API schema, test results, type definitions, a diff summary) and injects
them as structured context into the next agent's prompt. This is the
richest form of coordination and requires the upstream agent's driver to
support structured output, or ShiftWork to parse raw output into
meaningful artifacts. Best for tightly coupled task chains where
downstream agents need specific upstream deliverables.

**7.5 Git-Native Artifact Passing**

A powerful pattern that combines git-based and artifact-passing
strategies: when Agent A completes a task, ShiftWork generates a
natural-language diff summary describing what changed and injects it
into Agent B's prompt context alongside merging the actual code changes
into B's worktree. Agent B gets both the code and the narrative context
of what happened upstream.

**8. Safety Guardrails**

**8.1 Git Guardrails**

ShiftWork enforces protective git policies to prevent agents from
damaging the repository:

- Force-push prevention: agents cannot force-push to any branch.

- Protected branches: main/master and configured branches cannot be
  directly modified by agents. All work flows through ShiftWork-managed
  branches.

- Worktree isolation: agents are confined to their assigned worktree
  directory.

- Merge gating: merges into protected branches require explicit operator
  approval (via dashboard or CLI command).

**8.2 Directory Scoping**

Tasks can declare a directory allowlist that restricts which paths an
agent may modify within its worktree. The agent driver enforces this
using the underlying CLI agent's native directory restriction features
where available, and ShiftWork validates compliance by inspecting the
git diff on task completion. Modifications outside the allowed scope
trigger a review flag.

**8.3 Change Review Staging**

Tasks can be configured to require human review before their changes are
merged. When such a task completes, ShiftWork stages the changes (the
branch exists, the diff is visible in the dashboard) but does not merge.
The operator reviews the diff, approves or rejects, and ShiftWork
proceeds accordingly. This is the default for tasks targeting protected
branches.

**8.4 Per-Task Retry Policy**

Each task can define its own error recovery behavior:

- **maxAttempts** --- Maximum number of attempts before escalation
  (default: 1, meaning no retry).

- **strategy** --- same-agent (retry with the same instance),
  fresh-agent (spawn a new instance), or different-type (try a different
  agent type entirely).

- **onExhaustion** --- alert (notify operator and pause),
  cancel-dependents (mark downstream tasks as blocked), or
  pause-dependents (hold downstream tasks, resumable on manual
  resolution).

**9. Observability & Reporting**

ShiftWork's observability system serves two audiences: the operator
monitoring a live shift, and the analyst reviewing completed shifts. All
data flows from the same event stream but surfaces differently in
real-time versus post-hoc contexts.

**9.1 Session Log Replay**

Every agent's output stream is captured with timestamps and persisted
for the duration of the shift. The TUI dashboard can show a live tail of
any agent's output, and after the shift completes, full session logs are
included in the shift report. Logs are stored in a structured format
(JSONL) that supports filtering by agent, task, crew, or time range.

**9.2 Cost / Token Tracking**

For agents whose drivers support cost reporting, ShiftWork aggregates
token usage and estimated cost per task, per agent, per crew, and per
shift. This data appears in the dashboard during the shift and in the
shift report after completion. Over multiple shifts, this data enables
comparative analysis: which agent types are most cost-effective for
which kinds of tasks.

**9.3 Git Diff Summary Per Task**

When a task completes, ShiftWork captures the full git diff (additions,
deletions, files changed) and generates a structured summary. This
summary serves dual purposes: it's shown in the dashboard for review
decisions, and it's available for artifact passing to downstream agents.
The diff summary includes file-level change counts, a line-level
statistical summary, and optionally a natural-language description
generated by passing the diff through an LLM.

**9.4 Shift Report**

At the conclusion of every shift, ShiftWork generates a structured
report containing: the original config, a timeline of all events (task
assignments, completions, failures, interventions), per-task outcomes
with diffs and costs, per-crew summaries, aggregate statistics, and any
unresolved issues. The report is emitted as both a human-readable
markdown document and a machine-readable JSON file. For agent callers,
the JSON report is the primary output of a ShiftWork invocation.

**10. Control Plane & Dashboard**

**10.1 Dashboard-Initiated Shifts**

When a shift is started, ShiftWork does not immediately launch agents.
Instead, it displays the execution plan in the TUI dashboard: the task
graph, crew assignments, agent allocations, and predicted execution
order. The operator reviews the plan, can make adjustments (reassign
tasks, modify agent allocations, reorder priorities), and then
explicitly initiates execution. This is the "foreman reviews the shift
plan" moment.

**10.2 Live Intervention Commands**

During an active shift, the operator can issue commands through the
dashboard or CLI:

- **pause/resume** --- Suspend or resume an individual agent, crew, or
  the entire shift.

- **reassign** --- Move a task to a different agent or crew.

- **inject** --- Add a new task to the running shift with specified
  dependencies.

- **approve/reject** --- Act on tasks staged for review.

- **kill** --- Terminate a stuck agent and mark its task as failed.

- **context** --- Inject additional context into a running agent's next
  prompt.

**10.3 Machine Interface**

Every dashboard action has a corresponding CLI command with \--json flag
support. A supervisor agent can monitor shift progress by polling
shiftwork status \--json, react to events by issuing commands, and
receive the final shift report as structured output. Exit codes follow a
strict contract: 0 for full success, 1 for partial success (some tasks
failed), 2 for shift failure, and specific codes for configuration
errors, agent errors, and merge conflicts.

**11. Build Sequence**

The v0 build is organized into five phases, each independently testable
and demoable.

**Phase 1: Agent Runtime + Claude Code Driver**

Implement the AgentDriver interface and the Claude Code driver. Validate
that a single agent can be spawned, given a task, monitored via output
stream, and detected on completion. No orchestration --- pure agent
lifecycle management. Deliverable: a working shiftwork spawn command
that launches Claude Code against a worktree and streams output.

**Phase 2: Config Loader + Orchestration Engine**

Implement the shiftwork.config.ts parser and the task DAG engine.
Execute a simple sequential plan: one agent, tasks in dependency order,
worktree creation and teardown per task. Validate the config format, the
state machine, and the worktree lifecycle. Deliverable: shiftwork run
executes a multi-task plan sequentially.

**Phase 3: Parallel Execution + Crew Coordination**

Enable multiple concurrent agents on independent tasks. Implement
crew-level worktree sharing and inter-crew merge coordination. Validate
the git worktree topology under parallel workloads. Deliverable:
multiple agents working simultaneously with worktree isolation and merge
gating.

**Phase 4: TUI Dashboard + Live Intervention**

Build the TUI dashboard with real-time agent status, output streaming,
task graph visualization, and live control commands. Implement the
dashboard-initiated start flow. Deliverable: full interactive shift
management experience.

**Phase 5: Observability + Reporting**

Implement session log capture (JSONL), cost aggregation, git diff
summaries, and the structured shift report (Markdown + JSON).
Deliverable: complete shift reports generated on every run.

**12. Technology Decisions**

  ------------------- ------------------------- -------------------------
  **Concern**         **Decision**              **Rationale**

  **Language**        TypeScript (Node.js)      Shared type system with
                                                config; npm ecosystem;
                                                port hot paths to Go/Rust
                                                later

  **Config Format**   TypeScript                Programmable,
                      (shiftwork.config.ts)     type-checked, IDE
                                                autocomplete, conditional
                                                logic

  **Workspace         Git worktrees             Parallel isolation,
  Isolation**                                   shared object store,
                                                conflict detection, audit
                                                trail

  **TUI Framework**   TBD (Ink / Blessed /      Evaluate in Phase 4;
                      custom)                   needs rich layout,
                                                streaming, and keyboard
                                                input

  **Process           Node.js child_process +   Agents are CLI processes;
  Management**        PTY                       PTY preserves terminal
                                                behavior for agents that
                                                need it

  **Session Logs**    JSONL files               Append-only, streamable,
                                                filterable, trivially
                                                parseable

  **Release           Private until v0 solid,   Ship quality over speed;
  Strategy**          then open source          proven approach from
                                                prior projects
  ------------------- ------------------------- -------------------------

**13. Future Considerations (Post-v0)**

The following capabilities are explicitly deferred from v0 but inform
the architecture to ensure they can be added without structural
rewrites:

- **Multi-repo orchestration:** The workspace config should not hardcode
  a single repository root. The data model accommodates multiple repos
  even if v0 only supports one.

- **Config + recorded patches:** Recording live interventions as
  replayable deltas on top of the immutable config, enabling
  reproducible shifts and learning from past runs.

- **Cost-aware scheduling:** Using historical cost data to route tasks
  to the most cost-effective agent type for that category of work.

- **Auto-debugging on retry:** Modifying the retry prompt based on the
  failure mode (e.g., including error output from the failed attempt).

- **Supervisor agent policies:** Moving from monitor-mode (human
  decides) to supervisor-mode (automated recovery policies) for error
  handling.

- **Plugin architecture:** Formal extension points for
  community-contributed agent drivers, coordination strategies, and
  dashboard widgets.

- **Multi-agent crews:** Expanding crews from the v0
  single-agent-per-crew model to true multi-agent collaboration within a
  shared worktree.

- **Hot-path performance:** Porting performance-critical components
  (worktree management, event bus, output parsing) to Go or Rust via
  native Node.js bindings.

**14. Summary**

ShiftWork is an orchestration platform built on three key insights: git
worktrees are the right isolation primitive for parallel AI-assisted
development, an agent-agnostic driver interface enables a healthy
ecosystem without vendor lock-in, and dual human/machine interfaces make
the orchestrator itself composable into higher-level autonomous
workflows.

The v0 scope is deliberately constrained: one agent driver (Claude
Code), sequential-then-parallel execution, worktree-based coordination,
a functional TUI dashboard, and structured shift reports. Every design
decision preserves extensibility for the capabilities deferred to later
versions.

The name says it all: ShiftWork coordinates shifts of AI workers on a
shared codebase, with a human foreman who sees everything, controls
everything, and clocks out with a full report of what happened on their
watch.
