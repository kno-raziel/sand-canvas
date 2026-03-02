/**
 * get_variables — Read variables, themes, and active theme from a .sand document.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDocument } from "../document-manager";

export function registerGetVariables(server: McpServer): void {
  server.registerTool(
    "get_variables",
    {
      title: "Get Variables",
      description:
        "Get the variables and themes defined in a .sand file. " +
        "Returns variable definitions (color, number, string, font) with optional theme values, " +
        "theme axis definitions, and the currently active theme.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
      },
    },
    async ({ filePath }) => {
      try {
        const entry = await getDocument(filePath);
        const doc = entry.document;

        const result = {
          variables: doc.variables ?? {},
          themes: doc.themes ?? {},
          activeTheme: doc.activeTheme ?? {},
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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
