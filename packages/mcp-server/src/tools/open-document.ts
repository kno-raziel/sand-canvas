/**
 * open_document — Open or create a .sand file.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openDocument } from "../document-manager";

export function registerOpenDocument(server: McpServer): void {
  server.registerTool(
    "open_document",
    {
      title: "Open Document",
      description:
        "Open an existing .sand file or create a new one. " +
        "If the file doesn't exist, a new empty document is created.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
      },
    },
    async ({ filePath }) => {
      try {
        const entry = await openDocument(filePath);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                filePath: entry.filePath,
                name: entry.document.name,
                version: entry.document.version,
                nodeCount: entry.document.children.length,
              }),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
