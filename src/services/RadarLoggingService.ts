
import { supabase } from '@/integrations/supabase/client';

export interface RadarLogEntry {
  id?: string;
  user_id?: string;
  timestamp: Date;
  operation: string;
  parameters: any;
  status: 'started' | 'completed' | 'error';
  results?: any;
  error?: string;
  execution_time_ms?: number;
}

export class RadarLoggingService {
  private static logs: RadarLogEntry[] = [];

  static async logRadarExecution(
    operation: string,
    parameters: any,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<string> {
    const logId = `radar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const logEntry: RadarLogEntry = {
      id: logId,
      timestamp: new Date(),
      operation,
      parameters,
      status: 'started'
    };

    // Agregar a logs locales
    this.logs.unshift(logEntry);
    
    // Log detallado
    onLog?.('info', `=== INICIANDO EJECUCIÓN RADAR.PY ===`);
    onLog?.('info', `Operación: ${operation}`);
    onLog?.('info', `Parámetros enviados:`, parameters);
    
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        logEntry.user_id = user.id;
        
        // Guardar en base de datos
        await this.saveToDatabase(logEntry);
      }
    } catch (error) {
      console.warn('Error guardando log en BD:', error);
    }

    return logId;
  }

  static async updateRadarLog(
    logId: string,
    status: 'completed' | 'error',
    results?: any,
    error?: string,
    startTime?: number,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<void> {
    const logIndex = this.logs.findIndex(log => log.id === logId);
    
    if (logIndex !== -1) {
      const executionTime = startTime ? Date.now() - startTime : undefined;
      
      this.logs[logIndex] = {
        ...this.logs[logIndex],
        status,
        results,
        error,
        execution_time_ms: executionTime
      };

      // Log detallado del resultado
      if (status === 'completed') {
        onLog?.('success', `=== RADAR.PY COMPLETADO EXITOSAMENTE ===`);
        onLog?.('success', `Tiempo de ejecución: ${executionTime}ms`);
        onLog?.('success', `Resultados:`, results);
      } else {
        onLog?.('error', `=== RADAR.PY FALLÓ ===`);
        onLog?.('error', `Error: ${error}`);
        onLog?.('error', `Tiempo hasta el error: ${executionTime}ms`);
      }

      // Actualizar en base de datos
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await this.updateInDatabase(logId, this.logs[logIndex]);
        }
      } catch (dbError) {
        console.warn('Error actualizando log en BD:', dbError);
      }
    }
  }

  static getLocalLogs(): RadarLogEntry[] {
    return [...this.logs].slice(0, 100); // Últimos 100 logs
  }

  static async getDatabaseLogs(): Promise<RadarLogEntry[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('radar_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error obteniendo logs de BD:', error);
        return [];
      }

      return (data || []).map(log => ({
        id: log.id,
        user_id: log.user_id || undefined,
        timestamp: new Date(log.timestamp),
        operation: log.operation,
        parameters: log.parameters,
        status: log.status as 'started' | 'completed' | 'error',
        results: log.results || undefined,
        error: log.error || undefined,
        execution_time_ms: log.execution_time_ms || undefined
      }));
    } catch (error) {
      console.error('Error accediendo a logs de BD:', error);
      return [];
    }
  }

  private static async saveToDatabase(logEntry: RadarLogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('radar_logs')
        .insert({
          id: logEntry.id!,
          user_id: logEntry.user_id!,
          timestamp: logEntry.timestamp.toISOString(),
          operation: logEntry.operation,
          parameters: logEntry.parameters,
          status: logEntry.status,
          results: logEntry.results || null,
          error: logEntry.error || null,
          execution_time_ms: logEntry.execution_time_ms || null
        });

      if (error) {
        console.error('Error guardando log:', error);
      }
    } catch (error) {
      console.error('Error en saveToDatabase:', error);
    }
  }

  private static async updateInDatabase(logId: string, logEntry: RadarLogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('radar_logs')
        .update({
          status: logEntry.status,
          results: logEntry.results || null,
          error: logEntry.error || null,
          execution_time_ms: logEntry.execution_time_ms || null
        })
        .eq('id', logId);

      if (error) {
        console.error('Error actualizando log:', error);
      }
    } catch (error) {
      console.error('Error en updateInDatabase:', error);
    }
  }

  static clearLocalLogs(): void {
    this.logs = [];
  }

  static exportLogs(): string {
    const logs = this.getLocalLogs();
    return JSON.stringify(logs, null, 2);
  }

  static downloadLogs(): void {
    const logsData = this.exportLogs();
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radar_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
