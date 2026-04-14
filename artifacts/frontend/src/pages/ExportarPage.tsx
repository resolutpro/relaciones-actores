import { useState } from "react";
import { useExportData } from "@workspace/api-client-react";
import { getExportDataQueryKey } from "@workspace/api-client-react";
import { Download, RefreshCw } from "lucide-react";

interface ExportData {
  exportedAt: string;
  actors: unknown[];
  relationships: unknown[];
}

export default function ExportarPage() {
  const [downloaded, setDownloaded] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useExportData({
    query: { queryKey: getExportDataQueryKey() },
  });

  const exportData = data as ExportData | undefined;

  const handleDownload = () => {
    if (!exportData) return;
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          Exportar Datos
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Descarga todos los actores y relaciones en formato JSON para su
          análisis externo o uso con LLMs
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Resumen del contenido
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        ) : exportData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {exportData.actors.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Actores</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {exportData.relationships.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Relaciones</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {new Date(exportData.exportedAt).toLocaleDateString("es-ES")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Fecha</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={!exportData || isLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Download size={16} />
          {downloaded ? "¡Descargado!" : "Descargar export.json"}
        </button>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2.5 border border-border text-sm rounded-lg text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={15} className={isRefetching ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Preview */}
      {exportData && (
        <div className="mt-6 bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Vista previa del JSON
            </h2>
          </div>
          <pre className="p-6 text-xs font-mono text-foreground/80 overflow-auto max-h-96 bg-muted/20">
            {JSON.stringify(exportData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
