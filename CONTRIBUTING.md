# Contributing to Sand 🏖️

Thanks for your interest in contributing! Sand is an AI-native design tool for visual communication between humans and AI agents.

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9

### Setup

```bash
git clone https://github.com/kno-raziel/sand-canvas.git
cd sand-canvas
pnpm install
pnpm --filter @sand/editor dev   # Editor at http://localhost:4003
```

## Project Structure

```text
sand/
├── packages/
│   ├── core/               # Headless document engine (no React deps)
│   ├── mcp-server/         # MCP stdio server (13 tools)
│   └── adapter-daisyui/    # daisyUI component adapter (14 components)
├── apps/
│   └── editor/             # Vite + React canvas editor
└── demos/                  # Example .sand files
```

## How to Contribute

### Adding Components to the daisyUI Adapter

The easiest contribution! Add a `CssComponentSpec` to `packages/adapter-daisyui/src/components.tsx`:

```typescript
{
  name: "Progress",
  element: "progress",
  baseClass: "progress",
  modifiers: {
    variant: { prefix: "progress-", values: ["primary", "secondary", "accent"] },
  },
  content: "label",
}
```

The CSS-Class Engine auto-generates the Zod schema, defaults, and render function. The component appears in the editor immediately.

### Creating a New Adapter

1. Create a new package under `packages/adapter-yourlib/`
2. Implement the `ComponentAdapter` interface from `@sand/core`
3. Register it in the editor's `main.tsx`

See `packages/adapter-daisyui/` as a reference.

### Working on the Editor

The editor is a Vite + React app using `@xyflow/react`. Key files:

- `apps/editor/src/store/editor-store.ts` — Main Zustand store
- `apps/editor/src/canvas/` — ReactFlow canvas setup
- `apps/editor/src/components/` — UI panels (Layers, Properties, Components)

### Working on the MCP Server

Each tool lives in its own file under `packages/mcp-server/src/tools/`. To add a new tool:

1. Create `packages/mcp-server/src/tools/your-tool.ts`
2. Register it in `packages/mcp-server/src/index.ts`

## Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting. Run:

```bash
pnpm --filter '@sand/*' run check
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes
4. Run `pnpm --filter '@sand/*' run check` and `pnpm --filter '@sand/*' run typecheck`
5. Submit a Pull Request

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
