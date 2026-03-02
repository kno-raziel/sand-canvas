import type {
  SandNode,
  FrameNode,
  TextNode,
  RectangleNode,
  IconNode,
  RefNode,
  BorderSide,
} from "@sand/core";
import { parseRef } from "@sand/core";
import type { ReactNode } from "react";
import { useEditorStore, getProjectComponent } from "../store/editor-store";
import { adapterRegistry } from "../registry/adapter-registry";
import { resolveVariable } from "../utils/resolve-variable";
import { ensureFontLoaded } from "../utils/font-loader";

/**
 * Hook that returns a function to resolve `$variable.name` references.
 * Memoized to avoid re-renders when variables haven't changed.
 */
function useVariableResolver(): (value: string | undefined) => string | undefined {
  const variables = useEditorStore((s) => s.variables);
  const activeTheme = useEditorStore((s) => s.activeTheme);
  return (value: string | undefined) => resolveVariable(value, variables, activeTheme);
}

/**
 * Recursively renders a SandNode tree as React DOM elements.
 *
 * This is the heart of Sand's "Canvas vs Content" pattern:
 * - Screen nodes live on the xyflow canvas (pan/zoom/drag)
 * - Everything INSIDE is rendered by this component as regular DOM with flexbox
 *
 * Layout styles are computed inline from node properties (dynamic).
 * Base styles use Tailwind (static).
 */
export function FrameRenderer({ node }: { node: SandNode }) {
  if (node.visible === false) return null;

  switch (node.type) {
    case "frame":
      return <FrameElement node={node} />;
    case "text":
      return <TextElement node={node} />;
    case "rectangle":
      return <RectangleElement node={node} />;
    case "icon":
      return <IconElement node={node} />;
    case "ref":
      return <RefElement node={node} />;
    default:
      return null;
  }
}

function FrameElement({ node }: { node: FrameNode }) {
  const resolve = useVariableResolver();
  const style = buildFrameStyle(node, resolve);
  const toggleSelection = useEditorStore((s) => s.toggleSandNodeSelection);
  const isSelected = useEditorStore((s) => s.selectedSandNodeIds.includes(node.id));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelection(node.id, e.shiftKey || e.metaKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      toggleSelection(node.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`relative box-border min-h-5 min-w-5 hover:outline-1 hover:-outline-offset-1 hover:outline-indigo-500/40 ${
        isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : ""
      }`}
      data-node-id={node.id}
      data-layout={node.layout ?? "none"}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {node.children?.map((child) => (
        <FrameRenderer key={child.id} node={child} />
      ))}
    </div>
  );
}

function TextElement({ node }: { node: TextNode }) {
  const resolve = useVariableResolver();
  const toggleSelection = useEditorStore((s) => s.toggleSandNodeSelection);
  const isSelected = useEditorStore((s) => s.selectedSandNodeIds.includes(node.id));

  // Load custom fonts dynamically
  ensureFontLoaded(node.fontFamily);
  const style: React.CSSProperties = {
    fontSize: node.fontSize ?? 14,
    fontWeight: node.fontWeight ?? 400,
    fontFamily: node.fontFamily,
    color: resolve(node.color) ?? "inherit",
    textAlign: node.textAlign ?? "left",
    lineHeight: node.lineHeight ? `${node.lineHeight}` : undefined,
    letterSpacing: node.letterSpacing ? `${node.letterSpacing}px` : undefined,
    textDecoration:
      node.textDecoration && node.textDecoration !== "none" ? node.textDecoration : undefined,
    textTransform:
      node.textTransform && node.textTransform !== "none" ? node.textTransform : undefined,
    opacity: node.opacity,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelection(node.id, e.shiftKey || e.metaKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      toggleSelection(node.id);
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      className={`inline-block min-h-[1em] whitespace-pre-wrap wrap-break-word cursor-pointer ${
        isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : ""
      }`}
      data-node-id={node.id}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {node.content}
    </span>
  );
}

function RectangleElement({ node }: { node: RectangleNode }) {
  const borderStyle = resolveBorder(node.border);
  const style: React.CSSProperties = {
    width: resolveDimension(node.width),
    height: resolveDimension(node.height),
    backgroundColor: node.fill,
    borderRadius: resolveCornerRadius(node.cornerRadius),
    opacity: node.opacity,
    ...borderStyle,
  };

  return <div className="box-border min-h-5 min-w-5" data-node-id={node.id} style={style} />;
}

function IconElement({ node }: { node: IconNode }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      data-node-id={node.id}
      style={{
        width: node.size ?? 24,
        height: node.size ?? 24,
        color: node.color ?? "inherit",
        fontSize: node.size ?? 24,
        opacity: node.opacity,
      }}
    >
      {/* Icon rendering — will use icon font families later */}◻
    </span>
  );
}

// ─── Style Helpers ────────────────────────────────────────────

/** Convert node dimensions to CSS values */
function resolveDimension(
  value: number | "fill_container" | "fit_content" | undefined
): string | undefined {
  if (value === undefined) return undefined;
  if (value === "fill_container") return "100%";
  if (value === "fit_content") return "fit-content";
  return `${value}px`;
}

/** Convert corner radius to CSS border-radius */
function resolveCornerRadius(
  value: number | [number, number, number, number] | undefined
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return `${value}px`;
  return value.map((v) => `${v}px`).join(" ");
}

/** Convert padding to CSS */
function resolvePadding(
  value: number | [number, number, number, number] | undefined
): React.CSSProperties {
  if (value === undefined) return {};
  if (typeof value === "number") return { padding: `${value}px` };
  const [top, right, bottom, left] = value;
  return { padding: `${top}px ${right}px ${bottom}px ${left}px` };
}

/** Convert border schema to CSS properties */
function resolveBorder(
  value: FrameNode["border"],
  resolve: (v: string | undefined) => string | undefined = (v) => v
): React.CSSProperties {
  if (value === undefined) return {};

  // Check if it's a uniform border (has `width`, `color`, or `style` at top level)
  if ("width" in value || "color" in value || "style" in value) {
    const side = value as BorderSide;
    return {
      borderWidth: side.width,
      borderColor: resolve(side.color),
      borderStyle: side.style ?? (side.width ? "solid" : undefined),
    };
  }

  // Per-side borders
  const perSide = value as {
    top?: BorderSide;
    right?: BorderSide;
    bottom?: BorderSide;
    left?: BorderSide;
  };
  const result: React.CSSProperties = {};

  if (perSide.top) {
    result.borderTopWidth = perSide.top.width;
    result.borderTopColor = perSide.top.color;
    result.borderTopStyle = perSide.top.style ?? "solid";
  }
  if (perSide.right) {
    result.borderRightWidth = perSide.right.width;
    result.borderRightColor = perSide.right.color;
    result.borderRightStyle = perSide.right.style ?? "solid";
  }
  if (perSide.bottom) {
    result.borderBottomWidth = perSide.bottom.width;
    result.borderBottomColor = perSide.bottom.color;
    result.borderBottomStyle = perSide.bottom.style ?? "solid";
  }
  if (perSide.left) {
    result.borderLeftWidth = perSide.left.width;
    result.borderLeftColor = perSide.left.color;
    result.borderLeftStyle = perSide.left.style ?? "solid";
  }

  return result;
}

/** Build inline styles for a frame node */
function buildFrameStyle(
  node: FrameNode,
  resolve: (v: string | undefined) => string | undefined = (v) => v
): React.CSSProperties {
  const padding = resolvePadding(node.padding);
  const borderStyle = resolveBorder(node.border, resolve);

  // Resolve shadows → box-shadow CSS
  let boxShadow: string | undefined;
  if (node.shadow?.length) {
    boxShadow = node.shadow
      .map((s) => {
        const inset = s.inset ? "inset " : "";
        const spread = s.spread ?? 0;
        return `${inset}${s.x}px ${s.y}px ${s.blur}px ${spread}px ${resolve(s.color) ?? s.color}`;
      })
      .join(", ");
  }

  // Resolve fill — detect gradient vs solid color
  const resolvedFill = resolve(node.fill);
  const isGradient =
    resolvedFill?.startsWith("linear-gradient") ||
    resolvedFill?.startsWith("radial-gradient") ||
    resolvedFill?.startsWith("conic-gradient");

  // Resolve image fill
  const imgFill = node.imageFill;
  const backgroundImage = imgFill?.src ? `url(${imgFill.src})` : undefined;
  const backgroundSize =
    imgFill?.objectFit === "contain"
      ? "contain"
      : imgFill?.objectFit === "fill"
        ? "100% 100%"
        : imgFill?.src
          ? "cover"
          : undefined;

  return {
    display: node.layout && node.layout !== "none" ? "flex" : undefined,
    flexDirection:
      node.layout === "horizontal" ? "row" : node.layout === "vertical" ? "column" : undefined,
    gap: node.gap ? `${node.gap}px` : undefined,
    alignItems: node.alignItems,
    justifyContent: node.justifyContent,
    width: resolveDimension(node.width),
    height: resolveDimension(node.height),
    minWidth: node.minWidth ? `${node.minWidth}px` : undefined,
    maxWidth: node.maxWidth ? `${node.maxWidth}px` : undefined,
    minHeight: node.minHeight ? `${node.minHeight}px` : undefined,
    maxHeight: node.maxHeight ? `${node.maxHeight}px` : undefined,
    overflow: node.overflow && node.overflow !== "visible" ? node.overflow : undefined,
    backgroundColor: isGradient ? undefined : resolvedFill,
    background: isGradient ? resolvedFill : undefined,
    backgroundImage,
    backgroundSize,
    backgroundPosition: backgroundImage ? "center" : undefined,
    backgroundRepeat: backgroundImage ? "no-repeat" : undefined,
    borderRadius: resolveCornerRadius(node.cornerRadius),
    opacity: node.opacity,
    boxShadow,
    backdropFilter: node.backdropBlur ? `blur(${node.backdropBlur}px)` : undefined,
    WebkitBackdropFilter: node.backdropBlur ? `blur(${node.backdropBlur}px)` : undefined,
    ...borderStyle,
    ...padding,
  };
}

// ─── Ref Element (adapter component) ──────────────────────────

function RefElement({ node }: { node: RefNode }) {
  const toggleSelection = useEditorStore((s) => s.toggleSandNodeSelection);
  const isSelected = useEditorStore((s) => s.selectedSandNodeIds.includes(node.id));

  const parsed = parseRef(node.ref);
  const isProject = parsed?.adapterId === "project";
  const projectComponent = useEditorStore((s) =>
    isProject && parsed ? getProjectComponent(s, parsed.componentName) : null
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelection(node.id, e.shiftKey || e.metaKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      toggleSelection(node.id);
    }
  };

  if (!parsed) {
    return (
      <div
        className="flex min-h-10 min-w-20 items-center justify-center rounded border border-dashed border-red-300 bg-red-50"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <span className="text-[11px] font-medium text-red-400">⚠ Invalid ref: {node.ref}</span>
      </div>
    );
  }

  if (isProject) {
    if (!projectComponent) {
      return (
        <div
          className="flex min-h-10 min-w-20 items-center justify-center rounded border border-dashed border-amber-300 bg-amber-50"
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <span className="text-[11px] font-medium text-amber-500">
            ⚠ Missing project component
          </span>
        </div>
      );
    }

    // Merge descendants overrides into the project component tree
    const overriddenComponent = applyOverrides(projectComponent, node);

    return (
      <div
        role="button"
        tabIndex={0}
        className={`relative box-border hover:outline-1 hover:-outline-offset-1 hover:outline-indigo-500/40 ${
          isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : ""
        }`}
        data-node-id={node.id}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <FrameElement node={{ ...overriddenComponent, id: node.id }} />
      </div>
    );
  }

  const definition = adapterRegistry.resolve(parsed.adapterId, parsed.componentName);
  if (!definition) {
    return (
      <div
        className="flex min-h-10 min-w-20 items-center justify-center rounded border border-dashed border-amber-300 bg-amber-50"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <span className="text-[11px] font-medium text-amber-500">↗ {node.ref} (unresolved)</span>
      </div>
    );
  }

  // Merge defaults with prop overrides
  const mergedProps = { ...definition.defaults, ...(node.props ?? {}) };
  const rendered = definition.render(mergedProps) as ReactNode;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`relative inline-block hover:outline-1 hover:-outline-offset-1 hover:outline-indigo-500/40 ${
        isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : ""
      }`}
      data-node-id={node.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="pointer-events-none">{rendered}</div>
    </div>
  );
}

/** Recursively applies descendants overrides to a component tree */
function applyOverrides(component: FrameNode, instance: RefNode): FrameNode {
  if (!instance.descendants && !instance.children) return component;

  // We do a deep clone to avoid mutating the master component in the store
  const clone = JSON.parse(JSON.stringify(component)) as FrameNode;

  // Apply descendants overrides
  if (instance.descendants) {
    const applyToMatches = (node: SandNode) => {
      // The path to match against the keys in descendants
      // If the node ID is "button", inside an instance "submit", the key might be "button"
      // Actually MCP says U("submit-button/label", {content: "Submit"})
      // meaning the descendant override key in the JSON is just the path part after the instance ID.
      // E.g. instance.descendants["label"] = { content: "Submit" }

      const override = instance.descendants?.[node.id];
      if (override) {
        Object.assign(node, override);
      }

      if ("children" in node && Array.isArray(node.children)) {
        for (const child of node.children) {
          applyToMatches(child);
        }
      }
    };

    // Apply recursively to children
    if (clone.children) {
      for (const child of clone.children) {
        applyToMatches(child);
      }
    }
  }

  // Handle slot children (if the ref node has its own children)
  // Usually the ref's children replace a specific slot inside the component.
  // For now, if the ref has children, we append them or replace the first slot found.
  if (instance.children && instance.children.length > 0) {
    let slotFound = false;
    const insertIntoSlot = (nodes: SandNode[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.type === "frame" && node.slot) {
          node.children = [...(node.children || []), ...(instance.children || [])];
          slotFound = true;
          return;
        }
        if ("children" in node && Array.isArray(node.children)) {
          insertIntoSlot(node.children);
          if (slotFound) return;
        }
      }
    };

    if (clone.children) {
      insertIntoSlot(clone.children);
    }

    // Fallback: if no slot found, append to the root frame
    if (!slotFound) {
      clone.children = [...(clone.children || []), ...instance.children];
    }
  }

  return clone;
}
