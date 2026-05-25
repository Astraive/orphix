# Orphix UI/UX Architecture

## 1. Core UX Definition

**Orphix is a canvas-based terminal compositor for AI-agent workflows.**

The desktop app is not an IDE and not a normal tabbed terminal. It is a cinematic, keyboard-first terminal canvas where:

```txt
Vertical axis   = workspaces
Horizontal axis = windows
Window          = cluster of terminals
Terminal        = live execution session
```

A window is not a feature page. A window is not Notes, Git, Search, or Settings. A window is only a **terminal cluster**.

The core product surface is always the terminal canvas.

---

## 2. Product UX Principles

### 2.1 Terminal First

The terminal is always the main object. Every major interaction orbits around terminal sessions, terminal clusters, agents, background jobs, and live execution.

### 2.2 Canvas, Not Tabs

Orphix should feel like a spatial terminal environment, not a normal desktop app with tabs.

The user should feel like they are moving through a large canvas:

```txt
up/down     between workspaces
left/right  between windows
inside      between tiled terminal panes
```

### 2.3 Window Means Terminal Cluster

A window is a group/layout of terminals.

Examples:

```txt
Window: Main
  - shell
  - Claude agent
  - dev server

Window: Agents
  - Claude agent
  - Codex agent
  - Gemini agent

Window: Debug
  - test runner
  - logs
  - shell
```

### 2.4 Tools Do Not Replace the Canvas

Notes, Git Lens, Files, Search, Tasks, Preview, Extensions, Remote, and Settings are tools. They open as sidebars, drawers, overlays, or panels. They do not become windows.

### 2.5 Everything Is Customizable

Any layout, theme, color scheme, icon pack, font pack, animation pack, terminal style, extension, or visual pack can be downloaded, installed, configured, overridden, and customized.

---

## 3. Main Hierarchy

```txt
Orphix
└── Canvas
    └── Workspace
        └── Window
            └── Terminal
```

Expanded:

```txt
Orphix Canvas
├── Workspace 1
│   ├── Window 1: terminal cluster
│   │   ├── Agent terminal
│   │   ├── Normal terminal
│   │   └── Background terminal
│   │
│   ├── Window 2: terminal cluster
│   │   ├── Agent terminal
│   │   └── Agent terminal
│   │
│   └── Workspace tools
│       ├── Notes
│       ├── Git Lens
│       ├── Files
│       ├── Search
│       ├── Tasks
│       ├── Preview
│       └── Extensions
│
└── Workspace 2
    └── ...
```

---

## 4. Canvas Navigation Model

### 4.1 Spatial Axes

```txt
Vertical movement:
  workspace switching

Horizontal movement:
  window switching inside active workspace

Directional movement inside window:
  terminal tile focus
```

### 4.2 Example Map

```txt
                         Windows →

                  Main        Agents       Debug        Deploy
                ┌────────┬───────────┬───────────┬───────────┐
Workspace ↓     │ cluster│ cluster   │ cluster   │ cluster   │  Orphix
                ├────────┼───────────┼───────────┼───────────┤
                │ cluster│ cluster   │ cluster   │ cluster   │  Loxa
                ├────────┼───────────┼───────────┼───────────┤
                │ cluster│ cluster   │ cluster   │ cluster   │  CTF
                └────────┴───────────┴───────────┴───────────┘
```

### 4.3 Keyboard Navigation

Recommended base shortcuts:

```txt
Alt/Super + Up       previous workspace
Alt/Super + Down     next workspace
Alt/Super + Left     previous window
Alt/Super + Right    next window
Alt/Super + H        focus terminal left
Alt/Super + J        focus terminal down
Alt/Super + K        focus terminal up
Alt/Super + L        focus terminal right
Alt/Super + Enter    new terminal
Shift+Alt+Enter      new terminal with profile picker
Shift+Alt+A          new agent terminal
Shift+Alt+B          new background terminal
Alt/Super + O        overview mode
Alt/Super + F        fuzzy finder
Alt/Super + Q        close focused terminal/window depending context
Alt/Super + =        grow focused terminal
Alt/Super + -        shrink focused terminal
```

All shortcuts must be configurable.

---

## 5. Desktop Shell Layout

### 5.1 Main Layout

```txt
┌────────────────────────────────────────────────────────────────────┐
│ Floating top bar / command area                         Tool icons │
│ Workspace: Orphix     Window: Agents        Sync: Live    📝 ⎇ 🔍 ⚙ │
├───────┬────────────────────────────────────────────────────────────┤
│ Ext   │                                                            │
│ Side  │                Cinematic Terminal Canvas                   │
│ Bar   │                                                            │
│       │   Workspace row                                            │
│       │     Window cluster strip                                   │
│       │       Hyprland-style tiled terminal cluster                 │
│       │                                                            │
├───────┴────────────────────────────────────────────────────────────┤
│ Floating status hint / workspace indicator / command hints          │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 Extensions Sidebar

The extensions sidebar is on the **left by default**.

It is the main vertical home for installed extensions and extension-provided panels/actions.

It can contain:

```txt
installed extensions
extension actions
agent provider extensions
custom panels
workspace tools contributed by extensions
extension status badges
marketplace shortcut
```

Default behavior:

```txt
Position: left
Mode: compact icon rail
Can be expanded: yes
Can be moved: configurable later
Can be hidden: yes
Can be themed: yes
Can be extended by extensions: yes
```

### 5.3 Top-Right Tool Icons

Built-in workspace tools are triggered from top-right icons.

Default tools:

```txt
Notes
Git Lens
Files
Search
Tasks
Preview
Remote
Settings
Theme/Customize
```

These icons open tools as overlays, sidebars, drawers, or floating panels. They do not create or replace windows.

---

## 6. Workspaces

A workspace is a vertical canvas layer.

A workspace owns:

```txt
windows
terminals
workspace notes
git state
workspace tasks
project roots
workspace tool state
workspace layout overrides
workspace theme overrides
enabled extensions
remote/live session settings
```

### 6.1 Workspace Examples

```txt
Orphix
Loxa
Nextral
CTF
College
Personal Scripts
```

### 6.2 Workspace State

```ts
type Workspace = {
  id: string;
  name: string;
  icon?: string;
  windows: OrphixWindow[];
  activeWindowIndex: number;
  notes: WorkspaceNotes;
  tools: WorkspaceToolState;
  themeOverride?: ThemeRef;
  enabledExtensions: string[];
  createdAt: string;
  updatedAt: string;
};
```

---

## 7. Windows

A window is a **cluster of terminals**.

A window is not:

```txt
Notes
Git
Search
Files
Settings
Preview
Docs
```

Those are tools.

### 7.1 Window Definition

```txt
Window = named terminal cluster + layout tree + focused terminal
```

A window owns:

```txt
terminal layout
terminal IDs
focused terminal
cluster title
cluster icon
cluster size/camera metadata
window-level appearance override optional
```

### 7.2 Window Examples

```txt
Main
Agents
Backend
Frontend
Debug
Deploy
Scratch
Background
```

Each window contains terminals only.

### 7.3 Window Model

```ts
type OrphixWindow = {
  id: string;
  workspaceId: string;
  name: string;
  icon?: string;
  terminals: TerminalSessionRef[];
  activeTerminalId?: string;
  layout: TerminalLayoutNode;
  appearanceOverride?: WindowAppearanceOverride;
  createdAt: string;
  updatedAt: string;
};
```

---

## 8. Hyprland-Style Terminal Clusters

Inside a window, terminals are displayed as a tiling cluster.

This is the Hyprland-inspired layer.

### 8.1 What It Means

Hyprland-style in Orphix means:

```txt
keyboard-first directional focus
animated tile transitions
focus borders
gaps between terminal tiles
rounded terminal cards
split layouts
resize with keyboard
floating overlays for tools
smooth workspace/window movement
active tile glow
background tile dimming
```

### 8.2 What It Does Not Mean

It does not mean Orphix becomes a Linux window manager.

Orphix borrows the feel:

```txt
spatial movement
tiling clusters
animated focus
fast keyboard control
compositor-like canvas
```

But it remains a desktop terminal app.

### 8.3 Layout Tree

```ts
type TerminalLayoutNode =
  | {
      type: 'terminal';
      terminalId: string;
    }
  | {
      type: 'split';
      direction: 'horizontal' | 'vertical';
      ratio: number;
      children: TerminalLayoutNode[];
    }
  | {
      type: 'stack';
      activeTerminalId: string;
      children: TerminalLayoutNode[];
    };
```

### 8.4 Example Layouts

Two-column agents:

```txt
┌──────────────────────────────┬───────────────────────────────┐
│ Claude Code                  │ Codex                         │
│ agent terminal               │ agent terminal                │
└──────────────────────────────┴───────────────────────────────┘
```

Agent + logs:

```txt
┌──────────────────────────────────────────────────────────────┐
│ Claude Code                                                  │
├──────────────────────────────┬───────────────────────────────┤
│ pnpm dev                     │ test watcher                  │
└──────────────────────────────┴───────────────────────────────┘
```

Main cluster:

```txt
┌──────────────────────────────┬───────────────────────────────┐
│ Shell                        │ Claude Code                   │
├──────────────┬───────────────┤                               │
│ Git shell    │ Dev server    │                               │
└──────────────┴───────────────┴───────────────────────────────┘
```

---

## 9. Terminals

Terminals are live execution sessions.

### 9.1 Terminal Types

Orphix has three primary terminal types:

```txt
1. Agent terminal
2. Normal terminal
3. Background terminal
```

### 9.2 Agent Terminal

Used for:

```txt
Claude Code
Codex CLI
Gemini CLI
Aider
custom agent command
```

Agent terminal shows:

```txt
agent provider
linked task
status
needs input badge
changed files count
remote attached clients
last activity
```

### 9.3 Normal Terminal

Used for normal shell work.

Shows:

```txt
shell profile
cwd
git branch
dirty state
exit status
```

### 9.4 Background Terminal

Used for long-running processes.

Examples:

```txt
pnpm dev
test watcher
file watcher
build watcher
local server
indexer logs
```

Background terminal behavior:

```txt
dimmed by default
can be visible in cluster
can be minimized into mini-tile
alerts only on failure / important output
remote readonly by default
```

### 9.5 Terminal Model

```ts
type TerminalSession = {
  id: string;
  workspaceId: string;
  windowId: string;
  type: 'agent' | 'normal' | 'background';
  title: string;
  cwd: string;
  shell?: string;
  status: 'starting' | 'running' | 'exited' | 'failed' | 'killed';
  agent?: AgentTerminalMetadata;
  background?: BackgroundTerminalMetadata;
  appearance?: TerminalAppearanceOverride;
  createdAt: string;
  lastActivityAt: string;
};
```

---

## 10. Canvas Behavior

### 10.1 Vertical Workspace Movement

Workspaces are stacked vertically.

Switching workspace moves the camera vertically.

```txt
transform: translateY(-activeWorkspaceIndex * screenHeight)
```

### 10.2 Horizontal Window Movement

Windows are arranged horizontally inside each workspace.

Switching window moves the camera horizontally.

```txt
transform: translateX(-activeWindowOffset)
```

### 10.3 Window Cluster Focus

The active window cluster is centered or magnetically framed.

Inactive windows remain visible enough to provide spatial context.

### 10.4 Overview Mode

Overview mode scales the whole canvas.

It should show:

```txt
multiple workspaces
multiple window clusters
active workspace highlight
active window highlight
live terminal thumbnails later
```

### 10.5 Fuzzy Finder

The fuzzy finder is a global jump system.

Searches:

```txt
workspaces
windows
terminals
agents
tasks
background jobs
extensions
commands
tools
```

Actions:

```txt
jump to terminal
jump to window
jump to workspace
open tool
run command
start agent
open extension action
```

---

## 11. Workspace Tools

Workspace tools are opened through top-right icons.

They do not become windows.

### 11.1 Notes

Notes are workspace-driven raw notes.

```txt
One notes area per workspace.
Fast raw notepad.
Autosaved.
No heavy editor.
No IDE behavior.
```

Notes can be used for:

```txt
scratch commands
deployment steps
agent prompts
TODOs
bugs
random notes
manual checklist
```

Possible future features:

```txt
markdown toggle
command snippets
attach note selection to agent
search notes
sync notes
```

### 11.2 Git Lens

Git Lens opens as a sidebar.

It shows workspace/repo git intelligence:

```txt
current branch
changed files
staged/unstaged state
recent commits
agent-changed files
dirty state
diff summary
commit actions later
open changed file in VS Code
attach diff to agent
```

Git Lens is not a window. It is triggered by the Git icon and docks as a sidebar.

### 11.3 Files

Files opens as a context picker/sidebar.

It supports:

```txt
file tree
Catppuccin/file icons from active icon pack
copy path
open in VS Code
attach to agent context
show recent files
show changed files
```

### 11.4 Search

Search opens as a spotlight overlay or drawer.

It supports:

```txt
ripgrep search
filename search
terminal/session search
agent/task search
command search
```

### 11.5 Tasks

Tasks opens as a workspace task drawer.

It supports:

```txt
workspace tasks
agent-linked tasks
running tasks
blocked tasks
needs review
completed
```

### 11.6 Preview

Preview opens as a floating/docked panel.

It supports:

```txt
local dev server preview
port picker
logs linkage
restart server
open externally
```

### 11.7 Remote

Remote opens connected device/session management.

It shows:

```txt
mobile clients
web dashboard clients
attached remote viewers
remote write permissions
live relay status
```

### 11.8 Settings and Customization

Settings opens customization and app preferences.

The customization system must be first-class, not hidden.

---

## 12. Top-Right Icon Dock

Default top-right icons:

```txt
📝 Notes
⎇ Git Lens
📁 Files
🔍 Search
☑ Tasks
◱ Preview
📱 Remote
🎨 Customize
⚙ Settings
```

Rules:

```txt
Icons are configurable.
Order is configurable.
Visibility is configurable.
Extensions can add icons.
Themes can style icons.
Icon packs can replace icons.
```

Tool open modes:

```txt
right sidebar
left sidebar
bottom drawer
floating panel
spotlight modal
fullscreen overlay
```

Each tool can define its preferred open mode, but users can override it.

---

## 13. Extensions Sidebar

The extensions sidebar is on the **left by default**.

It is not the workspace switcher. It is a dedicated extension rail.

### 13.1 Purpose

The extensions sidebar gives installed extensions a visible, composable place in the desktop shell.

It can contain:

```txt
extension icons
extension panels
agent providers
custom commands
status badges
marketplace entry
extension updates
extension-specific notifications
```

### 13.2 Behavior

```txt
compact icon rail by default
expandable on hover/shortcut
can pin extension panels
can hide unused extensions
can reorder icons
can disable per workspace
can be themed
can be moved later if user wants
```

### 13.3 Extension Panel Model

Extensions can contribute:

```txt
sidebar icons
command palette actions
top-right tool icons
terminal context actions
workspace context actions
agent providers
theme packs
icon packs
layout packs
status bar items
```

---

## 14. Customization System

Everything visual and layout-related can be downloaded, configured, or custom-set.

Customizable areas:

```txt
layouts
themes
color schemes
icon packs
font packs
terminal themes
window cluster styles
animation packs
blur/transparency settings
panel styles
shortcut maps
extension sidebars
top-right tool dock
workspace indicators
terminal tile chrome
status bars
```

### 14.1 Package Types

```txt
extension
theme
color-scheme
icon-pack
layout-pack
font-pack
terminal-theme
animation-pack
workspace-template
agent-preset
```

### 14.2 Theme vs Color Scheme vs Icon Pack

```txt
Theme:
  complete appearance bundle.
  Can include color scheme, icons, terminal theme, panel styles, animations.

Color scheme:
  design tokens / CSS variable config only.

Icon pack:
  file icons, terminal icons, agent icons, status icons, tool icons.

Layout pack:
  workspace/window/terminal cluster layout presets.

Extension:
  behavior or feature package.
```

### 14.3 User Override Priority

User custom settings always win.

Priority order:

```txt
1. User explicit override
2. Workspace override
3. Active layout/theme pack
4. Active color/icon/font pack
5. Global default settings
6. Orphix built-in defaults
```

---

## 15. Default Theme and Palette

Default palette:

```txt
#040D12
#183D3D
#5C8374
#93B1A6
```

Suggested mapping:

```txt
#040D12  canvas background / terminal base
#183D3D  panel background / inactive surfaces
#5C8374  muted borders / secondary accents / dim text
#93B1A6  active accent / focus ring / selected workspace/window
```

### 15.1 Default CSS Tokens

```css
:root {
  --ox-bg: #040D12;
  --ox-surface: #183D3D;
  --ox-muted: #5C8374;
  --ox-accent: #93B1A6;

  --ox-text: #EAF4EF;
  --ox-text-dim: #93B1A6;
  --ox-border: rgba(147, 177, 166, 0.18);
  --ox-border-active: #93B1A6;

  --ox-terminal-bg: #040D12;
  --ox-terminal-fg: #EAF4EF;
  --ox-terminal-cursor: #93B1A6;

  --ox-window-bg: rgba(24, 61, 61, 0.62);
  --ox-window-border: rgba(147, 177, 166, 0.18);
  --ox-window-border-active: rgba(147, 177, 166, 0.92);

  --ox-tile-gap: 12px;
  --ox-tile-radius: 18px;
  --ox-panel-radius: 20px;
  --ox-blur: 32px;
}
```

---

## 16. Downloadable Package Formats

### 16.1 Theme Package

```txt
orphix-theme-example/
├── theme.json
├── color-scheme.json
├── terminal-theme.json
├── icons.json optional
├── layout.json optional
├── animations.json optional
├── preview.png
└── README.md
```

`theme.json`:

```json
{
  "type": "theme",
  "id": "example.deep-terminal",
  "name": "Deep Terminal",
  "version": "1.0.0",
  "author": "author-name",
  "description": "Dark terminal-first theme for Orphix.",
  "colorScheme": "./color-scheme.json",
  "terminalTheme": "./terminal-theme.json",
  "iconPack": "./icons.json",
  "layoutPack": "./layout.json",
  "preview": "./preview.png"
}
```

### 16.2 Color Scheme Package

Prefer JSON tokens over raw arbitrary CSS for safety.

```json
{
  "type": "color-scheme",
  "id": "orphix.default.deep",
  "name": "Orphix Deep",
  "tokens": {
    "bg": "#040D12",
    "surface": "#183D3D",
    "muted": "#5C8374",
    "accent": "#93B1A6",
    "text": "#EAF4EF",
    "textDim": "#93B1A6",
    "border": "rgba(147, 177, 166, 0.18)",
    "terminalBg": "#040D12",
    "terminalFg": "#EAF4EF"
  }
}
```

Orphix validates the config and generates CSS variables internally.

### 16.3 Icon Pack Package

```txt
orphix-iconpack-example/
├── icon-pack.json
├── icons/
│   ├── files/
│   ├── folders/
│   ├── agents/
│   ├── terminals/
│   ├── tools/
│   └── status/
└── preview.png
```

`icon-pack.json`:

```json
{
  "type": "icon-pack",
  "id": "example.icons",
  "name": "Example Icons",
  "version": "1.0.0",
  "icons": {
    "tool.notes": "icons/tools/notes.svg",
    "tool.git": "icons/tools/git.svg",
    "terminal.agent": "icons/terminals/agent.svg",
    "terminal.normal": "icons/terminals/normal.svg",
    "terminal.background": "icons/terminals/background.svg"
  }
}
```

### 16.4 Layout Pack

A layout pack can define default workspace/window/terminal cluster structures.

```json
{
  "type": "layout-pack",
  "id": "example.agent-workspace",
  "name": "Agent Workspace",
  "windows": [
    {
      "name": "Agents",
      "layout": {
        "type": "split",
        "direction": "horizontal",
        "ratio": 0.5,
        "children": [
          { "type": "terminal-slot", "kind": "agent" },
          { "type": "terminal-slot", "kind": "agent" }
        ]
      }
    }
  ]
}
```

---

## 17. Settings Architecture

Settings should be split by scope.

```txt
Global settings
Workspace settings
Window settings
Terminal settings
Extension settings
Theme/customization settings
Remote/mobile settings
```

### 17.1 Global Settings

```txt
default theme
default color scheme
default icon pack
default font
default shortcuts
default terminal profile
default extension sidebar behavior
default top-right tool dock behavior
```

### 17.2 Workspace Settings

```txt
workspace theme override
workspace icon
workspace notes
workspace enabled extensions
workspace default terminal profile
workspace default layout pack
workspace remote access rules
```

### 17.3 Window Settings

```txt
window name
window icon
window layout tree
window gap size
window tile radius
window default terminal type
window visual override
```

### 17.4 Terminal Settings

```txt
terminal title
terminal type
terminal shell profile
terminal cwd
terminal theme override
terminal remote input policy
terminal output buffer size
```

---

## 18. UI Component Architecture

```txt
src/
├── app/
│   ├── App.tsx
│   ├── providers.tsx
│   ├── shell.tsx
│   └── command-registry.ts
│
├── canvas/
│   ├── CanvasContainer.tsx
│   ├── WorkspaceRow.tsx
│   ├── WindowStrip.tsx
│   ├── WindowCluster.tsx
│   ├── WorkspaceIndicators.tsx
│   ├── WindowIndicators.tsx
│   ├── OverviewMode.tsx
│   └── canvas-store.ts
│
├── terminal/
│   ├── main/
│   ├── shared/
│   └── renderer/
│       ├── components/
│       │   ├── TerminalTile.tsx
│       │   ├── TerminalViewport.tsx
│       │   ├── TerminalChrome.tsx
│       │   ├── TerminalStatusBar.tsx
│       │   └── TerminalPickerModal.tsx
│       │
│       ├── layout/
│       │   ├── TerminalLayoutRenderer.tsx
│       │   ├── split-layout.ts
│       │   ├── focus-direction.ts
│       │   └── resize-layout.ts
│       │
│       ├── context/
│       ├── hooks/
│       ├── stores/
│       └── xterm/
│
├── tools/
│   ├── notes/
│   ├── git-lens/
│   ├── files/
│   ├── search/
│   ├── tasks/
│   ├── preview/
│   ├── remote/
│   └── customize/
│
├── extensions/
│   ├── sidebar/
│   ├── marketplace/
│   ├── runtime/
│   └── permissions/
│
├── customization/
│   ├── themes/
│   ├── color-schemes/
│   ├── icon-packs/
│   ├── layout-packs/
│   ├── fonts/
│   └── settings/
│
└── components/
```

---

## 19. State Model

### 19.1 Canvas State

```ts
type CanvasState = {
  workspaces: Workspace[];
  activeWorkspaceIndex: number;
  isOverview: boolean;
  activeTool: WorkspaceTool | null;
  controlsVisible: boolean;
  theme: ResolvedTheme;
};
```

### 19.2 Workspace State

```ts
type Workspace = {
  id: string;
  name: string;
  windows: OrphixWindow[];
  activeWindowIndex: number;
  notes: WorkspaceNotes;
  toolsState: WorkspaceToolsState;
  customization: WorkspaceCustomization;
};
```

### 19.3 Window State

```ts
type OrphixWindow = {
  id: string;
  name: string;
  terminals: TerminalSession[];
  activeTerminalId?: string;
  layout: TerminalLayoutNode;
};
```

### 19.4 Tool State

```ts
type WorkspaceToolState = {
  notesOpen: boolean;
  gitLensOpen: boolean;
  filesOpen: boolean;
  searchOpen: boolean;
  tasksOpen: boolean;
  previewOpen: boolean;
  remoteOpen: boolean;
  customizeOpen: boolean;
};
```

---

## 20. Visual Style

### 20.1 Base Style

Orphix should feel:

```txt
cinematic
minimal
terminal-native
soft-glass
spatial
fast
keyboard-first
compositor-like
```

### 20.2 Window Cluster Chrome

Window clusters should have:

```txt
large rounded card
subtle blur/saturation
active border
soft shadow/glow
window title
terminal count
status badges
```

### 20.3 Terminal Tile Chrome

Terminal tiles should have:

```txt
thin border
focused accent ring
small titlebar
terminal type badge
agent/background status
subtle traffic-light controls optional
minimal visual noise
```

### 20.4 Motion

Motion should be:

```txt
smooth but not slow
spatially meaningful
keyboard responsive
interruptible
configurable
reducible for accessibility
```

Default transitions:

```txt
workspace switch: cinematic slide
window switch: horizontal camera pan
terminal focus: quick border/focus animation
overview: scale canvas
tool open: drawer/overlay slide
```

---

## 21. Extension System UX

Extensions are first-class.

### 21.1 Extension Types

```txt
agent provider extension
terminal action extension
workspace tool extension
top-right tool extension
sidebar extension
status item extension
theme extension
icon pack extension
layout pack extension
preview provider extension
git/action extension
```

### 21.2 Extension Entry Points

Extensions can contribute to:

```txt
left extension sidebar
top-right tool dock
command palette
terminal context menu
workspace context actions
status bar
agent provider list
custom panels
custom themes/icon packs/layout packs
```

### 21.3 Extension Permissions

```json
{
  "permissions": [
    "terminal:read",
    "terminal:write",
    "workspace:read",
    "workspace:write",
    "files:read",
    "network:access",
    "theme:install",
    "layout:install"
  ]
}
```

Extensions must request permissions. Dangerous permissions must be clearly shown.

---

## 22. MVP UI Scope

### 22.1 Must Have

```txt
cinematic canvas shell
vertical workspaces
horizontal windows
window = terminal cluster
Hyprland-style terminal tiling inside window
agent / normal / background terminal types
top-right tool icons
workspace notes raw notepad
Git Lens sidebar
left extensions sidebar
fuzzy finder
overview mode
default theme palette
basic theme/color/icon config
```

### 22.2 Should Have

```txt
downloadable color schemes
downloadable icon packs
downloadable themes
custom layout presets
workspace theme overrides
extension marketplace skeleton
remote clients panel
preview panel
```

### 22.3 Later

```txt
animation packs
font packs
community marketplace
layout sharing
theme editor
icon pack editor
extension sandbox UI
cloud-synced customizations
AI-generated layout suggestions
```

---

## 23. Final UX Summary

Orphix desktop is a canvas-based terminal compositor.

```txt
Workspace:
  vertical world/context.

Window:
  horizontal terminal cluster.

Terminal:
  live execution tile inside a Hyprland-like layout.

Top-right icons:
  open tools like Notes, Git Lens, Files, Search, Tasks, Preview, Remote, Customize.

Notes:
  workspace-driven raw notepad.

Git:
  Git Lens sidebar.

Extensions:
  left sidebar by default, with installable extension panels/actions.

Customization:
  everything can be downloaded, configured, overridden, or custom-set.
```

The golden rule:

> **The terminal canvas never stops being the center. Tools orbit it. Windows are only clusters of terminals.**
