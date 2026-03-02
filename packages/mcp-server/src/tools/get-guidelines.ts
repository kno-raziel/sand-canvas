/**
 * get_guidelines — Return design guidelines for a given topic.
 *
 * Static tool providing documentation/best practices for AI agents
 * working with .sand files.
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const TOPICS = ["layout", "components", "typography", "tables"] as const;

const GUIDELINES: Record<(typeof TOPICS)[number], string> = {
  layout: `# Layout Guidelines

## Auto-Layout (Flexbox)
- Use \`layout: "horizontal"\` or \`layout: "vertical"\` on frame nodes
- Set \`gap\` for spacing between children
- Use \`padding\` for inner spacing (uniform number or [top, right, bottom, left])
- \`alignItems\`: "start" | "center" | "end" | "stretch"
- \`justifyContent\`: "start" | "center" | "end" | "space-between" | "space-around"

## Sizing
- Fixed: \`width: 200\` / \`height: 100\` (pixels)
- Fill: \`width: "fill_container"\` — stretches to fill parent
- Fit: \`width: "fit_content"\` — shrinks to content

## Positioning
- Top-level nodes use \`x\` and \`y\` for canvas position
- Children are positioned by the parent's layout (flexbox)
- Use \`find_empty_space\` tool to avoid overlapping nodes

## Best Practices
- Always set \`layout\` on container frames
- Use \`fill_container\` width for full-width sections
- Keep padding consistent (8px increments recommended)
`,

  components: `# Component Guidelines

## Adapter Components (ref nodes)
- Reference format: \`"adapterId:ComponentName"\` (e.g., \`"daisyui:Button"\`)
- Override props via \`props\` object: \`{ label: "Click Me", variant: "primary" }\`
- Available components listed in \`batch_get\` with patterns

## Reusable Project Components
- Mark any frame as \`reusable: true\`
- Reference via: \`"project:nodeId"\`
- Override nested content via \`descendants\` map
- Slots: mark child frames with \`slot: true\` for replaceable content

## Inserting Components
\`\`\`
btn=I(parentId, {type: "ref", ref: "daisyui:Button", props: {label: "Save", variant: "primary"}})
\`\`\`
`,

  typography: `# Typography Guidelines

## Text Nodes
- \`content\`: the text string to display
- \`fontSize\`: pixels (default: 14)
- \`fontWeight\`: number (300-700) or string
- \`fontFamily\`: CSS font family string
- \`color\`: hex color or $variable reference
- \`textAlign\`: "left" | "center" | "right"
- \`lineHeight\`: number (multiplier)
- \`letterSpacing\`: number (pixels)

## Heading Scale (recommended)
| Level | fontSize | fontWeight |
|-------|----------|------------|
| H1    | 36       | 700        |
| H2    | 28       | 700        |
| H3    | 22       | 600        |
| H4    | 18       | 600        |
| Body  | 14-16    | 400        |
| Small | 12       | 400        |

## Variables
- Use \`$variableName\` syntax in color fields to reference design tokens
- Set variables via \`set_variables\` tool
`,

  tables: `# Table Guidelines

## Building Tables in Sand
Tables are composed of nested frames:

\`\`\`
table (frame, layout: vertical)
├── header-row (frame, layout: horizontal)
│   ├── cell1 (text)
│   ├── cell2 (text)
│   └── cell3 (text)
├── row1 (frame, layout: horizontal)
│   ├── cell1 (text)
│   ├── cell2 (text)
│   └── cell3 (text)
└── row2 (frame, layout: horizontal)
    ├── cell1 (text)
    ├── cell2 (text)
    └── cell3 (text)
\`\`\`

## Tips
- Set \`fill_container\` width on rows
- Use consistent column widths (e.g., each cell with fixed width)
- Add borders to cells or rows for visual separation
- Header row: use bold fontWeight (600-700) and slightly different fill color
`,
};

export function registerGetGuidelines(server: McpServer): void {
  server.registerTool(
    "get_guidelines",
    {
      title: "Get Design Guidelines",
      description:
        "Return design guidelines and best practices for working with .sand files. " +
        "Available topics: layout, components, typography, tables.",
      inputSchema: {
        topic: z.enum(TOPICS).describe("Topic to get guidelines for"),
      },
    },
    async ({ topic }) => {
      const content = GUIDELINES[topic];
      return {
        content: [{ type: "text" as const, text: content }],
      };
    }
  );
}
