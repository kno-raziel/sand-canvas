import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDocument, markDirtyAndSave } from "../document-manager";
import type { ConversationMessage } from "@sand/core";

export function registerReplyConversation(server: McpServer): void {
  server.registerTool(
    "reply_conversation",
    {
      title: "Reply to Conversation",
      description:
        "Respond to an open or in-review conversation. " +
        "This will add a new message to the thread as the 'agent' and update the document. " +
        "If the editor is running, it will also broadcast the reply in real-time.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
        conversationId: z.string().describe("The ID of the conversation to reply to"),
        message: z.string().describe("Your reply text"),
      },
    },
    async (args) => {
      const { filePath, conversationId, message } = args;
      const entry = await getDocument(filePath);

      const conv = entry.document.conversations?.find((c) => c.id === conversationId);
      if (!conv) {
        return {
          content: [{ type: "text", text: `Error: Conversation ${conversationId} not found.` }],
          isError: true,
        };
      }

      if (conv.status === "resolved") {
        return {
          content: [
            {
              type: "text",
              text: `Error: Conversation ${conversationId} is already resolved. Cannot reply.`,
            },
          ],
          isError: true,
        };
      }

      // Add message locally to document
      const newMessage: ConversationMessage = {
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        author: "agent",
        content: message,
        createdAt: new Date().toISOString(),
      };

      conv.messages.push(newMessage);
      conv.status = "in-review";

      // Save directly to disk
      await markDirtyAndSave(filePath);

      // Attempt to broadcast to editor via live HTTP endpoint
      try {
        await fetch("http://localhost:4003/api/conversations/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message: newMessage,
          }),
        });
      } catch (err) {
        // It's ok if the editor is not running
        console.warn("Could not broadcast to editor, but message was saved to disk.");
      }

      return {
        content: [{ type: "text", text: "Replied successfully." }],
      };
    }
  );
}
