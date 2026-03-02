/**
 * batch_get — Read nodes from a .sand file by ID or search pattern.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDocument, findNodeById, findNodesByPattern, trimToDepth } from "../document-manager";

export function registerBatchGet(server: McpServer): void {
  server.registerTool(
    "batch_get",
    {
      title: "Batch Get Nodes",
      description:
        "Read nodes from a .sand file. Retrieve by ID or search by pattern " +
        "(type, name, reusable). Returns nodes trimmed to the specified depth. " +
        "If no nodeIds or patterns are given, returns top-level children.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
        nodeIds: z.array(z.string()).optional().describe("Array of node IDs to read"),
        patterns: z
          .array(
            z.object({
              type: z.string().optional().describe("Node type filter (frame, text, etc.)"),
              name: z.string().optional().describe("Exact name match"),
              reusable: z.boolean().optional().describe("Filter by reusable flag"),
            })
          )
          .optional()
          .describe("Search patterns to find matching nodes"),
        readDepth: z.number().optional().describe("Max depth to return children (default: 2)"),
      },
    },
    async ({ filePath, nodeIds, patterns, readDepth }) => {
      try {
        const entry = await getDocument(filePath);
        const depth = readDepth ?? 2;
        const results: unknown[] = [];

        // Read specific nodes by ID
        if (nodeIds && nodeIds.length > 0) {
          for (const id of nodeIds) {
            const node = findNodeById(entry.document.children, id);
            if (node) {
              results.push(trimToDepth(node, depth));
            }
          }
        }

        // Search by patterns
        if (patterns && patterns.length > 0) {
          for (const pattern of patterns) {
            const matches = findNodesByPattern(entry.document.children, pattern);
            for (const match of matches) {
              results.push(trimToDepth(match, depth));
            }
          }
        }

        // Default: return top-level children
        if ((!nodeIds || nodeIds.length === 0) && (!patterns || patterns.length === 0)) {
          for (const child of entry.document.children) {
            results.push(trimToDepth(child, depth));
          }
        }

        // Include conversations (metadata) when available
        // Try live conversations from the running editor first, fall back to file
        let conversations = entry.document.conversations ?? [];
        try {
          const res = await fetch("http://localhost:4003/api/conversations", {
            signal: AbortSignal.timeout(3_000),
          });
          if (res.ok) {
            const live = (await res.json()) as unknown;
            if (Array.isArray(live)) conversations = live;
          }
        } catch {
          // Editor not running — use file-based conversations
        }

        const response = conversations.length > 0 ? { nodes: results, conversations } : results;

        return {
          content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
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
