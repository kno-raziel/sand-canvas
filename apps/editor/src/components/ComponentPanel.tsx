import type { Adapter, ComponentDefinition } from "@sand/core";
import { parseRef } from "@sand/core";
import type { SandNode } from "@sand/core";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore, getReusableNodes } from "../store/editor-store";
import { adapterRegistry } from "../registry/adapter-registry";

/**
 * Component Panel — left sidebar listing available adapter components.
 *
 * Browse by adapter → category. Click a component to insert a `ref`
 * node into the first screen (or selected screen).
 */
export function ComponentPanel() {
  const addRefNode = useInsertRefNode();
  const adapters = adapterRegistry.listAdapters();
  const projectComponents = useEditorStore(useShallow(getReusableNodes));

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-3">
      {/* Project Components */}
      {projectComponents.length > 0 && (
        <ProjectComponentsSection components={projectComponents} onInsert={addRefNode} />
      )}

      {/* Library Adapters */}
      {adapters.length === 0 ? (
        <div className="p-4 text-center text-xs text-base-content/40">No adapters registered</div>
      ) : (
        adapters.map((adapter) => (
          <AdapterSection key={adapter.id} adapter={adapter} onInsert={addRefNode} />
        ))
      )}
    </div>
  );
}

function ProjectComponentsSection({
  components,
  onInsert,
}: {
  components: SandNode[];
  onInsert: (ref: string) => void;
}) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-base-content/60 border-b border-base-content/10 pb-1">
        Project Components
      </h3>
      <div className="grid grid-cols-2 gap-1 mt-2">
        {components.map((comp) => (
          <button
            key={comp.id}
            type="button"
            className="btn btn-ghost btn-xs justify-start font-mono text-[11px] truncate bg-primary/5 text-primary"
            onClick={() => onInsert(`project:${comp.id}`)}
            title={`Insert ${comp.name || "Unnamed Component"}`}
          >
            {comp.name || "Unnamed"}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdapterSection({
  adapter,
  onInsert,
}: {
  adapter: Adapter;
  onInsert: (ref: string) => void;
}) {
  // Group components by category
  const byCategory = new Map<string, ComponentDefinition[]>();
  for (const comp of adapter.components) {
    const existing = byCategory.get(comp.category) ?? [];
    existing.push(comp);
    byCategory.set(comp.category, existing);
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-base-content/40">
        {adapter.name}
      </h3>
      {Array.from(byCategory.entries()).map(([category, components]) => (
        <div key={category} className="mb-3">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-base-content/30">
            {category}
          </span>
          <div className="grid grid-cols-2 gap-1">
            {components.map((comp) => (
              <button
                key={comp.name}
                type="button"
                className="btn btn-ghost btn-xs justify-start font-mono text-[11px]"
                onClick={() => onInsert(`${adapter.id}:${comp.name}`)}
                title={`Insert ${comp.displayName}`}
              >
                {comp.displayName}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Hook that returns a function to insert a ref node.
 */
function useInsertRefNode(): (ref: string) => void {
  const nodes = useEditorStore((s) => s.nodes);
  const insertSandNode = useEditorStore((s) => s.insertSandNode);
  const selectedSandNodeIds = useEditorStore((s) => s.selectedSandNodeIds);

  return (ref: string) => {
    if (nodes.length === 0) return;
    const screen = nodes[0]; // Currently defaults to first screen

    // Determine target parent based on selection, or default to root
    let targetParentId: string | null = null;
    if (selectedSandNodeIds.length === 1) {
      targetParentId = selectedSandNodeIds[0];
    } else {
      // Find the body frame to insert into (or fall back to first child)
      const bodyFrame = screen.data.children.find(
        (c) => c.type === "frame" && c.id.includes("-body")
      );
      targetParentId = bodyFrame?.id ?? null;
      if (!targetParentId && screen.data.children.length > 0) {
        targetParentId = screen.data.children[0].id;
      }
    }

    const newNode: SandNode = {
      id: `ref-${crypto.randomUUID().slice(0, 8)}`,
      type: "ref",
      ref,
      props: {},
    };

    insertSandNode(screen.id, targetParentId, newNode);
  };
}
