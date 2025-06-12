
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, RefreshCw } from "lucide-react";
import { RadarLoggingService, RadarLogEntry } from "@/services/RadarLoggingService";

const RadarLogsViewer = () => {
  const [logs, setLogs] = useState<RadarLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const localLogs = RadarLoggingService.getLocalLogs();
      const dbLogs = await RadarLoggingService.getDatabaseLogs();
      
      // Combinar y ordenar logs
      const allLogs = [...localLogs, ...dbLogs]
        .filter((log, index, self) => 
          index === self.findIndex(l => l.id === log.id)
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setLogs(allLogs);
    } catch (error) {
      console.error('Error cargando logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const clearLogs = () => {
    RadarLoggingService.clearLocalLogs();
    setLogs([]);
  };

  const downloadLogs = () => {
    RadarLoggingService.downloadLogs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'error': return 'destructive';
      case 'started': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Logs de Ejecución Radar.py</CardTitle>
            <CardDescription>
              Historial detallado de ejecuciones del script Python ({logs.length} entradas)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={downloadLogs}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 w-full">
          {logs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay logs de radar.py disponibles</p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                      <Badge variant="outline">
                        {log.operation}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {log.timestamp.toLocaleString()}
                      </span>
                      {log.execution_time_ms && (
                        <span className="text-xs text-blue-600">
                          {log.execution_time_ms}ms
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Parámetros enviados:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.parameters, null, 2)}
                      </pre>
                    </div>
                    
                    {log.results && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Resultados:</h4>
                        <pre className="text-xs bg-green-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.results, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {log.error && (
                      <div>
                        <h4 className="text-sm font-medium mb-1 text-red-600">Error:</h4>
                        <pre className="text-xs bg-red-50 p-2 rounded overflow-x-auto text-red-800">
                          {log.error}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RadarLogsViewer;
