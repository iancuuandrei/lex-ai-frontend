import { useEffect, useState, useRef } from "react";
import PromptComposer from "../components/PromptComposer";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import { forceCollide } from "d3-force-3d";

const promptIdeas = [
  "Poate angajatorul să-mi scadă salariul fără act adițional?",
  "Cum contest o amendă contravențională?",
  "Ce drepturi am dacă lucrez ore suplimentare?",
  "Ce se întâmplă dacă circul fără ITP valabil?",
];

type DummyNode = {
  id: string;
  val: number;
  category: "root" | "article" | "point";
};

type DummyLink = { source: string; target: string };
type DummyGraphNode = NodeObject<DummyNode>;
type DummyGraphLink = LinkObject<DummyNode, DummyLink>;
type HomeForceGraphMethods = ForceGraphMethods<DummyGraphNode, DummyGraphLink>;

// Generate a dummy "edge of a large law graph"
const dummyNodes: DummyNode[] = Array.from({ length: 150 }, (_, i) => ({
  id: `n${i}`,
  val: i === 0 ? 30 : i < 10 ? 10 : 2,
  category: i === 0 ? "root" : i < 10 ? "article" : "point",
}));

const dummyLinks: DummyLink[] = dummyNodes.slice(1).map((node, i) => ({
  source: i < 9 ? "n0" : `n${Math.floor(Math.random() * 9) + 1}`,
  target: node.id,
}));

function HomePage() {
  const [isIntroVisible, setIsIntroVisible] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  const navigate = useNavigate();
  const graphRef = useRef<HomeForceGraphMethods | undefined>(undefined);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsIntroVisible(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (graph) {
      const chargeForce = graph.d3Force("charge");
      chargeForce?.strength(-40).distanceMax(300);
      graph.d3Force(
        "collide",
        forceCollide<DummyGraphNode>()
          .radius((n) => (n.val || 2) + 2)
          .iterations(2),
      );
      graph.zoom(1.8);
      // shift camera so the center of the graph is pushed to the left,
      // simulating "we are at the left edge of a giant graph on the right side of the screen"
      setTimeout(() => {
        graph.centerAt(-100, 0);
      }, 100);
    }
  }, []);

  const handleSend = () => {
    const query = promptValue.trim();
    if (!query) return;
    navigate(`/product?q=${encodeURIComponent(query)}`);
  };

  return (
    <section
      className={`page landing-page${isIntroVisible ? " is-visible" : ""}`}
    >
      <div className="landing-bg-dots" />

      <div className="landing-content">
        <div className="landing-left">
          <div className="landing-copy">
            <h1>The Legal Knowledge Graph</h1>
            <p>
              Describe your case. We map the entire legal framework, extract
              exact citations, and plot the connections instantly.
            </p>
          </div>

          <div className="landing-composer-wrap">
            <PromptComposer
              promptPrefix=""
              promptIdeas={promptIdeas}
              value={promptValue}
              onChange={setPromptValue}
              onSend={handleSend}
              ariaLabel="Ask a legal question"
            />
            <button className="landing-get-started" onClick={handleSend}>
              Get Started
            </button>
          </div>
        </div>

        <div className="landing-right">
          <div className="landing-graph-mask">
            <ForceGraph2D<DummyNode, DummyLink>
              ref={graphRef}
              graphData={{ nodes: dummyNodes, links: dummyLinks }}
              width={1200}
              height={1200}
              backgroundColor="rgba(0,0,0,0)"
              nodeRelSize={2}
              nodeColor={(n: DummyNode) =>
                n.category === "root"
                  ? "#ffffff"
                  : n.category === "article"
                    ? "#8caeff"
                    : "rgba(255,255,255,0.4)"
              }
              linkColor={() => "rgba(255,255,255,0.1)"}
              linkWidth={0.5}
              enableZoomInteraction={false}
              enablePanInteraction={false}
              cooldownTicks={100}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomePage;
