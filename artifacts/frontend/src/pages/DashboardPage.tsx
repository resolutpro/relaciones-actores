import { useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import {
  useListActors,
  useGetActorRelationships,
} from "@workspace/api-client-react";
import { getListActorsQueryKey, getGetActorRelationshipsQueryKey } from "@workspace/api-client-react";

interface Actor {
  id: number;
  name: string;
  sector?: string | null;
  lat?: number | null;
  lon?: number | null;
  custom_fields: Record<string, string>;
}

interface ActorWithScore extends Actor {
  score: number;
  relationship_id: number;
  comments?: string | null;
}

function getMarkerColor(
  actor: Actor,
  selectedId: number | null,
  relMap: Map<number, number>
): string {
  if (actor.id === selectedId) return "#1971c2";
  if (selectedId === null) return "#4dabf7";
  const score = relMap.get(actor.id);
  if (score === undefined) return "#909090";
  if (score >= 0.75) return "#e03131";
  if (score >= 0.4) return "#f76707";
  return "#f59f00";
}

function applyJitter(actors: Actor[]): Array<Actor & { jLat: number; jLon: number }> {
  const groups = new Map<string, Actor[]>();
  for (const actor of actors) {
    if (actor.lat == null || actor.lon == null) continue;
    const key = `${actor.lat.toFixed(5)},${actor.lon.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(actor);
  }

  return actors
    .filter((a) => a.lat != null && a.lon != null)
    .map((actor) => {
      const key = `${actor.lat!.toFixed(5)},${actor.lon!.toFixed(5)}`;
      const group = groups.get(key)!;
      if (group.length === 1) return { ...actor, jLat: actor.lat!, jLon: actor.lon! };
      const idx = group.indexOf(actor);
      const angle = (2 * Math.PI * idx) / group.length;
      const radius = 0.015;
      return {
        ...actor,
        jLat: actor.lat! + radius * Math.cos(angle),
        jLon: actor.lon! + radius * Math.sin(angle),
      };
    });
}

export default function DashboardPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: actors = [], isLoading } = useListActors({
    query: { queryKey: getListActorsQueryKey() },
  });

  const { data: relationships = [] } = useGetActorRelationships(
    selectedId ?? 0,
    {
      query: {
        enabled: selectedId !== null,
        queryKey: getGetActorRelationshipsQueryKey(selectedId ?? 0),
      },
    }
  );

  const relMap = useMemo(() => {
    const map = new Map<number, number>();
    if (selectedId !== null) {
      for (const r of relationships as ActorWithScore[]) {
        map.set(r.id, r.score);
      }
    }
    return map;
  }, [relationships, selectedId]);

  const jitteredActors = useMemo(() => applyJitter(actors as Actor[]), [actors]);

  const selectedActor = (actors as Actor[]).find((a) => a.id === selectedId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">Mapa de Actores</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualiza los actores sobre el mapa de España
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

      {/* Legend */}
      {selectedId !== null && (
        <div className="bg-white border-b border-border px-6 py-2 flex items-center gap-5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Leyenda:</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-[#1971c2]" />
            Actor principal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-[#e03131]" />
            Puntuación alta (≥ 0.75)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-[#f76707]" />
            Puntuación media (≥ 0.4)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-[#f59f00]" />
            Puntuación baja
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-[#909090]" />
            Sin relación
          </span>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <p className="text-muted-foreground text-sm">Cargando mapa...</p>
          </div>
        ) : (
          <MapContainer
            center={[40.416775, -3.70379]}
            zoom={6}
            className="h-full w-full"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {jitteredActors.map((actor) => {
              const color = getMarkerColor(actor as Actor, selectedId, relMap);
              const isMain = actor.id === selectedId;
              const score = relMap.get(actor.id);
              return (
                <CircleMarker
                  key={actor.id}
                  center={[actor.jLat, actor.jLon]}
                  radius={isMain ? 14 : 10}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.9,
                    color: isMain ? "#fff" : color,
                    weight: isMain ? 3 : 1.5,
                  }}
                  eventHandlers={{
                    click: () => setSelectedId(actor.id === selectedId ? null : actor.id),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]}>
                    <div className="text-xs">
                      <p className="font-semibold">{actor.name}</p>
                      {actor.sector && (
                        <p className="text-muted-foreground">{actor.sector}</p>
                      )}
                      {selectedId !== null && actor.id !== selectedId && (
                        <p className="mt-1">
                          Puntuación:{" "}
                          {score !== undefined
                            ? score.toFixed(2)
                            : "sin relación"}
                        </p>
                      )}
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}

        {/* Empty state */}
        {!isLoading && jitteredActors.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 rounded-xl shadow-lg px-6 py-4 text-center">
              <p className="text-sm font-medium text-foreground">
                No hay actores en el mapa
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Añade actores con coordenadas en la sección Actores
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
