# @sand/adapter-daisyui

daisyUI component adapter for Sand — renders real daisyUI components on the canvas using the CSS-Class Engine.

## How It Works

Components are defined as **declarative specs** (~10 lines of data each). The CSS-Class Engine in `@sand/core` auto-generates Zod schemas, prop defaults, and React render functions from these specs.

```typescript
// Adding a new component is just adding a spec:
{
  name: "Button",
  element: "button",
  baseClass: "btn",
  modifiers: {
    variant: { prefix: "btn-", values: ["primary", "secondary", "accent", ...] },
    size: { prefix: "btn-", values: ["xs", "sm", "md", "lg"] },
  },
  booleans: { outline: { class: "btn-outline" } },
  content: "label",
}
```

## Components (14)

| Category | Components |
|----------|-----------|
| **Actions** | Button |
| **Data Display** | Badge, Card, Stat, Avatar, Table |
| **Form** | Text Input |
| **Navigation** | Navbar, Tabs, Menu |
| **Feedback** | Alert, Toast |
| **Overlay** | Modal |
| **Layout** | Drawer |

## Structure

```text
src/
├── components.tsx  # CssComponentSpec[] — all 14 component definitions
└── index.ts        # Adapter registration via createCssClassAdapter()
```

## Adding Components

1. Add a new `CssComponentSpec` object to the `specs` array in `components.tsx`
2. The CSS-Class Engine generates everything else automatically
3. The component appears in the editor's Component Panel immediately
