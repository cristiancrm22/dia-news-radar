
import { useState, useCallback } from "react";
import { LogEntry } from "@/components/LogViewer";

export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((
    type: LogEntry['type'],
    service: LogEntry['service'],
    message: string,
    details?: any
  ) => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      service,
      message,
      details
    };
    
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep only last 100 logs
    console.log(`[${service.toUpperCase()}] ${type.toUpperCase()}: ${message}`, details || '');
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    addLog,
    clearLogs
  };
};
