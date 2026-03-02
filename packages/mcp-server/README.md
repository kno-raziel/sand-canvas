# @sand/mcp-server

MCP (Model Context Protocol) server for Sand — enables AI agents to create, edit, and inspect `.sand` design files via stdio.

## How It Works

The MCP server communicates over `stdin/stdout` using JSON-RPC. No HTTP server or framework needed.

```
┌─────────────┐    stdio    ┌──────────────────┐
│  AI Agent   │ ◄──────────► │  sand-mcp-server │
│  (Antigrav, │              │  (Node.js proc)  │
│   Claude)   │              └────────┬─────────┘
└─────────────┘                       │
                               reads/writes .sand files
```

## Tools (13)

| Tool | Type | Description |
|------|------|-------------|
| `get_editor_state` | Read | Active document, open files, schema version |
| `batch_get` | Read | Read nodes by ID or search patterns |
| `batch_design` | Write | Insert/Update/Delete/Copy/Replace/Move/Generate operations |
| `open_document` | Utility | Open or create `.sand` files |
| `get_screenshot` | Read | DOM-to-PNG capture via WebSocket bridge to editor |
| `snapshot_layout` | Read | Layout rectangles with problem detection |
| `get_variables` | Read | Design token and theme definitions |
| `set_variables` | Write | Create/update variables and themes |
| `find_empty_space` | Utility | Find available canvas space for new frames |
| `search_unique_properties` | Read | Find unique property values across a subtree |
| `replace_matching_properties` | Write | Bulk-replace property values |
| `get_guidelines` | Read | Design guidelines by topic |
| `reply_conversation` | Write | Reply to comment threads |

## Structure

```text
src/
├── tools/              # One file per tool (13 files)
├── document-manager.ts # Document lifecycle, file I/O, live sync
└── index.ts            # MCP setup + StdioServerTransport
```

## Configuration

Registered in Antigravity's MCP config. The server auto-discovers `.sand` files in the workspace.
