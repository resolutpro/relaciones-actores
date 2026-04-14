import { useState, useRef, useCallback, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  useListActors,
  useGetActorRelationships,
} from "@workspace/api-client-react";
import {
  getListActorsQueryKey,
  getGetActorRelationshipsQueryKey,
} from "@workspace/api-client-react";

interface Actor {
  id: number;
  name: string;
  sector?: string | null;
  custom_fields: Record<string, string>;
}

interface ActorWithScore extends Actor {
  score: number;
  relationship_id: number;
  comments?: string | null;
}

interface GraphNode {
  id: number;
  name: string;
  score?: number;
  isMain?: boolean;
  fx?: number;
  fy?: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: number;
  target: number;
  value: number;
}

export default function GrafoPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const graphRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { data: actors = [], isLoading: loadingActors } = useListActors({
    query: { queryKey: getListActorsQueryKey() },
  });

  const { data: relationships = [], isLoading: loadingRel } =
    useGetActorRelationships(selectedId ?? 0, {
      query: {
        enabled: selectedId !== null,
        queryKey: getGetActorRelationshipsQueryKey(selectedId ?? 0),
      },
    });

  const selectedActor = (actors as Actor[]).find((a) => a.id === selectedId);

  const graphData = (() => {
    if (!selectedActor) return { nodes: [], links: [] };

    const cx = 0;
    const cy = 0;

    const mainNode: GraphNode = {
      id: selectedActor.id,
      name: selectedActor.name,
      isMain: true,
      fx: cx,
      fy: cy,
    };

    const relActors = relationships as ActorWithScore[];
    const maxDist = Math.min(dimensions.width, dimensions.height) * 0.35;

    const relNodes: GraphNode[] = relActors.map((ra, i) => {
      const angle = (2 * Math.PI * i) / relActors.length;
      const dist = maxDist * (1 - ra.score * 0.75);
      return {
        id: ra.id,
        name: ra.name,
        score: ra.score,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
      };
    });

    const links: GraphLink[] = relActors.map((ra) => ({
      source: selectedActor.id,
      target: ra.id,
      value: ra.score,
    }));

    return { nodes: [mainNode, ...relNodes], links };
  })();

  const nodeCanvasObject = useCallback(
    (node: unknown, ctx: CanvasRenderingContext2D) => {
      const n = node as GraphNode & { x: number; y: number };
      const r = n.isMain ? 18 : 10 + n.score! * 6;
      const color = n.isMain
        ? "#1971c2"
        : n.score! >= 0.75
        ? "#e03131"
        : n.score! >= 0.4
        ? "#f76707"
        : "#f59f00";

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = n.isMain ? 3 : 2;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = `${n.isMain ? "bold " : ""}${n.isMain ? 11 : 9}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxWidth = r * 2 + 8;
      const label =
        n.name.length > 18 ? n.name.slice(0, 15) + "..." : n.name;
      ctx.fillText(label, n.x, n.y + r + 10, maxWidth);
    },
    []
  );

  const linkCanvasObject = useCallback(
    (link: unknown, ctx: CanvasRenderingContext2D) => {
      const l = link as { source: GraphNode & { x: number; y: number }; target: GraphNode & { x: number; y: number }; value: number };
      if (!l.source?.x || !l.target?.x) return;

      const score = l.value;
      const color =
        score >= 0.75
          ? "#e03131"
          : score >= 0.4
          ? "#f76707"
          : "#f59f00";

      ctx.beginPath();
      ctx.moveTo(l.source.x, l.source.y);
      ctx.lineTo(l.target.x, l.target.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 + score * 3;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const mx = (l.source.x + l.target.x) / 2;
      const my = (l.source.y + l.target.y) / 2;
      ctx.fillStyle = "#555";
      ctx.font = "9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(score.toFixed(2), mx, my - 4);
    },
    []
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">
            Red de Relaciones
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualización radial de las relaciones entre actores
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground whitespace-nowrap">
            Actor principal:
          </label>
          <select
            value={selectedId ?? ""}
            onChange={(e) =>
              setSelectedId(e.target.value ? Number(e.target.value) : null)
            }
            className="text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring min-w-48"
          >
            <option value="">— Seleccionar actor —</option>
            {(actors as Actor[]).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Graph area */}
      <div ref={containerRef} className="flex-1 bg-muted/30 relative">
        {selectedId === null ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm font-medium">
                Selecciona un actor principal
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                para ver su red de relaciones
              </p>
            </div>
          </div>
        ) : loadingRel ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Cargando grafo...</p>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-foreground text-sm font-medium">
                Sin relaciones
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Este actor no tiene relaciones registradas
              </p>
            </div>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef as React.RefObject<never>}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData as { nodes: GraphNode[]; links: GraphLink[] }}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            nodeLabel={(node) => {
              const n = node as GraphNode;
              return n.isMain
                ? `${n.name} (Actor principal)`
                : `${n.name} — Score: ${n.score?.toFixed(2)}`;
            }}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.4}
            cooldownTime={2000}
            nodeRelSize={6}
            linkDirectionalArrowLength={0}
            backgroundColor="#f4f6fb"
          />
        )}

        {/* Legend */}
        {selectedId !== null && graphData.nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl border border-border p-4 shadow-sm text-xs space-y-1.5">
            <p className="font-semibold text-foreground mb-2">Leyenda</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1971c2] inline-block" />
              Actor principal
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#e03131] inline-block" />
              Score alto (≥ 0.75)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f76707] inline-block" />
              Score medio (≥ 0.4)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f59f00] inline-block" />
              Score bajo
            </div>
            <p className="text-muted-foreground mt-2">
              Más cerca = score más alto
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
