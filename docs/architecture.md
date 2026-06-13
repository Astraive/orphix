# Project Orphix — Full Architecture & Design Document

## 1. One-Line Definition

**Orphix is a terminal-first, Tauri-powered desktop command center for running, supervising, and coordinating AI coding agents across projects, with a Next.js account/control web app, a mobile companion app, and a dedicated Fumadocs documentation site.**

Orphix is not an IDE. Orphix does not replace VS Code, Cursor, Zed, or JetBrains. The terminal is the whole app. Editing is handed off to external editors, mainly VS Code.

---

## 2. Product Positioning

### 2.1 What Orphix Is

Orphix is a keyboard-first terminal workspace for:

* AI coding agents
* multiple terminal sessions
* project-aware process supervision
* long-running task tracking
* dev server previews
* file/search context selection
* VS Code handoff
* device/session management
* mobile remote control
* account and login management through the web app

### 2.2 What Orphix Is Not

Orphix is not:

* a full IDE
* a code editor
* an LSP platform
* a Monaco wrapper
* a browser terminal only
* a VS Code replacement
* a Cursor replacement

### 2.3 Core Thesis

AI coding agents live in terminals. Developers now run multiple agents, test runners, dev servers, package managers, build tools, deployment CLIs, and logs at the same time. Existing editors treat terminals as panels. Orphix treats the terminal-agent workflow as the main product.

### 2.4 Taglines

* **The terminal command center for AI agents.**
* **Run agents in Orphix. Edit in VS Code.**
* **A control plane for human and AI coding sessions.**

---

## 3. High-Level System Overview

```txt
orphix/
├── src/                  # Main Tauri app: UI + core app code together
├── src-tauri/            # Tauri Rust host and native commands
├── apps/
│   ├── web/              # Next.js web app: login, account, device management
│   ├── mobile/           # Mobile companion app
│   └── docs/             # Fumadocs documentation app
├── packages/             # Shared packages used across apps
├── scripts/
├── public/
├── package.json
├── bun.lock
├── turbo.json
├── Cargo.toml
└── README.md
```

The main desktop product lives at the repository root. The root `src/` contains the full Tauri frontend application code and app-domain modules. The Rust/native host remains in `src-tauri/`, because that is how Tauri projects are structured, but the product architecture is centered around one main app source tree.

---

## 4. Main Architecture Decision

### Decision

Use:

```txt
Desktop app:    Tauri v2 + React + TypeScript + Rust commands
Terminal UI:    xterm.js + WebGL renderer
Terminal core:  Rust-backed PTY/session/process layer exposed through Tauri
Web app:        Next.js for login, account, devices, billing, remote management
Mobile app:     React Native / Expo companion
Docs app:       Fumadocs / Next.js docs app
Package manager: Bun workspaces
Build system:   Turborepo
Local storage:  SQLite for desktop state
Cloud data:     Next.js app/API routes + database
```

### Why This Shape

Orphix should be desktop-first and terminal-first. The root app should feel like one product, not a separated frontend/backend split inside the desktop codebase. The main app source should be easy to navigate:

```txt
src/app
src/features
src/components
src/lib
src/hooks
src/config
src/types
src/terminal
```

The web app handles login and account management. There is no separate FastAPI service. The Next.js web app owns the public web, dashboard, login frontend, and backend API routes.

---

## 5. Final Monorepo Structure

```txt
orphix/
├── src/                              # Main desktop Tauri app source
│   ├── app/                          # App shell, routing, providers, layout
│   ├── features/                     # Product features
│   ├── components/                   # Shared UI components
│   ├── hooks/                        # Shared React hooks
│   ├── lib/                          # Shared frontend utilities
│   ├── config/                       # App config, constants, shortcuts
│   ├── types/                        # Global TypeScript types
│   ├── terminal/                     # Terminal system: main/shared/renderer
│   ├── agents/                       # Agent runtime UI/domain wrappers
│   ├── tasks/                        # Tasks/plans/TODO models and UI
│   ├── projects/                     # Project detection and project UI
│   ├── preview/                      # Dev server preview UI
│   ├── search/                       # Project search UI and API wrappers
│   ├── git/                          # Git state UI and command wrappers
│   ├── vscode/                       # VS Code handoff wrappers
│   ├── system/                       # Sleep lock/resource/notification UI
│   ├── sync/                         # Cloud sync/client-side state
│   ├── styles/                       # Global styles/theme
│   └── main.tsx                      # React entry
│
├── src-tauri/                        # Tauri native host
│   ├── src/
│   │   ├── main.rs
│   │   ├── bootstrap.rs
│   │   ├── state.rs
│   │   ├── error.rs
│   │   ├── events.rs
│   │   ├── commands/
│   │   │   ├── terminal.rs
│   │   │   ├── agents.rs
│   │   │   ├── tasks.rs
│   │   │   ├── projects.rs
│   │   │   ├── preview.rs
│   │   │   ├── search.rs
│   │   │   ├── git.rs
│   │   │   ├── vscode.rs
│   │   │   ├── system.rs
│   │   │   └── sync.rs
│   │   ├── terminal/
│   │   ├── agents/
│   │   ├── tasks/
│   │   ├── projects/
│   │   ├── preview/
│   │   ├── search/
│   │   ├── git/
│   │   ├── vscode/
│   │   ├── system/
│   │   ├── db/
│   │   └── protocol/
│   ├── capabilities/
│   ├── migrations/
│   ├── icons/
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── apps/
│   ├── web/                          # Next.js account/control web app
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── server/
│   │   ├── db/
│   │   ├── emails/
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── mobile/                       # Mobile companion app
│   │   ├── app/
│   │   ├── src/
│   │   ├── assets/
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── docs/                         # Fumadocs documentation app
│       ├── app/
│       ├── content/
│       ├── components/
│       ├── lib/
│       ├── source.config.ts
│       └── package.json
│
├── packages/
│   ├── ui/                           # Shared UI primitives
│   ├── icons/                        # Catppuccin/dev/file icons
│   ├── config/                       # shared tsconfig/eslint/tailwind
│   ├── protocol/                     # shared TS protocol schemas
│   ├── api-client/                   # client for apps/web APIs
│   └── validators/                   # zod schemas shared across apps
│
├── scripts/
├── public/
├── .github/
├── package.json
├── bun.lock
├── turbo.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── Cargo.toml
└── README.md
```

---

## 6. Root `src/` Desktop App Structure

The root `src/` is the primary Orphix application source. It includes the desktop UI, product feature modules, TypeScript protocol wrappers, and terminal renderer logic.

```txt
src/
├── app/
│   ├── App.tsx
│   ├── providers.tsx
│   ├── shell.tsx
│   ├── layout-store.ts
│   ├── command-registry.ts
│   ├── routes.tsx
│   └── boot.ts
│
├── features/
│   ├── command-palette/
│   ├── workspaces/
│   ├── profiles/
│   ├── settings/
│   ├── onboarding/
│   ├── notifications/
│   ├── devices/
│   └── updates/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── panels/
│   ├── toolbar/
│   ├── sidebar/
│   ├── empty-states/
│   └── icons/
│
├── hooks/
│   ├── use-command.ts
│   ├── use-shortcut.ts
│   ├── use-event-listener.ts
│   ├── use-tauri-event.ts
│   ├── use-hotkeys.ts
│   └── use-theme.ts
│
├── lib/
│   ├── tauri.ts
│   ├── events.ts
│   ├── commands.ts
│   ├── ids.ts
│   ├── paths.ts
│   ├── keyboard.ts
│   ├── logger.ts
│   ├── cn.ts
│   └── result.ts
│
├── config/
│   ├── app.ts
│   ├── shortcuts.ts
│   ├── themes.ts
│   ├── terminal.ts
│   ├── agents.ts
│   ├── sync.ts
│   └── constants.ts
│
├── types/
│   ├── app.ts
│   ├── events.ts
│   ├── commands.ts
│   ├── ids.ts
│   ├── result.ts
│   └── global.d.ts
│
├── terminal/
│   ├── main/
│   ├── shared/
│   └── renderer/
│
├── agents/
│   ├── components/
│   ├── hooks/
│   ├── stores/
│   ├── api.ts
│   ├── commands.ts
│   ├── events.ts
│   └── types.ts
│
├── tasks/
├── projects/
├── preview/
├── search/
├── files/
├── git/
├── vscode/
├── system/
├── sync/
├── styles/
└── main.tsx
```

---

## 7. Terminal Module Structure

The terminal is the heart of Orphix. It gets its own top-level module under `src/terminal`.

```txt
src/terminal/
├── main/                         # TypeScript wrappers around Tauri terminal commands
│   ├── terminal-api.ts
│   ├── terminal-events.ts
│   ├── terminal-commands.ts
│   ├── terminal-manager-client.ts
│   ├── terminal-session-client.ts
│   └── index.ts
│
├── shared/                       # Shared terminal contracts and schemas
│   ├── terminal-types.ts
│   ├── terminal-events.ts
│   ├── terminal-commands.ts
│   ├── terminal-profiles.ts
│   ├── terminal-status.ts
│   ├── terminal-layout.ts
│   ├── terminal-errors.ts
│   └── index.ts
│
└── renderer/                     # xterm.js UI/rendering layer
    ├── components/
    │   ├── TerminalPane.tsx
    │   ├── TerminalGrid.tsx
    │   ├── TerminalTabs.tsx
    │   ├── TerminalViewport.tsx
    │   ├── TerminalToolbar.tsx
    │   ├── TerminalSwitcher.tsx
    │   └── TerminalStatusBar.tsx
    │
    ├── hooks/
    │   ├── use-terminal.ts
    │   ├── use-terminal-output.ts
    │   ├── use-terminal-resize.ts
    │   ├── use-terminal-keyboard.ts
    │   └── use-terminal-fit.ts
    │
    ├── stores/
    │   ├── terminal-store.ts
    │   ├── terminal-layout-store.ts
    │   └── terminal-selection-store.ts
    │
    ├── xterm/
    │   ├── create-terminal.ts
    │   ├── attach-terminal.ts
    │   ├── fit.ts
    │   ├── theme.ts
    │   ├── webgl.ts
    │   └── keybindings.ts
    │
    └── index.ts
```

### 7.1 Terminal Responsibility Split

```txt
src/terminal/main
  Calls Tauri commands and subscribes to native events.

src/terminal/shared
  Defines types, payloads, terminal states, and validation schemas.

src/terminal/renderer
  Owns xterm.js instances, WebGL renderer setup, React components, and UI state.

src-tauri/src/terminal
  Owns actual PTY sessions, process lifecycle, output buffers, shell profiles, and native terminal state.
```

---

## 8. Native Tauri Core Structure

The Rust side owns real system state. The frontend can request actions, but the Rust core owns processes.

```txt
src-tauri/src/
├── main.rs
├── bootstrap.rs
├── state.rs
├── error.rs
├── events.rs
│
├── commands/
│   ├── mod.rs
│   ├── terminal.rs
│   ├── agents.rs
│   ├── tasks.rs
│   ├── projects.rs
│   ├── preview.rs
│   ├── search.rs
│   ├── git.rs
│   ├── vscode.rs
│   ├── system.rs
│   └── sync.rs
│
├── terminal/
│   ├── mod.rs
│   ├── manager.rs
│   ├── session.rs
│   ├── pty.rs
│   ├── shell.rs
│   ├── profile.rs
│   ├── output.rs
│   ├── ring_buffer.rs
│   ├── cwd.rs
│   └── events.rs
│
├── agents/
│   ├── mod.rs
│   ├── manager.rs
│   ├── registry.rs
│   ├── runner.rs
│   ├── adapters/
│   │   ├── claude.rs
│   │   ├── codex.rs
│   │   ├── gemini.rs
│   │   ├── aider.rs
│   │   └── custom.rs
│   └── events.rs
│
├── tasks/
│   ├── mod.rs
│   ├── manager.rs
│   ├── model.rs
│   └── store.rs
│
├── projects/
│   ├── mod.rs
│   ├── detector.rs
│   ├── framework.rs
│   ├── package_manager.rs
│   ├── scripts.rs
│   └── ports.rs
│
├── preview/
│   ├── mod.rs
│   ├── manager.rs
│   ├── dev_server.rs
│   └── ports.rs
│
├── search/
│   ├── mod.rs
│   ├── rg.rs
│   └── results.rs
│
├── files/
│   ├── mod.rs
│   ├── watcher.rs
│   └── explorer.rs
│
├── git/
│   ├── mod.rs
│   ├── status.rs
│   ├── diff.rs
│   └── watcher.rs
│
├── vscode/
│   ├── mod.rs
│   └── handoff.rs
│
├── system/
│   ├── mod.rs
│   ├── sleep.rs
│   ├── resources.rs
│   ├── notifications.rs
│   └── shortcuts.rs
│
├── sync/
│   ├── mod.rs
│   ├── client.rs
│   ├── device.rs
│   ├── auth.rs
│   └── relay.rs
│
├── db/
│   ├── mod.rs
│   ├── sqlite.rs
│   ├── migrations.rs
│   └── models.rs
│
└── protocol/
    ├── mod.rs
    ├── ids.rs
    ├── terminal.rs
    ├── agents.rs
    ├── tasks.rs
    ├── projects.rs
    ├── events.rs
    └── commands.rs
```

---

## 9. Tauri Communication Model

### 9.1 Commands: UI to Native

Use Tauri commands for direct actions.

```ts
await invoke('terminal_create', request)
await invoke('terminal_write', request)
await invoke('terminal_resize', request)
await invoke('terminal_kill', request)
await invoke('agent_start', request)
await invoke('project_detect', request)
await invoke('vscode_open_file', request)
```

### 9.2 Events: Native to UI

Use events/channels for streaming updates.

```txt
terminal.output
terminal.state
terminal.exit
terminal.error
terminal.cwd_changed
terminal.git_changed

agent.started
agent.output_summary
agent.attention
agent.finished
agent.failed

task.created
task.updated
task.completed

project.detected
preview.ready
search.result
system.resource_update
sync.status
```

### 9.3 Terminal Streaming Rule

Never stream every terminal to every pane.

```txt
Visible terminal:
  live byte stream to xterm.js

Hidden terminal:
  Rust keeps ring buffer
  UI receives activity/status updates only

Archived terminal:
  logs persisted or discarded according to settings
```

Commands:

```txt
terminal_create
terminal_attach
terminal_detach
terminal_write
terminal_resize
terminal_kill
terminal_restart
terminal_list
terminal_snapshot
terminal_output_range
terminal_clear
```

---

## 10. Terminal Engine Design

### 10.1 Terminal Session Model

```rust
pub struct TerminalSession {
    pub id: TerminalId,
    pub kind: TerminalKind,
    pub project_id: Option<ProjectId>,
    pub task_id: Option<TaskId>,
    pub agent_run_id: Option<AgentRunId>,
    pub cwd: PathBuf,
    pub shell: ShellProfile,
    pub cols: u16,
    pub rows: u16,
    pub status: TerminalStatus,
    pub visibility: TerminalVisibility,
    pub created_at: DateTime<Utc>,
    pub last_activity_at: DateTime<Utc>,
}
```

### 10.2 Terminal Kinds

```rust
pub enum TerminalKind {
    Shell,
    Agent,
    DevServer,
    TestRunner,
    Script,
    Task,
}
```

### 10.3 Visibility Modes

```rust
pub enum TerminalVisibility {
    Attached,
    Detached,
    Background,
    Archived,
}
```

### 10.4 Terminal Manager Responsibilities

* create PTY sessions
* write input
* stream output
* resize PTY
* kill/restart sessions
* track cwd
* detect shell profiles
* store output ring buffers
* attach/detach frontend subscribers
* associate sessions with agents/tasks/projects
* emit lifecycle events

---

## 11. Agent System

### 11.1 Agent Principle

An agent is a supervised terminal session with metadata.

```txt
AgentRun
├── id
├── provider
├── terminal_id
├── project_id
├── task_id
├── command
├── cwd
├── status
├── attention_state
├── changed_files
├── started_at
└── ended_at
```

### 11.2 Supported Agents

Initial providers:

* Claude Code
* Codex CLI
* Gemini CLI
* Aider
* custom command

### 11.3 Agent Status

```txt
queued
starting
running
needs_input
blocked
failed
completed
cancelled
```

### 11.4 Agent Flow

```txt
User starts agent
  ↓
AgentManager creates AgentRun
  ↓
TerminalManager creates PTY session
  ↓
Agent command runs inside terminal
  ↓
Output streams to xterm.js
  ↓
TaskManager updates linked task
  ↓
GitManager tracks changed files
  ↓
Sync layer pushes safe status to web/mobile
```

---

## 12. Tasks, Plans, and TODOs

Tasks are first-class objects in Orphix.

```txt
Task
├── id
├── project_id
├── title
├── description
├── status
├── priority
├── linked_agent_runs
├── linked_terminals
├── changed_files
├── created_at
└── updated_at
```

Task statuses:

```txt
backlog
planned
running
needs_review
blocked
done
cancelled
```

A task can have multiple terminals and agents attached to it. This lets Orphix answer:

* what is running?
* which agent owns this task?
* what files changed?
* is it waiting for input?
* which terminal belongs to this task?
* can this be reviewed in VS Code?

---

## 13. Project System

The project system detects and manages local projects.

### 13.1 Project Detection

Detect:

* git root
* package manager
* framework
* dev command
* build command
* test command
* available scripts
* dev server ports
* monorepo packages

### 13.2 Framework Detection

```txt
Next.js      next.config.*, app/, pages/, next dependency
Vite         vite.config.*, vite dependency
Astro        astro.config.*, astro dependency
SvelteKit    svelte.config.*, @sveltejs/kit dependency
Nuxt         nuxt.config.*, nuxt dependency
Rust         Cargo.toml
Go           go.mod
Python       pyproject.toml, requirements.txt
```

---

## 14. Preview System

Orphix can run and supervise dev servers, but it is not a browser IDE.

Preview responsibilities:

* detect dev server command
* run dev server in managed terminal
* detect localhost URL
* open preview panel
* show logs/errors
* link preview to task/agent
* restart preview
* open external browser

Preview commands:

```txt
preview_start
preview_stop
preview_restart
preview_detect
preview_open_url
```

---

## 15. File Explorer and Search

The file explorer is not an editor. It is a context picker and handoff surface.

Features:

* Catppuccin icons
* keyboard navigation
* show changed files
* show agent-touched files
* attach file to agent context
* copy path
* open in VS Code
* open containing folder

Search features:

* ripgrep-speed search
* regex search
* filename search
* include/exclude globs
* attach result to agent
* open result in VS Code

---

## 16. VS Code Handoff

VS Code is the editing surface. Orphix is the terminal-agent control surface.

Actions:

```txt
Open project in VS Code
Open file in VS Code
Open file at line/column
Open failed test location
Open search result
Open agent-changed file
Open git diff/review
```

Command examples:

```bash
code .
code src/app/page.tsx
code -g src/app/page.tsx:42:8
```

Orphix should detect whether the `code` CLI exists and show setup guidance when missing.

---

## 17. Web App — `apps/web`

The web app is a Next.js application for public account and remote management.

It owns:

* login frontend
* register/signup
* dashboard
* account settings
* device management
* desktop pairing
* mobile pairing
* billing later
* remote session overview
* API routes for auth/sync/relay

### 17.1 Web Structure

```txt
apps/web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── devices/page.tsx
│   │   ├── sessions/page.tsx
│   │   ├── billing/page.tsx
│   │   └── settings/page.tsx
│   │
│   ├── api/
│   │   ├── auth/
│   │   ├── devices/
│   │   ├── sync/
│   │   ├── relay/
│   │   ├── sessions/
│   │   └── billing/
│   │
│   └── download/page.tsx
│
├── components/
│   ├── marketing/
│   ├── dashboard/
│   ├── auth/
│   └── ui/
│
├── server/
│   ├── auth.ts
│   ├── db.ts
│   ├── sessions.ts
│   ├── devices.ts
│   ├── sync.ts
│   ├── relay.ts
│   └── billing.ts
│
├── db/
│   ├── schema.ts
│   ├── migrations/
│   └── seed.ts
│
├── lib/
│   ├── api.ts
│   ├── auth-client.ts
│   ├── validators.ts
│   └── env.ts
│
├── emails/
├── public/
└── package.json
```

### 17.2 Web Backend Responsibilities

The web app replaces a separate API server. Its API routes/server modules handle:

* auth
* sessions
* users
* device registration
* desktop pairing
* mobile pairing
* sync events
* relay commands
* billing later

### 17.3 Suggested Web Stack

```txt
Next.js App Router
TypeScript
PostgreSQL
Drizzle ORM or Prisma
Auth.js / Better Auth / custom auth
Zod validation
TanStack Query on client
WebSocket/SSE route for relay if needed
Stripe later
```

---

## 18. Mobile App — `apps/mobile`

The mobile app is a companion remote-control app.

It lets users:

* login
* pair with desktop devices
* see active sessions
* see running agents
* receive notifications
* kill/restart agents
* approve prompts later
* track tasks
* view summaries

### 18.1 Mobile Structure

```txt
apps/mobile/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── devices.tsx
│   ├── sessions.tsx
│   ├── agents/
│   │   └── [agentRunId].tsx
│   ├── tasks/
│   │   └── [taskId].tsx
│   └── settings.tsx
│
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── devices.ts
│   │   ├── sessions.ts
│   │   ├── agents.ts
│   │   └── tasks.ts
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── devices/
│   │   ├── sessions/
│   │   ├── agents/
│   │   ├── tasks/
│   │   ├── notifications/
│   │   └── approvals/
│   │
│   ├── components/
│   ├── hooks/
│   ├── stores/
│   ├── config/
│   ├── types/
│   └── lib/
│
├── assets/
├── app.json
└── package.json
```

### 18.2 Mobile Stack

```txt
React Native / Expo
Expo Router
TypeScript
TanStack Query
Zustand/Jotai
SecureStore for tokens
Push notifications
WebSocket/SSE client for relay/status
```

---

## 19. Docs App — `apps/docs`

Use Fumadocs as the dedicated docs app.

It owns:

* product docs
* architecture docs
* setup docs
* CLI/agent integration docs
* extension docs later
* security docs
* changelog docs

### 19.1 Docs Structure

```txt
apps/docs/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── docs/[[...slug]]/page.tsx
│   └── api/search/route.ts
│
├── content/
│   ├── docs/
│   │   ├── index.mdx
│   │   ├── getting-started.mdx
│   │   ├── desktop.mdx
│   │   ├── terminal.mdx
│   │   ├── agents.mdx
│   │   ├── mobile.mdx
│   │   ├── web-sync.mdx
│   │   ├── security.mdx
│   │   └── architecture.mdx
│   │
│   └── changelog/
│       └── index.mdx
│
├── components/
├── lib/
├── source.config.ts
└── package.json
```

---

## 20. Cloud Sync and Relay

### 20.1 Philosophy

Desktop is local-first. Cloud enables login, sync, mobile control, and device management.

```txt
Desktop owns execution.
Web app owns account and relay.
Mobile owns remote control.
Docs owns product knowledge.
VS Code owns editing.
Orphix owns terminal-agent workflow.
```

### 20.2 Safe Sync Data

Sync by default:

* device status
* task states
* agent run status
* project display metadata
* session status
* notification events
* user-approved summaries

Do not sync by default:

* raw terminal output
* source code
* `.env` values
* private keys
* secrets
* full command history

### 20.3 Relay Flow

```txt
Desktop connects to web relay endpoint
Mobile connects to web relay endpoint
Mobile sends command: kill agent
Web verifies auth/device permission
Web relays command to desktop
Desktop executes locally
Desktop sends result event
Mobile receives update
```

Remote commands:

```txt
agent.kill
agent.restart
agent.pause later
agent.resume later
task.mark_done
terminal.kill
preview.restart
notification.ack
```

---

## 21. Security Model

### 21.1 Desktop Security

* minimal Tauri capabilities
* validate every command payload
* keep process ownership in Rust
* do not expose arbitrary command execution outside terminal/session APIs
* secure token storage
* local SQLite for state
* optional encrypted local DB later
* audit remote commands

### 21.2 Web Security

* secure auth sessions
* device tokens
* refresh/session rotation
* CSRF protection where needed
* rate limiting
* audit logs
* scoped relay permissions
* per-device revocation

### 21.3 Mobile Security

* secure token storage
* biometric lock optional
* device revocation
* confirmation for destructive remote commands
* notification redaction options

---

## 22. Local Data Model

Desktop SQLite tables:

```txt
settings
profiles
projects
workspaces
terminals
terminal_logs
agent_runs
tasks
dev_servers
git_snapshots
sync_queue
devices
audit_log
```

Web database tables:

```txt
users
accounts
sessions
devices
device_pairings
projects
tasks
agent_runs
sync_events
relay_connections
relay_commands
audit_logs
subscriptions
```

---

## 23. Package Structure

```txt
packages/
├── ui/
│   ├── src/components/
│   ├── src/hooks/
│   ├── src/styles/
│   └── package.json
│
├── icons/
│   ├── src/file-icons/
│   ├── src/product-icons/
│   └── package.json
│
├── protocol/
│   ├── src/terminal.ts
│   ├── src/agents.ts
│   ├── src/tasks.ts
│   ├── src/projects.ts
│   ├── src/sync.ts
│   └── package.json
│
├── validators/
│   ├── src/auth.ts
│   ├── src/devices.ts
│   ├── src/tasks.ts
│   ├── src/agents.ts
│   └── package.json
│
├── api-client/
│   ├── src/client.ts
│   ├── src/auth.ts
│   ├── src/devices.ts
│   ├── src/sync.ts
│   └── package.json
│
└── config/
    ├── eslint/
    ├── tsconfig/
    ├── tailwind/
    └── package.json
```

---

## 24. Root Package Scripts

```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:desktop": "tauri dev",
    "dev:web": "bun --filter @orphix/web dev",
    "dev:mobile": "bun --filter @orphix/mobile start",
    "dev:docs": "bun --filter @orphix/docs dev",
    "build": "turbo build",
    "build:desktop": "tauri build",
    "build:web": "bun --filter @orphix/web build",
    "build:docs": "bun --filter @orphix/docs build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "format": "prettier --write ."
  }
}
```

---

## 25. MVP Scope

### 25.1 Desktop MVP

Must have:

* Tauri desktop shell
* xterm.js WebGL terminal
* Rust PTY terminal sessions
* terminal tabs
* terminal panes
* terminal switcher
* shell profile discovery
* attach/detach terminal streaming
* local session state
* project detection
* agent launch as terminal session
* task list
* VS Code open project/file/line
* SQLite local persistence

### 25.2 Web MVP

Must have:

* landing page
* login/register
* dashboard
* device pairing
* session overview
* basic sync API routes
* relay skeleton

### 25.3 Mobile MVP

Must have:

* login
* pair device
* list active sessions
* list running agents
* kill/restart agent
* receive status updates

### 25.4 Docs MVP

Must have:

* getting started
* install guide
* desktop usage
* terminal sessions
* agent sessions
* mobile pairing
* security model
* architecture overview

---

## 26. Build Order

### Phase 0 — Monorepo Setup

* root Bun workspace
* root Tauri app
* `apps/web`
* `apps/mobile`
* `apps/docs`
* shared packages
* lint/typecheck/build scripts

### Phase 1 — Tauri Terminal Core

* Tauri app boots
* React shell renders
* Rust command bridge
* create PTY terminal
* stream output to xterm.js
* write input
* resize
* kill

### Phase 2 — Terminal Workspace

* terminal tabs
* split panes
* terminal switcher
* ring buffer
* attach/detach streaming
* shell profiles
* keyboard navigation

### Phase 3 — Project Layer

* detect project root
* detect package manager
* detect framework
* run dev command
* preview local server
* VS Code handoff

### Phase 4 — Agent Layer

* AgentRun model
* launch supported agent commands
* attach agent to task
* track status
* track changed files
* attention states

### Phase 5 — Web Auth + Device Pairing

* login/register
* device registration
* desktop pairing
* mobile pairing
* sync endpoints
* relay skeleton

### Phase 6 — Mobile Companion

* login
* device list
* session list
* agent list
* remote kill/restart
* push/status notifications later

### Phase 7 — Docs and Launch

* Fumadocs site
* install guide
* architecture docs
* security docs
* public landing polish

---

## 27. Final Product Boundary

```txt
Orphix Desktop:
  Runs terminals, agents, dev servers, tasks, previews, and local workflows.

Orphix Web:
  Handles login, account, device pairing, dashboard, sync APIs, and relay.

Orphix Mobile:
  Controls and monitors desktop sessions remotely.

Orphix Docs:
  Explains setup, concepts, architecture, security, and integrations.

VS Code:
  Handles editing.
```

The final architecture is:

```txt
Orphix =
  root Tauri desktop app
  + one main src/ product tree
  + Rust native host in src-tauri/
  + Next.js account/control web app
  + mobile companion app
  + Fumadocs documentation app
```

The golden rule:

> **Orphix owns terminal-agent orchestration. External editors own editing.**
