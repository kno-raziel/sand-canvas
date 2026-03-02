import { create } from "zustand";
import type { Node, Edge, OnNodesChange, OnEdgesChange } from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { enablePatches, produceWithPatches, applyPatches, type Patch } from "immer";
import type {
  SandNode,
  SandDocument,
  FrameNode,
  Conversation,
  ConversationMessage,
} from "@sand/core";
import { loadFromSandDocument, exportToSandDocument } from "../utils/sand-io";

// Enable Immer patches for undo/redo
enablePatches();

/** A theme-aware variable value */
export interface ThemeValue {
  theme: Record<string, string>;
  value: string;
}

/** Variable definition */
export interface VariableDefinition {
  type: "color" | "number" | "string" | "font";
  value: string | ThemeValue[];
}

/**
 * Data shape for a "screen" node on the canvas.
 * Each screen represents a top-level artboard (like a Figma frame).
 */
export interface ScreenNodeData extends Record<string, unknown> {
  label: string;
  width: number;
  height: number;
  /** Background fill color from the .sand frame (supports theme variables) */
  fill?: string;
  /** The design tree rendered inside this screen */
  children: SandNode[];
}

export type ScreenNode = Node<ScreenNodeData, "screen">;

/** Maximum number of undo steps to keep */
const MAX_UNDO_HISTORY = 50;

// ─── State Interface ──────────────────────────────────────────

interface EditorState {
  /** xyflow nodes (screens on the canvas) */
  nodes: ScreenNode[];
  /** xyflow edges (connections between nodes, not used yet) */
  edges: Edge[];

  /** Currently selected xyflow node IDs */
  selectedNodeIds: string[];

  /** Currently selected SandNode IDs (inner nodes within screens) */
  selectedSandNodeIds: string[];

  /** Internal counter for unique screen IDs */
  _screenCounter: number;

  /** Undo/redo history */
  _undoStack: Patch[][];
  _redoStack: Patch[][];

  /** Whether undo/redo is available */
  canUndo: boolean;
  canRedo: boolean;

  /** Design token system */
  variables: Record<string, VariableDefinition>;
  themes: Record<string, string[]>;
  activeTheme: Record<string, string>;

  /** File persistence */
  currentFilePath: string | null;
  currentFileName: string;
  isDirty: boolean;
  fileHandle: FileSystemFileHandle | null;

  /** Conversations — threaded metadata, separate from design tree */
  conversations: Conversation[];
  activeConversationId: string | null;

  /** Canvas focus callback (registered by SandCanvas, used by LayersPanel) */
  _focusNodeFn: ((nodeId: string) => void) | null;

  /** xyflow change handlers */
  onNodesChange: OnNodesChange<ScreenNode>;
  onEdgesChange: OnEdgesChange;

  /** Actions */
  addScreen: (name?: string, x?: number, y?: number) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  toggleSandNodeSelection: (nodeId: string, multi?: boolean) => void;
  clearSandNodeSelection: () => void;
  updateSandNodeProperty: (nodeId: string, key: string, value: unknown) => void;
  deleteSandNode: (nodeId: string) => void;
  deleteSelectedSandNodes: () => void;
  insertSandNode: (screenId: string, parentId: string | null, node: SandNode) => void;
  copySandNode: (nodeId: string, targetParentId: string | null) => void;
  replaceSandNode: (nodeId: string, newNodeData: SandNode) => void;
  moveSandNode: (nodeId: string, newParentId: string | null, index?: number) => void;

  /** Variable/theme actions */
  setVariable: (name: string, definition: VariableDefinition) => void;
  deleteVariable: (name: string) => void;
  setThemes: (themes: Record<string, string[]>) => void;
  setActiveTheme: (axis: string, value: string) => void;

  /** File persistence actions */
  loadDocument: (doc: SandDocument, filePath?: string, handle?: FileSystemFileHandle) => void;
  updateDocumentLive: (doc: SandDocument) => void;
  exportDocument: () => SandDocument;
  setFileHandle: (handle: FileSystemFileHandle, name: string) => void;
  clearDirty: () => void;

  /** Conversation actions */
  startConversation: (conversation: Conversation) => void;
  addMessage: (conversationId: string, message: ConversationMessage) => void;
  resolveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;

  undo: () => void;
  redo: () => void;

  /** Canvas focus — called from LayersPanel to center view on a screen */
  registerFocusNode: (fn: (nodeId: string) => void) => void;
  focusNode: (nodeId: string) => void;
}

// ─── Tree Helpers ─────────────────────────────────────────────

/** Find a SandNode by ID anywhere in a tree */
function findSandNode(nodes: SandNode[], id: string): SandNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if ("children" in node && node.children) {
      const found = findSandNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Immutably update a SandNode's property in a tree */
function updateInTree(nodes: SandNode[], id: string, key: string, value: unknown): SandNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, [key]: value };
    }
    if ("children" in node && node.children) {
      return { ...node, children: updateInTree(node.children, id, key, value) } as SandNode;
    }
    return node;
  });
}

/** Recursively remove a node by ID from a tree */
function removeFromTree(nodes: SandNode[], id: string): SandNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => {
      if ("children" in node && node.children) {
        return { ...node, children: removeFromTree(node.children, id) } as SandNode;
      }
      return node;
    });
}

/** Insert a node into a specific parent in the tree. If parentId is null, insert at root. */
function insertIntoTree(nodes: SandNode[], parentId: string | null, newNode: SandNode): SandNode[] {
  if (parentId === null) {
    return [...nodes, newNode];
  }
  return nodes.map((node) => {
    if (node.id === parentId && "children" in node) {
      const children = node.children ? [...node.children, newNode] : [newNode];
      return { ...node, children } as SandNode;
    }
    if ("children" in node && node.children) {
      return { ...node, children: insertIntoTree(node.children, parentId, newNode) } as SandNode;
    }
    return node;
  });
}

// ─── Store ────────────────────────────────────────────────────

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  selectedSandNodeIds: [],
  _screenCounter: 0,
  _undoStack: [],
  _redoStack: [],
  canUndo: false,
  canRedo: false,
  variables: {},
  themes: {},
  activeTheme: {},
  currentFilePath: null,
  currentFileName: "Untitled",
  isDirty: false,
  fileHandle: null,
  conversations: [],
  activeConversationId: null,
  _focusNodeFn: null,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  addScreen: (name, x, y) => {
    const state = get();
    const counter = state._screenCounter + 1;
    const screenName = name ?? `Screen ${counter}`;
    const id = `screen-${crypto.randomUUID().slice(0, 8)}`;

    // Stagger new screens so they don't stack
    const posX = x ?? 100 + state.nodes.length * 1600;
    const posY = y ?? 100;

    const newNode: ScreenNode = {
      id,
      type: "screen",
      position: { x: posX, y: posY },
      data: {
        label: screenName,
        width: 1440,
        height: 900,
        children: createDefaultContent(),
      },
      dragHandle: ".screen-node__header",
    };
    set({
      nodes: [...state.nodes, newNode],
      _screenCounter: counter,
      isDirty: true,
    });
  },

  setSelectedNodeIds: (ids) => {
    set({ selectedNodeIds: ids });
  },

  toggleSandNodeSelection: (nodeId, multi = false) => {
    const state = get();
    if (multi) {
      const isSelected = state.selectedSandNodeIds.includes(nodeId);
      set({
        selectedSandNodeIds: isSelected
          ? state.selectedSandNodeIds.filter((id) => id !== nodeId)
          : [...state.selectedSandNodeIds, nodeId],
      });
    } else {
      set({ selectedSandNodeIds: [nodeId] });
    }
  },

  clearSandNodeSelection: () => {
    set({ selectedSandNodeIds: [] });
  },

  updateSandNodeProperty: (nodeId, key, value) => {
    const state = get();

    // Use Immer to produce patches for undo
    const [nextNodes, patches, inversePatches] = produceWithPatches(state.nodes, (draft) => {
      for (const screen of draft) {
        const node = findMutableNode(screen.data.children, nodeId);
        if (node) {
          (node as unknown as Record<string, unknown>)[key] = value;
          return;
        }
      }
    });

    if (patches.length > 0) {
      const undoStack = [...state._undoStack, inversePatches].slice(-MAX_UNDO_HISTORY);
      set({
        nodes: nextNodes,
        _undoStack: undoStack,
        _redoStack: [],
        canUndo: undoStack.length > 0,
        canRedo: false,
        isDirty: true,
      });
    }
  },

  deleteSelectedSandNodes: () => {
    const state = get();
    if (state.selectedSandNodeIds.length === 0) return;

    const [nextNodes, patches, inversePatches] = produceWithPatches(state.nodes, (draft) => {
      for (const screen of draft) {
        state.selectedSandNodeIds.forEach((id) => {
          screen.data.children = removeMutableNode(screen.data.children, id);
        });
      }
    });

    if (patches.length > 0) {
      const undoStack = [...state._undoStack, inversePatches].slice(-MAX_UNDO_HISTORY);
      set({
        nodes: nextNodes,
        selectedSandNodeIds: [],
        _undoStack: undoStack,
        _redoStack: [],
        canUndo: undoStack.length > 0,
        canRedo: false,
        isDirty: true,
      });
    }
  },

  deleteSandNode: (nodeId) => {
    const state = get();

    const [nextNodes, patches, inversePatches] = produceWithPatches(state.nodes, (draft) => {
      for (const screen of draft) {
        screen.data.children = removeMutableNode(screen.data.children, nodeId);
      }
    });

    if (patches.length > 0) {
      const undoStack = [...state._undoStack, inversePatches].slice(-MAX_UNDO_HISTORY);
      set({
        nodes: nextNodes,
        selectedSandNodeIds: state.selectedSandNodeIds.filter((id) => id !== nodeId),
        _undoStack: undoStack,
        _redoStack: [],
        canUndo: undoStack.length > 0,
        canRedo: false,
        isDirty: true,
      });
    }
  },

  insertSandNode: (screenId, parentId, node) => {
    const state = get();

    const [nextNodes, patches, inversePatches] = produceWithPatches(state.nodes, (draft) => {
      const screen = draft.find((s) => s.id === screenId);
      if (!screen) return;

      if (parentId === null) {
        screen.data.children.push(node);
      } else {
        insertMutableNode(screen.data.children, parentId, node);
      }
    });

    if (patches.length > 0) {
      const undoStack = [...state._undoStack, inversePatches].slice(-MAX_UNDO_HISTORY);
      set({
        nodes: nextNodes,
        _undoStack: undoStack,
        _redoStack: [],
        canUndo: undoStack.length > 0,
        canRedo: false,
        isDirty: true,
      });
    }
  },

  copySandNode: (nodeId, targetParentId) => {
    const state = get();

    const [nextNodes, patches, inversePatches] = produceWithPatches(state.nodes, (draft) => {
      for (const screen of draft) {
        const original = findMutableNode(screen.data.children, nodeId);
        if (original) {
          // Deep clone with new IDs
          const clone = JSON.parse(JSON.stringify(original)) as SandNode;
          assignNewIdsMutable(clone);

          if (targetParentId === null) {
            screen.data.children.push(clone);
          } else {
            const inserted = insertMutableNode(screen.data.children, targetParentId, clone);
            if (!inserted) {
              // Fallback: insert at root if parent not found
              screen.data.children.push(clone);
            }
          }
          return;
        }
      }
    });

    if (patches.length > 0) {
      const undoStack = [...state._undoStack, inversePatches].slice(-MAX_UNDO_HISTORY);
      set({
        nodes: nextNodes,
        _undoStack: undoStack,
        _redoStack: [],
        canUndo: undoStack.length > 0,
        canRedo: false,
        isDirty: true,
      });
    }
  },

  replaceSandNode: (nodeId, newNodeData) => {
    const state = get();

    const [nextNodes, patches, inversePatches] = produceWithPatches(state.nodes, (draft) => {
      for (const screen of draft) {
        if (replaceMutableNode(screen.data.children, nodeId, newNodeData)) {
          return;
        }
      }
    });

    if (patches.length > 0) {
      const undoStack = [...state._undoStack, inversePatches].slice(-MAX_UNDO_HISTORY);
      set({
        nodes: nextNodes,
        _undoStack: undoStack,
        _redoStack: [],
        canUndo: undoStack.length > 0,
        canRedo: false,
        isDirty: true,
      });
    }
  },

  moveSandNode: (nodeId, newParentId, index) => {
    const state = get();

    const [nextNodes, patches, inversePatches] = produceWithPatches(state.nodes, (draft) => {
      for (const screen of draft) {
        const removed = removeMutableNodeReturn(screen.data.children, nodeId);
        if (removed) {
          if (newParentId === null) {
            if (index !== undefined) {
              screen.data.children.splice(index, 0, removed);
            } else {
              screen.data.children.push(removed);
            }
          } else {
            const parent = findMutableNode(screen.data.children, newParentId);
            if (parent && "children" in parent) {
              if (!parent.children) {
                (parent as unknown as Record<string, unknown>).children = [];
              }
              if (index !== undefined) {
                parent.children?.splice(index, 0, removed);
              } else {
                parent.children?.push(removed);
              }
            } else {
              // Fallback: insert at root
              screen.data.children.push(removed);
            }
          }
          return;
        }
      }
    });

    if (patches.length > 0) {
      const undoStack = [...state._undoStack, inversePatches].slice(-MAX_UNDO_HISTORY);
      set({
        nodes: nextNodes,
        _undoStack: undoStack,
        _redoStack: [],
        canUndo: undoStack.length > 0,
        canRedo: false,
        isDirty: true,
      });
    }
  },

  setVariable: (name, definition) => {
    set({ variables: { ...get().variables, [name]: definition }, isDirty: true });
  },

  deleteVariable: (name) => {
    const { [name]: _, ...rest } = get().variables;
    set({ variables: rest, isDirty: true });
  },

  setThemes: (themes) => {
    set({ themes, isDirty: true });
  },

  setActiveTheme: (axis, value) => {
    set({ activeTheme: { ...get().activeTheme, [axis]: value }, isDirty: true });
  },

  loadDocument: (doc, filePath, handle) => {
    const result = loadFromSandDocument(doc);
    const screens = result.screens.map((screen, i) => ({
      ...screen,
      position: screen.position ?? { x: 100 + i * 1600, y: 100 },
    }));

    set({
      nodes: screens,
      edges: [],
      selectedNodeIds: [],
      selectedSandNodeIds: [],
      _screenCounter: screens.length,
      _undoStack: [],
      _redoStack: [],
      canUndo: false,
      canRedo: false,
      variables: result.variables,
      themes: result.themes,
      activeTheme: result.activeTheme,
      conversations: result.conversations,
      currentFilePath: filePath ?? null,
      currentFileName:
        doc.name ??
        (filePath ? filePath.split("/").pop()?.replace(".sand", "") : "Untitled") ??
        "Untitled",
      isDirty: false,
      fileHandle: handle ?? null,
    });
  },

  updateDocumentLive: (doc) => {
    // Similar to loadDocument, but preserves selection and doesn't touch undo stack
    const result = loadFromSandDocument(doc);
    const screens = result.screens.map((screen, i) => ({
      ...screen,
      position: screen.position ?? { x: 100 + i * 1600, y: 100 },
    }));

    set({
      nodes: screens,
      edges: [],
      variables: result.variables,
      themes: result.themes,
      activeTheme: result.activeTheme,
      conversations: result.conversations,
      currentFileName: doc.name ?? get().currentFileName,
    });
  },

  exportDocument: () => {
    const state = get();
    return exportToSandDocument(
      state.nodes,
      state.variables,
      state.themes,
      state.activeTheme,
      state.conversations,
      state.currentFileName
    );
  },

  setFileHandle: (handle, name) => {
    set({ fileHandle: handle, currentFileName: name });
  },

  clearDirty: () => {
    set({ isDirty: false });
  },

  startConversation: (conversation) => {
    set({
      conversations: [...get().conversations, conversation],
      activeConversationId: conversation.id,
      isDirty: true,
    });
  },

  addMessage: (conversationId, message) => {
    set({
      conversations: get().conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message], status: "in-review" as const }
          : c
      ),
      isDirty: true,
    });
  },

  resolveConversation: (id) => {
    set({
      conversations: get().conversations.map((c) =>
        c.id === id ? { ...c, status: "resolved" as const } : c
      ),
      isDirty: true,
    });
  },

  deleteConversation: (id) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
      isDirty: true,
    }));
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
  },

  undo: () => {
    const state = get();
    if (state._undoStack.length === 0) return;

    const inversePatches = state._undoStack[state._undoStack.length - 1];
    const newUndoStack = state._undoStack.slice(0, -1);

    // Apply inverse patches to get previous state, and capture forward patches
    const [nextNodes, , forwardPatches] = produceWithPatches(state.nodes, (draft) => {
      return applyPatches(draft, inversePatches);
    });

    const newRedoStack = [...state._redoStack, forwardPatches];
    set({
      nodes: nextNodes,
      _undoStack: newUndoStack,
      _redoStack: newRedoStack,
      canUndo: newUndoStack.length > 0,
      canRedo: newRedoStack.length > 0,
    });
  },

  redo: () => {
    const state = get();
    if (state._redoStack.length === 0) return;

    const forwardPatches = state._redoStack[state._redoStack.length - 1];
    const newRedoStack = state._redoStack.slice(0, -1);

    const [nextNodes, , inversePatches] = produceWithPatches(state.nodes, (draft) => {
      return applyPatches(draft, forwardPatches);
    });

    const newUndoStack = [...state._undoStack, inversePatches].slice(-MAX_UNDO_HISTORY);
    set({
      nodes: nextNodes,
      _undoStack: newUndoStack,
      _redoStack: newRedoStack,
      canUndo: newUndoStack.length > 0,
      canRedo: newRedoStack.length > 0,
    });
  },

  registerFocusNode: (fn) => {
    set({ _focusNodeFn: fn });
  },

  focusNode: (nodeId) => {
    const { _focusNodeFn } = get();
    if (_focusNodeFn) _focusNodeFn(nodeId);
  },
}));

// ─── Mutable Tree Helpers (for Immer drafts) ──────────────────

/** Find a node by ID in a mutable Immer draft */
function findMutableNode(nodes: SandNode[], id: string): SandNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if ("children" in node && node.children) {
      const found = findMutableNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Remove a node by ID from a mutable Immer draft */
function removeMutableNode(nodes: SandNode[], id: string): SandNode[] {
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx !== -1) {
    nodes.splice(idx, 1);
    return nodes;
  }
  for (const node of nodes) {
    if ("children" in node && node.children) {
      removeMutableNode(node.children, id);
    }
  }
  return nodes;
}

/** Insert a node into a parent in a mutable Immer draft */
function insertMutableNode(nodes: SandNode[], parentId: string, newNode: SandNode): boolean {
  for (const node of nodes) {
    if (node.id === parentId && "children" in node) {
      if (!node.children) {
        (node as unknown as Record<string, unknown>).children = [];
      }
      node.children?.push(newNode);
      return true;
    }
    if ("children" in node && node.children) {
      if (insertMutableNode(node.children, parentId, newNode)) return true;
    }
  }
  return false;
}

/** Remove a node by ID from a mutable Immer draft, returning the removed node */
function removeMutableNodeReturn(nodes: SandNode[], id: string): SandNode | undefined {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      return nodes.splice(i, 1)[0];
    }
    const node = nodes[i];
    if ("children" in node && node.children) {
      const found = removeMutableNodeReturn(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Replace a node in a mutable Immer draft */
function replaceMutableNode(nodes: SandNode[], targetId: string, newNode: SandNode): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) {
      nodes[i] = newNode;
      return true;
    }
    const node = nodes[i];
    if ("children" in node && node.children) {
      if (replaceMutableNode(node.children, targetId, newNode)) return true;
    }
  }
  return false;
}

/** Recursively assign new UUIDs to a node and all its children (mutable) */
function assignNewIdsMutable(node: SandNode): void {
  node.id = `clone-${crypto.randomUUID().slice(0, 8)}`;
  if ("children" in node && node.children) {
    for (const child of node.children) {
      assignNewIdsMutable(child);
    }
  }
}

// ─── Selectors ────────────────────────────────────────────────

/** Get the currently selected SandNodes from the store */
export function getSelectedSandNodes(state: EditorState): SandNode[] {
  if (state.selectedSandNodeIds.length === 0) return [];
  const selected: SandNode[] = [];
  for (const screen of state.nodes) {
    for (const id of state.selectedSandNodeIds) {
      const found = findSandNode(screen.data.children, id);
      if (found && !selected.includes(found)) selected.push(found);
    }
  }
  return selected;
}

/** Find which screen contains a given SandNode */
export function findScreenForNode(state: EditorState, nodeId: string): ScreenNode | null {
  for (const screen of state.nodes) {
    const found = findSandNode(screen.data.children, nodeId);
    if (found) return screen;
  }
  return null;
}

/** Get all components marked as reusable */
export function getReusableNodes(state: EditorState): FrameNode[] {
  const reusable: FrameNode[] = [];
  function walk(nodes: SandNode[]) {
    for (const node of nodes) {
      if (node.type === "frame" && node.reusable) {
        reusable.push(node);
      }
      if ("children" in node && node.children) {
        walk(node.children);
      }
    }
  }
  for (const screen of state.nodes) {
    walk(screen.data.children);
  }
  return reusable;
}

/** Get a specific project component by ID */
export function getProjectComponent(state: EditorState, id: string | null): FrameNode | null {
  if (!id) return null;
  // Look through reusable nodes to ensure it's actually marked reusable
  const reusable = getReusableNodes(state);
  return reusable.find((n) => n.id === id) ?? null;
}

// ─── Default Screen Content ───────────────────────────────────

/**
 * Default content for new screens. Returns an empty canvas
 * so agents/users start from a clean slate.
 */
function createDefaultContent(): SandNode[] {
  return [];
}
