Repository:
frontend (Vite React SPA)

Branch:
feature/explore-force-layout

Agent / Owner:
Frontend Explore / Claude Code

Context:
We are in Phase 4 of the LexAI Explore Mode. The static WebGL canvas correctly renders nodes and edges. However, the positions are currently random, and the graph does not communicate back to React when interacted with. To create a true "legal universe", we need a physics-based layout (ForceAtlas2) to group related legal units and we need to capture WebGL click events to drive the React UI (e.g., opening a side panel).

Task:
Integrate `graphology-layout-forceatlas2` to calculate organic node positions and bind Sigma.js events (`clickNode`, `enterNode`, `leaveNode`) to React callbacks.

Goal:
When the graph loads, nodes animate or snap into a structured constellation (physics layout). When a user hovers over a node, the cursor changes to a pointer. When a user clicks a node in the WebGL canvas, the React parent component receives the node ID and updates the UI (e.g., displaying the selected node).

Files/folders to inspect first:
- src/components/explore/SigmaGraphRenderer.tsx
- src/pages/GraphPage.tsx
- package.json (to verify graphology-layout-forceatlas2)

Contracts involved:
- GraphNode

Endpoints involved:
- None

Implementation requirements:
1.  **Force Layout:** In `SigmaGraphRenderer.tsx` (or inside your builder), import `forceAtlas2` from `graphology-layout-forceatlas2`. 
    - After the graph is populated with nodes and edges (and initial random `x, y`), run the layout algorithm synchronously for about 50-100 iterations: `forceAtlas2.assign(graph, { iterations: 100, settings: { gravity: 1, scalingRatio: 2 } });`. 
2.  **Sigma Events & React Callbacks:** - Update the `SigmaGraphRenderer` props to accept `onNodeClick?: (nodeId: string) => void`.
    - In the `useEffect` where `sigma` is instantiated, bind the events:
      `sigma.on("clickNode", (e) => onNodeClick?.(e.node));`
    - Add hover effects: 
      `sigma.on("enterNode", () => { sigma.getContainer().style.cursor = "pointer"; });`
      `sigma.on("leaveNode", () => { sigma.getContainer().style.cursor = "default"; });`
3.  **UI Integration:** In `GraphPage.tsx`:
    - Create a local state: `const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)`.
    - Pass `onNodeClick={setSelectedNodeId}` to `<SigmaGraphRenderer />`.
    - Add a simple absolute-positioned floating div over the canvas (e.g., top-right corner) that displays "Selected Node: [selectedNodeId]" to prove the WebGL-to-React bridge works.

Constraints:
- Keep the iterations for ForceAtlas2 relatively low (e.g., 50-100) so it calculates quickly on load without blocking the main thread for too long. Do not implement the WebWorker version just yet.
- Make sure Sigma event listeners do not cause memory leaks (they are bound to the sigma instance, so `sigma.kill()` on unmount is usually enough, but be careful with closures).

Acceptance criteria:
- TypeScript compiles cleanly.
- The graph loads with nodes arranged organically (clustered based on edges), not purely random.
- Hovering over a node changes the cursor to a pointer.
- Clicking a node in the canvas updates the React state and displays the node ID in the UI.

Verification:
Commands to run:
- npm run typecheck
- npm run lint

Manual test steps:
- Run `npm run dev`.
- Load the graph page. Verify the layout looks like a constellation.
- Hover over nodes and click one.
- Verify the React UI updates to show the selected node ID.

Expected output from coding agent:
1. Summary of changes
2. Files changed
3. Commands run
4. Manual verification result
5. Next recommended task

Risk/fallback:
- Risk: `graphology-layout-forceatlas2` is not installed.
- Fallback: The agent should run `npm install graphology-layout-forceatlas2` if it's missing from `package.json`.