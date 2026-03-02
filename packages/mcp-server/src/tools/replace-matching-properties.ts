/**
 * replace_matching_properties — Bulk-replace property values across a subtree.
 *
 * Recursively walks the node tree under specified parents and replaces
 * all occurrences of a property value with a new value.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SandNode } from "@sand/core";
import { getDocument, findNodeById, markDirtyAndSave } from "../document-manager";

const ReplacementSchema = z.object({
  from: z.union([z.string(), z.number()]),
  to: z.union([z.string(), z.number()]),
});

const REPLACEABLE_PROPERTIES = [
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

type ReplaceableProperty = (typeof REPLACEABLE_PROPERTIES)[number];

/** Map from our keys to actual node property paths */
const PROPERTY_MAP: Record<ReplaceableProperty, { path: string; nested?: string }> = {
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

export function registerReplaceMatchingProperties(server: McpServer): void {
  server.registerTool(
    "replace_matching_properties",
    {
      title: "Replace Matching Properties",
      description:
        "Recursively replace all matching property values on nodes below the provided parent IDs. " +
        "Supports: fillColor, textColor, strokeColor, fontSize, fontFamily, fontWeight, " +
        "cornerRadius, padding, gap.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
        parents: z.array(z.string()).describe("IDs of parent nodes to search within"),
        properties: z
          .object({
            fillColor: z.array(ReplacementSchema).optional(),
            textColor: z.array(ReplacementSchema).optional(),
            strokeColor: z.array(ReplacementSchema).optional(),
            fontSize: z.array(ReplacementSchema).optional(),
            fontFamily: z.array(ReplacementSchema).optional(),
            fontWeight: z.array(ReplacementSchema).optional(),
            cornerRadius: z.array(ReplacementSchema).optional(),
            padding: z.array(ReplacementSchema).optional(),
            gap: z.array(ReplacementSchema).optional(),
          })
          .describe("Property replacements, each with from/to pairs"),
      },
    },
    async ({ filePath, parents, properties }) => {
      try {
        const entry = await getDocument(filePath);
        let totalReplacements = 0;

        for (const parentId of parents) {
          const parent = findNodeById(entry.document.children, parentId);
          if (!parent) continue;

          const nodes = "children" in parent && parent.children ? parent.children : [parent];
          totalReplacements += replaceInTree(nodes, properties);
        }

        if (totalReplacements > 0) {
          await markDirtyAndSave(filePath);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ replacements: totalReplacements }, null, 2),
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

function replaceInTree(
  nodes: SandNode[],
  properties: Record<string, Array<{ from: string | number; to: string | number }> | undefined>
): number {
  let count = 0;

  for (const node of nodes) {
    const record = node as unknown as Record<string, unknown>;

    for (const [propName, replacements] of Object.entries(properties)) {
      if (!replacements) continue;
      const mapping = PROPERTY_MAP[propName as ReplaceableProperty];
      if (!mapping) continue;

      for (const { from, to } of replacements) {
        if (mapping.nested) {
          // Nested property (e.g., border.color)
          const container = record[mapping.path];
          if (container && typeof container === "object") {
            const obj = container as Record<string, unknown>;
            if (obj[mapping.nested] === from) {
              obj[mapping.nested] = to;
              count++;
            }
          }
        } else {
          if (record[mapping.path] === from) {
            record[mapping.path] = to;
            count++;
          }
        }
      }
    }

    if ("children" in node && node.children) {
      count += replaceInTree(node.children, properties);
    }
  }

  return count;
}
