/**
 * Sand I/O — Converters between SandDocument ↔ editor store state.
 *
 * `loadFromSandDocument()` converts a parsed SandDocument into ScreenNode[] + variables.
 * `exportToSandDocument()` converts back from editor state to SandDocument for saving.
 */

import type { SandDocument, SandNode, Conversation } from "@sand/core";
import type { ScreenNode, ScreenNodeData, VariableDefinition } from "../store/editor-store";

export interface LoadResult {
  screens: ScreenNode[];
  variables: Record<string, VariableDefinition>;
  themes: Record<string, string[]>;
  activeTheme: Record<string, string>;
  conversations: Conversation[];
}

/**
 * Convert a SandDocument into editor store state.
 * Each top-level child becomes a ScreenNode on the canvas.
 */
export function loadFromSandDocument(doc: SandDocument): LoadResult {
  const screens: ScreenNode[] = doc.children.map((child, index) => {
    const frame = child as SandNode & { children?: SandNode[] };
    const id = frame.id;

    const data: ScreenNodeData = {
      label: frame.name ?? `Screen ${index + 1}`,
      width: (frame.width as number) ?? doc.width ?? 1440,
      height: (frame.height as number) ?? doc.height ?? 900,
      fill: "fill" in frame ? (frame.fill as string | undefined) : undefined,
      children: frame.children ?? [],
    };

    return {
      id,
      type: "screen" as const,
      position: {
        x: (frame.x as number) ?? 100 + index * 1600,
        y: (frame.y as number) ?? 100,
      },
      data,
      dragHandle: ".screen-node__header",
    };
  });

  // Extract variables if present
  const variables = (doc.variables ?? {}) as Record<string, VariableDefinition>;
  const themes = (doc.themes ?? {}) as Record<string, string[]>;
  const activeTheme = (doc.activeTheme ?? {}) as Record<string, string>;
  const conversations = (doc.conversations ?? []) as Conversation[];

  return { screens, variables, themes, activeTheme, conversations };
}

/**
 * Convert editor store state back to a SandDocument for saving.
 */
export function exportToSandDocument(
  screens: ScreenNode[],
  variables: Record<string, VariableDefinition>,
  themes: Record<string, string[]>,
  activeTheme: Record<string, string>,
  conversations: Conversation[],
  docName?: string
): SandDocument {
  const children: SandNode[] = screens.map((screen) => ({
    type: "frame" as const,
    id: screen.id,
    name: screen.data.label,
    x: screen.position.x,
    y: screen.position.y,
    width: screen.data.width,
    height: screen.data.height,
    children: screen.data.children,
  }));

  return {
    version: 1,
    name: docName ?? "Untitled",
    children,
    ...(Object.keys(variables).length > 0 ? { variables } : {}),
    ...(Object.keys(themes).length > 0 ? { themes } : {}),
    ...(Object.keys(activeTheme).length > 0 ? { activeTheme } : {}),
    ...(conversations.length > 0 ? { conversations } : {}),
  };
}
