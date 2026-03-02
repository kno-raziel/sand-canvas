import { useState, useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "../store/editor-store";

interface ContextMenuState {
  x: number;
  y: number;
  screenId: string | null;
}

/**
 * ContextMenu — right-click menu on the canvas.
 * Provides quick actions: Add Frame, Add Text, Add Note, Delete selected.
 */
export function ContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const addScreen = useEditorStore((s) => s.addScreen);
  const startConversation = useEditorStore((s) => s.startConversation);
  const deleteSelectedSandNodes = useEditorStore((s) => s.deleteSelectedSandNodes);
  const selectedSandNodeIds = useEditorStore((s) => s.selectedSandNodeIds);
  const nodes = useEditorStore((s) => s.nodes);
  const insertSandNode = useEditorStore((s) => s.insertSandNode);

  // Listen for contextmenu events on the canvas
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Only trigger on the canvas area
      const target = e.target as HTMLElement;
      if (!target.closest(".react-flow") && !target.closest(".screen-node")) return;

      e.preventDefault();

      // Find which screen was right-clicked
      const screenEl = target.closest("[data-id]") as HTMLElement | null;
      const screenId = screenEl?.getAttribute("data-id") ?? nodes[0]?.id ?? null;

      setMenu({ x: e.clientX, y: e.clientY, screenId });
    };

    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  }, [nodes]);

  // Close on click outside or escape
  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    const handleClick = () => close();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [menu, close]);

  if (!menu) return null;

  const hasSelection = selectedSandNodeIds.length > 0;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[180px] rounded-lg border border-base-content/15 bg-base-100 shadow-xl py-1 text-sm"
      style={{ left: menu.x, top: menu.y }}
    >
      <MenuItem
        label="Add Frame"
        icon="▢"
        onClick={() => {
          if (menu.screenId) {
            insertSandNode(menu.screenId, null, {
              id: `frame-${crypto.randomUUID().slice(0, 8)}`,
              type: "frame",
              layout: "vertical",
              width: 200,
              height: 100,
              fill: "#ffffff",
              padding: 16,
            });
          }
          close();
        }}
      />
      <MenuItem
        label="Add Text"
        icon="T"
        onClick={() => {
          if (menu.screenId) {
            insertSandNode(menu.screenId, null, {
              id: `text-${crypto.randomUUID().slice(0, 8)}`,
              type: "text",
              content: "Text",
              fontSize: 16,
              color: "#1e293b",
            });
          }
          close();
        }}
      />
      <div className="mx-2 my-1 border-t border-base-content/10" />
      <MenuItem
        label={hasSelection ? "Comment on selected 💬" : "Add Comment 💬"}
        icon=""
        onClick={() => {
          const store = useEditorStore.getState();
          const targetNodeId = hasSelection ? selectedSandNodeIds[0] : undefined;

          if (targetNodeId) {
            // Check if there's already an active conversation for this node
            const existingConv = store.conversations.find(
              (c) => c.targetNodeId === targetNodeId && c.status !== "resolved"
            );

            if (existingConv) {
              // Focus the existing conversation reply box
              store.setActiveConversation(existingConv.id);
              close();
              return;
            }
          }

          store.startConversation({
            id: `conv-${crypto.randomUUID().slice(0, 8)}`,
            status: "open",
            messages: [
              {
                id: `msg-${crypto.randomUUID().slice(0, 8)}`,
                author: "user",
                content: "",
                createdAt: new Date().toISOString(),
              },
            ],
            color: "#fef3c7",
            createdAt: new Date().toISOString(),
            ...(targetNodeId ? { targetNodeId } : {}),
          });
          close();
        }}
      />
      <div className="mx-2 my-1 border-t border-base-content/10" />
      <MenuItem
        label="Add Screen"
        icon="+"
        onClick={() => {
          addScreen();
          close();
        }}
      />
      {hasSelection && (
        <>
          <div className="mx-2 my-1 border-t border-base-content/10" />
          <MenuItem
            label={`Delete (${selectedSandNodeIds.length})`}
            icon="🗑"
            className="text-red-500"
            onClick={() => {
              deleteSelectedSandNodes();
              close();
            }}
          />
        </>
      )}
    </div>
  );
}

function MenuItem({
  label,
  icon,
  onClick,
  className = "",
}: {
  label: string;
  icon: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-1.5 hover:bg-base-content/5 flex items-center gap-2 ${className}`}
      onClick={onClick}
    >
      {icon && <span className="w-5 text-center text-xs opacity-60">{icon}</span>}
      {label}
    </button>
  );
}
