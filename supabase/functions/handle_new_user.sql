
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Insert default search settings ONLY if they don't exist
  INSERT INTO public.user_search_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert default news sources
  INSERT INTO public.user_news_sources (user_id, name, url, enabled) VALUES
    (NEW.id, 'Clarín', 'https://www.clarin.com', true),
    (NEW.id, 'La Nación', 'https://www.lanacion.com.ar', true),
    (NEW.id, 'Página 12', 'https://www.pagina12.com.ar', true),
    (NEW.id, 'Infobae', 'https://www.infobae.com', true),
    (NEW.id, 'Ámbito', 'https://www.ambito.com', true)
  ON CONFLICT (user_id, name) DO NOTHING;
  
  -- Insert default keywords
  INSERT INTO public.user_keywords (user_id, keyword) VALUES
    (NEW.id, 'Magario'),
    (NEW.id, 'Kicillof'),
    (NEW.id, 'Espinosa'),
    (NEW.id, 'Milei')
  ON CONFLICT (user_id, keyword) DO NOTHING;
  
  -- Insert default Twitter users
  INSERT INTO public.user_twitter_users (user_id, twitter_username) VALUES
    (NEW.id, 'Senado_BA'),
    (NEW.id, 'VeronicaMagario'),
    (NEW.id, 'BAProvincia'),
    (NEW.id, 'DiputadosBA')
  ON CONFLICT (user_id, twitter_username) DO NOTHING;
  
  RETURN NEW;
END;
$function$
