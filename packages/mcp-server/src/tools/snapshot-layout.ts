/**
 * snapshot_layout — Return layout rectangles for all nodes in a document.
 *
 * Provides spatial information that AI agents can use to understand
 * how elements are positioned relative to each other.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDocument, findNodeById, computeLayout, type LayoutRect } from "../document-manager";

export function registerSnapshotLayout(server: McpServer): void {
  server.registerTool(
    "snapshot_layout",
    {
      title: "Snapshot Layout",
      description:
        "Check the current layout structure of a .sand file. Returns layout rectangles " +
        "with x, y, width, height for each node. Use problemsOnly to filter for issues.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
        parentId: z
          .string()
          .optional()
          .describe("Only return layout in this node's subtree. If omitted, returns all."),
        maxDepth: z
          .number()
          .optional()
          .describe("Limit depth of layout tree. Default: 2. Use 0 for top-level only."),
        problemsOnly: z
          .boolean()
          .optional()
          .describe("Only return nodes with layout problems (overlaps, clipping). Default: false."),
      },
    },
    async ({ filePath, parentId, maxDepth, problemsOnly }) => {
      try {
        const entry = await getDocument(filePath);
        const depth = maxDepth ?? 2;

        let nodes = entry.document.children;
        if (parentId) {
          const parent = findNodeById(entry.document.children, parentId);
          if (!parent) throw new Error(`Node not found: ${parentId}`);
          if ("children" in parent && parent.children) {
            nodes = parent.children;
          } else {
            nodes = [];
          }
        }

        let layout = computeLayout(nodes, 0, 0, depth);

        // Filter for problems if requested
        if (problemsOnly) {
          layout = findProblems(layout);
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(layout, null, 2) }],
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

/** Find overlapping or clipped nodes */
function findProblems(rects: LayoutRect[]): LayoutRect[] {
  const problems: LayoutRect[] = [];

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (overlaps(rects[i], rects[j])) {
        if (!problems.includes(rects[i])) problems.push(rects[i]);
        if (!problems.includes(rects[j])) problems.push(rects[j]);
      }
    }
  }

  return problems;
}

function overlaps(a: LayoutRect, b: LayoutRect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}
