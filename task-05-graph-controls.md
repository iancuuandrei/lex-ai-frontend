Repository:
frontend (Vite React SPA)

Branch:
feature/explore-graph-controls

Agent / Owner:
Frontend Explore / Claude Code

Context:
We are in Phase 5 of the LexAI Explore Mode. The graph physics (ForceAtlas2) and hover/click interactivity are working perfectly. However, as the legal universe grows, users will need tools to navigate it. We need to implement Graph Controls: a local search bar that moves the WebGL camera to a specific node, and visual filters to hide/show specific legal domains.

Task:
Implement a Search input that animates the Sigma.js camera to the searched node, and a Domain Filter Bar using Sigma's `nodeReducer` and `edgeReducer` to hide/show nodes efficiently without mutating the underlying graph data.

Goal:
The UI features a Search Bar and a Domain Filter set in the toolbar. Typing a node's label and hitting Enter smoothly flies the camera to that node and selects it. Toggling off the "Muncă" filter instantly hides all nodes belonging to that domain and their connected edges in the canvas, using WebGL reducers.

Files/folders to inspect first:
- src/components/explore/SigmaGraphRenderer.tsx
- src/pages/GraphPage.tsx

Contracts involved:
- GraphNode

Endpoints involved:
- None (UI local filtering only)

Implementation requirements:
1.  **Sigma Reducers for Filtering:** In `SigmaGraphRenderer.tsx`, accept a new prop: `hiddenDomains: string[]` (or Set).
    - Use `sigma.setSetting("nodeReducer", (node, data) => { ... })`. If the node's domain is in `hiddenDomains`, return `{ ...data, hidden: true }`. Remember to preserve the existing hover/selected logic in the reducer!
    - Use `sigma.setSetting("edgeReducer", (edge, data) => { ... })`. If either the source or target node is hidden, return `{ ...data, hidden: true }`.
2.  **Camera Animation (Search):** In `SigmaGraphRenderer.tsx`, listen to changes on the `selectedNodeId` prop. 
    - If `selectedNodeId` changes to a valid node, use `sigma.getCamera().animate(sigma.getNodeDisplayData(selectedNodeId), { duration: 500 })` to zoom in on it.
3.  **UI Controls (`GraphPage.tsx`):**
    - Add state: `const [hiddenDomains, setHiddenDomains] = useState<string[]>([])`.
    - Build a `DomainFilterBar` component (or replace existing toolbar buttons): a row of toggleable badges/buttons for domains (e.g., "Muncă", "Civil", "Penal"). Clicking one toggles its presence in `hiddenDomains`.
    - Build a `SearchBar` component: an input field. On submit, find the first node whose label matches the query (case-insensitive substring match), set it as `selectedNodeId` (which will trigger the camera animation via the renderer).
4.  **Integration:** Pass `hiddenDomains` to the `<SigmaGraphRenderer />`.

Constraints:
- Do NOT remove nodes from the Graphology instance when filtering. Using `nodeReducer` and `edgeReducer` is the correct, highly-optimized WebGL approach.
- Ensure camera animations don't crash if the node doesn't exist. Check `graph.hasNode(id)` first.
- Preserve the existing ForceAtlas2 layout and hover effects.

Acceptance criteria:
- TypeScript compiles cleanly.
- Unchecking a domain instantly hides those nodes without breaking the layout or throwing errors.
- Searching for a node label (e.g., "Codul") moves the camera and selects the node.

Verification:
Commands to run:
- npm run typecheck
- npm run lint

Manual test steps:
- Run `npm run dev`.
- Type a node's name in the search bar and verify the camera zooms to it.
- Toggle domains in the filter bar and verify nodes disappear/reappear.

Expected output from coding agent:
1. Summary of changes
2. Files changed
3. Commands run
4. Manual verification result
5. Next recommended task

Risk/fallback:
- Risk: Reducers overwrite the selection/hover states implemented in Phase 4.
- Fallback: Ensure the `nodeReducer` applies the `hidden` flag *on top* of whatever style changes the hover/click logic applies.