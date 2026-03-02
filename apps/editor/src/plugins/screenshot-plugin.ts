/**
 * Vite plugin that exposes a screenshot HTTP endpoint for the Sand MCP server.
 *
 * Architecture:
 * 1. MCP server calls: GET /api/screenshot/:nodeId
 * 2. This plugin receives the request and sends a WebSocket message to the browser
 * 3. The browser captures the DOM node via html-to-image and sends the result back
 * 4. The plugin responds to the HTTP request with the base64 PNG
 *
 * Uses Vite's built-in HMR WebSocket (no extra server needed).
 */

import type { Plugin } from "vite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

interface PendingScreenshot {
  resolve: (dataUrl: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export function sandScreenshotPlugin(): Plugin {
  const pending = new Map<string, PendingScreenshot>();
  const pendingAnnotations = new Map<string, PendingScreenshot>();

  return {
    name: "sand-screenshot",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        if (address && typeof address === "object") {
          const portFile = path.join(os.tmpdir(), "sand-editor-port");
          fs.writeFileSync(portFile, String(address.port), "utf-8");
          console.log(`[Sand] Logged Vite dev server port (${address.port}) to ${portFile}`);
        }
      });

      // Listen for screenshot results from the browser
      server.ws.on(
        "sand:screenshot-result",
        (data: { requestId: string; dataUrl: string | null; error?: string }) => {
          const entry = pending.get(data.requestId);
          if (!entry) return;

          pending.delete(data.requestId);
          clearTimeout(entry.timer);

          if (data.error || !data.dataUrl) {
            entry.reject(new Error(data.error ?? "Screenshot capture failed"));
          } else {
            entry.resolve(data.dataUrl);
          }
        }
      );

      // Listen for conversation results from the browser
      server.ws.on(
        "sand:conversations-result",
        (data: { requestId: string; dataUrl: string | null; error?: string }) => {
          const entry = pendingAnnotations.get(data.requestId);
          if (!entry) return;

          pendingAnnotations.delete(data.requestId);
          clearTimeout(entry.timer);

          if (data.error || !data.dataUrl) {
            entry.reject(new Error(data.error ?? "Annotations fetch failed"));
          } else {
            entry.resolve(data.dataUrl);
          }
        }
      );

      // HTTP middleware for /api/screenshot/:nodeId
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/^\/api\/screenshot\/([^/?]+)/);
        if (!match || req.method !== "GET") {
          next();
          return;
        }

        const nodeId = decodeURIComponent(match[1]);
        const requestId = `${nodeId}-${Date.now()}`;
        const timeout = 10_000; // 10 seconds

        const promise = new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => {
            pending.delete(requestId);
            reject(new Error("Screenshot timeout — is the editor running and the node visible?"));
          }, timeout);

          pending.set(requestId, { resolve, reject, timer });
        });

        // Send request to the browser via WebSocket
        server.ws.send({
          type: "custom",
          event: "sand:screenshot-request",
          data: { requestId, nodeId },
        });

        promise
          .then((dataUrl) => {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ dataUrl }));
          })
          .catch((err: Error) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          });
      });

      // HTTP middleware for /api/conversations (live state from editor)
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/api/conversations" || req.method !== "GET") {
          next();
          return;
        }

        const requestId = `conversations-${Date.now()}`;
        const timeout = 5_000;

        const promise = new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => {
            pendingAnnotations.delete(requestId);
            reject(new Error("Conversations timeout — is the editor running?"));
          }, timeout);

          pendingAnnotations.set(requestId, { resolve, reject, timer });
        });

        server.ws.send({
          type: "custom",
          event: "sand:conversations-request",
          data: { requestId },
        });

        promise
          .then((json) => {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(json);
          })
          .catch((err: Error) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          });
      });

      // HTTP middleware for POST /api/conversations/reply
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/api/conversations/reply" || req.method !== "POST") {
          next();
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            // Broadcast to the client to update Zustand directly
            server.ws.send({
              type: "custom",
              event: "sand:conversations-agent-reply",
              data,
            });

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Invalid JSON body" }));
          }
        });
      });

      // HTTP middleware for POST /api/document-update (live sync from MCP)
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/api/document-update" || req.method !== "POST") {
          next();
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const document = JSON.parse(body);
            // Broadcast the entire new SandDocument to the client
            server.ws.send({
              type: "custom",
              event: "sand:document-update",
              data: document,
            });

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Invalid JSON body" }));
          }
        });
      });
    },
  };
}
