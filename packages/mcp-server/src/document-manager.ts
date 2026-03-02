/**
 * Document Manager — In-memory cache for .sand files.
 *
 * Loads, caches, and saves .sand documents. The MCP tools use this
 * as the single source of truth for file operations.
 */

import { readFile, writeFile, access } from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type SandDocument,
  type SandNode,
  parseSandDocument,
  serializeSandDocument,
  createEmptyDocument,
} from "@sand/core";

export function getEditorBaseUrl(): string {
  try {
    const portFile = path.join(os.tmpdir(), "sand-editor-port");
    const port = fsSync.readFileSync(portFile, "utf-8").trim();
    if (port && !Number.isNaN(Number(port))) {
      return `http://localhost:${port}`;
    }
  } catch {
    // Ignore and use fallback
  }
  return "http://localhost:4003";
}

/** A loaded document with metadata */
interface OpenDocument {
  filePath: string;
  document: SandDocument;
  dirty: boolean;
}

/** Document manager state */
const openDocuments = new Map<string, OpenDocument>();
let activeFilePath: string | null = null;

// ─── Public API ───────────────────────────────────────────────

/** Open a .sand file. Creates it if it doesn't exist. */
export async function openDocument(filePath: string): Promise<OpenDocument> {
  // Already open?
  const existing = openDocuments.get(filePath);
  if (existing) {
    activeFilePath = filePath;
    return existing;
  }

  // Check if file exists
  const exists = await fileExists(filePath);

  let document: SandDocument;
  if (exists) {
    const json = await readFile(filePath, "utf-8");
    const result = parseSandDocument(json);
    if (!result.ok) {
      throw new Error(`Failed to parse ${filePath}: ${result.error}`);
    }
    document = result.document;
  } else {
    // Create new empty document
    const name = filePath.split("/").pop()?.replace(".sand", "") ?? "Untitled";
    document = createEmptyDocument(name);
    await writeFile(filePath, serializeSandDocument(document), "utf-8");
  }

  const entry: OpenDocument = { filePath, document, dirty: false };
  openDocuments.set(filePath, entry);
  activeFilePath = filePath;
  return entry;
}

/** Get a document, auto-opening if needed */
export async function getDocument(filePath: string): Promise<OpenDocument> {
  const existing = openDocuments.get(filePath);
  if (existing) return existing;
  return openDocument(filePath);
}

/** Save a document to disk */
export async function saveDocument(filePath: string): Promise<void> {
  const entry = openDocuments.get(filePath);
  if (!entry) throw new Error(`Document not open: ${filePath}`);

  const jsonString = serializeSandDocument(entry.document);
  await writeFile(filePath, jsonString, "utf-8");
  entry.dirty = false;

  // Broadcast to live Editor via Vite dev server
  try {
    await fetch("http://127.0.0.1:4003/api/document-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString,
    });
  } catch (err) {
    // Silently ignore if editor is not running
  }
}

/** Mark a document as modified and auto-save */
export async function markDirtyAndSave(filePath: string): Promise<void> {
  const entry = openDocuments.get(filePath);
  if (!entry) throw new Error(`Document not open: ${filePath}`);
  entry.dirty = true;
  await saveDocument(filePath);
}

/** Get the active file path */
export function getActiveFilePath(): string | null {
  return activeFilePath;
}

/** List all open documents */
export function listOpenDocuments(): Array<{
  filePath: string;
  name: string | undefined;
  active: boolean;
  dirty: boolean;
  nodeCount: number;
}> {
  return Array.from(openDocuments.values()).map((entry) => ({
    filePath: entry.filePath,
    name: entry.document.name,
    active: entry.filePath === activeFilePath,
    dirty: entry.dirty,
    nodeCount: countNodes(entry.document.children),
  }));
}

// ─── Node Helpers ─────────────────────────────────────────────

/** Find a node by ID in a document tree */
export function findNodeById(nodes: SandNode[], id: string): SandNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if ("children" in node && node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Find nodes matching a pattern */
export function findNodesByPattern(
  nodes: SandNode[],
  pattern: { type?: string; name?: string; reusable?: boolean },
  maxDepth = Infinity,
  currentDepth = 0
): SandNode[] {
  if (currentDepth > maxDepth) return [];

  const results: SandNode[] = [];
  for (const node of nodes) {
    let matches = true;
    if (pattern.type && node.type !== pattern.type) matches = false;
    if (pattern.name && (!("name" in node) || node.name !== pattern.name)) matches = false;
    if (
      pattern.reusable !== undefined &&
      (node.type !== "frame" || node.reusable !== pattern.reusable)
    )
      matches = false;

    if (matches) results.push(node);

    if ("children" in node && node.children) {
      results.push(...findNodesByPattern(node.children, pattern, maxDepth, currentDepth + 1));
    }
  }
  return results;
}

/** Trim a node tree to a max depth */
export function trimToDepth(node: SandNode, maxDepth: number, currentDepth = 0): SandNode {
  if (currentDepth >= maxDepth) {
    if ("children" in node && node.children && node.children.length > 0) {
      const { children: _ignored, ...rest } = node;
      return { ...rest, children: undefined } as SandNode;
    }
    return node;
  }

  if ("children" in node && node.children) {
    return {
      ...node,
      children: node.children.map((child) => trimToDepth(child, maxDepth, currentDepth + 1)),
    } as SandNode;
  }

  return node;
}

/** Count total nodes in a tree */
function countNodes(nodes: SandNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if ("children" in node && node.children) {
      count += countNodes(node.children);
    }
  }
  return count;
}

/** Find a node's parent and the node itself by ID */
export function findNodeAndParent(
  nodes: SandNode[],
  id: string
): { node: SandNode; parent: SandNode[] } | undefined {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      return { node: nodes[i], parent: nodes };
    }
    const node = nodes[i];
    if ("children" in node && node.children) {
      const found = findNodeAndParent(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

// ─── Tree Mutation Helpers ─────────────────────────────────────

/** Deep clone a SandNode tree, optionally regenerating all IDs */
export function deepCloneNode(node: SandNode, regenerateIds = true): SandNode {
  const clone = JSON.parse(JSON.stringify(node)) as SandNode;
  if (regenerateIds) {
    assignNewIds(clone);
  }
  return clone;
}

function assignNewIds(node: SandNode): void {
  node.id = generateId();
  if ("children" in node && node.children) {
    for (const child of node.children) {
      assignNewIds(child);
    }
  }
}

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Move a node from its current position to a new parent at an optional index.
 * Works on the document's direct children array and any nested children.
 * Returns the moved node, or undefined if not found.
 */
export function moveNode(
  rootChildren: SandNode[],
  nodeId: string,
  newParentId: string | null,
  index?: number
): SandNode | undefined {
  // 1. Remove node from current location
  const removed = removeNodeFromTree(rootChildren, nodeId);
  if (!removed) return undefined;

  // 2. Insert into new parent
  if (newParentId === null || newParentId === "__root__") {
    if (index !== undefined) {
      rootChildren.splice(index, 0, removed);
    } else {
      rootChildren.push(removed);
    }
  } else {
    const parent = findNodeById(rootChildren, newParentId);
    if (!parent) {
      // Restore the node at root if parent not found
      rootChildren.push(removed);
      throw new Error(`Target parent not found: ${newParentId}`);
    }
    if (parent.type !== "frame" && parent.type !== "ref") {
      rootChildren.push(removed);
      throw new Error(`Node ${newParentId} cannot have children (type: ${parent.type})`);
    }
    const frameParent = parent as { children?: SandNode[] };
    if (!frameParent.children) frameParent.children = [];
    if (index !== undefined) {
      frameParent.children.splice(index, 0, removed);
    } else {
      frameParent.children.push(removed);
    }
  }

  return removed;
}

/** Remove a node by ID from the tree, returning the removed node */
function removeNodeFromTree(nodes: SandNode[], id: string): SandNode | undefined {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      return nodes.splice(i, 1)[0];
    }
    const node = nodes[i];
    if ("children" in node && node.children) {
      const found = removeNodeFromTree(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Replace a node in the tree with a new node. Returns the old node if found. */
export function replaceNodeInTree(
  nodes: SandNode[],
  targetId: string,
  newNode: SandNode
): SandNode | undefined {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) {
      const old = nodes[i];
      nodes[i] = newNode;
      return old;
    }
    const node = nodes[i];
    if ("children" in node && node.children) {
      const found = replaceNodeInTree(node.children, targetId, newNode);
      if (found) return found;
    }
  }
  return undefined;
}

/** Layout rect for spatial queries */
export interface LayoutRect {
  id: string;
  name?: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: LayoutRect[];
}

/**
 * Compute approximate layout rectangles for nodes.
 * Uses explicit width/height/x/y when available, falls back to defaults.
 * For nested frame children, computes positions based on layout direction.
 */
export function computeLayout(
  nodes: SandNode[],
  parentX = 0,
  parentY = 0,
  maxDepth = Infinity,
  currentDepth = 0
): LayoutRect[] {
  if (currentDepth > maxDepth) return [];

  const rects: LayoutRect[] = [];
  let offsetX = parentX;
  let offsetY = parentY;

  for (const node of nodes) {
    const w = resolveSize(node.width, 200);
    const h = resolveSize(node.height, 40);
    const x = node.x ?? offsetX;
    const y = node.y ?? offsetY;

    const rect: LayoutRect = {
      id: node.id,
      name: "name" in node ? (node.name as string) : undefined,
      type: node.type,
      x,
      y,
      width: w,
      height: h,
    };

    if ("children" in node && node.children && currentDepth < maxDepth) {
      const padding = resolvePaddingValue(node);
      rect.children = computeLayout(
        node.children,
        x + padding,
        y + padding,
        maxDepth,
        currentDepth + 1
      );
    }

    rects.push(rect);

    // Advance offset based on parent layout direction
    // (simplified — assumes vertical stacking for now)
    const gap = "gap" in node ? ((node.gap as number) ?? 0) : 0;
    offsetY = y + h + gap;
  }

  return rects;
}

function resolveSize(value: number | string | undefined, fallback: number): number {
  if (typeof value === "number") return value;
  return fallback;
}

function resolvePaddingValue(node: SandNode): number {
  if (!("padding" in node) || node.padding === undefined) return 0;
  const p = node.padding;
  if (typeof p === "number") return p;
  if (Array.isArray(p)) return p[0]; // Use top padding as approximation
  return 0;
}

// ─── Private Helpers ──────────────────────────────────────────

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
