# Orphix

Terminal-first, Electron-powered desktop command center for AI coding agents.

- **Desktop app**: Electron + React + TypeScript
- **Terminal UI**: xterm.js + WebGL
- **Terminal core**: Rust binary (`orphix-core`) with stdio JSON transport

## Development

```bash
# Install dependencies
bun install

# Build Rust core
bun run build:core

# Run Electron dev mode
bun run dev
```

## Architecture

```
apps/desktop/       Electron app (main + preload + renderer)
crates/orphix-core/ Rust binary — PTY sessions, stdio JSON transport
```

See `docs/` for full architecture, communication, and UI/UX documentation.
