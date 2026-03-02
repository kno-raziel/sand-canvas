/**
 * get_screenshot — Capture a node as a screenshot.
 *
 * When the Sand editor is running (localhost:4003), the screenshot is captured
 * via the editor's HTTP endpoint → Vite WebSocket → browser DOM → html-to-image.
 *
 * When the editor is not running, returns node metadata as a fallback.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDocument, findNodeById, getEditorBaseUrl } from "../document-manager";

async function tryEditorScreenshot(nodeId: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    const res = await fetch(`${getEditorBaseUrl()}/api/screenshot/${encodeURIComponent(nodeId)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as { dataUrl?: string; error?: string };
    return data.dataUrl ?? null;
  } catch {
    // Editor not running or timeout
    return null;
  }
}

export function registerGetScreenshot(server: McpServer): void {
  server.registerTool(
    "get_screenshot",
    {
      title: "Get Screenshot",
      description:
        "Get a screenshot of a node in a .sand file. " +
        "Returns a PNG image when the Sand editor is running, " +
        "or node metadata as a fallback in headless mode.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
        nodeId: z.string().describe("The ID of the node to screenshot"),
      },
    },
    async ({ filePath, nodeId }) => {
      try {
        const entry = await getDocument(filePath);
        const node = findNodeById(entry.document.children, nodeId);

        if (!node) throw new Error(`Node not found: ${nodeId}`);

        // Try to get a real screenshot from the running editor
        const dataUrl = await tryEditorScreenshot(nodeId);

        if (dataUrl) {
          // Strip "data:image/png;base64," prefix to get raw base64
          const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
          return {
            content: [{ type: "image" as const, mimeType: "image/png" as const, data: base64 }],
          };
        }

        // Fallback: return node metadata
        const info = {
          message:
            "Screenshot capture requires the Sand editor to be running at localhost:4003. " +
            "Start it with: pnpm --filter @sand/editor dev",
          node: {
            id: node.id,
            type: node.type,
            name: "name" in node ? node.name : undefined,
            width: node.width,
            height: node.height,
            childCount: "children" in node && node.children ? node.children.length : 0,
          },
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(info, null, 2) }],
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
