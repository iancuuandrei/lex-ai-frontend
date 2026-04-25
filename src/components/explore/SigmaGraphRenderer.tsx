import { useEffect, useRef } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import type { NodeDisplayData, EdgeDisplayData } from 'sigma/types';

interface Props {
  graph: Graph;
  hiddenDomains: string[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}

export default function SigmaGraphRenderer({ graph, hiddenDomains, selectedNodeId, onNodeSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const hiddenDomainsRef = useRef<string[]>(hiddenDomains);
  const selectedNodeRef = useRef<string | null>(selectedNodeId);

  useEffect(() => {
    if (!containerRef.current) return;

    const sigma = new Sigma(graph, containerRef.current, {
      nodeReducer: (node: string, data: Record<string, unknown>): Partial<NodeDisplayData> => {
        const domain = data.domain as string | undefined;
        if (domain && hiddenDomainsRef.current.includes(domain)) {
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

        const hovered = hoveredNodeRef.current;
        const selected = selectedNodeRef.current;

        if (hovered !== null || selected !== null) {
          const isActive =
            source === hovered || target === hovered || source === selected || target === selected;
          if (!isActive) {
            return { ...data, hidden: true } as Partial<EdgeDisplayData>;
          }
        }

        return data as Partial<EdgeDisplayData>;
      },

      renderEdgeLabels: false,
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

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
