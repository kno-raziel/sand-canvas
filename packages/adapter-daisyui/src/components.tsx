/**
 * daisyUI 5 component specs — declarative definitions for CSS-class-based components.
 *
 * Each spec is ~10 lines of data. The CSS-Class Engine in @sand/core
 * auto-generates Zod schemas, defaults, and render functions.
 *
 * Full daisyUI 5 coverage — 65 components across 7 categories.
 */
import type { CssComponentSpec } from "@sand/core";

export const specs: CssComponentSpec[] = [
  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Button",
    displayName: "Button",
    category: "Actions",
    element: "button",
    baseClass: "btn",
    modifiers: {
      variant: {
        prefix: "btn-",
        values: [
          "primary",
          "secondary",
          "accent",
          "info",
          "success",
          "warning",
          "error",
          "ghost",
          "link",
        ],
        default: "neutral",
      },
      size: {
        prefix: "btn-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    booleans: {
      outline: { class: "btn-outline" },
      wide: { class: "btn-wide" },
      disabled: { class: "btn-disabled" },
    },
    content: "label",
    attrs: { type: "button" },
  },

  {
    name: "Dropdown",
    displayName: "Dropdown",
    category: "Actions",
    element: "div",
    baseClass: "dropdown",
    booleans: {
      hover: { class: "dropdown-hover" },
      open: { class: "dropdown-open" },
      top: { class: "dropdown-top" },
      end: { class: "dropdown-end" },
    },
    children: [
      {
        element: "div",
        class: "btn m-1",
        attrs: { tabindex: "0", role: "button" },
        content: "label",
      },
      {
        element: "ul",
        class: "dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm",
        attrs: { tabindex: "0" },
        children: [
          { element: "li", children: [{ element: "a", content: "item1" }] },
          { element: "li", children: [{ element: "a", content: "item2" }] },
        ],
      },
    ],
  },

  {
    name: "Modal",
    displayName: "Modal",
    category: "Actions",
    element: "div",
    baseClass: "bg-base-100 shadow-xl rounded-2xl p-6 max-w-md border border-base-300",
    children: [
      { element: "h3", class: "text-lg font-bold", content: "title" },
      { element: "p", class: "py-4 text-base-content/70", content: "description" },
      {
        element: "div",
        class: "flex justify-end gap-2 mt-4",
        children: [
          { element: "button", class: "btn btn-ghost", content: "cancelLabel" },
          { element: "button", class: "btn btn-primary", content: "confirmLabel" },
        ],
      },
    ],
  },

  {
    name: "Swap",
    displayName: "Swap",
    category: "Actions",
    element: "div",
    baseClass: "flex items-center gap-2 text-xl",
    children: [
      { element: "span", class: "opacity-40", content: "onContent" },
      { element: "span", class: "text-xs text-base-content/50", content: "" },
      { element: "span", class: "", content: "offContent" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DATA DISPLAY
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Accordion",
    displayName: "Accordion",
    category: "Data Display",
    element: "div",
    baseClass: "collapse collapse-arrow bg-base-100 border border-base-300",
    children: [
      { element: "div", class: "collapse-title font-semibold", content: "title" },
      { element: "div", class: "collapse-content text-sm", content: "description" },
    ],
  },

  {
    name: "Avatar",
    displayName: "Avatar",
    category: "Data Display",
    element: "div",
    baseClass: "avatar avatar-placeholder",
    children: [
      {
        element: "div",
        class: "bg-neutral text-neutral-content w-12 h-12",
        attrs: {
          style: {
            borderRadius: "9999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          },
        },
        children: [
          {
            element: "span",
            class: "text-lg",
            content: "initials",
          },
        ],
      },
    ],
  },

  {
    name: "Badge",
    displayName: "Badge",
    category: "Data Display",
    element: "span",
    baseClass: "badge",
    modifiers: {
      variant: {
        prefix: "badge-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error", "ghost"],
        default: "neutral",
      },
      size: {
        prefix: "badge-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    booleans: {
      outline: { class: "badge-outline" },
    },
    content: "label",
  },

  {
    name: "Card",
    displayName: "Card",
    category: "Data Display",
    element: "div",
    baseClass: "card bg-base-100 shadow-sm",
    booleans: {
      compact: { class: "card-compact" },
      bordered: { class: "card-bordered" },
    },
    children: [
      {
        element: "div",
        class: "card-body",
        children: [
          { element: "h2", class: "card-title", content: "title" },
          { element: "p", content: "description" },
        ],
      },
    ],
  },

  {
    name: "Carousel",
    displayName: "Carousel",
    category: "Data Display",
    element: "div",
    baseClass: "carousel rounded-box w-full",
    booleans: {
      vertical: { class: "carousel-vertical" },
      center: { class: "carousel-center" },
    },
    children: [
      {
        element: "div",
        class: "carousel-item",
        children: [{ element: "span", content: "slide1" }],
      },
      {
        element: "div",
        class: "carousel-item",
        children: [{ element: "span", content: "slide2" }],
      },
      {
        element: "div",
        class: "carousel-item",
        children: [{ element: "span", content: "slide3" }],
      },
    ],
  },

  {
    name: "Chat",
    displayName: "Chat Bubble",
    category: "Data Display",
    element: "div",
    baseClass: "chat chat-start",
    children: [
      { element: "div", class: "chat-header", content: "sender" },
      { element: "div", class: "chat-bubble", content: "message" },
      { element: "div", class: "chat-footer opacity-50", content: "timestamp" },
    ],
  },

  {
    name: "Collapse",
    displayName: "Collapse",
    category: "Data Display",
    element: "div",
    baseClass: "collapse bg-base-100 border border-base-300",
    booleans: {
      arrow: { class: "collapse-arrow" },
      plus: { class: "collapse-plus" },
    },
    children: [
      { element: "div", class: "collapse-title font-medium", content: "title" },
      { element: "div", class: "collapse-content text-sm", content: "description" },
    ],
  },

  {
    name: "Countdown",
    displayName: "Countdown",
    category: "Data Display",
    element: "span",
    baseClass: "countdown font-mono text-2xl",
    content: "value",
  },

  {
    name: "Diff",
    displayName: "Diff",
    category: "Data Display",
    element: "div",
    baseClass: "diff aspect-16/9",
    children: [
      { element: "div", class: "diff-item-1", children: [{ element: "span", content: "before" }] },
      { element: "div", class: "diff-item-2", children: [{ element: "span", content: "after" }] },
      { element: "div", class: "diff-resizer" },
    ],
  },

  {
    name: "Kbd",
    displayName: "Kbd",
    category: "Data Display",
    element: "kbd",
    baseClass: "kbd",
    modifiers: {
      size: {
        prefix: "kbd-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    content: "key",
  },

  {
    name: "List",
    displayName: "List",
    category: "Data Display",
    element: "ul",
    baseClass: "list bg-base-100 rounded-box shadow-md",
    children: [
      {
        element: "li",
        class: "list-row",
        children: [{ element: "span", content: "item1" }],
      },
      {
        element: "li",
        class: "list-row",
        children: [{ element: "span", content: "item2" }],
      },
      {
        element: "li",
        class: "list-row",
        children: [{ element: "span", content: "item3" }],
      },
    ],
  },

  {
    name: "Stat",
    displayName: "Stat",
    category: "Data Display",
    element: "div",
    baseClass: "stat",
    children: [
      { element: "div", class: "stat-title", content: "title" },
      { element: "div", class: "stat-value", content: "value" },
      { element: "div", class: "stat-desc", content: "description" },
    ],
  },

  {
    name: "Status",
    displayName: "Status",
    category: "Data Display",
    element: "span",
    baseClass: "status",
    modifiers: {
      variant: {
        prefix: "status-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error"],
        default: "primary",
      },
      size: {
        prefix: "status-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    booleans: {
      animate: { class: "status-animate" },
    },
  },

  {
    name: "Table",
    displayName: "Table",
    category: "Data Display",
    element: "div",
    baseClass: "overflow-x-auto",
    booleans: {
      zebra: { class: "table-zebra" },
    },
    children: [
      {
        element: "table",
        class: "table",
        children: [
          {
            element: "thead",
            children: [
              {
                element: "tr",
                children: [
                  { element: "th", content: "col1" },
                  { element: "th", content: "col2" },
                  { element: "th", content: "col3" },
                ],
              },
            ],
          },
          {
            element: "tbody",
            children: [
              {
                element: "tr",
                children: [
                  { element: "td", content: "row1col1" },
                  { element: "td", content: "row1col2" },
                  { element: "td", content: "row1col3" },
                ],
              },
              {
                element: "tr",
                children: [
                  { element: "td", content: "row2col1" },
                  { element: "td", content: "row2col2" },
                  { element: "td", content: "row2col3" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  {
    name: "Timeline",
    displayName: "Timeline",
    category: "Data Display",
    element: "ul",
    baseClass: "timeline",
    booleans: {
      vertical: { class: "timeline-vertical" },
      compact: { class: "timeline-compact" },
    },
    children: [
      {
        element: "li",
        children: [
          { element: "div", class: "timeline-start", content: "step1" },
          { element: "div", class: "timeline-middle" },
          { element: "hr" },
        ],
      },
      {
        element: "li",
        children: [
          { element: "hr" },
          { element: "div", class: "timeline-start", content: "step2" },
          { element: "div", class: "timeline-middle" },
          { element: "hr" },
        ],
      },
      {
        element: "li",
        children: [
          { element: "hr" },
          { element: "div", class: "timeline-start", content: "step3" },
          { element: "div", class: "timeline-middle" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DATA INPUT
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Checkbox",
    displayName: "Checkbox",
    category: "Data Input",
    element: "input",
    baseClass: "checkbox",
    modifiers: {
      variant: {
        prefix: "checkbox-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error"],
        default: "primary",
      },
      size: {
        prefix: "checkbox-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    attrs: { type: "checkbox", checked: "checked" },
  },

  {
    name: "Fieldset",
    displayName: "Fieldset",
    category: "Data Input",
    element: "fieldset",
    baseClass: "fieldset bg-base-200 border border-base-300 p-4 rounded-box",
    children: [
      { element: "legend", class: "fieldset-legend", content: "legend" },
      { element: "div", content: "description" },
    ],
  },

  {
    name: "FileInput",
    displayName: "File Input",
    category: "Data Input",
    element: "input",
    baseClass: "file-input",
    modifiers: {
      variant: {
        prefix: "file-input-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error", "ghost"],
        default: "ghost",
      },
      size: {
        prefix: "file-input-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    booleans: {
      bordered: { class: "file-input-bordered" },
    },
    attrs: { type: "file" },
  },

  {
    name: "Filter",
    displayName: "Filter",
    category: "Data Input",
    element: "div",
    baseClass: "filter",
    children: [
      {
        element: "input",
        class: "btn btn-sm filter-reset",
        attrs: { type: "radio", name: "filter", "aria-label": "All" },
      },
      {
        element: "input",
        class: "btn btn-sm",
        attrs: { type: "radio", name: "filter", "aria-label": "Option 1" },
      },
      {
        element: "input",
        class: "btn btn-sm",
        attrs: { type: "radio", name: "filter", "aria-label": "Option 2" },
      },
    ],
  },

  {
    name: "Label",
    displayName: "Label",
    category: "Data Input",
    element: "label",
    baseClass: "label",
    content: "text",
  },

  {
    name: "Input",
    displayName: "Text Input",
    category: "Data Input",
    element: "input",
    baseClass: "input",
    modifiers: {
      variant: {
        prefix: "input-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error", "ghost"],
        default: "ghost",
      },
      size: {
        prefix: "input-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    booleans: {
      bordered: { class: "input-bordered" },
    },
    attrs: { type: "text", placeholder: "Type here" },
  },

  {
    name: "Radio",
    displayName: "Radio",
    category: "Data Input",
    element: "input",
    baseClass: "radio",
    modifiers: {
      variant: {
        prefix: "radio-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error"],
        default: "primary",
      },
      size: {
        prefix: "radio-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    attrs: { type: "radio", checked: "checked" },
  },

  {
    name: "Range",
    displayName: "Range",
    category: "Data Input",
    element: "input",
    baseClass: "range",
    modifiers: {
      variant: {
        prefix: "range-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error"],
        default: "primary",
      },
      size: {
        prefix: "range-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    attrs: { type: "range", min: "0", max: "100", value: "40" },
  },

  {
    name: "Rating",
    displayName: "Rating",
    category: "Data Input",
    element: "div",
    baseClass: "rating",
    modifiers: {
      size: {
        prefix: "rating-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    booleans: {
      half: { class: "rating-half" },
    },
    children: [
      {
        element: "input",
        class: "mask mask-star-2 bg-orange-400",
        attrs: { type: "radio", name: "rating" },
      },
      {
        element: "input",
        class: "mask mask-star-2 bg-orange-400",
        attrs: { type: "radio", name: "rating", checked: "checked" },
      },
      {
        element: "input",
        class: "mask mask-star-2 bg-orange-400",
        attrs: { type: "radio", name: "rating" },
      },
      {
        element: "input",
        class: "mask mask-star-2 bg-orange-400",
        attrs: { type: "radio", name: "rating" },
      },
      {
        element: "input",
        class: "mask mask-star-2 bg-orange-400",
        attrs: { type: "radio", name: "rating" },
      },
    ],
  },

  {
    name: "Select",
    displayName: "Select",
    category: "Data Input",
    element: "select",
    baseClass: "select",
    modifiers: {
      variant: {
        prefix: "select-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error", "ghost"],
        default: "ghost",
      },
      size: {
        prefix: "select-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    booleans: {
      bordered: { class: "select-bordered" },
    },
    children: [
      { element: "option", content: "option1" },
      { element: "option", content: "option2" },
      { element: "option", content: "option3" },
    ],
  },

  {
    name: "Textarea",
    displayName: "Textarea",
    category: "Data Input",
    element: "textarea",
    baseClass: "textarea",
    modifiers: {
      variant: {
        prefix: "textarea-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error", "ghost"],
        default: "ghost",
      },
      size: {
        prefix: "textarea-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    booleans: {
      bordered: { class: "textarea-bordered" },
    },
    attrs: { placeholder: "Type here" },
  },

  {
    name: "Toggle",
    displayName: "Toggle",
    category: "Data Input",
    element: "input",
    baseClass: "toggle",
    modifiers: {
      variant: {
        prefix: "toggle-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error"],
        default: "primary",
      },
      size: {
        prefix: "toggle-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    attrs: { type: "checkbox", checked: "checked" },
  },

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Breadcrumbs",
    displayName: "Breadcrumbs",
    category: "Navigation",
    element: "div",
    baseClass: "breadcrumbs text-sm",
    children: [
      {
        element: "ul",
        children: [
          { element: "li", children: [{ element: "a", content: "crumb1" }] },
          { element: "li", children: [{ element: "a", content: "crumb2" }] },
          { element: "li", content: "crumb3" },
        ],
      },
    ],
  },

  {
    name: "Dock",
    displayName: "Dock",
    category: "Navigation",
    element: "div",
    baseClass: "dock",
    modifiers: {
      size: {
        prefix: "dock-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    children: [
      { element: "button", class: "dock-label", content: "item1" },
      { element: "button", class: "dock-label dock-active", content: "item2" },
      { element: "button", class: "dock-label", content: "item3" },
    ],
  },

  {
    name: "Link",
    displayName: "Link",
    category: "Navigation",
    element: "a",
    baseClass: "link",
    modifiers: {
      variant: {
        prefix: "link-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error"],
        default: "primary",
      },
    },
    booleans: {
      hover: { class: "link-hover" },
    },
    content: "label",
  },

  {
    name: "Menu",
    displayName: "Menu",
    category: "Navigation",
    element: "ul",
    baseClass: "menu bg-base-200 rounded-box w-56",
    modifiers: {
      size: {
        prefix: "menu-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
    booleans: {
      horizontal: { class: "menu-horizontal" },
    },
    children: [
      { element: "li", children: [{ element: "a", content: "item1" }] },
      { element: "li", children: [{ element: "a", content: "item2" }] },
      { element: "li", children: [{ element: "a", content: "item3" }] },
    ],
  },

  {
    name: "Navbar",
    displayName: "Navbar",
    category: "Navigation",
    element: "div",
    baseClass: "navbar bg-base-100 shadow-sm",
    children: [
      {
        element: "div",
        class: "navbar-start",
        children: [{ element: "a", class: "btn btn-ghost text-xl", content: "title" }],
      },
    ],
  },

  {
    name: "Pagination",
    displayName: "Pagination",
    category: "Navigation",
    element: "div",
    baseClass: "join",
    children: [
      { element: "button", class: "join-item btn", content: "prev" },
      { element: "button", class: "join-item btn btn-active", content: "current" },
      { element: "button", class: "join-item btn", content: "next" },
    ],
  },

  {
    name: "Steps",
    displayName: "Steps",
    category: "Navigation",
    element: "ul",
    baseClass: "steps",
    booleans: {
      vertical: { class: "steps-vertical" },
    },
    children: [
      { element: "li", class: "step step-primary", content: "step1" },
      { element: "li", class: "step step-primary", content: "step2" },
      { element: "li", class: "step", content: "step3" },
      { element: "li", class: "step", content: "step4" },
    ],
  },

  {
    name: "Tabs",
    displayName: "Tabs",
    category: "Navigation",
    element: "div",
    baseClass: "tabs tabs-border",
    attrs: { role: "tablist" },
    modifiers: {
      variant: {
        prefix: "tabs-",
        values: ["border", "lift", "box"],
        default: "border",
      },
    },
    children: [
      { element: "a", class: "tab", content: "tab1", attrs: { role: "tab" } },
      { element: "a", class: "tab tab-active", content: "tab2", attrs: { role: "tab" } },
      { element: "a", class: "tab", content: "tab3", attrs: { role: "tab" } },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // FEEDBACK
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Alert",
    displayName: "Alert",
    category: "Feedback",
    element: "div",
    baseClass: "alert",
    modifiers: {
      variant: {
        prefix: "alert-",
        values: ["info", "success", "warning", "error"],
        default: "info",
      },
    },
    children: [{ element: "span", content: "message" }],
  },

  {
    name: "Loading",
    displayName: "Loading",
    category: "Feedback",
    element: "span",
    baseClass: "loading",
    modifiers: {
      variant: {
        prefix: "loading-",
        values: ["spinner", "dots", "ring", "ball", "bars", "infinity"],
        default: "spinner",
      },
      size: {
        prefix: "loading-",
        values: ["xs", "sm", "md", "lg"],
        default: "md",
      },
    },
  },

  {
    name: "Progress",
    displayName: "Progress",
    category: "Feedback",
    element: "progress",
    baseClass: "progress w-56",
    modifiers: {
      variant: {
        prefix: "progress-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error"],
        default: "primary",
      },
    },
    attrs: { value: "70", max: "100" },
  },

  {
    name: "RadialProgress",
    displayName: "Radial Progress",
    category: "Feedback",
    element: "div",
    baseClass: "radial-progress",
    content: "value",
  },

  {
    name: "Skeleton",
    displayName: "Skeleton",
    category: "Feedback",
    element: "div",
    baseClass: "skeleton h-4 w-full",
  },

  {
    name: "Toast",
    displayName: "Toast",
    category: "Feedback",
    element: "div",
    baseClass: "inline-flex flex-col gap-2",
    children: [
      {
        element: "div",
        class: "alert alert-info shadow-lg",
        children: [{ element: "span", content: "message" }],
      },
    ],
  },

  {
    name: "Tooltip",
    displayName: "Tooltip",
    category: "Feedback",
    element: "div",
    baseClass: "tooltip",
    modifiers: {
      position: {
        prefix: "tooltip-",
        values: ["top", "bottom", "left", "right"],
        default: "top",
      },
      variant: {
        prefix: "tooltip-",
        values: ["primary", "secondary", "accent", "info", "success", "warning", "error"],
        default: "primary",
      },
    },
    children: [{ element: "button", class: "btn", content: "label" }],
  },

  // ═══════════════════════════════════════════════════════════════
  // LAYOUT
  // ═══════════════════════════════════════════════════════════════

  {
    name: "Divider",
    displayName: "Divider",
    category: "Layout",
    element: "div",
    baseClass: "divider",
    booleans: {
      horizontal: { class: "divider-horizontal" },
    },
    content: "label",
  },

  {
    name: "Drawer",
    displayName: "Drawer",
    category: "Layout",
    element: "div",
    baseClass: "bg-base-200 p-4 rounded-box w-80",
    children: [
      {
        element: "ul",
        class: "menu",
        children: [
          { element: "li", children: [{ element: "a", content: "item1" }] },
          { element: "li", children: [{ element: "a", content: "item2" }] },
          { element: "li", children: [{ element: "a", content: "item3" }] },
        ],
      },
    ],
  },

  {
    name: "Footer",
    displayName: "Footer",
    category: "Layout",
    element: "footer",
    baseClass: "footer sm:footer-horizontal bg-base-200 text-base-content p-10",
    children: [
      {
        element: "nav",
        children: [
          { element: "h6", class: "footer-title", content: "col1Title" },
          { element: "a", class: "link link-hover", content: "col1Link1" },
          { element: "a", class: "link link-hover", content: "col1Link2" },
        ],
      },
      {
        element: "nav",
        children: [
          { element: "h6", class: "footer-title", content: "col2Title" },
          { element: "a", class: "link link-hover", content: "col2Link1" },
          { element: "a", class: "link link-hover", content: "col2Link2" },
        ],
      },
    ],
  },

  {
    name: "Hero",
    displayName: "Hero",
    category: "Layout",
    element: "div",
    baseClass: "hero min-h-64 bg-base-200",
    children: [
      {
        element: "div",
        class: "hero-content text-center",
        children: [
          {
            element: "div",
            class: "max-w-md",
            children: [
              { element: "h1", class: "text-5xl font-bold", content: "title" },
              { element: "p", class: "py-6", content: "description" },
              { element: "button", class: "btn btn-primary", content: "buttonLabel" },
            ],
          },
        ],
      },
    ],
  },

  {
    name: "Indicator",
    displayName: "Indicator",
    category: "Layout",
    element: "div",
    baseClass: "indicator",
    children: [
      { element: "span", class: "indicator-item badge badge-primary", content: "badgeText" },
      {
        element: "div",
        class: "bg-base-300 grid h-32 w-32 place-items-center",
        content: "description",
      },
    ],
  },

  {
    name: "Join",
    displayName: "Join",
    category: "Layout",
    element: "div",
    baseClass: "join",
    booleans: {
      vertical: { class: "join-vertical" },
    },
    children: [
      { element: "button", class: "btn join-item", content: "item1" },
      { element: "button", class: "btn join-item", content: "item2" },
      { element: "button", class: "btn join-item", content: "item3" },
    ],
  },

  {
    name: "Mask",
    displayName: "Mask",
    category: "Layout",
    element: "div",
    baseClass: "mask bg-base-300 w-20 h-20",
    modifiers: {
      shape: {
        prefix: "mask-",
        values: [
          "squircle",
          "heart",
          "hexagon",
          "hexagon-2",
          "decagon",
          "pentagon",
          "diamond",
          "square",
          "circle",
          "star",
          "star-2",
          "triangle",
        ],
        default: "squircle",
      },
    },
  },

  {
    name: "Stack",
    displayName: "Stack",
    category: "Layout",
    element: "div",
    baseClass: "stack",
    children: [
      {
        element: "div",
        class: "bg-primary text-primary-content grid w-32 h-20 place-content-center rounded-box",
        content: "item1",
      },
      {
        element: "div",
        class: "bg-accent text-accent-content grid w-32 h-20 place-content-center rounded-box",
        content: "item2",
      },
      {
        element: "div",
        class:
          "bg-secondary text-secondary-content grid w-32 h-20 place-content-center rounded-box",
        content: "item3",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // MOCKUP
  // ═══════════════════════════════════════════════════════════════

  {
    name: "MockupBrowser",
    displayName: "Browser Mockup",
    category: "Mockup",
    element: "div",
    baseClass: "mockup-browser bg-base-300 border border-base-300",
    children: [
      {
        element: "div",
        class: "mockup-browser-toolbar",
        children: [{ element: "div", class: "input", content: "url" }],
      },
      {
        element: "div",
        class: "bg-base-200 flex justify-center px-4 py-16",
        content: "description",
      },
    ],
  },

  {
    name: "MockupCode",
    displayName: "Code Mockup",
    category: "Mockup",
    element: "div",
    baseClass: "mockup-code",
    children: [
      { element: "pre", children: [{ element: "code", content: "line1" }] },
      { element: "pre", children: [{ element: "code", content: "line2" }] },
      { element: "pre", children: [{ element: "code", content: "line3" }] },
    ],
  },

  {
    name: "MockupPhone",
    displayName: "Phone Mockup",
    category: "Mockup",
    element: "div",
    baseClass: "mockup-phone",
    children: [
      { element: "div", class: "camera" },
      {
        element: "div",
        class: "display",
        children: [
          { element: "div", class: "artboard artboard-demo phone-1", content: "description" },
        ],
      },
    ],
  },

  {
    name: "MockupWindow",
    displayName: "Window Mockup",
    category: "Mockup",
    element: "div",
    baseClass: "mockup-window bg-base-300 border border-base-300",
    children: [
      {
        element: "div",
        class: "bg-base-200 flex justify-center px-4 py-16",
        content: "description",
      },
    ],
  },
];
