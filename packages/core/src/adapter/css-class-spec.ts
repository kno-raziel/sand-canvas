import { createElement, type ReactNode } from "react";
import { z } from "zod/v4";
import type { ComponentDefinition, Adapter } from "./types";

// ─── Spec Types ───────────────────────────────────────────────

/**
 * Defines a CSS class modifier driven by an enum prop.
 *
 * Example: `{ prefix: "btn-", values: ["primary","secondary"], default: "neutral" }`
 * With prop value "primary" → class "btn-primary"
 * With prop value "neutral" (default) → no extra class
 */
export interface CssModifier {
  /** Class prefix prepended to the value, e.g. "btn-" */
  prefix: string;
  /** Allowed values for this modifier */
  values: string[];
  /** Value that produces no extra class (skipped in output) */
  default?: string;
}

/**
 * Defines a boolean CSS class modifier.
 *
 * Example: `{ class: "btn-outline" }`
 * When true → adds "btn-outline" to the class list
 */
export interface CssBooleanModifier {
  /** Class to add when the boolean prop is true */
  class: string;
}

/**
 * Defines the structure of a child element for compound components.
 * Used for components like Card that have nested structure.
 */
export interface CssChildSpec {
  /** HTML element tag, e.g. "div", "h2", "p" */
  element: string;
  /** Static CSS class(es) for this element */
  class?: string;
  /** Prop name whose value becomes the text content */
  content?: string;
  /** Static HTML attributes (e.g. role, aria-*, type) */
  attrs?: Record<string, unknown>;
  /** Nested children specs */
  children?: CssChildSpec[];
}

/**
 * Complete declarative specification for a CSS-class-based component.
 *
 * Defines everything needed to generate a `ComponentDefinition`:
 * - What HTML element to render
 * - Which CSS classes to apply (base + modifiers)
 * - Which props to expose (inferred from modifiers/booleans/content)
 * - How to render compound children structures
 */
export interface CssComponentSpec {
  /** Component identifier, e.g. "Button" */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Grouping category, e.g. "Actions", "Data Display" */
  category: string;
  /** Root HTML element tag, e.g. "button", "div", "span" */
  element: string;
  /** Always-applied CSS class(es), e.g. "btn" or "card bg-base-100 shadow-sm" */
  baseClass: string;
  /** Enum-style modifiers (e.g. variant, size) */
  modifiers?: Record<string, CssModifier>;
  /** Boolean toggle modifiers (e.g. outline, compact) */
  booleans?: Record<string, CssBooleanModifier>;
  /** Prop name for the text content of the root element */
  content?: string;
  /** Props that pass through as HTML attributes (e.g. disabled, type) */
  attrs?: Record<string, string | boolean>;
  /** Child element specs for compound components */
  children?: CssChildSpec[];
}

// ─── Schema Generation ────────────────────────────────────────

function buildZodSchema(spec: CssComponentSpec): z.ZodObject {
  const shape: Record<string, z.ZodType> = {};

  // Content prop → string
  if (spec.content) {
    shape[spec.content] = z.string().default(spec.displayName);
  }

  // Enum modifiers → z.enum with default
  if (spec.modifiers) {
    for (const [key, mod] of Object.entries(spec.modifiers)) {
      const allValues =
        mod.default && !mod.values.includes(mod.default)
          ? [mod.default, ...mod.values]
          : mod.values;
      shape[key] = z.enum(allValues as [string, ...string[]]).default(mod.default ?? mod.values[0]);
    }
  }

  // Boolean modifiers → z.boolean with default false
  if (spec.booleans) {
    for (const key of Object.keys(spec.booleans)) {
      shape[key] = z.boolean().default(false);
    }
  }

  // Attr props that are boolean → z.boolean
  if (spec.attrs) {
    for (const [key, val] of Object.entries(spec.attrs)) {
      if (typeof val === "boolean") {
        shape[key] = z.boolean().default(false);
      }
    }
  }

  // Content props from children specs
  if (spec.children) {
    collectChildContentProps(spec.children, shape);
  }

  return z.object(shape);
}

/** Recursively find all content props in children specs */
function collectChildContentProps(
  children: CssChildSpec[],
  shape: Record<string, z.ZodType>
): void {
  for (const child of children) {
    if (child.content && !(child.content in shape)) {
      shape[child.content] = z.string().default("");
    }
    if (child.children) {
      collectChildContentProps(child.children, shape);
    }
  }
}

// ─── Defaults Generation ──────────────────────────────────────

function buildDefaults(spec: CssComponentSpec): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  if (spec.content) {
    defaults[spec.content] = spec.displayName;
  }

  if (spec.modifiers) {
    for (const [key, mod] of Object.entries(spec.modifiers)) {
      defaults[key] = mod.default ?? mod.values[0];
    }
  }

  if (spec.booleans) {
    for (const key of Object.keys(spec.booleans)) {
      defaults[key] = false;
    }
  }

  if (spec.attrs) {
    for (const [key, val] of Object.entries(spec.attrs)) {
      if (typeof val === "boolean") {
        defaults[key] = false;
      }
    }
  }

  if (spec.children) {
    collectChildDefaults(spec.children, defaults);
  }

  return defaults;
}

function collectChildDefaults(children: CssChildSpec[], defaults: Record<string, unknown>): void {
  for (const child of children) {
    if (child.content && !(child.content in defaults)) {
      // Use a readable placeholder derived from the prop name (e.g. "item1" → "Item 1")
      defaults[child.content] = child.content
        .replace(/([a-z])(\d+)/g, "$1 $2")
        .replace(/^./, (s) => s.toUpperCase());
    }
    if (child.children) {
      collectChildDefaults(child.children, defaults);
    }
  }
}

// ─── Class Builder ────────────────────────────────────────────

function buildClasses(spec: CssComponentSpec, props: Record<string, unknown>): string {
  const classes: string[] = [spec.baseClass];

  if (spec.modifiers) {
    for (const [key, mod] of Object.entries(spec.modifiers)) {
      const value = props[key] as string;
      if (value && value !== mod.default) {
        classes.push(`${mod.prefix}${value}`);
      }
    }
  }

  if (spec.booleans) {
    for (const [key, boolMod] of Object.entries(spec.booleans)) {
      if (props[key] === true && boolMod.class) {
        classes.push(boolMod.class);
      }
    }
  }

  return classes.filter(Boolean).join(" ");
}

// ─── Render Function ──────────────────────────────────────────

function renderChildSpec(child: CssChildSpec, props: Record<string, unknown>): ReactNode {
  const childContent = child.content ? (props[child.content] as string) : undefined;

  // Build element props: className + any static attrs
  const elProps: Record<string, unknown> = {};
  if (child.class) {
    elProps.className = child.class;
  }
  if (child.attrs) {
    for (const [key, val] of Object.entries(child.attrs)) {
      elProps[key] = val;
    }
  }

  if (child.children) {
    const renderedChildren = child.children.map((c) => renderChildSpec(c, props)) as ReactNode[];
    return createElement(
      child.element,
      Object.keys(elProps).length > 0 ? elProps : null,
      ...renderedChildren
    );
  }

  return createElement(
    child.element,
    Object.keys(elProps).length > 0 ? elProps : null,
    childContent
  );
}

function buildRenderFn(spec: CssComponentSpec): (props: Record<string, unknown>) => unknown {
  return (props: Record<string, unknown>) => {
    const className = buildClasses(spec, props);

    // Collect HTML attributes
    const htmlAttrs: Record<string, unknown> = { className };
    if (spec.attrs) {
      for (const [key, val] of Object.entries(spec.attrs)) {
        if (typeof val === "boolean") {
          // Boolean attr — use prop value
          htmlAttrs[key] = props[key];
        } else {
          // Static attr value (e.g. type="button")
          htmlAttrs[key] = val;
        }
      }
    }

    // Determine content
    const textContent = spec.content ? (props[spec.content] as string) : undefined;

    // Render compound children if defined
    if (spec.children) {
      const renderedChildren = spec.children.map((c) => renderChildSpec(c, props)) as ReactNode[];
      return createElement(spec.element, htmlAttrs, ...renderedChildren);
    }

    return createElement(spec.element, htmlAttrs, textContent);
  };
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Generate a ComponentDefinition from a CSS component spec.
 *
 * @example
 * ```ts
 * const buttonDef = buildCssComponent({
 *   name: "Button", displayName: "Button", category: "Actions",
 *   element: "button", baseClass: "btn",
 *   modifiers: { variant: { prefix: "btn-", values: ["primary"], default: "neutral" } },
 *   content: "label",
 * });
 * ```
 */
export function buildCssComponent(spec: CssComponentSpec): ComponentDefinition {
  return {
    name: spec.name,
    displayName: spec.displayName,
    category: spec.category,
    propSchema: buildZodSchema(spec),
    defaults: buildDefaults(spec),
    render: buildRenderFn(spec),
  };
}

/**
 * Generate a complete Adapter from an array of CSS component specs.
 *
 * @example
 * ```ts
 * const daisyui = buildCssAdapter("daisyui", "daisyUI", "5.5.17", [
 *   { name: "Button", element: "button", baseClass: "btn", ... },
 *   { name: "Badge", element: "span",  baseClass: "badge", ... },
 * ]);
 * ```
 */
export function buildCssAdapter(
  id: string,
  name: string,
  version: string,
  specs: CssComponentSpec[]
): Adapter {
  return {
    id,
    name,
    version,
    components: specs.map(buildCssComponent),
  };
}
