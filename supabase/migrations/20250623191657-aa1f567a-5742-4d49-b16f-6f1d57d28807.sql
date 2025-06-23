
-- 1. Crear tabla para logs de mensajes automáticos de WhatsApp
CREATE TABLE public.whatsapp_automated_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES whatsapp_subscriptions(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  news_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  execution_type TEXT NOT NULL DEFAULT 'scheduled'
);

-- Habilitar RLS para la nueva tabla
ALTER TABLE public.whatsapp_automated_logs ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propios logs
CREATE POLICY "Users can view their own automated logs" 
  ON public.whatsapp_automated_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para insertar logs (solo el sistema puede insertar)
CREATE POLICY "System can insert automated logs" 
  ON public.whatsapp_automated_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
