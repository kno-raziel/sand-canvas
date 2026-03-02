import { createElement, type ComponentType } from "react";
import { z } from "zod/v4";
import type { ComponentDefinition } from "./types";

// ─── Spec Types ───────────────────────────────────────────────

/**
 * Defines a single prop for a React-wrapped component.
 */
export interface ReactPropDef {
  /** The prop's data type */
  type: "string" | "number" | "boolean" | "enum";
  /** Allowed values for enum type */
  values?: string[];
  /** Default value */
  default: unknown;
}

/**
 * Specification for wrapping an existing React component as a Sand ComponentDefinition.
 *
 * This is for component libraries that export real React components
 * (e.g. shadcn/ui, MUI, your own design system).
 *
 * @example
 * ```ts
 * const buttonSpec: ReactWrapSpec = {
 *   name: "Button",
 *   displayName: "Button",
 *   category: "Actions",
 *   component: Button,
 *   props: {
 *     variant: { type: "enum", values: ["gradient","glass","outlined"], default: "gradient" },
 *     size: { type: "enum", values: ["sm","md","lg"], default: "md" },
 *     showArrow: { type: "boolean", default: false },
 *   },
 *   contentProp: "children",
 * };
 * ```
 */
export interface ReactWrapSpec {
  /** Component identifier, e.g. "Button" */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Grouping category, e.g. "Actions", "Data Display" */
  category: string;
  /** The actual React component to render */
  component: ComponentType<Record<string, unknown>>;
  /** Prop definitions for the property panel */
  props: Record<string, ReactPropDef>;
  /** Which prop is used for text content / children */
  contentProp?: string;
}

// ─── Schema Generation ────────────────────────────────────────

function buildZodSchema(spec: ReactWrapSpec): z.ZodObject {
  const shape: Record<string, z.ZodType> = {};

  for (const [key, prop] of Object.entries(spec.props)) {
    switch (prop.type) {
      case "string":
        shape[key] = z.string().default(prop.default as string);
        break;
      case "number":
        shape[key] = z.number().default(prop.default as number);
        break;
      case "boolean":
        shape[key] = z.boolean().default(prop.default as boolean);
        break;
      case "enum":
        if (prop.values && prop.values.length > 0) {
          shape[key] = z.enum(prop.values as [string, ...string[]]).default(prop.default as string);
        }
        break;
    }
  }

  // Content prop (children text)
  if (spec.contentProp && !(spec.contentProp in shape)) {
    shape[spec.contentProp] = z.string().default(spec.displayName);
  }

  return z.object(shape);
}

// ─── Defaults Generation ──────────────────────────────────────

function buildDefaults(spec: ReactWrapSpec): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(spec.props)) {
    defaults[key] = prop.default;
  }

  if (spec.contentProp && !(spec.contentProp in defaults)) {
    defaults[spec.contentProp] = spec.displayName;
  }

  return defaults;
}

// ─── Render Function ──────────────────────────────────────────

function buildRenderFn(spec: ReactWrapSpec): (props: Record<string, unknown>) => unknown {
  return (props: Record<string, unknown>) => {
    // Pass all props through to the real component
    const componentProps: Record<string, unknown> = {};

    for (const key of Object.keys(spec.props)) {
      if (key in props) {
        componentProps[key] = props[key];
      }
    }

    // Content prop becomes children
    const children = spec.contentProp ? (props[spec.contentProp] as string) : undefined;

    return createElement(spec.component, componentProps, children);
  };
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Wrap an existing React component into a Sand ComponentDefinition.
 *
 * Generates a Zod prop schema, defaults, and a render function
 * that delegates to the real React component.
 *
 * @example
 * ```ts
 * import { Button } from "your-component-library";
 *
 * const buttonDef = wrapReactComponent({
 *   name: "Button", displayName: "Button", category: "Actions",
 *   component: Button,
 *   props: {
 *     variant: { type: "enum", values: ["gradient","glass","outlined"], default: "gradient" },
 *     size: { type: "enum", values: ["sm","md","lg"], default: "md" },
 *   },
 *   contentProp: "children",
 * });
 * ```
 */
export function wrapReactComponent(spec: ReactWrapSpec): ComponentDefinition {
  return {
    name: spec.name,
    displayName: spec.displayName,
    category: spec.category,
    propSchema: buildZodSchema(spec),
    defaults: buildDefaults(spec),
    render: buildRenderFn(spec),
  };
}
