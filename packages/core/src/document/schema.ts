/**
 * Sand File Format — Zod Schemas
 *
 * Custom format inspired by .pen, designed for component-based web UI design.
 *
 * Key design decisions:
 * - `color` instead of `fill` for text (CSS-aligned)
 * - CSS-like borders instead of complex stroke objects
 * - Only web UI node types (frame, text, rectangle, ref, icon)
 * - Variable references via `$variable.name` syntax
 * - Component-first with reusable frames and typed refs
 * - One file = one page/screen
 */

import { z } from "zod/v4";

// ─── Primitives ───────────────────────────────────────────────

/** A dimension value — pixel number or layout keyword */
const DimensionSchema = z.union([
  z.number(),
  z.literal("fill_container"),
  z.literal("fit_content"),
]);
type Dimension = z.infer<typeof DimensionSchema>;

/** A color value — hex string or variable reference ($variable.name) */
const ColorSchema = z.string();

/** Corner radius — uniform or per-corner [topLeft, topRight, bottomRight, bottomLeft] */
const CornerRadiusSchema = z.union([
  z.number(),
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
]);

/** Padding — uniform or per-side [top, right, bottom, left] */
const PaddingSchema = z.union([
  z.number(),
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
]);

/** CSS-like border — per side, expressed as individual properties */
const BorderSideSchema = z.object({
  width: z.number().optional(),
  color: ColorSchema.optional(),
  style: z.enum(["solid", "dashed", "dotted"]).optional(),
});

const BorderSchema = z.union([
  /** Shorthand: uniform border on all sides */
  BorderSideSchema,
  /** Per-side borders */
  z.object({
    top: BorderSideSchema.optional(),
    right: BorderSideSchema.optional(),
    bottom: BorderSideSchema.optional(),
    left: BorderSideSchema.optional(),
  }),
]);

/** Box shadow */
const ShadowSchema = z.object({
  x: z.number(),
  y: z.number(),
  blur: z.number(),
  spread: z.number().optional(),
  color: ColorSchema,
  inset: z.boolean().optional(),
});

/** Image fill for background images */
const ImageFillSchema = z.object({
  src: z.string(),
  objectFit: z.enum(["cover", "contain", "fill", "none"]).optional(),
});

// ─── Base Node Properties ─────────────────────────────────────

/** Properties shared by all node types */
const NodeBaseSchema = z.object({
  id: z.string(),
  name: z.string().optional(),

  /** Position (only used for top-level canvas placement) */
  x: z.number().optional(),
  y: z.number().optional(),

  /** Dimensions */
  width: DimensionSchema.optional(),
  height: DimensionSchema.optional(),

  /** Visual */
  fill: ColorSchema.optional(),
  opacity: z.number().min(0).max(1).optional(),
  cornerRadius: CornerRadiusSchema.optional(),
  border: BorderSchema.optional(),
  shadow: z.array(ShadowSchema).optional(),
  imageFill: ImageFillSchema.optional(),

  /** Visibility */
  visible: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

// ─── Node Types ───────────────────────────────────────────────

/**
 * Note on recursive types with Zod v4:
 * We define the schemas without explicit ZodType annotations and use
 * z.lazy() for the recursive children. Types are defined as separate
 * interfaces to handle the circular reference.
 */

/** Frame — the primary container */
const FrameNodeSchema: z.ZodType<FrameNode> = NodeBaseSchema.extend({
  type: z.literal("frame"),

  /** Layout */
  layout: z.enum(["horizontal", "vertical", "none"]).optional(),
  gap: z.number().optional(),
  padding: PaddingSchema.optional(),
  alignItems: z.enum(["start", "center", "end", "stretch"]).optional(),
  justifyContent: z.enum(["start", "center", "end", "space-between", "space-around"]).optional(),
  clip: z.boolean().optional(),
  overflow: z.enum(["visible", "hidden", "scroll", "auto"]).optional(),
  backdropBlur: z.number().optional(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  minHeight: z.number().optional(),
  maxHeight: z.number().optional(),

  /** Component system */
  reusable: z.boolean().optional(),
  slot: z.boolean().optional(),
  slotRecommendations: z.array(z.string()).optional(),

  /** Children — lazy to handle recursion */
  children: z.lazy(() => z.array(SandNodeSchema)).optional(),
});

/** Text — renders text content */
const TextNodeSchema = NodeBaseSchema.extend({
  type: z.literal("text"),
  content: z.string(),

  /** Typography */
  fontSize: z.number().optional(),
  fontWeight: z.union([z.number(), z.string()]).optional(),
  fontFamily: z.string().optional(),
  color: ColorSchema.optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  textDecoration: z.enum(["none", "underline", "line-through"]).optional(),
  textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
});

/** Rectangle — a styled primitive shape */
const RectangleNodeSchema = NodeBaseSchema.extend({
  type: z.literal("rectangle"),
});

/** Icon — renders an icon from a font family */
const IconNodeSchema = NodeBaseSchema.extend({
  type: z.literal("icon"),
  iconFamily: z.string(),
  iconName: z.string(),
  size: z.number().optional(),
  color: ColorSchema.optional(),
});

/** Ref — a component instance referencing a reusable frame or adapter component */
const RefNodeSchema: z.ZodType<RefNode> = NodeBaseSchema.extend({
  type: z.literal("ref"),
  ref: z.string(),
  /** Flat prop overrides for adapter components (e.g. { label: "Click" }) */
  props: z.record(z.string(), z.unknown()).optional(),
  /** Path-based overrides for nested nodes inside reusable frames */
  descendants: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  children: z.lazy(() => z.array(SandNodeSchema)).optional(),
});

/** Union of all design node types (no annotations — those are metadata) */
const SandNodeSchema: z.ZodType<SandNode> = z.union([
  FrameNodeSchema,
  TextNodeSchema,
  RectangleNodeSchema,
  IconNodeSchema,
  RefNodeSchema,
]);

// ─── Conversations (metadata, NOT design nodes) ──────────────

/** A single message in a conversation thread */
const ConversationMessageSchema = z.object({
  id: z.string(),
  author: z.enum(["user", "agent"]),
  content: z.string(),
  createdAt: z.string(),
});

/** A conversation thread — metadata about the design */
const ConversationSchema = z.object({
  id: z.string(),
  /** Which design node this conversation refers to (optional pinning) */
  targetNodeId: z.string().optional(),
  /** open → in-review → resolved. Only user can set resolved. */
  status: z.enum(["open", "in-review", "resolved"]).default("open"),
  /** Thread of messages */
  messages: z.array(ConversationMessageSchema),
  /** Sticky note color (default: yellow) */
  color: z.string().optional(),
  createdAt: z.string(),
});

// ─── Variables & Themes ───────────────────────────────────────

/** A theme-aware variable value */
const VariableValueSchema = z.union([
  z.string(),
  z.array(
    z.object({
      theme: z.record(z.string(), z.string()),
      value: z.string(),
    })
  ),
]);

/** Variable definition */
const VariableSchema = z.object({
  type: z.enum(["color", "number", "string", "font"]),
  value: VariableValueSchema,
});

/** Theme axis definition */
const ThemesSchema = z.record(z.string(), z.array(z.string()));

// ─── Document ─────────────────────────────────────────────────

/**
 * A complete .sand document.
 * One file = one page/screen.
 */
const SandDocumentSchema = z.object({
  version: z.literal(1),
  name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  themes: ThemesSchema.optional(),
  variables: z.record(z.string(), VariableSchema).optional(),
  activeTheme: z.record(z.string(), z.string()).optional(),
  children: z.array(SandNodeSchema),
  /** Conversations — threaded metadata comments, not part of the design tree */
  conversations: z.array(ConversationSchema).optional(),
});

// ─── Type Definitions ─────────────────────────────────────────

/**
 * Manually defined types for recursive nodes.
 * Zod v4 infer works for leaf types, but recursive unions need manual defs.
 */

/** Base properties shared by all nodes */
interface NodeBase {
  id: string;
  name?: string;
  x?: number;
  y?: number;
  width?: Dimension;
  height?: Dimension;
  fill?: string;
  opacity?: number;
  cornerRadius?: number | [number, number, number, number];
  border?:
    | BorderSide
    | { top?: BorderSide; right?: BorderSide; bottom?: BorderSide; left?: BorderSide };
  shadow?: Shadow[];
  imageFill?: { src: string; objectFit?: "cover" | "contain" | "fill" | "none" };
  visible?: boolean;
  enabled?: boolean;
}

interface BorderSide {
  width?: number;
  color?: string;
  style?: "solid" | "dashed" | "dotted";
}

interface Shadow {
  x: number;
  y: number;
  blur: number;
  spread?: number;
  color: string;
  inset?: boolean;
}

/** Frame node — container with flexbox layout */
interface FrameNode extends NodeBase {
  type: "frame";
  layout?: "horizontal" | "vertical" | "none";
  gap?: number;
  padding?: number | [number, number, number, number];
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "space-between" | "space-around";
  clip?: boolean;
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  backdropBlur?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  reusable?: boolean;
  slot?: boolean;
  slotRecommendations?: string[];
  children?: SandNode[];
}

/** Text node */
interface TextNode extends NodeBase {
  type: "text";
  content: string;
  fontSize?: number;
  fontWeight?: number | string;
  fontFamily?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: "none" | "underline" | "line-through";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

/** Rectangle node */
interface RectangleNode extends NodeBase {
  type: "rectangle";
}

/** Icon node */
interface IconNode extends NodeBase {
  type: "icon";
  iconFamily: string;
  iconName: string;
  size?: number;
  color?: string;
}

/** Component instance node */
interface RefNode extends NodeBase {
  type: "ref";
  ref: string;
  /** Flat prop overrides for adapter components */
  props?: Record<string, unknown>;
  /** Path-based overrides for nested nodes inside reusable frames */
  descendants?: Record<string, Record<string, unknown>>;
  children?: SandNode[];
}

/** Union of all design node types */
type SandNode = FrameNode | TextNode | RectangleNode | IconNode | RefNode;

/** A single message in a conversation thread */
interface ConversationMessage {
  id: string;
  author: "user" | "agent";
  content: string;
  createdAt: string;
}

/** Conversation thread — metadata about the design, not a design node */
interface Conversation {
  id: string;
  targetNodeId?: string;
  status: "open" | "in-review" | "resolved";
  messages: ConversationMessage[];
  color?: string;
  createdAt: string;
}

/** Complete .sand document */
interface SandDocument {
  version: 1;
  name?: string;
  width?: number;
  height?: number;
  themes?: Record<string, string[]>;
  variables?: Record<
    string,
    {
      type: "color" | "number" | "string" | "font";
      value: string | Array<{ theme: Record<string, string>; value: string }>;
    }
  >;
  activeTheme?: Record<string, string>;
  children: SandNode[];
  conversations?: Conversation[];
}

// ─── Exports ──────────────────────────────────────────────────

export {
  // Schemas
  SandDocumentSchema,
  SandNodeSchema,
  FrameNodeSchema,
  TextNodeSchema,
  RectangleNodeSchema,
  IconNodeSchema,
  RefNodeSchema,
  ConversationSchema,
  ConversationMessageSchema,
  // Primitive schemas
  DimensionSchema,
  ColorSchema,
  CornerRadiusSchema,
  PaddingSchema,
  BorderSchema,
  ShadowSchema,
};

export type {
  SandDocument,
  SandNode,
  FrameNode,
  TextNode,
  RectangleNode,
  IconNode,
  RefNode,
  Conversation,
  ConversationMessage,
  Dimension,
  BorderSide,
  Shadow,
};
