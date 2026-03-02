import type { Conversation, ConversationMessage } from "@sand/core";
import { useState, useRef, useEffect } from "react";
import { useEditorStore } from "../store/editor-store";

const STATUS_BADGE: Record<Conversation["status"], { label: string; class: string }> = {
  open: { label: "Open", class: "badge-warning" },
  "in-review": { label: "In Review", class: "badge-info" },
  resolved: { label: "Resolved", class: "badge-success" },
};

/**
 * ConversationPanel — renders threaded conversations in the right sidebar.
 * Conversations are metadata about the design, NOT part of the design tree.
 */
export function ConversationPanel() {
  const conversations = useEditorStore((s) => s.conversations);
  const resolveConversation = useEditorStore((s) => s.resolveConversation);
  const deleteConversation = useEditorStore((s) => s.deleteConversation);

  const open = conversations.filter((c) => c.status !== "resolved");
  const resolved = conversations.filter((c) => c.status === "resolved");

  if (conversations.length === 0) return null;

  return (
    <div className="border-t border-base-content/10 bg-base-100">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">
          💬 Conversations ({open.length} open)
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3 pb-3 max-h-[400px] overflow-y-auto">
        {/* Open + In-Review first */}
        {open.map((conv) => (
          <ConversationCard
            key={conv.id}
            conversation={conv}
            onResolve={() => resolveConversation(conv.id)}
            onDelete={() => deleteConversation(conv.id)}
          />
        ))}
        {/* Resolved (collapsed) */}
        {resolved.length > 0 && (
          <ResolvedSection conversations={resolved} onDelete={deleteConversation} />
        )}
      </div>
    </div>
  );
}

function ConversationCard({
  conversation,
  onResolve,
  onDelete,
}: {
  conversation: Conversation;
  onResolve: () => void;
  onDelete: () => void;
}) {
  const badge = STATUS_BADGE[conversation.status];
  const bgColor = conversation.color ?? "#fef9c3";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const activeConversationId = useEditorStore((s) => s.activeConversationId);

  const firstMsg = conversation.messages[0];
  const isNewEmpty = firstMsg && firstMsg.content === "" && firstMsg.author === "user";

  // Track editing state locally so it doesn't close immediately upon typing
  const [isEditing, setIsEditing] = useState(isNewEmpty);

  // Auto-focus the textarea for new empty conversations
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Auto-focus the reply input if this conversation is activated via context menu
  useEffect(() => {
    if (activeConversationId === conversation.id && replyInputRef.current) {
      replyInputRef.current.focus();
      // Clear it from the store to prevent stealing focus if the user clicks away
      useEditorStore.getState().setActiveConversation(null);
    }
  }, [activeConversationId, conversation.id]);

  const handleFirstMessageChange = (content: string) => {
    // Update the first message content directly in the store
    const conversations = useEditorStore.getState().conversations;
    const updated = conversations.map((c) =>
      c.id === conversation.id
        ? {
            ...c,
            messages: c.messages.map((m, i) => (i === 0 ? { ...m, content } : m)),
          }
        : c
    );
    useEditorStore.setState({ conversations: updated, isDirty: true });
  };

  const finishEditing = () => {
    if (firstMsg && firstMsg.content.trim() !== "") {
      setIsEditing(false);
    }
  };

  return (
    <div
      className="rounded-md shadow-sm text-sm"
      style={{ backgroundColor: bgColor, padding: "10px 12px" }}
    >
      {/* Header: status + target node + actions */}
      <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className={`badge badge-xs ${badge.class}`}>{badge.label}</span>
          {conversation.targetNodeId && (
            <span
              className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono"
              title={`Linked to: ${conversation.targetNodeId}`}
            >
              📌 {conversation.targetNodeId.slice(0, 10)}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {conversation.status === "open" && (
            <button
              type="button"
              className="btn btn-xs btn-ghost text-green-600 px-1"
              onClick={onResolve}
              title="Mark as resolved"
            >
              ✓
            </button>
          )}
          <button
            type="button"
            className="btn btn-xs btn-ghost text-red-400 px-1"
            onClick={onDelete}
            title="Delete conversation"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages thread */}
      <div className="flex flex-col gap-1.5">
        {conversation.messages.map((msg, i) => (
          <div key={msg.id} className="flex gap-1.5 items-start">
            <span className="text-[10px] mt-0.5 shrink-0">
              {msg.author === "agent" ? "🤖" : "👤"}
            </span>
            {i === 0 && isEditing ? (
              <textarea
                ref={textareaRef}
                className="w-full bg-white/60 text-gray-800 text-xs leading-snug resize-none outline-none border border-amber-300 rounded p-1"
                placeholder="Escribe tu comentario... (Enter para guardar)"
                rows={2}
                value={msg.content}
                onChange={(e) => handleFirstMessageChange(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    finishEditing();
                  }
                }}
              />
            ) : (
              <p className="text-xs leading-snug text-gray-800 whitespace-pre-wrap">
                {msg.content}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Reply Input */}
      {conversation.status !== "resolved" && (!isNewEmpty || !isEditing) && (
        <div className="mt-2 text-xs">
          <input
            ref={replyInputRef}
            type="text"
            placeholder="Reply..."
            className="w-full bg-white/60 text-gray-800 outline-none border border-amber-300/50 rounded px-2 py-1 placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && e.currentTarget.value.trim() !== "") {
                e.preventDefault();
                useEditorStore.getState().addMessage(conversation.id, {
                  id: `msg-${crypto.randomUUID().slice(0, 8)}`,
                  author: "user",
                  content: e.currentTarget.value.trim(),
                  createdAt: new Date().toISOString(),
                });
                e.currentTarget.value = "";
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

function ResolvedSection({
  conversations,
  onDelete,
}: {
  conversations: Conversation[];
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="text-[10px] text-base-content/40 hover:text-base-content/60 mb-1"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "▼" : "▶"} {conversations.length} resolved
      </button>
      {expanded &&
        conversations.map((conv) => (
          <div
            key={conv.id}
            className="rounded-md text-xs opacity-50 mb-1 px-2 py-1"
            style={{ backgroundColor: conv.color ?? "#f3f4f6" }}
          >
            <div className="flex justify-between items-center">
              <span className="badge badge-xs badge-success">Resolved</span>
              <button
                type="button"
                className="btn btn-xs btn-ghost text-red-400 px-1"
                onClick={() => onDelete(conv.id)}
              >
                ×
              </button>
            </div>
            {conv.messages[0] && (
              <p className="text-gray-600 mt-1 truncate">{conv.messages[0].content}</p>
            )}
          </div>
        ))}
    </div>
  );
}
