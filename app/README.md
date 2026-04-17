# ShiftWork Desktop App

The ShiftWork desktop application is a terminal multiplexer with built-in AI agent orchestration, built on **Tauri v2**, **React**, and **xterm.js**. It provides a native desktop experience where developers can work in terminal sessions, spawn AI coding agents, and orchestrate multi-step development workflows — all from a single application.

## Architecture

The application follows a clean separation between the Rust backend and the React frontend, communicating through Tauri's IPC (Inter-Process Communication) layer.

```
┌─────────────────────────────────────────────────────┐
│                   Tauri Webview                      │
│  ┌───────────┬─────────────────────────────────┐    │
│  │           │  TabBar                          │    │
│  │  Sidebar  ├─────────────────────────────────┤    │
│  │           │                                  │    │
│  │  (Work-   │  TerminalPane (xterm.js)         │    │
│  │   spaces) │                                  │    │
│  │           │                                  │    │
│  └───────────┴─────────────────────────────────┘    │
│                        ▲                             │
│                        │ Tauri IPC                   │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐    │
│  │  Rust Backend                                │    │
│  │  ┌──────────────┐  ┌──────────────────────┐ │    │
│  │  │ PTY Registry │  │ Tauri Commands       │ │    │
│  │  │ (parking_lot)│  │ spawn / write /      │ │    │
│  │  │              │  │ resize / kill / list  │ │    │
│  │  └──────┬───────┘  └──────────────────────┘ │    │
│  │         │                                    │    │
│  │         ▼                                    │    │
│  │  ┌──────────────┐                            │    │
│  │  │ portable-pty │ → System Shell / Agent CLI │    │
│  │  └──────────────┘                            │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| App Shell | Tauri v2 (Rust) | Native window, OS integration, IPC bridge |
| PTY Management | `portable-pty` (Rust) | Spawning and managing pseudo-terminal processes |
| Thread Safety | `parking_lot` (Rust) | Lock-free concurrent access to the PTY registry |
| Frontend Framework | React 18 + TypeScript | Application UI and component architecture |
| Terminal Renderer | xterm.js + WebGL addon | High-performance terminal emulation in the webview |
| State Management | Zustand | Lightweight reactive state for workspaces and tabs |
| Build Tool | Vite | Fast frontend bundling with HMR |
| Testing | Vitest + Rust tests | Frontend unit tests and Rust unit tests |

### Directory Structure

```
app/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs            # Binary entry point
│   │   ├── lib.rs             # App initialization, command registration
│   │   ├── pty.rs             # PTY lifecycle management
│   │   └── pty_tests.rs       # Rust unit tests
│   ├── capabilities/
│   │   └── default.json       # Tauri security permissions
│   ├── Cargo.toml             # Rust dependencies
│   ├── tauri.conf.json        # Tauri configuration
│   └── build.rs               # Tauri build script
├── src/                       # React frontend
│   ├── components/
│   │   ├── TerminalPane.tsx   # xterm.js ↔ PTY bridge
│   │   ├── Sidebar.tsx        # Workspace navigation
│   │   ├── TabBar.tsx         # Tab management
│   │   ├── WorkspaceView.tsx  # Workspace content area
│   │   └── SpawnAgentDialog.tsx # Agent launcher dialog
│   ├── hooks/
│   │   └── useTerminal.ts     # PTY lifecycle hook
│   ├── lib/
│   │   ├── pty.ts             # Tauri IPC bindings for PTY commands
│   │   └── pty.test.ts        # PTY binding tests
│   ├── stores/
│   │   ├── workspace-store.ts      # Zustand store for workspace/tab state
│   │   └── workspace-store.test.ts # Store unit tests
│   ├── styles/
│   │   ├── app.css            # Application layout and theme
│   │   └── dialog.css         # Dialog/modal styles
│   ├── types/
│   │   └── workspace.ts       # TypeScript type definitions
│   ├── tests/
│   │   └── setup.ts           # Test setup with Tauri API mocks
│   ├── App.tsx                # Root component
│   └── main.tsx               # React entry point
├── index.html                 # Webview HTML entry
├── package.json               # Frontend dependencies
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
└── vitest.config.ts           # Test configuration
```

## Getting Started

### Prerequisites

The following must be installed on your system:

| Requirement | macOS | Linux | Windows |
|---|---|---|---|
| **Rust** (1.77+) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | Same | [rustup.rs](https://rustup.rs) |
| **Node.js** (18+) | `brew install node` | `apt install nodejs` | [nodejs.org](https://nodejs.org) |
| **pnpm** | `npm install -g pnpm` | Same | Same |
| **System libs** | Included with Xcode CLI tools | `sudo apt install libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev` | Included with MSVC |

### Development

```bash
# From the repository root:
cd app

# Install frontend dependencies
pnpm install

# Run in development mode (starts Vite dev server + Tauri)
pnpm tauri dev

# Run frontend tests
pnpm test

# Run Rust tests
cd src-tauri && cargo test

# Build for production
pnpm tauri build
```

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + N` | New workspace |
| `Cmd/Ctrl + T` | New terminal tab |
| `Cmd/Ctrl + W` | Close active tab |
| `Cmd/Ctrl + Shift + A` | Spawn agent dialog |
| `Cmd/Ctrl + 1-9` | Switch to workspace by index |
| `Escape` | Close dialogs |

## Data Model

ShiftWork organizes terminal sessions in a two-level hierarchy:

```
Workspace ("Frontend Dev")
├── Tab: "Terminal 1"     → PTY (zsh)
├── Tab: "Claude Code"    → PTY (claude)
└── Tab: "Tests"          → PTY (zsh)

Workspace ("Backend API")
├── Tab: "Terminal 1"     → PTY (bash)
└── Tab: "Gemini CLI"     → PTY (gemini)
```

Each **workspace** groups related terminal sessions by project or task. Each **tab** within a workspace holds a single terminal pane backed by a PTY process. Tabs can be either regular terminals or agent sessions.

## IPC Protocol

The frontend communicates with the Rust backend through five Tauri commands and two event channels:

### Commands (Frontend → Backend)

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `spawn_pty` | `SpawnOptions` | `string` (session ID) | Creates a new PTY process |
| `write_pty` | `id`, `data: number[]` | `void` | Sends input to a PTY |
| `resize_pty` | `id`, `cols`, `rows` | `void` | Resizes a PTY |
| `kill_pty` | `id` | `void` | Terminates a PTY |
| `list_ptys` | none | `string[]` | Lists active PTY IDs |

### Events (Backend → Frontend)

| Event | Payload | Description |
|---|---|---|
| `pty:output` | `{ id, data: number[] }` | Raw output bytes from a PTY |
| `pty:exit` | `{ id, code: number \| null }` | PTY process has exited |

## Agent Integration

The app supports spawning AI coding agents directly into terminal tabs. The `SpawnAgentDialog` component provides a UI for selecting an agent, entering a task prompt, and configuring the working directory. Currently supported agents:

| Agent | Command | Status |
|---|---|---|
| Claude Code | `claude` | Supported |
| Gemini CLI | `gemini` | Supported |
| OpenAI Codex CLI | `codex` | Supported |

Agent tabs are visually distinguished from regular terminal tabs with a diamond icon and are tagged with metadata (driver type, prompt) for future orchestration integration.

## Design Decisions

**Why Tauri v2?** Tauri produces small, fast native binaries (typically 5-10 MB) compared to Electron's ~150 MB. It uses the system's native webview (WebKit on macOS/Linux, WebView2 on Windows), which means lower memory usage and better OS integration. The Rust backend provides safe, performant PTY management.

**Why xterm.js?** It is the most mature terminal emulator for the web, used by VS Code, Hyper, and many other applications. The WebGL addon provides GPU-accelerated rendering at ~60fps, which is critical for a terminal that needs to feel native.

**Why Zustand?** Zustand provides a minimal, hook-based state management solution that avoids the boilerplate of Redux while supporting the same patterns (selectors, subscriptions, middleware). The workspace/tab state is simple enough that a single store suffices.

**Why portable-pty?** This Rust crate provides cross-platform PTY support (macOS, Linux, Windows) with a clean API. It handles the platform-specific details of PTY creation, which differ significantly between Unix (openpty/forkpty) and Windows (ConPTY).
