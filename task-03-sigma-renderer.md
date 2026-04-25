Repository:
frontend (Vite React SPA)

Branch:
feature/explore-sigma-renderer

Agent / Owner:
Frontend Explore / Claude Code

Context:
We are moving into Phase 3 of the LexAI Explore Mode. The routing and basic layout are functional. We must now replace any dummy graph placeholders in `GraphPage.tsx` (or `ExplorePage.tsx`, whichever is the main graph route) with a real WebGL canvas using `sigma` and `graphology`. This allows us to render thousands of legal units efficiently in a "dark legal universe" aesthetic.

Task:
Implement the `SigmaGraphRenderer` component, the `graphology` graph builder, visual scoring functions, and integrate them into the main graph page to visualize `nodes` and `edges`.

Goal:
The placeholder canvas is replaced by an interactive Sigma.js WebGL canvas. Nodes are assigned basic sizes and colors based on their type. Edges are drawn between them. Users can pan and zoom smoothly using WebGL.

Files/folders to inspect first:
- src/pages/GraphPage.tsx (or ExplorePage.tsx)
- src/components/explore/SigmaGraphRenderer.tsx (to be created)
- src/lib/graph/graphology-builders.ts (to be created)
- src/lib/graph/visual-scoring.ts (to be created)

Contracts involved:
- GraphNode, GraphEdge (assuming these types exist in your shared types)

Endpoints involved:
- None (UI rendering only based on existing React state/mock data)

Implementation requirements:
1.  **Visual Scoring:** Create `src/lib/graph/visual-scoring.ts`. Export functions `computeNodeSize(node)` and `computeNodeColor(node)`.
    - Size: `root` = 30, `domain` = 20, `legal_act` = 14, default = 8.
    - Color (Dark Universe Theme): `root` = "#ffffff" (white/glowing), `domain` = specific hex colors based on domain string (e.g., "#3b82f6" for blue, "#10b981" for green), `legal_act` = "#94a3b8" (slate).
2.  **Graphology Builder:** Create `src/lib/graph/graphology-builders.ts`. Export `buildGraphologyGraph(nodes, edges)`.
    - Return `new Graph({ multi: true, type: "directed" })` from the `graphology` package.
    - Iterate `nodes` and `graph.addNode(id, {...})`. Assign temporary `x` and `y` coordinates using `Math.random() * 100` since we don't have a layout algorithm active yet. Pass `size`, `color`, and `label`.
    - Iterate `edges` and `graph.addEdge(source, target, { size: 1, color: "#334155" })`. Ensure you wrap this in `if (graph.hasNode(source) && graph.hasNode(target))` to prevent crashes.
3.  **Sigma Renderer Component:** Create `src/components/explore/SigmaGraphRenderer.tsx`.
    - Accept props: `{ nodes: GraphNode[], edges: GraphEdge[] }`.
    - Use a `useRef<HTMLDivElement>` to attach the container.
    - Inside a `useEffect` dependent on `nodes` and `edges`: build the Graphology instance, instantiate `new Sigma(graph, containerRef.current)`.
    - CRITICAL: Return a cleanup function `() => sigma.kill()` to prevent WebGL memory leaks on unmount.
4.  **Integration:** In `GraphPage.tsx`, replace the canvas placeholder with `<SigmaGraphRenderer nodes={mockNodes} edges={mockEdges} />`. Ensure the container wrapper has explicit dimensions (e.g., `w-full h-full min-h-[600px]`).

Constraints:
- Do not implement complex ForceAtlas2 web workers yet. Static randomized/circular positions are fine for this step.
- Handle WebGL lifecycle properly (`sigma.kill()`) to prevent crashes during Vite HMR (Hot Module Replacement).
- Respect the existing routing structure.

Acceptance criteria:
- TypeScript compiles cleanly.
- The browser renders a canvas where the nodes are visible as colored circles.
- Zooming (scroll) and panning (drag) work natively via Sigma.js.

Verification:
Commands to run:
- npm run typecheck
- npm run lint

Manual test steps:
- Run `npm run dev`.
- Load the graph page.
- Verify the WebGL canvas appears and you can pan/zoom interactively.

Expected output from coding agent:
1. Summary of changes
2. Files changed
3. Commands run
4. Manual verification result
5. Next recommended task

Risk/fallback:
- Risk: Sigma.js throws an error if nodes or edges are added without coordinates (`x`, `y`).
- Fallback: Ensure every node gets an `x` and `y` value inside `buildGraphologyGraph`.