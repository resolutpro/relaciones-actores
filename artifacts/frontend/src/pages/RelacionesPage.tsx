import { useState } from "react";
import {
  useListRelationships,
  useListActors,
  useCreateRelationship,
  useUpdateRelationship,
  useDeleteRelationship,
} from "@workspace/api-client-react";
import {
  getListRelationshipsQueryKey,
  getListActorsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check } from "lucide-react";

interface Actor {
  id: number;
  name: string;
  sector?: string | null;
  custom_fields: Record<string, string>;
}

interface Relationship {
  id: number;
  source_actor_id: number;
  target_actor_id: number;
  score: number;
  comments?: string | null;
}

const emptyForm = {
  source_actor_id: "",
  target_actor_id: "",
  score: 0.5,
  comments: "",
};

export default function RelacionesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: actors = [], isLoading: loadingActors } = useListActors({
    query: { queryKey: getListActorsQueryKey() },
  });

  const { data: relationships = [], isLoading: loadingRel } = useListRelationships({
    query: { queryKey: getListRelationshipsQueryKey() },
  });

  const createMutation = useCreateRelationship({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
        setForm({ ...emptyForm });
        setError(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { error?: string } })?.data?.error;
        setError(msg || "Error al crear la relación");
      },
    },
  });

  const updateMutation = useUpdateRelationship({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
        setForm({ ...emptyForm });
        setEditId(null);
        setError(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { error?: string } })?.data?.error;
        setError(msg || "Error al actualizar la relación");
      },
    },
  });

  const deleteMutation = useDeleteRelationship({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.source_actor_id || !form.target_actor_id) {
      setError("Debes seleccionar los dos actores");
      return;
    }
    if (form.source_actor_id === form.target_actor_id) {
      setError("No puedes relacionar un actor consigo mismo");
      return;
    }
    const payload = {
      source_actor_id: Number(form.source_actor_id),
      target_actor_id: Number(form.target_actor_id),
      score: form.score,
      comments: form.comments || null,
    };
    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const handleEdit = (rel: Relationship) => {
    setEditId(rel.id);
    setError(null);
    setForm({
      source_actor_id: String(rel.source_actor_id),
      target_actor_id: String(rel.target_actor_id),
      score: rel.score,
      comments: rel.comments || "",
    });
  };

  const handleCancel = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setError(null);
  };

  const actorMap = new Map((actors as Actor[]).map((a) => [a.id, a.name]));
  const isPending = createMutation.isPending || updateMutation.isPending;

  function scoreColor(score: number) {
    if (score >= 0.75) return "text-red-600";
    if (score >= 0.4) return "text-orange-500";
    return "text-yellow-600";
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          Gestión de Relaciones
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define y ajusta las relaciones entre actores
        </p>
      </div>

      {/* Form */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          {editId !== null ? "Editar relación" : "Nueva relación"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Actor A *
              </label>
              <select
                value={form.source_actor_id}
                onChange={(e) =>
                  setForm((p) => ({ ...p, source_actor_id: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">— Seleccionar —</option>
                {(actors as Actor[]).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Actor B *
              </label>
              <select
                value={form.target_actor_id}
                onChange={(e) =>
                  setForm((p) => ({ ...p, target_actor_id: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">— Seleccionar —</option>
                {(actors as Actor[]).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Puntuación de relación:{" "}
              <span className="font-bold text-primary">
                {form.score.toFixed(2)}
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={form.score}
              onChange={(e) =>
                setForm((p) => ({ ...p, score: parseFloat(e.target.value) }))
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0.0 — Sin relación</span>
              <span>0.5 — Media</span>
              <span>1.0 — Máxima</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Comentarios
            </label>
            <textarea
              value={form.comments}
              onChange={(e) =>
                setForm((p) => ({ ...p, comments: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Describe la naturaleza de la relación..."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending || loadingActors}
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
                  {isPending ? "Creando..." : "Crear relación"}
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
            Lista de relaciones{" "}
            <span className="text-muted-foreground font-normal">
              ({(relationships as Relationship[]).length})
            </span>
          </h2>
        </div>
        {loadingRel ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : (relationships as Relationship[]).length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No hay relaciones. Crea la primera usando el formulario de arriba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actor A
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actor B
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Puntuación
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Comentarios
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(relationships as Relationship[]).map((rel) => (
                  <tr
                    key={rel.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      editId === rel.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-6 py-3 font-medium text-foreground">
                      {actorMap.get(rel.source_actor_id) ?? rel.source_actor_id}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {actorMap.get(rel.target_actor_id) ?? rel.target_actor_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${rel.score * 100}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-semibold ${scoreColor(rel.score)}`}
                        >
                          {rel.score.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">
                      {rel.comments || <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleEdit(rel)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() =>
                            confirm("¿Eliminar esta relación?") &&
                            deleteMutation.mutate({ id: rel.id })
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
