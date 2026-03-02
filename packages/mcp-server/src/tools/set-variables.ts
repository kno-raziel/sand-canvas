/**
 * set_variables — Create/update variables and themes in a .sand document.
 *
 * By default, merges new variables into existing ones.
 * Pass `replace: true` to completely replace all variable definitions.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDocument, markDirtyAndSave } from "../document-manager";

const ThemeValueSchema = z.union([
  z.string(),
  z.array(
    z.object({
      theme: z.record(z.string(), z.string()),
      value: z.string(),
    })
  ),
]);

const VariableSchema = z.object({
  type: z.enum(["color", "number", "string", "font"]),
  value: ThemeValueSchema,
});

export function registerSetVariables(server: McpServer): void {
  server.registerTool(
    "set_variables",
    {
      title: "Set Variables",
      description:
        "Update the variables and themes defined in a .sand file. " +
        "By default, variables are merged into existing definitions. " +
        "If replace is true, existing variables are completely replaced.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
        variables: z
          .record(z.string(), VariableSchema)
          .optional()
          .describe("Variable definitions to set/merge"),
        themes: z
          .record(z.string(), z.array(z.string()))
          .optional()
          .describe("Theme axis definitions"),
        activeTheme: z
          .record(z.string(), z.string())
          .optional()
          .describe("Currently active theme values"),
        replace: z
          .boolean()
          .optional()
          .describe("If true, completely replace existing variables instead of merging"),
      },
    },
    async ({ filePath, variables, themes, activeTheme, replace }) => {
      try {
        const entry = await getDocument(filePath);
        const doc = entry.document;

        if (variables) {
          if (replace) {
            doc.variables = variables;
          } else {
            doc.variables = { ...(doc.variables ?? {}), ...variables };
          }
        }

        if (themes) {
          doc.themes = themes;
        }

        if (activeTheme) {
          doc.activeTheme = activeTheme;
        }

        await markDirtyAndSave(filePath);

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
