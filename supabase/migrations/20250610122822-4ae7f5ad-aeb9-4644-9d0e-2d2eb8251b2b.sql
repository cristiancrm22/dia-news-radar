
-- Crear tabla para logs de radar.py
CREATE TABLE public.radar_logs (
  id text NOT NULL PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  operation text NOT NULL,
  parameters jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'completed', 'error')),
  results jsonb,
  error text,
  execution_time_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.radar_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para que los usuarios solo vean sus propios logs
CREATE POLICY "Users can view their own radar logs" 
  ON public.radar_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own radar logs" 
  ON public.radar_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own radar logs" 
  ON public.radar_logs 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Índice para mejorar rendimiento
CREATE INDEX idx_radar_logs_user_timestamp ON public.radar_logs(user_id, timestamp DESC);
