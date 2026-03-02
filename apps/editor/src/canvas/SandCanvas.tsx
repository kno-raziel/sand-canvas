import { useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditorStore } from "../store/editor-store";
import { ScreenNode } from "./ScreenNode";

/** Register custom node types — must be stable (outside component) to avoid re-renders */
const nodeTypes: NodeTypes = {
  screen: ScreenNode,
};

/** Inner canvas that has access to the ReactFlow instance */
function SandCanvasInner() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const clearSandNodeSelection = useEditorStore((s) => s.clearSandNodeSelection);
  const registerFocusNode = useEditorStore((s) => s.registerFocusNode);

  const reactFlowInstance = useReactFlow();

  // Register the focusNode callback so LayersPanel can center the view
  useEffect(() => {
    registerFocusNode((nodeId: string) => {
      reactFlowInstance.fitView({
        nodes: [{ id: nodeId }],
        duration: 300,
        padding: 0.3,
      });
    });
  }, [reactFlowInstance, registerFocusNode]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      panOnScroll={true}
      selectionOnDrag={true}
      onPaneClick={() => clearSandNodeSelection()}
      fitView
      minZoom={0.1}
      defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="bg-base-300!" />
      <Controls className="bg-base-100! border-base-300! shadow-lg!" />
      <MiniMap
        className="bg-base-100! border-base-300!"
        nodeColor="#6366f1"
        maskColor="rgba(0, 0, 0, 0.15)"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

export function SandCanvas() {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <SandCanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
