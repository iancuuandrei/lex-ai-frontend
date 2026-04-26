import { useEffect, useRef } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import type { NodeDisplayData, EdgeDisplayData } from 'sigma/types';

interface Props {
  graph: Graph;
  hiddenDomains: string[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  autoFocusNodeId: string | null;
  onAutoFocusDone: () => void;
}

export default function SigmaGraphRenderer({ graph, hiddenDomains, selectedNodeId, onNodeSelect, autoFocusNodeId, onAutoFocusDone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const hiddenDomainsRef = useRef<string[]>(hiddenDomains);
  const selectedNodeRef = useRef<string | null>(selectedNodeId);

  useEffect(() => {
    if (!containerRef.current) return;

    // Zoom-level thresholds: camera ratio < threshold means "zoomed in enough"
    // ratio = 1 is default view, lower = more zoomed in
    const ZOOM_THRESHOLDS = { 2: 0.7, 3: 0.4 };

    let lastVisibleLevel = 1;
    let sigmaInstance: Sigma | null = null;

    function getVisibleZoomLevel(ratio: number): number {
      if (ratio <= ZOOM_THRESHOLDS[3]) return 3;
      if (ratio <= ZOOM_THRESHOLDS[2]) return 2;
      return 1;
    }

    function currentVisibleLevel(): number {
      if (!sigmaInstance) return 1;
      return getVisibleZoomLevel(sigmaInstance.getCamera().ratio);
    }

    const sigma = new Sigma(graph, containerRef.current, {
      nodeReducer: (node: string, data: Record<string, unknown>): Partial<NodeDisplayData> => {
        const domain = data.domain as string | undefined;
        if (domain && hiddenDomainsRef.current.includes(domain)) {
          return { ...data, hidden: true } as Partial<NodeDisplayData>;
        }

        // Semantic zoom: hide nodes above the current visible zoom level
        const nodeZoomLevel = (data.zoomLevel as number) ?? 1;
        const visibleLevel = currentVisibleLevel();
        if (nodeZoomLevel > visibleLevel) {
          return { ...data, hidden: true } as Partial<NodeDisplayData>;
        }

        const hovered = hoveredNodeRef.current;
        const selected = selectedNodeRef.current;

        if (hovered !== null || selected !== null) {
          const isActive = node === hovered || node === selected;
          if (!isActive) {
            return { ...data, color: '#555', zIndex: 0 } as Partial<NodeDisplayData>;
          }
          return { ...data, highlighted: true, zIndex: 1 } as Partial<NodeDisplayData>;
        }

        return data as Partial<NodeDisplayData>;
      },

      edgeReducer: (edge: string, data: Record<string, unknown>): Partial<EdgeDisplayData> => {
        const source = graph.source(edge);
        const target = graph.target(edge);
        const srcAttrs = graph.getNodeAttributes(source);
        const tgtAttrs = graph.getNodeAttributes(target);

        const srcHidden = srcAttrs.domain && hiddenDomainsRef.current.includes(srcAttrs.domain as string);
        const tgtHidden = tgtAttrs.domain && hiddenDomainsRef.current.includes(tgtAttrs.domain as string);

        if (srcHidden || tgtHidden) {
          return { ...data, hidden: true } as Partial<EdgeDisplayData>;
        }

        // Hide edges connected to nodes not visible at current zoom level
        const visibleLevel = currentVisibleLevel();
        const srcZoom = (srcAttrs.zoomLevel as number) ?? 1;
        const tgtZoom = (tgtAttrs.zoomLevel as number) ?? 1;
        if (srcZoom > visibleLevel || tgtZoom > visibleLevel) {
          return { ...data, hidden: true } as Partial<EdgeDisplayData>;
        }

        const hovered = hoveredNodeRef.current;
        const selected = selectedNodeRef.current;

        const baseEdgeSize = (data.size as number ?? 1.5) * 1.5;

        if (hovered !== null || selected !== null) {
          const isActive =
            source === hovered || target === hovered || source === selected || target === selected;
          if (!isActive) {
            return { ...data, hidden: true } as Partial<EdgeDisplayData>;
          }
          return { ...data, color: '#8caeff', size: baseEdgeSize * 2, zIndex: 1 } as Partial<EdgeDisplayData>;
        }

        return { ...data, size: baseEdgeSize, color: 'rgba(150, 160, 180, 0.4)' } as Partial<EdgeDisplayData>;
      },

      renderEdgeLabels: false,
    });

    sigmaInstance = sigma;

    // Schedule a needsRefresh when zoom level crosses a threshold
    sigma.on('beforeRender', () => {
      const level = currentVisibleLevel();
      if (level !== lastVisibleLevel) {
        lastVisibleLevel = level;
        // Schedule refresh on next tick to avoid rendering mid-frame
        requestAnimationFrame(() => sigma.refresh());
      }
    });

    sigma.on('enterNode', ({ node }) => {
      hoveredNodeRef.current = node;
      containerRef.current!.style.cursor = 'pointer';
      sigma.refresh();
    });

    sigma.on('leaveNode', () => {
      hoveredNodeRef.current = null;
      containerRef.current!.style.cursor = 'default';
      sigma.refresh();
    });

    sigma.on('clickNode', ({ node }) => {
      onNodeSelect(selectedNodeRef.current === node ? null : node);
    });

    sigma.on('clickStage', () => {
      onNodeSelect(null);
    });

    sigmaRef.current = sigma;
    return () => {
      sigma.kill();
      sigmaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Perpetual Animation Effect
  useEffect(() => {
    let animationFrameId: number;
    const settings = forceAtlas2.inferSettings(graph);
    
    const runLayout = () => {
      forceAtlas2.assign(graph, {
        iterations: 1,
        settings: {
          ...settings,
          gravity: 0.15,
          scalingRatio: 10,
          barnesHutOptimize: true,
          linLogMode: true,
        }
      });
      animationFrameId = requestAnimationFrame(runLayout);
    };

    runLayout();
    return () => cancelAnimationFrame(animationFrameId);
  }, [graph]);

  useEffect(() => {
    hiddenDomainsRef.current = hiddenDomains;
    sigmaRef.current?.refresh();
  }, [hiddenDomains]);

  useEffect(() => {
    selectedNodeRef.current = selectedNodeId;
    const sigma = sigmaRef.current;
    if (!sigma) return;

    if (selectedNodeId && graph.hasNode(selectedNodeId)) {
      const { x, y } = graph.getNodeAttributes(selectedNodeId) as { x: number; y: number };
      sigma.getCamera().animate({ x, y, ratio: 0.3 }, { duration: 500 });
    }

    sigma.refresh();
  }, [selectedNodeId, graph]);

  // Auto-focus: animated reset → pan to node → zoom deep in
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma || !autoFocusNodeId || !graph.hasNode(autoFocusNodeId)) return;

    const { x, y } = graph.getNodeAttributes(autoFocusNodeId) as { x: number; y: number };
    const camera = sigma.getCamera();

    // Step 1: reset to overview
    camera.animate({ x: 0.5, y: 0.5, ratio: 1, angle: 0 }, { duration: 600 }).then(() => {
      // Step 2: pan to the node
      return camera.animate({ x, y, ratio: 1 }, { duration: 800 });
    }).then(() => {
      // Step 3: zoom all the way in
      return camera.animate({ x, y, ratio: 0.15 }, { duration: 1000 });
    }).then(() => {
      onNodeSelect(autoFocusNodeId);
      onAutoFocusDone();
    });
  }, [autoFocusNodeId, graph, onNodeSelect, onAutoFocusDone]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
