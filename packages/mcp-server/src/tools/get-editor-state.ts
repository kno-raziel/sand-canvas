/**
 * get_editor_state — Returns info about open documents and server state.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VERSION } from "@sand/core";
import { listOpenDocuments, getActiveFilePath } from "../document-manager";

export function registerGetEditorState(server: McpServer): void {
  server.registerTool(
    "get_editor_state",
    {
      title: "Get Editor State",
      description:
        "Returns the current state of the Sand editor: open documents, " +
        "active file, schema version, and available tools.",
    },
    async () => {
      const documents = listOpenDocuments();
      const activeFile = getActiveFilePath();

      const state = {
        version: VERSION,
        schemaVersion: 1,
        activeFile,
        openDocuments: documents,
        availableTools: ["open_document", "get_editor_state", "batch_get", "batch_design"],
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(state, null, 2) }],
      };
    }
  );
}
