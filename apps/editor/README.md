# @sand/editor

The Sand visual design editor — a Vite + React web app built on `@xyflow/react`.

## Quick Start

```bash
pnpm --filter @sand/editor dev   # http://localhost:4003
```

## Features

- **Canvas** — Pan, zoom, minimap navigation, screen nodes with nested design trees
- **Component Panel** — Browse and insert daisyUI components (+ custom adapters) with one click
- **Layers Panel** — Collapsible tree view of screen hierarchy, double-click to focus
- **Property Panel** — Type-aware editing for frames, text, and screen nodes
- **Conversation Panel** — Threaded comments for human ↔ agent feedback
- **Context Menu** — Right-click to add frames, text, notes, delete, or copy
- **Theme System** — Dark (abyss) / Light (lemonade) toggle, synced with frame rendering
- **File Persistence** — Save/Load `.sand` files, drag-and-drop, auto-save, `⌘S`/`⌘O`
- **Screenshots** — `html-to-image` capture with Vite WebSocket bridge for MCP
- **Undo/Redo** — Immer patch-based history with `⌘Z`/`⌘⇧Z`
- **Responsive Design** — Support for multiple breakpoint screens (Desktop/Tablet/Mobile)

## Architecture

```text
src/
├── canvas/       # ReactFlow canvas setup, ScreenNode renderer, ReactFlowProvider bridge
├── components/   # UI panels
│   ├── ComponentPanel.tsx    # Browse/insert adapter components
│   ├── ConversationPanel.tsx # Threaded comments
│   ├── ContextMenu.tsx       # Right-click canvas menu
│   ├── LayersPanel.tsx       # Collapsible tree with double-click focus
│   └── PropertyPanel.tsx     # Node/screen property editing
├── hooks/
│   ├── useAutoSave.ts        # Periodic auto-save to file system
│   ├── useKeyboardShortcuts.ts # ⌘Z, ⌘⇧Z, Delete, ⌘S, ⌘O
│   └── useScreenshotApi.ts   # WebSocket bridge for MCP screenshots
├── plugins/
│   └── vite-ws-bridge.ts     # Vite plugin bridging MCP server ↔ editor
├── registry/     # Component adapter registry (loads adapters at startup)
├── store/
│   └── editor-store.ts       # Zustand + Immer — single store (800+ lines)
├── utils/
│   ├── canvas-export.ts      # html-to-image PNG export
│   ├── file-commands.ts      # Save/Open/Load file operations
│   ├── font-loader.ts        # Google Fonts dynamic loading
│   ├── resolve-variable.ts   # Theme variable resolution
│   └── sand-io.ts            # .sand file serialization/deserialization
├── App.tsx       # Main shell — toolbar, sidebars, canvas
└── main.tsx      # React entry point
```

## Key Patterns

- **Canvas vs Content**: Screens are xyflow nodes (drag, zoom). Everything inside is regular React DOM with flexbox.
- **Focus Bridge**: `registerFocusNode`/`focusNode` in the store bridges ReactFlow context with external panels.
- **Live Sync**: Vite WebSocket plugin enables real-time MCP ↔ editor communication.
