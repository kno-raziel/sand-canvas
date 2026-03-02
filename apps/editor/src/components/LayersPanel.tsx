import { useState } from "react";
import { useEditorStore, type ScreenNode as ScreenNodeType } from "../store/editor-store";
import type { SandNode } from "@sand/core";

export function LayersPanel() {
  const screens = useEditorStore((s) => s.nodes);

  if (screens.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-base-content/40">
        No screens yet. Add one to see layers.
      </div>
    );
  }

  return (
    <div className="flex flex-col py-2">
      {screens.map((screen) => (
        <ScreenBranch key={screen.id} screen={screen} />
      ))}
    </div>
  );
}

function ScreenBranch({ screen }: { screen: ScreenNodeType }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = screen.data.children && screen.data.children.length > 0;

  return (
    <div className="flex flex-col">
      <LayerItem
        id={screen.id}
        screenId={screen.id}
        name={screen.data.label || `Screen ${screen.id.substring(screen.id.length - 8)}`}
        type="screen"
        depth={0}
        hasChildren={hasChildren ?? false}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      {!collapsed &&
        hasChildren &&
        screen.data.children?.map((node: SandNode) => (
          <LayerNode key={node.id} node={node} depth={1} screenId={screen.id} />
        ))}
    </div>
  );
}

function LayerNode({ node, depth, screenId }: { node: SandNode; depth: number; screenId: string }) {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const hasChildren = node.type === "frame" && node.children && node.children.length > 0;

  return (
    <>
      <LayerItem
        id={node.id}
        screenId={screenId}
        name={node.name || node.type}
        type={node.type}
        depth={depth}
        hasChildren={hasChildren ?? false}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      {!collapsed &&
        hasChildren &&
        (node.children || []).map((child) => (
          <LayerNode key={child.id} node={child} depth={depth + 1} screenId={screenId} />
        ))}
    </>
  );
}

function LayerItem({
  id,
  screenId,
  name,
  type,
  depth,
  hasChildren,
  collapsed,
  onToggle,
}: {
  id: string;
  screenId: string;
  name: string;
  type: string;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const selectedNodeIds = useEditorStore((s) => s.selectedSandNodeIds);
  const toggleSelection = useEditorStore((s) => s.toggleSandNodeSelection);
  const focusNode = useEditorStore((s) => s.focusNode);

  const isSelected = selectedNodeIds.includes(id);
  const paddingLeft = `${depth * 1}rem`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => toggleSelection(id, e.shiftKey || e.metaKey)}
      onDoubleClick={() => focusNode(screenId)}
      onKeyDown={(e) => {
        if (e.key === "Enter") toggleSelection(id, e.shiftKey || e.metaKey);
      }}
      className={`flex w-full text-left items-center gap-1 py-1.5 px-3 text-xs hover:bg-base-200 transition-colors cursor-pointer ${
        isSelected ? "bg-primary/10 text-primary font-medium" : "text-base-content/80"
      }`}
      style={{ paddingLeft: `calc(0.75rem + ${paddingLeft})` }}
    >
      {/* Collapse toggle */}
      {hasChildren ? (
        <button
          type="button"
          className="opacity-50 hover:opacity-100 cursor-pointer select-none w-3 text-center bg-transparent border-none p-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
      ) : (
        <span className="w-3" />
      )}
      {/* Type icon */}
      <span className="opacity-50">
        {type === "screen" && "📱"}
        {type === "frame" && "◫"}
        {type === "text" && "T"}
        {type === "ref" && "◇"}
        {!["screen", "frame", "text", "ref"].includes(type) && "📄"}
      </span>
      <span className="truncate flex-1">{name}</span>
    </div>
  );
}
