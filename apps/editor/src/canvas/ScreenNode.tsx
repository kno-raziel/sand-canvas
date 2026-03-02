import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ScreenNode as ScreenNodeType } from "../store/editor-store";
import { FrameRenderer } from "./FrameRenderer";
import { useEditorStore } from "../store/editor-store";
import { resolveVariable } from "../utils/resolve-variable";

/**
 * Custom xyflow node that renders as a design artboard.
 *
 * Structure:
 * ┌─────────────── header (drag handle) ──────────────┐
 * │  Screen Name                          1440 × 900   │
 * ├────────────────────────────────────────────────────-┤
 * │                                                     │
 * │              nested frames rendered                 │
 * │              via FrameRenderer (DOM)                │
 * │                                                     │
 * └─────────────────────────────────────────────────────┘
 */
export function ScreenNode({ id, data, selected }: NodeProps<ScreenNodeType>) {
  const { label, width, height, children, fill } = data;
  const hasChildren = children.length > 0;

  // Resolve fill variables (e.g. "var(bg_surface)") using theme
  const variables = useEditorStore((s) => s.variables);
  const activeTheme = useEditorStore((s) => s.activeTheme);
  const resolvedFill = resolveVariable(fill, variables, activeTheme) ?? "#ffffff";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg shadow-md transition-shadow ${
        selected
          ? "ring-2 ring-indigo-500/30 border border-indigo-500"
          : "border border-gray-300/80"
      }`}
      style={{ width: `${width}px`, height: `${height}px`, backgroundColor: resolvedFill }}
      data-node-id={id}
    >
      {/* Header bar — .screen-node__header is the dragHandle hook for xyflow */}
      <div className="screen-node__header flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2 cursor-grab select-none active:cursor-grabbing">
        <span className="text-[13px] font-semibold tracking-tight text-gray-700">{label}</span>
        <span className="text-[11px] text-gray-400 tabular-nums">
          {width} × {height}
        </span>
      </div>

      {/* Content area — nested frames, nopan/nowheel lets clicks pass through to inner nodes */}
      <div className="nopan nowheel relative flex-1 overflow-hidden">
        {hasChildren ? (
          children.map((child) => <FrameRenderer key={child.id} node={child} />)
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-sm text-gray-300">Empty Screen</span>
          </div>
        )}
      </div>

      {/* Hidden handles for potential future connections */}
      <Handle type="source" position={Position.Right} className="hidden!" />
      <Handle type="target" position={Position.Left} className="hidden!" />
    </div>
  );
}
