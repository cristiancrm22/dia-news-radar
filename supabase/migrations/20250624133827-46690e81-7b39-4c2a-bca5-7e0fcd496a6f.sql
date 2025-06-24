
-- Create email_subscriptions table
CREATE TABLE public.email_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_address TEXT NOT NULL,
  scheduled_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT '08:00:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'daily',
  weekdays INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sent TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_automated_logs table
CREATE TABLE public.email_automated_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID,
  email_address TEXT NOT NULL,
  message_content TEXT NOT NULL,
  news_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  execution_type TEXT NOT NULL DEFAULT 'scheduled',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key relationship
ALTER TABLE public.email_automated_logs 
ADD CONSTRAINT email_automated_logs_subscription_id_fkey 
FOREIGN KEY (subscription_id) REFERENCES public.email_subscriptions(id);

-- Enable RLS on both tables
ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automated_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_subscriptions
CREATE POLICY "Users can view their own email subscriptions" 
  ON public.email_subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email subscriptions" 
  ON public.email_subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email subscriptions" 
  ON public.email_subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email subscriptions" 
  ON public.email_subscriptions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for email_automated_logs
CREATE POLICY "Users can view their own email automated logs" 
  ON public.email_automated_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email automated logs" 
  ON public.email_automated_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
