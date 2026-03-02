/**
 * batch_design — Execute Insert, Update, Delete, Copy, Replace, Move, Generate
 * operations on a .sand file.
 *
 * Operations:
 * - I(parent, nodeData) — Insert a new node as child of parent
 * - U(nodeId, updateData) — Update properties of an existing node
 * - D(nodeId) — Delete a node
 * - C(sourceId, parentId, {overrides}) — Copy (deep clone with new IDs)
 * - R(targetPath, {nodeData}) — Replace a node entirely
 * - M(nodeId, parentId, index?) — Move a node to a new parent
 * - G(nodeId, type, prompt) — Generate/set image metadata on a node
 *
 * Operations are parsed from a simple DSL string, one per line.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SandNode } from "@sand/core";
import {
  getDocument,
  findNodeById,
  findNodeAndParent,
  markDirtyAndSave,
  deepCloneNode,
  moveNode,
  replaceNodeInTree,
} from "../document-manager";

/** Parsed operation types */
interface InsertOp {
  kind: "insert";
  binding: string;
  parentRef: string;
  nodeData: Record<string, unknown>;
}

interface UpdateOp {
  kind: "update";
  path: string;
  updateData: Record<string, unknown>;
}

interface DeleteOp {
  kind: "delete";
  nodeId: string;
}

interface CopyOp {
  kind: "copy";
  binding: string;
  sourceRef: string;
  parentRef: string;
  overrides: Record<string, unknown>;
}

interface ReplaceOp {
  kind: "replace";
  binding: string;
  targetPath: string;
  nodeData: Record<string, unknown>;
}

interface MoveOp {
  kind: "move";
  nodeRef: string;
  parentRef: string | undefined;
  index: number | undefined;
}

interface GenerateOp {
  kind: "generate";
  nodeRef: string;
  imageType: string;
  prompt: string;
}

type Operation = InsertOp | UpdateOp | DeleteOp | CopyOp | ReplaceOp | MoveOp | GenerateOp;

export function registerBatchDesign(server: McpServer): void {
  server.registerTool(
    "batch_design",
    {
      title: "Batch Design Operations",
      description:
        "Execute insert/update/delete/copy/replace/move/generate operations on a .sand file. " +
        "Operations are specified one per line in a simple DSL:\n" +
        '- binding=I(parentId, {type: "frame", ...})\n' +
        '- U(nodeId, {fill: "#fff", ...})\n' +
        "- D(nodeId)\n" +
        "- binding=C(sourceId, parentId, {overrides})\n" +
        '- binding=R(targetPath, {type: "text", ...})\n' +
        "- M(nodeId, parentId, index?)\n" +
        '- G(nodeId, "ai"|"stock", "prompt")\n\n' +
        "Bindings from Insert/Copy/Replace can be referenced as parent in later operations. " +
        'Use "document" to insert at the root level.',
      inputSchema: {
        filePath: z.string().describe("Absolute path to the .sand file"),
        operations: z
          .string()
          .describe("Operations DSL, one per line. See tool description for syntax."),
      },
    },
    async ({ filePath, operations }) => {
      try {
        const entry = await getDocument(filePath);
        const ops = parseOperations(operations);
        const bindings = new Map<string, string>();
        // "document" binding always refers to root
        bindings.set("document", "__root__");

        const results: Array<{ op: string; nodeId: string }> = [];

        for (const op of ops) {
          switch (op.kind) {
            case "insert": {
              const parentId = resolveRef(op.parentRef, bindings);
              const nodeData = resolveNodeData(op.nodeData, bindings);

              // Generate ID if not provided
              if (!nodeData.id) {
                nodeData.id = generateId();
              }
              const newNode = nodeData as unknown as SandNode;

              if (parentId === "__root__") {
                entry.document.children.push(newNode);
              } else {
                const parent = findNodeById(entry.document.children, parentId);
                if (!parent) throw new Error(`Parent node not found: ${parentId}`);
                if (parent.type !== "frame" && parent.type !== "ref") {
                  throw new Error(`Node ${parentId} cannot have children (type: ${parent.type})`);
                }
                const frameParent = parent as { children?: SandNode[] };
                if (!frameParent.children) frameParent.children = [];
                frameParent.children.push(newNode);
              }

              bindings.set(op.binding, String(newNode.id));
              results.push({ op: `I(${op.parentRef})`, nodeId: String(newNode.id) });
              break;
            }

            case "update": {
              const nodeId = resolveRef(op.path, bindings);
              const node = findNodeById(entry.document.children, nodeId);
              if (!node) throw new Error(`Node not found: ${nodeId}`);

              // Merge update data into node (shallow)
              Object.assign(node, op.updateData);
              results.push({ op: `U(${op.path})`, nodeId });
              break;
            }

            case "delete": {
              const nodeId = resolveRef(op.nodeId, bindings);

              // Try root level first
              const rootIndex = entry.document.children.findIndex((n) => n.id === nodeId);
              if (rootIndex !== -1) {
                entry.document.children.splice(rootIndex, 1);
              } else {
                const found = findNodeAndParent(entry.document.children, nodeId);
                if (!found) throw new Error(`Node not found: ${nodeId}`);
                const idx = found.parent.findIndex((n) => n.id === nodeId);
                if (idx !== -1) found.parent.splice(idx, 1);
              }

              results.push({ op: `D(${op.nodeId})`, nodeId });
              break;
            }

            case "copy": {
              const sourceId = resolveRef(op.sourceRef, bindings);
              const parentId = resolveRef(op.parentRef, bindings);

              const source = findNodeById(entry.document.children, sourceId);
              if (!source) throw new Error(`Source node not found: ${sourceId}`);

              // Deep clone with new IDs
              const clone = deepCloneNode(source, true);

              // Apply overrides to the cloned root
              if (Object.keys(op.overrides).length > 0) {
                Object.assign(clone, op.overrides);
              }

              if (parentId === "__root__") {
                entry.document.children.push(clone);
              } else {
                const parent = findNodeById(entry.document.children, parentId);
                if (!parent) throw new Error(`Parent node not found: ${parentId}`);
                const frameParent = parent as { children?: SandNode[] };
                if (!frameParent.children) frameParent.children = [];
                frameParent.children.push(clone);
              }

              bindings.set(op.binding, clone.id);
              results.push({ op: `C(${op.sourceRef}, ${op.parentRef})`, nodeId: clone.id });
              break;
            }

            case "replace": {
              const targetId = resolveRef(op.targetPath, bindings);
              const nodeData = resolveNodeData(op.nodeData, bindings);

              if (!nodeData.id) {
                nodeData.id = generateId();
              }
              const newNode = nodeData as unknown as SandNode;

              const old = replaceNodeInTree(entry.document.children, targetId, newNode);
              if (!old) throw new Error(`Target node not found: ${targetId}`);

              bindings.set(op.binding, newNode.id);
              results.push({ op: `R(${op.targetPath})`, nodeId: newNode.id });
              break;
            }

            case "move": {
              const nodeId = resolveRef(op.nodeRef, bindings);
              const parentId = op.parentRef ? resolveRef(op.parentRef, bindings) : null;

              const moved = moveNode(entry.document.children, nodeId, parentId, op.index);
              if (!moved) throw new Error(`Node not found: ${nodeId}`);

              results.push({ op: `M(${op.nodeRef})`, nodeId });
              break;
            }

            case "generate": {
              const nodeId = resolveRef(op.nodeRef, bindings);
              const node = findNodeById(entry.document.children, nodeId);
              if (!node) throw new Error(`Node not found: ${nodeId}`);

              // Build image URL based on type
              const keywords = encodeURIComponent(op.prompt.replace(/\s+/g, ","));
              const w = typeof node.width === "number" ? node.width : 400;
              const h = typeof node.height === "number" ? node.height : 300;

              let src: string;
              if (op.imageType === "stock") {
                // Unsplash source API (no key needed)
                src = `https://source.unsplash.com/${w}x${h}/?${keywords}`;
              } else {
                // Fallback: picsum with seed from prompt for deterministic results
                src = `https://picsum.photos/seed/${keywords}/${w}/${h}`;
              }

              // Set imageFill on the node
              Object.assign(node, {
                imageFill: { src, objectFit: "cover" },
              });

              results.push({ op: `G(${op.nodeRef})`, nodeId });
              break;
            }
          }
        }

        // Save to disk
        await markDirtyAndSave(filePath);

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ results }, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}

// ─── DSL Parser ───────────────────────────────────────────────

function parseOperations(dsl: string): Operation[] {
  const lines = dsl
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));

  return lines.map(parseLine);
}

function parseLine(line: string): Operation {
  // Insert: binding=I(parent, {...})
  const insertMatch = line.match(/^(\w+)\s*=\s*I\((.+?)\s*,\s*(\{.+\})\s*\)$/s);
  if (insertMatch) {
    const [, binding, parentRef, jsonStr] = insertMatch;
    return {
      kind: "insert",
      binding,
      parentRef: parentRef.trim(),
      nodeData: parseJSON(jsonStr),
    };
  }

  // Update: U(path, {...})
  const updateMatch = line.match(/^U\((.+?)\s*,\s*(\{.+\})\s*\)$/s);
  if (updateMatch) {
    const [, path, jsonStr] = updateMatch;
    return {
      kind: "update",
      path: path.trim(),
      updateData: parseJSON(jsonStr),
    };
  }

  // Delete: D(nodeId)
  const deleteMatch = line.match(/^D\((.+?)\)$/);
  if (deleteMatch) {
    const [, nodeId] = deleteMatch;
    return {
      kind: "delete",
      nodeId: nodeId.trim(),
    };
  }

  // Copy: binding=C(sourceId, parentId, {overrides})
  const copyMatch = line.match(/^(\w+)\s*=\s*C\((.+?)\s*,\s*(.+?)\s*,\s*(\{.+\})\s*\)$/s);
  if (copyMatch) {
    const [, binding, sourceRef, parentRef, jsonStr] = copyMatch;
    return {
      kind: "copy",
      binding,
      sourceRef: sourceRef.trim(),
      parentRef: parentRef.trim(),
      overrides: parseJSON(jsonStr),
    };
  }

  // Replace: binding=R(targetPath, {...})
  const replaceMatch = line.match(/^(\w+)\s*=\s*R\((.+?)\s*,\s*(\{.+\})\s*\)$/s);
  if (replaceMatch) {
    const [, binding, targetPath, jsonStr] = replaceMatch;
    return {
      kind: "replace",
      binding,
      targetPath: targetPath.trim(),
      nodeData: parseJSON(jsonStr),
    };
  }

  // Move: M(nodeId, parentId?, index?)
  const moveMatch = line.match(/^M\((.+?)(?:\s*,\s*(.+?))?(?:\s*,\s*(\d+))?\s*\)$/);
  if (moveMatch) {
    const [, nodeRef, parentRef, indexStr] = moveMatch;
    return {
      kind: "move",
      nodeRef: nodeRef.trim(),
      parentRef: parentRef?.trim(),
      index: indexStr ? Number(indexStr) : undefined,
    };
  }

  // Generate: G(nodeId, "type", "prompt")
  const generateMatch = line.match(/^G\((.+?)\s*,\s*"(.+?)"\s*,\s*"(.+?)"\s*\)$/);
  if (generateMatch) {
    const [, nodeRef, imageType, prompt] = generateMatch;
    return {
      kind: "generate",
      nodeRef: nodeRef.trim(),
      imageType,
      prompt,
    };
  }

  throw new Error(`Invalid operation: ${line}`);
}

function parseJSON(str: string): Record<string, unknown> {
  // Normalize single quotes → double quotes
  let normalized = str.replace(/'/g, '"');

  // Quote unquoted object keys:
  // Match word chars before a colon that are NOT preceded by a double quote
  // and NOT preceded by another word char (to avoid matching inside values like "daisyui:Stat").
  // Strategy: only quote keys that appear after { or , (the start of a JSON pair).
  normalized = normalized.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON in operation: ${str}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function resolveRef(ref: string, bindings: Map<string, string>): string {
  // Handle binding+path combinations like: binding+"/childId"
  if (ref.includes("+")) {
    const parts = ref.split("+").map((p) => p.trim().replace(/^["']|["']$/g, ""));
    return parts.map((p) => bindings.get(p) ?? p).join("");
  }

  // Strip quotes from literal strings
  const cleaned = ref.replace(/^["']|["']$/g, "");
  return bindings.get(cleaned) ?? cleaned;
}

function resolveNodeData(
  data: Record<string, unknown>,
  bindings: Map<string, string>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && bindings.has(value)) {
      resolved[key] = bindings.get(value);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}
