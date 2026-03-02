/**
 * @sand/core — Headless document engine for Sand design files.
 *
 * This package provides:
 * - Zod schemas for the .sand file format
 * - Type-safe document tree types
 * - Parse / serialize / validate functions
 * - (future) Command pattern for undo/redo
 * - (future) Layout calculation engine
 */

// Schema + Types
export {
  SandDocumentSchema,
  SandNodeSchema,
  FrameNodeSchema,
  TextNodeSchema,
  RectangleNodeSchema,
  IconNodeSchema,
  RefNodeSchema,
  ConversationSchema,
  ConversationMessageSchema,
  DimensionSchema,
  ColorSchema,
} from "./document/schema";

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
} from "./document/schema";

// I/O
export {
  parseSandDocument,
  serializeSandDocument,
  createEmptyDocument,
} from "./document/io";

export type { ParseResult } from "./document/io";

// Adapter types
export type { ComponentDefinition, Adapter } from "./adapter/types";
export { parseRef } from "./adapter/types";

// Adapter utilities — Level 1: CSS-Class Engine
export type {
  CssComponentSpec,
  CssModifier,
  CssBooleanModifier,
  CssChildSpec,
} from "./adapter/css-class-spec";
export { buildCssComponent, buildCssAdapter } from "./adapter/css-class-spec";

// Adapter utilities — Level 2: React Wrapper
export type { ReactWrapSpec, ReactPropDef } from "./adapter/react-wrapper";
export { wrapReactComponent } from "./adapter/react-wrapper";

export const VERSION = "0.0.1";
