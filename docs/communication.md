# Orphix Communication Architecture

## 1. Purpose

This document defines how communication works across Orphix:

```txt
src/            Main desktop UI
src-tauri/      Native desktop core and source of truth
apps/web        Next.js web app: login, dashboard, sync API, live relay
apps/mobile     Mobile companion app
internal        Local sidecars/services connected through gRPC
```

The core requirement is simple:

> Orphix must be live-session based, not request-snapshot based.

If an AI agent is running inside a terminal on the desktop, the user should be able to open the mobile app or web dashboard, attach to that same live session, see recent output, watch new output stream in real time, and send new input into the same running terminal session.

---

## 2. Communication Summary

```txt
Local Desktop UI:
  src/ ⇄ src-tauri/
  Protocol: Tauri commands + Tauri events/channels

Remote Live Control:
  apps/mobile ⇄ apps/web ⇄ src-tauri/
  Protocol: WebSocket live relay

Web Dashboard Live Control:
  browser UI ⇄ apps/web ⇄ src-tauri/
  Protocol: WebSocket live relay

Normal Account/Data APIs:
  apps/mobile ⇄ apps/web
  browser UI ⇄ apps/web
  Protocol: HTTPS / Next.js API routes / server actions

Internal Desktop Services:
  src-tauri/ ⇄ local sidecars/services
  Protocol: gRPC
```

The final model:

```txt
src-tauri/ is the live session source of truth.
apps/web is the authenticated relay and account layer.
src/ is the local renderer.
apps/mobile and web dashboard are remote live clients.
gRPC is for internal desktop services, not the main UI bridge.
```

---

## 3. Core Principle

### 3.1 Desktop Owns Execution

All real execution happens on the user’s desktop.

```txt
PTY sessions
AI agent processes
shells
dev servers
test runners
file watchers
resource tracking
sleep locks
project detection
```

These are owned by `src-tauri/`, not by `src/`, `apps/web`, or `apps/mobile`.

### 3.2 UI Renders, Core Executes

```txt
src/
  renders terminals, tasks, panels, previews, and state

src-tauri/
  owns processes, sessions, PTYs, lifecycle, output buffers, and native state
```

### 3.3 Remote Clients Attach to Live Sessions

Remote clients do not ask for static snapshots only. They attach to running sessions.

```txt
mobile opens
  ↓
connects to apps/web relay
  ↓
sees desktop online
  ↓
subscribes to live session list
  ↓
attaches to Claude Code terminal
  ↓
receives recent output buffer + live stream
  ↓
sends new input to same PTY
```

---

## 4. High-Level Architecture

```txt
┌─────────────────────────────────────────────────────────────┐
│                         Desktop App                         │
│                                                             │
│  ┌───────────────────────┐      Tauri IPC      ┌─────────┐ │
│  │ src/ React UI          │ ⇄ commands/events ⇄ │ src-    │ │
│  │ - xterm.js renderer    │                     │ tauri/  │ │
│  │ - terminal panes       │                     │ Rust    │ │
│  │ - task/agent UI        │                     │ Core    │ │
│  │ - local renderer       │                     │         │ │
│  └───────────────────────┘                     └────┬────┘ │
│                                                       │      │
│                                                       │ gRPC │
│                                                       │      │
│  ┌────────────────────────────────────────────────────▼────┐ │
│  │ Optional internal sidecars/services                      │ │
│  │ - agent runner                                           │ │
│  │ - indexer                                                │ │
│  │ - MCP host                                               │ │
│  │ - preview proxy                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ▲
                         │ persistent WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ apps/web                                                     │
│ - login/account                                              │
│ - device pairing                                             │
│ - sync APIs                                                  │
│ - live relay                                                 │
│ - dashboard                                                  │
└───────────────▲───────────────────────────▲─────────────────┘
                │                           │
                │ WebSocket/HTTPS           │ WebSocket/HTTPS
                ▼                           ▼
       ┌────────────────┐          ┌─────────────────────┐
       │ apps/mobile     │          │ web dashboard        │
       │ remote control  │          │ remote control       │
       └────────────────┘          └─────────────────────┘
```

---

## 5. Protocol Responsibilities

## 5.1 Tauri IPC: `src/` ⇄ `src-tauri/`

Use Tauri IPC for local desktop UI communication.

### Used For

```txt
terminal_create
terminal_write
terminal_resize
terminal_kill
terminal_attach
terminal_detach
agent_start
agent_stop
task_create
task_update
project_detect
preview_start
vscode_open_file
system_acquire_sleep_lock
```

### Why Tauri IPC Here

Because `src/` is inside the Tauri webview and `src-tauri/` is the native host. Tauri commands/events are the native communication layer for this boundary.

Do not use gRPC between `src/` and `src-tauri/`.

Reasons:

* no local port needed
* no localhost server exposure
* no firewall prompts
* no grpc-web complexity
* simpler permissions
* tighter Tauri security model
* better app lifecycle integration

### Local Terminal Flow

```txt
User types in xterm.js
  ↓
src/terminal/renderer calls terminal_write
  ↓
Tauri invoke sends payload to src-tauri/
  ↓
Rust TerminalManager writes bytes to PTY
  ↓
PTY outputs bytes
  ↓
Rust emits terminal.output event
  ↓
src/terminal/renderer writes bytes into xterm.js
```

---

## 5.2 WebSocket Relay: Remote Live Control

Use WebSocket for live remote session control.

```txt
apps/mobile ⇄ apps/web ⇄ src-tauri/
web dashboard ⇄ apps/web ⇄ src-tauri/
```

### Used For

```txt
live session list
terminal attach/detach
terminal output streaming
remote terminal input
agent status updates
task updates
preview status
presence
heartbeats
command results
reconnect/resume
```

### Why WebSocket Here

Remote Orphix control must be live and bidirectional.

WebSocket gives:

* live terminal output
* live agent state
* mobile input into same session
* dashboard input into same session
* presence
* heartbeats
* reconnect support
* simple browser/mobile support
* works behind NAT through outbound desktop connection

### Why Not Request-Based APIs

Request APIs are poor for:

* terminal streams
* agents waiting for input
* multi-client viewing
* reconnect/resume
* low-latency command feedback
* live status updates

Normal APIs can still be used for login, account, and non-live data. Live terminal/agent control should use WebSocket.

---

## 5.3 HTTPS APIs: Account, Auth, Sync Metadata

Use normal HTTPS APIs for non-live operations.

### Used For

```txt
login
register
logout
refresh session
device pairing
account settings
billing later
fetch dashboard data
list devices
list synced projects
list historical tasks
```

These are owned by `apps/web` through Next.js API routes, server actions, or route handlers.

---

## 5.4 gRPC: Internal Desktop Services

Use gRPC for internal desktop services and sidecars.

```txt
src-tauri/ ⇄ local sidecars/services
```

### Used For

```txt
agent runner sidecar
indexer sidecar
MCP host sidecar
preview proxy sidecar
local automation daemon
large background workers
language/runtime-specific helpers
```

### Why gRPC Internally

gRPC is excellent when both sides are controlled by Orphix and run as local services.

Benefits:

* strong typed contracts
* streaming support
* clean service boundaries
* multi-language support
* good Rust/Go/Node/Python support
* works well for sidecars
* good for long-running internal background services

### Why Not gRPC Everywhere

Do not use gRPC as the main UI bridge or first remote relay protocol.

```txt
src ⇄ src-tauri:
  Use Tauri IPC.

mobile/web ⇄ apps/web:
  Use HTTPS + WebSocket.

src-tauri ⇄ sidecars:
  Use gRPC.
```

---

## 6. Live Session Model

A live session is a running execution surface on the desktop.

Examples:

```txt
shell terminal
Claude Code terminal
Codex terminal
Gemini terminal
pnpm dev server
pytest runner
cargo test runner
custom script
```

### 6.1 TerminalSession

```ts
type TerminalSession = {
  id: string;
  kind: 'shell' | 'agent' | 'dev-server' | 'test-runner' | 'script' | 'task';
  projectId?: string;
  taskId?: string;
  agentRunId?: string;
  title: string;
  cwd: string;
  shell: string;
  status: 'starting' | 'running' | 'exited' | 'failed' | 'killed';
  visibility: 'attached' | 'detached' | 'background' | 'archived';
  inputPolicy: TerminalInputPolicy;
  createdAt: string;
  lastActivityAt: string;
};
```

### 6.2 TerminalInputPolicy

Remote input must be controlled.

```ts
type TerminalInputPolicy =
  | 'local_only'
  | 'remote_readonly'
  | 'remote_confirm_required'
  | 'remote_write_allowed';
```

Recommended defaults:

```txt
Agent terminal:
  remote_write_allowed after trusted device pairing

Normal shell terminal:
  remote_confirm_required by default

Dev server terminal:
  remote_readonly by default

Sensitive/admin terminal:
  local_only
```

---

## 7. Attach/Detach Model

A terminal session can exist without any UI watching it.

```txt
Session running:
  PTY exists in src-tauri/
  output is buffered locally
  local UI may attach
  mobile may attach
  web dashboard may attach
```

### 7.1 Attach Flow

```txt
Client sends session.attach
  ↓
src-tauri validates permission
  ↓
src-tauri sends snapshot
  ↓
src-tauri sends recent output buffer
  ↓
src-tauri starts live output stream
```

Attach response:

```ts
type SessionAttachSnapshot = {
  session: TerminalSession;
  fromSeq: number;
  latestSeq: number;
  recentChunks: TerminalOutputChunk[];
};
```

### 7.2 Detach Flow

```txt
Client sends session.detach
  ↓
output stream to that client stops
  ↓
PTY keeps running
  ↓
output continues buffering in src-tauri/
```

### 7.3 Multiple Clients

A session may have multiple clients attached:

```txt
local desktop pane
mobile app
web dashboard
```

All can watch. Input rules decide who can write.

---

## 8. Terminal Output Streaming

### 8.1 Output Chunk

Every output chunk should have a sequence number.

```ts
type TerminalOutputChunk = {
  sessionId: string;
  seq: number;
  data: string;
  timestamp: string;
};
```

### 8.2 Why Sequence Numbers Matter

Sequence numbers allow:

* reconnect resume
* missed chunk recovery
* ordered delivery
* deduplication
* ring-buffer range requests
* attach from last seen state

### 8.3 Output Ring Buffer

Each session should keep a local ring buffer in `src-tauri/`.

Recommended default:

```txt
5 MB per active terminal
or 5,000 lines
or 30 minutes
configurable per user/project
```

The web relay should not store raw terminal streams by default.

`src-tauri/` owns the authoritative recent output buffer.

---

## 9. Reconnect and Resume

### 9.1 Mobile Reconnect

```txt
mobile disconnects
  ↓
terminal continues running on desktop
  ↓
src-tauri keeps buffering output
  ↓
mobile reconnects
  ↓
mobile sends lastSeenSeq
  ↓
desktop sends missed chunks
  ↓
live stream resumes
```

### 9.2 Resume Request

```ts
type SessionResumeRequest = {
  sessionId: string;
  lastSeenSeq: number;
};
```

### 9.3 Resume Response

```ts
type SessionResumeResponse = {
  sessionId: string;
  fromSeq: number;
  latestSeq: number;
  chunks: TerminalOutputChunk[];
  truncated: boolean;
};
```

If `truncated` is true, the client missed chunks older than the ring buffer. It should show:

```txt
Some earlier output is no longer available.
```

---

## 10. Remote Input Flow

Remote input means mobile/web can send text into the same running PTY.

### 10.1 Input Message

```ts
type TerminalInputMessage = {
  sessionId: string;
  data: string;
  inputId: string;
  issuedByDeviceId: string;
  issuedByUserId: string;
  timestamp: string;
};
```

### 10.2 Flow

```txt
Mobile user sends message
  ↓
apps/mobile sends terminal.input over WebSocket
  ↓
apps/web validates auth and device permission
  ↓
apps/web relays input to desktop
  ↓
src-tauri validates input policy
  ↓
TerminalManager writes bytes to PTY
  ↓
PTY receives input
  ↓
Agent responds normally in same terminal
```

### 10.3 Chat-Like Agent Input

For terminal agents, mobile can show a chat-like box.

Internally it still writes to PTY:

```txt
User types: "continue and add tests"
  ↓
Orphix appends newline if needed
  ↓
TerminalManager.write(sessionId, "continue and add tests\n")
```

This gives the user a chat-like experience without needing a separate agent API.

---

## 11. Web Relay Design

`apps/web` owns relay authentication, routing, and presence.

### 11.1 Relay Responsibilities

```txt
authenticate desktop devices
authenticate mobile/web clients
track online devices
track attached clients
route commands to correct desktop
route output/status to subscribed clients
store command audit logs
handle reconnect metadata
avoid storing raw terminal output by default
```

### 11.2 Relay Does Not Own Execution

The relay should not execute commands locally.

```txt
apps/web does not spawn terminals.
apps/web does not run agents.
apps/web does not own PTYs.
apps/web does not inspect source code by default.
```

It routes authorized messages.

### 11.3 Relay Message Envelope

All relay messages should use a common envelope.

```ts
type RelayEnvelope<T> = {
  id: string;
  type: string;
  version: 1;
  deviceId?: string;
  sessionId?: string;
  timestamp: string;
  payload: T;
};
```

Examples:

```txt
session.list
session.attach
session.detach
session.snapshot
terminal.output
terminal.input
agent.status
task.updated
command.result
heartbeat
```

---

## 12. Desktop Relay Client

The desktop app runs a relay client inside `src-tauri/`.

```txt
src-tauri/sync/relay.rs
```

### Responsibilities

```txt
connect outbound to apps/web
maintain authenticated WebSocket
send heartbeat
publish session presence
receive remote commands
validate command targets
call TerminalManager / AgentManager / TaskManager
send command results
send live output to subscribed remote clients
```

### Desktop Relay Connection Flow

```txt
Desktop starts
  ↓
loads auth/device token
  ↓
connects to apps/web relay
  ↓
sends device.online
  ↓
sends session inventory
  ↓
starts heartbeat
  ↓
receives subscriptions and commands
```

---

## 13. Local UI Fanout

When native state changes, `src-tauri/` emits events to local `src/`.

Example:

```txt
Remote mobile sends input
  ↓
src-tauri writes to PTY
  ↓
PTY outputs data
  ↓
src-tauri emits terminal.output locally
  ↓
src/ xterm.js updates
  ↓
src-tauri also streams output to remote subscribers
```

So local UI and remote clients see the same live session.

---

## 14. gRPC Internal Architecture

gRPC is reserved for internal services behind `src-tauri/`.

### 14.1 Internal Service Examples

```txt
orphix-agent-runner
orphix-indexer
orphix-mcp-host
orphix-preview-proxy
orphix-file-watcher
orphix-automation-daemon
```

### 14.2 When to Use a Sidecar

Use a sidecar when the task is:

* long-running
* language/runtime-specific
* crash-isolated
* CPU-heavy
* easier to write outside the main Tauri binary
* needs its own lifecycle
* needs to be updated independently later

### 14.3 gRPC Service Boundaries

```txt
src-tauri/
  ├── owns app state
  ├── calls sidecars over gRPC
  ├── supervises sidecar lifecycle
  └── exposes results to src/ and remote clients

sidecar
  ├── does one focused job
  ├── exposes typed gRPC service
  ├── streams results back
  └── does not talk directly to UI
```

### 14.4 Example gRPC Services

```proto
service AgentRunnerService {
  rpc StartAgent(StartAgentRequest) returns (StartAgentResponse);
  rpc StopAgent(StopAgentRequest) returns (StopAgentResponse);
  rpc StreamAgentEvents(StreamAgentEventsRequest) returns (stream AgentEvent);
}

service IndexerService {
  rpc IndexProject(IndexProjectRequest) returns (stream IndexEvent);
  rpc Search(SearchRequest) returns (stream SearchResult);
}

service McpHostService {
  rpc ListServers(ListServersRequest) returns (ListServersResponse);
  rpc CallTool(CallToolRequest) returns (CallToolResponse);
}
```

### 14.5 gRPC Transport

Prefer local-only transports:

```txt
Unix domain socket on macOS/Linux
Named pipe on Windows
localhost TCP only if necessary
```

Avoid exposing internal gRPC ports publicly.

---

## 15. End-to-End Flows

## 15.1 Local User Opens Agent Terminal

```txt
User opens Orphix desktop
  ↓
src/ requests session list
  ↓
src-tauri returns running sessions
  ↓
user selects Claude Code session
  ↓
src/ sends terminal_attach
  ↓
src-tauri sends snapshot + ring buffer
  ↓
src-tauri streams live terminal.output
  ↓
xterm.js renders session
```

## 15.2 Mobile User Opens Running Claude Code

```txt
Claude Code is running on desktop
  ↓
src-tauri has PTY session active
  ↓
src-tauri sends session presence to apps/web relay
  ↓
mobile opens and connects to relay
  ↓
mobile receives live session list
  ↓
mobile attaches to Claude Code session
  ↓
relay asks desktop for attach
  ↓
desktop sends snapshot + recent output + live stream
  ↓
mobile shows current state
```

## 15.3 Mobile Sends New Instruction to Same Session

```txt
Mobile user types: "continue but add auth tests"
  ↓
mobile sends terminal.input
  ↓
apps/web relay validates permission
  ↓
relay forwards input to desktop
  ↓
src-tauri validates TerminalInputPolicy
  ↓
TerminalManager writes input to PTY
  ↓
Claude Code receives it as normal terminal input
  ↓
new output streams to desktop UI and mobile
```

## 15.4 Web Dashboard Restarts Dev Server

```txt
Web dashboard sends preview.restart
  ↓
apps/web validates user/device/project permission
  ↓
relay forwards command to desktop
  ↓
src-tauri PreviewManager stops old dev-server terminal
  ↓
src-tauri starts new dev-server terminal
  ↓
terminal output streams locally and remotely
  ↓
preview.ready event updates UI/mobile/web
```

## 15.5 Internal gRPC Index Search

```txt
User searches project
  ↓
src/ invokes search_project
  ↓
src-tauri calls IndexerService.Search over gRPC
  ↓
indexer streams search results
  ↓
src-tauri emits search.result events
  ↓
src/ renders results
```

---

## 16. Message Types

### 16.1 Session Messages

```txt
session.list
session.online
session.offline
session.attach
session.detach
session.snapshot
session.resume
session.closed
```

### 16.2 Terminal Messages

```txt
terminal.output
terminal.input
terminal.resize
terminal.clear
terminal.kill
terminal.exited
terminal.error
```

### 16.3 Agent Messages

```txt
agent.started
agent.status
agent.attention
agent.summary
agent.changed_files
agent.finished
agent.failed
agent.cancelled
```

### 16.4 Task Messages

```txt
task.created
task.updated
task.completed
task.blocked
task.deleted
```

### 16.5 Relay Messages

```txt
relay.hello
relay.authenticated
relay.heartbeat
relay.command
relay.command_result
relay.error
relay.reconnect
```

---

## 17. Privacy Rules

### 17.1 Do Not Store Raw Output by Default

The web relay should not persist raw terminal streams unless the user explicitly enables cloud logs.

Default behavior:

```txt
Raw terminal output:
  transient relay only

Recent terminal output:
  stored locally in src-tauri ring buffer

Safe metadata:
  can sync to web/mobile
```

### 17.2 Safe Sync Metadata

Safe by default:

```txt
device online/offline
session title/status
agent status
task status
project display name
last activity timestamp
safe user-written summaries
```

Sensitive by default:

```txt
raw terminal output
source code
.env files
API keys
private keys
full shell history
clipboard
```

---

## 18. Security Rules

### 18.1 Remote Input Requires Permission

Remote write access must be explicit.

```txt
local_only:
  remote clients cannot read/write

remote_readonly:
  remote clients can watch only

remote_confirm_required:
  desktop must approve before write

remote_write_allowed:
  paired trusted devices can write
```

### 18.2 Audit Remote Commands

Every remote command should be auditable.

```ts
type RemoteCommandAudit = {
  commandId: string;
  type: string;
  issuedByUserId: string;
  issuedByDeviceId: string;
  targetDesktopDeviceId: string;
  targetSessionId?: string;
  status: 'accepted' | 'denied' | 'executed' | 'failed';
  createdAt: string;
  completedAt?: string;
};
```

### 18.3 Desktop Final Authority

Even if the relay validates a command, the desktop should validate again.

```txt
apps/web validates cloud permissions.
src-tauri validates local session policy.
```

---

## 19. Recommended Implementation Order

### Phase 1 — Local Live Terminal

```txt
Tauri command: terminal_create
Tauri command: terminal_write
Tauri command: terminal_attach
Tauri event: terminal.output
Tauri event: terminal.state
xterm.js renderer
local ring buffer
```

### Phase 2 — Session Registry

```txt
session IDs
session inventory
session attach/detach
visibility states
sequence numbers
output replay
```

### Phase 3 — Desktop Relay Client

```txt
connect src-tauri to apps/web relay
heartbeat
session presence
remote attach
remote output stream
remote command result
```

### Phase 4 — Mobile/Web Live Attach

```txt
mobile session list
web dashboard session list
attach to running session
view recent output
watch live output
```

### Phase 5 — Remote Input

```txt
input policy
mobile input box
web input box
terminal.input relay
PTY write
remote command audit
```

### Phase 6 — Internal gRPC

```txt
sidecar supervisor
proto definitions
agent runner service
indexer service
MCP host service
streaming events
```

---

## 20. Final Recommendation

Use four communication layers:

```txt
1. Tauri IPC
   src/ ⇄ src-tauri/
   For local UI commands and native events.

2. WebSocket Relay
   apps/mobile/web ⇄ apps/web ⇄ src-tauri/
   For live remote sessions, terminal streams, agent state, and remote input.

3. HTTPS APIs
   apps/mobile/web ⇄ apps/web
   For login, account, device pairing, billing, and non-live data.

4. gRPC
   src-tauri/ ⇄ internal sidecars
   For internal services, background workers, indexing, MCP, and agent helpers.
```

The golden rule:

> `src-tauri/` owns live execution. `src/` renders locally. `apps/web` relays securely. `apps/mobile` controls remotely. gRPC powers internal services only.
