import { useEditorStore, getSelectedSandNodes, type ScreenNode } from "../store/editor-store";
import type { SandNode, FrameNode, TextNode } from "@sand/core";
import { useShallow } from "zustand/react/shallow";
import { exportNodeToImage } from "../utils/canvas-export";

/**
 * Property Panel — right sidebar that shows and edits selected node properties.
 *
 * Phase 1: basic fields (name, dimensions, fill, layout, text content/style).
 * Phase 3A: interactive editing, delete button.
 * Phase 3B: multi-select basic support.
 */
export function PropertyPanel() {
  const selectedNodes = useEditorStore(useShallow(getSelectedSandNodes));
  const deleteSelected = useEditorStore((s) => s.deleteSelectedSandNodes);
  const selectedIds = useEditorStore((s) => s.selectedSandNodeIds);
  const screens = useEditorStore((s) => s.nodes);

  // Check if a screen-level node is selected (not a child SandNode)
  const selectedScreen =
    selectedIds.length === 1 ? screens.find((s) => s.id === selectedIds[0]) : undefined;

  if (selectedScreen) {
    return <ScreenProperties screen={selectedScreen} />;
  }

  if (selectedNodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-sm text-base-content/40">
          Click a node on the canvas to inspect its properties
        </p>
      </div>
    );
  }

  if (selectedNodes.length > 1) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
        <p className="text-center text-sm font-medium">{selectedNodes.length} nodes selected</p>
        <button
          type="button"
          className="btn btn-sm btn-error btn-outline"
          onClick={() => deleteSelected()}
        >
          Delete All
        </button>
      </div>
    );
  }

  const selectedNode = selectedNodes[0];

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="badge badge-sm badge-primary font-mono">{selectedNode.type}</span>
        <span className="text-xs text-base-content/40 font-mono truncate max-w-[150px]">
          {selectedNode.id}
        </span>
      </div>

      {/* Name */}
      <PropertyField
        label="Name"
        value={selectedNode.name ?? ""}
        nodeId={selectedNode.id}
        propKey="name"
      />

      {/* Common: Fill + Opacity */}
      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="Fill"
          value={selectedNode.fill}
          nodeId={selectedNode.id}
          propKey="fill"
        />
        <NumberField
          label="Opacity"
          value={selectedNode.opacity ?? 1}
          nodeId={selectedNode.id}
          propKey="opacity"
          min={0}
          max={1}
          step={0.05}
        />
      </div>

      {/* Dimensions */}
      <SectionLabel>Dimensions</SectionLabel>
      <DimensionFields node={selectedNode} />

      {/* Type-specific fields */}
      {selectedNode.type === "frame" && <FrameFields node={selectedNode} />}
      {selectedNode.type === "text" && <TextFields node={selectedNode} />}

      {/* Actions */}
      <div className="border-t border-base-content/10 pt-3 flex flex-col gap-2">
        <button
          type="button"
          className="btn btn-sm btn-outline w-full"
          onClick={async () => {
            const dataUrl = await exportNodeToImage(selectedNode.id);
            if (dataUrl) {
              const a = document.createElement("a");
              a.href = dataUrl;
              a.download = `${selectedNode.name || selectedNode.type}-${selectedNode.id}.png`;
              a.click();
            }
          }}
        >
          Export PNG
        </button>
        <button
          type="button"
          className="btn btn-sm btn-error btn-outline w-full"
          onClick={() => deleteSelected()}
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}

// ─── Screen Properties ────────────────────────────────────────

function ScreenProperties({ screen }: { screen: ScreenNode }) {
  const update = useEditorStore((s) => s.updateSandNodeProperty);
  const data = screen.data;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="badge badge-sm badge-accent font-mono">screen</span>
        <span className="text-xs text-base-content/40 font-mono truncate max-w-[150px]">
          {screen.id}
        </span>
      </div>

      {/* Name */}
      <label className="flex flex-col">
        <span className="label text-xs">Name</span>
        <input
          type="text"
          className="input input-xs input-bordered w-full"
          value={data.label || ""}
          onChange={(e) => {
            const state = useEditorStore.getState();
            const updated = state.nodes.map((n) =>
              n.id === screen.id ? { ...n, data: { ...n.data, label: e.target.value } } : n
            );
            useEditorStore.setState({ nodes: updated });
          }}
        />
      </label>

      {/* Dimensions */}
      <SectionLabel>Dimensions</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col">
          <span className="label text-xs">Width</span>
          <input
            type="number"
            className="input input-xs input-bordered w-full font-mono"
            value={data.width}
            onChange={(e) => {
              const state = useEditorStore.getState();
              const updated = state.nodes.map((n) =>
                n.id === screen.id
                  ? { ...n, data: { ...n.data, width: Number(e.target.value) } }
                  : n
              );
              useEditorStore.setState({ nodes: updated });
            }}
          />
        </label>
        <label className="flex flex-col">
          <span className="label text-xs">Height</span>
          <input
            type="number"
            className="input input-xs input-bordered w-full font-mono"
            value={data.height}
            onChange={(e) => {
              const state = useEditorStore.getState();
              const updated = state.nodes.map((n) =>
                n.id === screen.id
                  ? { ...n, data: { ...n.data, height: Number(e.target.value) } }
                  : n
              );
              useEditorStore.setState({ nodes: updated });
            }}
          />
        </label>
      </div>

      {/* Fill */}
      <SectionLabel>Appearance</SectionLabel>
      <label className="flex flex-col">
        <span className="label text-xs">Fill Color</span>
        <span className="flex items-center gap-1">
          <input
            type="text"
            className="input input-xs input-bordered flex-1 font-mono"
            value={data.fill ?? ""}
            onChange={(e) => {
              const state = useEditorStore.getState();
              const updated = state.nodes.map((n) =>
                n.id === screen.id ? { ...n, data: { ...n.data, fill: e.target.value } } : n
              );
              useEditorStore.setState({ nodes: updated });
            }}
            placeholder="var(bg_base) or #hex"
          />
        </span>
      </label>

      {/* Info */}
      <SectionLabel>Info</SectionLabel>
      <div className="text-xs text-base-content/60 space-y-1">
        <p>
          <span className="font-medium">Size:</span> {data.width} × {data.height}
        </p>
        <p>
          <span className="font-medium">Children:</span> {data.children?.length ?? 0}
        </p>
      </div>
    </div>
  );
}

// ─── Type-Specific Sections ───────────────────────────────────

function FrameFields({ node }: { node: FrameNode }) {
  return (
    <>
      <SectionLabel>Layout</SectionLabel>
      <SelectField
        label="Direction"
        value={node.layout ?? "none"}
        options={["none", "horizontal", "vertical"]}
        nodeId={node.id}
        propKey="layout"
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Gap" value={node.gap ?? 0} nodeId={node.id} propKey="gap" />
        <NumberField
          label="Padding"
          value={typeof node.padding === "number" ? node.padding : 0}
          nodeId={node.id}
          propKey="padding"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Align"
          value={node.alignItems ?? "stretch"}
          options={["start", "center", "end", "stretch"]}
          nodeId={node.id}
          propKey="alignItems"
        />
        <SelectField
          label="Justify"
          value={node.justifyContent ?? "start"}
          options={["start", "center", "end", "space-between", "space-around"]}
          nodeId={node.id}
          propKey="justifyContent"
        />
      </div>
      <NumberField
        label="Corner Radius"
        value={typeof node.cornerRadius === "number" ? node.cornerRadius : 0}
        nodeId={node.id}
        propKey="cornerRadius"
      />

      <SectionLabel>Component System</SectionLabel>
      <label className="flex cursor-pointer items-center justify-between py-2">
        <span className="label-text text-xs">Reusable Component</span>
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={node.reusable ?? false}
          onChange={(e) => {
            const update = useEditorStore.getState().updateSandNodeProperty;
            update(node.id, "reusable", e.target.checked);
          }}
        />
      </label>
    </>
  );
}

function TextFields({ node }: { node: TextNode }) {
  return (
    <>
      <SectionLabel>Text</SectionLabel>
      <PropertyField label="Content" value={node.content} nodeId={node.id} propKey="content" />
      <ColorField label="Color" value={node.color} nodeId={node.id} propKey="color" />
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Font Size"
          value={node.fontSize ?? 14}
          nodeId={node.id}
          propKey="fontSize"
        />
        <SelectField
          label="Weight"
          value={String(node.fontWeight ?? 400)}
          options={["300", "400", "500", "600", "700"]}
          nodeId={node.id}
          propKey="fontWeight"
          transform={(v) => Number(v)}
        />
      </div>
      <SelectField
        label="Align"
        value={node.textAlign ?? "left"}
        options={["left", "center", "right"]}
        nodeId={node.id}
        propKey="textAlign"
      />
    </>
  );
}

function DimensionFields({ node }: { node: SandNode }) {
  const update = useEditorStore((s) => s.updateSandNodeProperty);
  const width = node.width;
  const height = node.height;

  const parseDimension = (raw: string): string | number | undefined => {
    if (raw === "" || raw === "auto") return undefined;
    if (raw === "fill_container" || raw === "fit_content") return raw;
    const num = Number(raw);
    return Number.isNaN(num) ? raw : num;
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col">
        <span className="label text-xs">Width</span>
        <input
          type="text"
          className="input input-xs input-bordered w-full font-mono"
          value={width ?? "auto"}
          onChange={(e) => update(node.id, "width", parseDimension(e.target.value))}
        />
      </label>
      <label className="flex flex-col">
        <span className="label text-xs">Height</span>
        <input
          type="text"
          className="input input-xs input-bordered w-full font-mono"
          value={height ?? "auto"}
          onChange={(e) => update(node.id, "height", parseDimension(e.target.value))}
        />
      </label>
    </div>
  );
}

// ─── Reusable Field Components ────────────────────────────────

function PropertyField({
  label,
  value,
  nodeId,
  propKey,
}: {
  label: string;
  value: string;
  nodeId: string;
  propKey: string;
}) {
  const update = useEditorStore((s) => s.updateSandNodeProperty);

  return (
    <label className="flex flex-col">
      <span className="label text-xs">{label}</span>
      <input
        type="text"
        className="input input-xs input-bordered w-full"
        value={value}
        onChange={(e) => update(nodeId, propKey, e.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  nodeId,
  propKey,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  nodeId: string;
  propKey: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const update = useEditorStore((s) => s.updateSandNodeProperty);

  return (
    <label className="flex flex-col">
      <span className="label text-xs">{label}</span>
      <input
        type="number"
        className="input input-xs input-bordered w-full font-mono"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => update(nodeId, propKey, Number(e.target.value))}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  nodeId,
  propKey,
}: {
  label: string;
  value: string | undefined;
  nodeId: string;
  propKey: string;
}) {
  const update = useEditorStore((s) => s.updateSandNodeProperty);

  return (
    <label className="flex flex-col">
      <span className="label text-xs">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="color"
          className="h-6 w-6 cursor-pointer rounded border-0"
          value={value ?? "#ffffff"}
          onChange={(e) => update(nodeId, propKey, e.target.value)}
        />
        <input
          type="text"
          className="input input-xs input-bordered flex-1 font-mono"
          value={value ?? ""}
          onChange={(e) => update(nodeId, propKey, e.target.value)}
          placeholder="#hex"
        />
      </span>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  nodeId,
  propKey,
  transform,
}: {
  label: string;
  value: string;
  options: string[];
  nodeId: string;
  propKey: string;
  transform?: (value: string) => unknown;
}) {
  const update = useEditorStore((s) => s.updateSandNodeProperty);

  return (
    <label className="flex flex-col">
      <span className="label text-xs">{label}</span>
      <select
        className="select select-xs select-bordered w-full"
        value={value}
        onChange={(e) =>
          update(nodeId, propKey, transform ? transform(e.target.value) : e.target.value)
        }
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-t border-base-content/10 pt-3 text-xs font-semibold uppercase tracking-wider text-base-content/50">
      {children}
    </h3>
  );
}
