import type { z } from "zod/v4";

/**
 * Definition of a single component inside an adapter.
 *
 * Each component has:
 * - A Zod prop schema that drives the property panel
 * - A render function that produces React output
 * - Sensible defaults for all props
 */
export interface ComponentDefinition<TSchema extends z.ZodObject = z.ZodObject> {
  /** Component identifier, e.g. "Button" */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Grouping category, e.g. "Actions", "Data Display" */
  category: string;
  /** Zod schema for the component's editable props */
  propSchema: TSchema;
  /** Default values for all props */
  defaults: z.infer<TSchema>;
  /** Render function — takes merged props, returns framework nodes (React, etc.) */
  render: (props: Record<string, unknown>) => unknown;
}

/**
 * An adapter wraps a component library (daisyUI, Mantine, etc.)
 * and provides Sand-compatible component definitions.
 */
export interface Adapter {
  /** Unique identifier, e.g. "daisyui" */
  id: string;
  /** Human-readable name, e.g. "daisyUI" */
  name: string;
  /** Library version */
  version: string;
  /** All components this adapter provides */
  components: ComponentDefinition[];
}

/**
 * Resolve a "adapter:component" ref string into its parts.
 * Returns undefined if the format is invalid.
 */
export function parseRef(ref: string): { adapterId: string; componentName: string } | undefined {
  const colonIndex = ref.indexOf(":");
  if (colonIndex === -1) return undefined;
  return {
    adapterId: ref.slice(0, colonIndex),
    componentName: ref.slice(colonIndex + 1),
  };
}
