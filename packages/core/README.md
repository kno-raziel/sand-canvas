# @sand/core

Headless document engine for Sand — no React dependencies.

## Responsibilities

- **Document schema** — Zod-validated `.sand` file format (frames, text, refs, notes)
- **Node types** — `FrameNode`, `TextNode`, `RefNode`, `NoteNode` with full type exports
- **Adapter interface** — `ComponentAdapter`, `CssComponentSpec`, `ComponentRegistry`
- **CSS-Class Engine** — Auto-generates Zod schemas, defaults, and render functions from declarative component specs (~10 lines of data per component)
- **Tree operations** — Path resolution, node lookup, CRUD helpers

## Usage

```typescript
import type { SandNode, FrameNode, TextNode, CssComponentSpec } from "@sand/core";
import { createCssClassAdapter } from "@sand/core";
```

## Structure

```text
src/
├── adapter/     # Adapter interface, CSS-Class Engine, component registry
├── document/    # Tree CRUD, Zod schemas, path resolution
└── index.ts     # Public API exports
```

## Key Exports

| Export | Description |
|--------|-------------|
| `SandNode` | Union type of all node types |
| `FrameNode`, `TextNode` | Individual node types |
| `CssComponentSpec` | Declarative spec format for CSS-class-based components |
| `createCssClassAdapter` | Factory that turns specs into a full adapter |
| `ComponentAdapter` | Interface that adapters implement |
