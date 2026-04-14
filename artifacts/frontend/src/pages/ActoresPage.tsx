import { useState } from "react";
import {
  useListActors,
  useCreateActor,
  useUpdateActor,
  useDeleteActor,
} from "@workspace/api-client-react";
import { getListActorsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  PlusCircle,
  Search,
  MapPin,
} from "lucide-react";

interface LocationItem {
  name: string;
  lat: number;
  lon: number;
}

interface Actor {
  id: number;
  name: string;
  sector?: string | null;
  lat?: number | null;
  lon?: number | null;
  custom_fields: Record<string, string>;
}

interface CustomField {
  key: string;
  value: string;
}

const emptyForm = {
  name: "",
  sector: "",
  locations: [] as LocationItem[], // Array para múltiples ubicaciones
  customFields: [] as CustomField[],
};

export default function ActoresPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Nuevos estados para la búsqueda de ubicaciones
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingLoc, setIsSearchingLoc] = useState(false);

  // Función para buscar en OpenStreetMap Nominatim
  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingLoc(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Error buscando ubicación", err);
    } finally {
      setIsSearchingLoc(false);
    }
  };

  const addLocation = (result: any) => {
    setForm((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          name: result.display_name,
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
        },
      ],
    }));
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeLocation = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== idx),
    }));
  };

  const { data: actors = [], isLoading } = useListActors({
    query: { queryKey: getListActorsQueryKey() },
  });

  const createMutation = useCreateActor({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListActorsQueryKey() });
        setForm({ ...emptyForm });
        setError(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { error?: string } })?.data?.error;
        setError(msg || "Error al crear el actor");
      },
    },
  });

  const updateMutation = useUpdateActor({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListActorsQueryKey() });
        setForm({ ...emptyForm });
        setEditId(null);
        setError(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { error?: string } })?.data?.error;
        setError(msg || "Error al actualizar el actor");
      },
    },
  });

  const deleteMutation = useDeleteActor({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListActorsQueryKey() });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const customFields: Record<string, string> = {};
    for (const f of form.customFields) {
      if (f.key.trim()) customFields[f.key.trim()] = f.value;
    }

    // Guardamos la lista completa de ubicaciones en los campos personalizados para no perder información
    if (form.locations.length > 0) {
      customFields["_locationsData"] = JSON.stringify(form.locations);
    }

    const payload = {
      name: form.name,
      sector: form.sector || null,
      // Guardamos la primera ubicación como principal en la DB para el grafo radial y retrocompatibilidad
      lat: form.locations.length > 0 ? form.locations[0].lat : null,
      lon: form.locations.length > 0 ? form.locations[0].lon : null,
      custom_fields: customFields,
    };

    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const handleEdit = (actor: Actor) => {
    setEditId(actor.id);
    setError(null);

    // Recuperar custom fields y extraer ubicaciones guardadas
    const actorCustomFields = { ...(actor.custom_fields || {}) };
    let savedLocations: LocationItem[] = [];

    if (actorCustomFields["_locationsData"]) {
      try {
        savedLocations = JSON.parse(actorCustomFields["_locationsData"]);
        delete actorCustomFields["_locationsData"]; // Lo quitamos para no mostrarlo en la tabla estándar
      } catch (e) {}
    } else if (actor.lat && actor.lon) {
      // Compatibilidad con actores antiguos que solo tienen 1 lat/lon
      savedLocations = [
        { name: "Ubicación Principal", lat: actor.lat, lon: actor.lon },
      ];
    }

    const customFieldsList = Object.entries(actorCustomFields).map(
      ([key, value]) => ({ key, value }),
    );

    setForm({
      name: actor.name,
      sector: actor.sector || "",
      locations: savedLocations,
      customFields: customFieldsList,
    });
  };

  const handleCancel = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setError(null);
  };

  const addCustomField = () => {
    setForm((prev) => ({
      ...prev,
      customFields: [...prev.customFields, { key: "", value: "" }],
    }));
  };

  const removeCustomField = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== idx),
    }));
  };

  const updateCustomField = (
    idx: number,
    field: "key" | "value",
    val: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f, i) =>
        i === idx ? { ...f, [field]: val } : f,
      ),
    }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          Gestión de Actores
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Añade y edita los actores corporativos del sistema
        </p>
      </div>

      {/* Form */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          {editId !== null ? "Editar actor" : "Nuevo actor"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nombre del actor"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Sector
              </label>
              <input
                type="text"
                value={form.sector}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sector: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ej: Banca, Energía, Tecnología..."
              />
            </div>

            <div className="border border-border p-4 rounded-lg bg-muted/10">
              <label className="block text-xs font-medium text-foreground mb-2">
                Ubicaciones de la empresa
              </label>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), handleSearchLocation())
                  }
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring"
                  placeholder="Buscar ciudad, calle, código postal..."
                />
                <button
                  type="button"
                  onClick={handleSearchLocation}
                  className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm flex items-center gap-2 hover:bg-secondary/80"
                >
                  <Search size={16} /> {isSearchingLoc ? "..." : "Buscar"}
                </button>
              </div>

              {/* Resultados de la búsqueda */}
              {searchResults.length > 0 && (
                <ul className="mb-4 bg-white border border-border rounded-lg shadow-sm max-h-40 overflow-y-auto">
                  {searchResults.map((res, i) => (
                    <li
                      key={i}
                      onClick={() => addLocation(res)}
                      className="px-3 py-2 text-xs hover:bg-muted cursor-pointer border-b last:border-0 truncate"
                    >
                      {res.display_name}
                    </li>
                  ))}
                </ul>
              )}

              {/* Lista de Ubicaciones Añadidas */}
              {form.locations.length > 0 ? (
                <div className="space-y-2">
                  {form.locations.map((loc, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between bg-white border border-border p-2 rounded-md"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <MapPin
                          size={14}
                          className="text-primary flex-shrink-0"
                        />
                        <span className="text-xs truncate" title={loc.name}>
                          {loc.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLocation(idx)}
                        className="text-destructive hover:bg-destructive/10 p-1 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No hay ubicaciones registradas.
                </p>
              )}
            </div>
          </div>

          {/* Custom fields */}
          {form.customFields.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                Campos personalizados
              </p>
              {form.customFields.map((cf, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={cf.key}
                    onChange={(e) =>
                      updateCustomField(idx, "key", e.target.value)
                    }
                    placeholder="Clave"
                    className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={cf.value}
                    onChange={(e) =>
                      updateCustomField(idx, "value", e.target.value)
                    }
                    placeholder="Valor"
                    className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomField(idx)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addCustomField}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <PlusCircle size={14} />
            Añadir campo personalizado
          </button>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {editId !== null ? (
                <>
                  <Check size={15} />
                  {isPending ? "Guardando..." : "Guardar cambios"}
                </>
              ) : (
                <>
                  <Plus size={15} />
                  {isPending ? "Creando..." : "Crear actor"}
                </>
              )}
            </button>
            {editId !== null && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-border text-sm rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Lista de actores{" "}
            <span className="text-muted-foreground font-normal">
              ({(actors as Actor[]).length})
            </span>
          </h2>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : (actors as Actor[]).length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No hay actores. Añade el primero usando el formulario de arriba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sector
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Coordenadas
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Campos extra
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(actors as Actor[]).map((actor) => (
                  <tr
                    key={actor.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      editId === actor.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-6 py-3 font-medium text-foreground">
                      {actor.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {actor.sector || (
                        <span className="italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {actor.lat != null && actor.lon != null ? (
                        `${actor.lat.toFixed(4)}, ${actor.lon.toFixed(4)}`
                      ) : (
                        <span className="italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {Object.keys(actor.custom_fields || {}).length > 0 ? (
                        Object.entries(actor.custom_fields)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")
                      ) : (
                        <span className="italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleEdit(actor)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() =>
                            confirm(
                              `¿Eliminar "${actor.name}"? Esta acción también eliminará sus relaciones.`,
                            ) && deleteMutation.mutate({ id: actor.id })
                          }
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
