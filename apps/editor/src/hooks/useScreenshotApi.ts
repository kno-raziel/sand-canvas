/**
 * Hook that listens for screenshot requests from the Vite dev server
 * and captures DOM nodes using html-to-image.
 *
 * Also handles annotation requests — reads live annotations from the Zustand store.
 *
 * Communication flow:
 * Vite plugin → WebSocket "sand:screenshot-request" → this hook → captures DOM →
 * WebSocket "sand:screenshot-result" → Vite plugin → HTTP response → MCP server
 */

import { useEffect } from "react";
import { exportNodeToImage } from "../utils/canvas-export";
import { useEditorStore } from "../store/editor-store";

export function useScreenshotApi(): void {
  useEffect(() => {
    if (!import.meta.hot) return;

    // Screenshot handler
    const screenshotHandler = async (data: { requestId: string; nodeId: string }) => {
      console.log(
        `[useScreenshotApi] Received WS screenshot-request for requestId: ${data.requestId}, nodeId: ${data.nodeId}`
      );
      try {
        const dataUrl = await exportNodeToImage(data.nodeId);
        console.log(
          `[useScreenshotApi] exportNodeToImage succeeded. dataUrl length: ${dataUrl.length}. Sending sand:screenshot-result`
        );
        import.meta.hot?.send("sand:screenshot-result", {
          requestId: data.requestId,
          dataUrl,
        });
      } catch (err: any) {
        console.error(`[useScreenshotApi] Caught export failure:`, err);
        import.meta.hot?.send("sand:screenshot-result", {
          requestId: data.requestId,
          dataUrl: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    // Conversations handler — reads live state from zustand store
    const conversationsHandler = (data: { requestId: string }) => {
      try {
        const conversations = useEditorStore.getState().conversations;
        // Only return open + in-review to keep context clean
        const active = conversations.filter((c) => c.status !== "resolved");

        import.meta.hot?.send("sand:conversations-result", {
          requestId: data.requestId,
          dataUrl: JSON.stringify(active),
        });
      } catch (err) {
        import.meta.hot?.send("sand:conversations-result", {
          requestId: data.requestId,
          dataUrl: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    const agentReplyHandler = (data: { conversationId: string; message: any }) => {
      try {
        useEditorStore.getState().addMessage(data.conversationId, data.message);
      } catch (err) {
        console.error("Failed to add agent reply to store", err);
      }
    };

    const documentUpdateHandler = (doc: any) => {
      try {
        useEditorStore.getState().updateDocumentLive(doc);
      } catch (err) {
        console.error("Failed to apply live document update from MCP", err);
      }
    };

    import.meta.hot.on("sand:screenshot-request", screenshotHandler);
    import.meta.hot.on("sand:conversations-request", conversationsHandler);
    import.meta.hot.on("sand:conversations-agent-reply", agentReplyHandler);
    import.meta.hot.on("sand:document-update", documentUpdateHandler);

    return () => {
      // Vite HMR doesn't support removeListener, but cleanup on unmount
      // is fine since the component lives for the entire app lifecycle
    };
  }, []);
}
