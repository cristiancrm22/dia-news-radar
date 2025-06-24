
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScheduledEmailService } from "@/services/ScheduledEmailService";
import { Mail, AlertCircle, CheckCircle, RefreshCw, Clock } from "lucide-react";

const EmailAutomatedLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const result = await ScheduledEmailService.getAutomatedLogs();
      if (result.success && result.logs) {
        setLogs(result.logs);
      }
    } catch (error) {
      console.error("Error loading email automated logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-100 text-green-800">Enviado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falló</Badge>;
      default:
        return <Badge variant="secondary">Procesando</Badge>;
    }
  };

  const getExecutionTypeBadge = (type: string) => {
    switch (type) {
      case 'immediate':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Manual</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Programado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Logs de Envíos Automáticos de Email ({logs.length})
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadLogs} 
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </CardTitle>
        <CardDescription>
          Historial de emails enviados automáticamente con noticias
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && logs.length === 0 ? (
          <div className="text-center py-4">Cargando logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No hay logs de envíos automáticos de email
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium">{log.email_address}</span>
                      {getStatusBadge(log.status)}
                      {getExecutionTypeBadge(log.execution_type)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(log.sent_at).toLocaleString('es-ES')}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Noticias enviadas:</span> {log.news_count}
                  </div>
                  
                  {log.error_message && (
                    <div className="text-sm text-red-600 mb-2">
                      <span className="font-medium">Error:</span> {log.error_message}
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded p-2 text-xs">
                    <div className="font-medium mb-1">Vista previa del email:</div>
                    <div className="text-gray-700 max-h-20 overflow-y-auto">
                      {log.message_content ? (
                        // Extraer texto del HTML para mostrar una vista previa
                        log.message_content.replace(/<[^>]*>/g, '').substring(0, 200)
                      ) : 'Sin contenido disponible'}
                      {log.message_content && log.message_content.length > 200 && '...'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailAutomatedLogs;
