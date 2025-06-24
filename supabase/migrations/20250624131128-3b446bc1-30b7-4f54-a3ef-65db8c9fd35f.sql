
-- Eliminar la restricción única que impide múltiples suscripciones para el mismo número
ALTER TABLE public.whatsapp_subscriptions DROP CONSTRAINT IF EXISTS unique_user_phone;

-- Verificar que no existan otras restricciones similares
ALTER TABLE public.whatsapp_subscriptions DROP CONSTRAINT IF EXISTS whatsapp_subscriptions_user_id_phone_number_key;
ALTER TABLE public.whatsapp_subscriptions DROP CONSTRAINT IF EXISTS whatsapp_subscriptions_phone_number_key;

-- Agregar políticas RLS si no existen
DO $$ 
BEGIN
  -- Política para SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view their own subscriptions' 
    AND tablename = 'whatsapp_subscriptions'
  ) THEN
    CREATE POLICY "Users can view their own subscriptions" 
      ON public.whatsapp_subscriptions 
      FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;

  -- Política para INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can create their own subscriptions' 
    AND tablename = 'whatsapp_subscriptions'
  ) THEN
    CREATE POLICY "Users can create their own subscriptions" 
      ON public.whatsapp_subscriptions 
      FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Política para UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update their own subscriptions' 
    AND tablename = 'whatsapp_subscriptions'
  ) THEN
    CREATE POLICY "Users can update their own subscriptions" 
      ON public.whatsapp_subscriptions 
      FOR UPDATE 
      USING (auth.uid() = user_id);
  END IF;

  -- Política para DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete their own subscriptions' 
    AND tablename = 'whatsapp_subscriptions'
  ) THEN
    CREATE POLICY "Users can delete their own subscriptions" 
      ON public.whatsapp_subscriptions 
      FOR DELETE 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Habilitar RLS en la tabla si no está habilitado
ALTER TABLE public.whatsapp_subscriptions ENABLE ROW LEVEL SECURITY;

-- Agregar políticas RLS para whatsapp_automated_logs si no existen
DO $$ 
BEGIN
  -- Política para SELECT en logs automáticos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view their own automated logs' 
    AND tablename = 'whatsapp_automated_logs'
  ) THEN
    CREATE POLICY "Users can view their own automated logs" 
      ON public.whatsapp_automated_logs 
      FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;

  -- Política para INSERT en logs automáticos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'System can insert automated logs' 
    AND tablename = 'whatsapp_automated_logs'
  ) THEN
    CREATE POLICY "System can insert automated logs" 
      ON public.whatsapp_automated_logs 
      FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Habilitar RLS en la tabla de logs si no está habilitado
ALTER TABLE public.whatsapp_automated_logs ENABLE ROW LEVEL SECURITY;
