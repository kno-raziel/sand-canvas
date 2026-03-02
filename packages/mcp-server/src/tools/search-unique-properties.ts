/**
 * search_unique_properties — Find all unique values of specified properties
 * across a subtree of nodes.
 *
 * Useful for AI agents to understand the design system currently in use
 * (which colors, fonts, sizes, etc. appear in the document).
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SandNode } from "@sand/core";
import { getDocument, findNodeById } from "../document-manager";

const SEARCHABLE_PROPERTIES = [
  "fillColor",
  "textColor",
  "strokeColor",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "cornerRadius",
  "padding",
  "gap",
] as const;

type SearchableProperty = (typeof SEARCHABLE_PROPERTIES)[number];

/** Map from our search keys to actual node property paths */
const PROPERTY_MAP: Record<SearchableProperty, { path: string; nested?: string }> = {
  fillColor: { path: "fill" },
  textColor: { path: "color" },
  strokeColor: { path: "border", nested: "color" },
  fontSize: { path: "fontSize" },
  fontFamily: { path: "fontFamily" },
  fontWeight: { path: "fontWeight" },
  cornerRadius: { path: "cornerRadius" },
  padding: { path: "padding" },
  gap: { path: "gap" },
};

export function registerSearchUniqueProperties(server: McpServer): void {
  server.registerTool(
    "search_unique_properties",
    {
      title: "Search Unique Properties",
      description:
        "Find all unique values of specified properties across a subtree. " +
        "Useful for understanding design patterns (e.g., all colors, font sizes, etc.).",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
        parents: z.array(z.string()).describe("IDs of parent nodes to search within"),
        properties: z
          .array(z.enum(SEARCHABLE_PROPERTIES))
          .describe("List of properties to search for"),
      },
    },
    async ({ filePath, parents, properties }) => {
      try {
        const entry = await getDocument(filePath);
        const results: Record<string, Set<string>> = {};

        for (const prop of properties) {
          results[prop] = new Set();
        }

        for (const parentId of parents) {
          const parent = findNodeById(entry.document.children, parentId);
          if (!parent) continue;
          const nodes = "children" in parent && parent.children ? parent.children : [parent];
          collectProperties(nodes, properties, results);
        }

        // Convert Sets to sorted arrays
        const output: Record<string, string[]> = {};
        for (const [key, values] of Object.entries(results)) {
          output[key] = Array.from(values).sort();
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
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

function collectProperties(
  nodes: SandNode[],
  properties: SearchableProperty[],
  results: Record<string, Set<string>>
): void {
  for (const node of nodes) {
    for (const prop of properties) {
      const mapping = PROPERTY_MAP[prop];
      const value = extractValue(node, mapping.path, mapping.nested);
      if (value !== undefined) {
        results[prop].add(String(value));
      }
    }

    if ("children" in node && node.children) {
      collectProperties(node.children, properties, results);
    }
  }
}

function extractValue(node: SandNode, path: string, nested?: string): unknown {
  const record = node as unknown as Record<string, unknown>;
  const value = record[path];
  if (value === undefined) return undefined;

  if (nested && typeof value === "object" && value !== null) {
    return (value as Record<string, unknown>)[nested];
  }

  return value;
}
