/**
 * @sand/mcp-server — MCP server for Sand design files.
 *
 * Communicates via stdin/stdout using the Model Context Protocol.
 * Uses @sand/core to read and manipulate .sand documents.
 *
 * Usage:
 *   tsx src/index.ts
 *   # or via pnpm:
 *   pnpm --filter @sand/mcp-server dev
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerOpenDocument } from "./tools/open-document";
import { registerGetEditorState } from "./tools/get-editor-state";
import { registerBatchGet } from "./tools/batch-get";
import { registerBatchDesign } from "./tools/batch-design";
import { registerFindEmptySpace } from "./tools/find-empty-space";
import { registerSnapshotLayout } from "./tools/snapshot-layout";
import { registerGetScreenshot } from "./tools/get-screenshot";
import { registerGetVariables } from "./tools/get-variables";
import { registerSetVariables } from "./tools/set-variables";
import { registerSearchUniqueProperties } from "./tools/search-unique-properties";
import { registerReplaceMatchingProperties } from "./tools/replace-matching-properties";
import { registerGetGuidelines } from "./tools/get-guidelines";
import { registerReplyConversation } from "./tools/reply-conversation";

const server = new McpServer({
  name: "sand",
  version: "0.0.1",
});

// Register Phase 1 tools
registerOpenDocument(server);
registerGetEditorState(server);
registerBatchGet(server);
registerBatchDesign(server);

// Register Phase 4A tools
registerFindEmptySpace(server);
registerSnapshotLayout(server);
registerGetScreenshot(server);
registerReplyConversation(server);

// Register Phase 4B tools
registerGetVariables(server);
registerSetVariables(server);
registerSearchUniqueProperties(server);
registerReplaceMatchingProperties(server);
registerGetGuidelines(server);

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
