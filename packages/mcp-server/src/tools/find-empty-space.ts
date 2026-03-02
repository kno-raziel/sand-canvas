/**
 * find_empty_space — Find available space on the canvas for placing new nodes.
 *
 * Given a direction and desired dimensions, scans existing node bounding boxes
 * to find a coordinate that doesn't overlap with existing content.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDocument, findNodeById, computeLayout } from "../document-manager";

export function registerFindEmptySpace(server: McpServer): void {
  server.registerTool(
    "find_empty_space",
    {
      title: "Find Empty Space on Canvas",
      description:
        "Find empty space in a .sand file for a given direction and desired size. " +
        "If nodeId is provided, finds space around that specific node. " +
        "If nodeId is omitted, finds space around the entire canvas content.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
        width: z.number().describe("The width of the required empty space"),
        height: z.number().describe("The height of the required empty space"),
        padding: z.number().describe("The minimum padding distance from other elements"),
        direction: z
          .enum(["top", "right", "bottom", "left"])
          .describe("The direction to search for empty space"),
        nodeId: z
          .string()
          .optional()
          .describe("Optional starting point node ID. If omitted, searches around all content."),
      },
    },
    async ({ filePath, width, height, padding, direction, nodeId }) => {
      try {
        const entry = await getDocument(filePath);
        const layout = computeLayout(entry.document.children, 0, 0, 0);

        // Determine the reference bounding box
        let refBox: { x: number; y: number; width: number; height: number };

        if (nodeId) {
          const node = findNodeById(entry.document.children, nodeId);
          if (!node) throw new Error(`Node not found: ${nodeId}`);
          const nodeRect = layout.find((r) => r.id === nodeId);
          refBox = nodeRect ?? { x: node.x ?? 0, y: node.y ?? 0, width: 200, height: 200 };
        } else {
          // Compute bounding box of all content
          if (layout.length === 0) {
            refBox = { x: 0, y: 0, width: 0, height: 0 };
          } else {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const rect of layout) {
              minX = Math.min(minX, rect.x);
              minY = Math.min(minY, rect.y);
              maxX = Math.max(maxX, rect.x + rect.width);
              maxY = Math.max(maxY, rect.y + rect.height);
            }
            refBox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
          }
        }

        // Calculate the empty space position
        let resultX: number;
        let resultY: number;

        switch (direction) {
          case "right":
            resultX = refBox.x + refBox.width + padding;
            resultY = refBox.y;
            break;
          case "left":
            resultX = refBox.x - width - padding;
            resultY = refBox.y;
            break;
          case "bottom":
            resultX = refBox.x;
            resultY = refBox.y + refBox.height + padding;
            break;
          case "top":
            resultX = refBox.x;
            resultY = refBox.y - height - padding;
            break;
        }

        const result = { x: resultX, y: resultY, width, height };
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
