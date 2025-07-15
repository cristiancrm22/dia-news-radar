
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CORREGIDO: Función para ejecutar búsqueda usando el MISMO proceso que la pantalla principal
async function executeNewsSearchLikeMainScreen(userId: string, supabase: any): Promise<{ success: boolean; news?: any[]; error?: string }> {
  try {
    console.log(`🔍 EJECUTANDO BÚSQUEDA COMO PANTALLA PRINCIPAL PARA USUARIO: ${userId}`);
    
    // **PASO 1: OBTENER CONFIGURACIÓN EXACTA COMO LA PANTALLA PRINCIPAL**
    
    // Obtener fuentes habilitadas
    const { data: sources, error: sourcesError } = await supabase
      .from('user_news_sources')
      .select('name, url, enabled')
      .eq('user_id', userId)
      .eq('enabled', true);

    if (sourcesError) {
      console.error('❌ Error obteniendo fuentes:', sourcesError);
      return { success: false, error: `Error obteniendo fuentes: ${sourcesError.message}` };
    }

    const enabledSources = sources || [];
    console.log(`📰 Fuentes habilitadas: ${enabledSources.map(s => s.name).join(', ')}`);

    if (enabledSources.length === 0) {
      console.log('⚠️ No hay fuentes habilitadas');
      return { success: false, error: 'No hay fuentes habilitadas' };
    }

    // Obtener palabras clave
    const { data: keywords, error: keywordsError } = await supabase
      .from('user_keywords')
      .select('keyword')
      .eq('user_id', userId);

    if (keywordsError) {
      console.error('❌ Error obteniendo palabras clave:', keywordsError);
      return { success: false, error: `Error obteniendo palabras clave: ${keywordsError.message}` };
    }

    const userKeywords = keywords?.map(k => k.keyword) || [];
    console.log(`📝 Palabras clave: ${userKeywords.join(', ')}`);

    // Obtener configuración de búsqueda
    const { data: searchSettings, error: settingsError } = await supabase
      .from('user_search_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError) {
      console.error('❌ Error obteniendo configuración:', settingsError);
    }

    const settings = searchSettings || {
      max_results: 50,
      include_twitter: true,
      validate_links: true,
      current_date_only: true,
      deep_scrape: true
    };

    console.log(`⚙️ Configuración de búsqueda:`, settings);

    // Obtener usuarios de Twitter
    const { data: twitterUsers, error: twitterError } = await supabase
      .from('user_twitter_users')
      .select('twitter_username')
      .eq('user_id', userId);

    const userTwitterUsers = twitterUsers?.map(t => t.twitter_username) || [];
    console.log(`🐦 Usuarios de Twitter: ${userTwitterUsers.join(', ')}`);

    // **PASO 2: BUSCAR RESULTADOS PREVIOS EN RADAR_LOGS EXACTAMENTE COMO LA PANTALLA PRINCIPAL**
    console.log('🔍 Buscando resultados previos en radar_logs...');
    
    const { data: radarLogs } = await supabase
      .from('radar_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('results', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (radarLogs && radarLogs.length > 0) {
      const latestLog = radarLogs[0];
      const results = latestLog.results as any;
      
      if (results && results.news && Array.isArray(results.news) && results.news.length > 0) {
        // Verificar si el log es reciente (menos de 1 hora)
        const logTime = new Date(latestLog.created_at).getTime();
        const now = new Date().getTime();
        const hoursDiff = (now - logTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 1) {
          console.log(`✅ Usando resultados del cache (${hoursDiff.toFixed(1)}h de antigüedad): ${results.news.length} noticias`);
          return { success: true, news: results.news };
        } else {
          console.log(`⏰ Cache antiguo (${hoursDiff.toFixed(1)}h), ejecutando nueva búsqueda`);
        }
      }
    }

    // **PASO 3: EJECUTAR NUEVA BÚSQUEDA USANDO EL SISTEMA PYTHON**
    console.log('🐍 Ejecutando nueva búsqueda con servidor Python...');
    
    const logId = crypto.randomUUID();
    const startTime = Date.now();
    
    // Crear log inicial
    const { error: logError } = await supabase
      .from('radar_logs')
      .insert({
        id: logId,
        user_id: userId,
        operation: 'automated_news_search',
        status: 'running',
        parameters: {
          keywords: userKeywords,
          sources: enabledSources,
          settings: settings,
          twitterUsers: userTwitterUsers,
          executedBy: 'scheduled_function'
        },
        timestamp: new Date().toISOString()
      });

    if (logError) {
      console.error('⚠️ Error creando log inicial:', logError);
    }

    // **CORREGIDO: USAR EXACTAMENTE LA MISMA LÓGICA QUE LA PANTALLA PRINCIPAL**
    const pythonPayload = {
      keywords: userKeywords,
      sources: enabledSources.map(s => s.url),
      includeTwitter: settings.include_twitter,
      maxResults: settings.max_results,
      validateLinks: settings.validate_links,
      currentDateOnly: settings.current_date_only,
      deepScrape: settings.deep_scrape,
      twitterUsers: userTwitterUsers,
      executeScript: true,
      forceExecution: true
    };

    console.log('📤 Payload para Python:', JSON.stringify(pythonPayload, null, 2));

    // Intentar múltiples URLs como hace la pantalla principal
    const pythonUrls = [
      "http://localhost:8000/api/news/refresh",
      "http://127.0.0.1:8000/api/news/refresh",
      "http://host.docker.internal:8000/api/news/refresh"
    ];

    let searchSuccess = false;
    let finalResult: any = null;

    for (const pythonUrl of pythonUrls) {
      try {
        console.log(`🔗 Intentando conectar con: ${pythonUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

        const response = await fetch(pythonUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(pythonPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const executionTime = Date.now() - startTime;
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Búsqueda Python exitosa en ${executionTime}ms`);
          console.log(`📰 Noticias encontradas: ${result.news?.length || 0}`);
          
          // Actualizar log con resultados exitosos
          await supabase
            .from('radar_logs')
            .update({
              status: 'completed',
              results: result,
              execution_time_ms: executionTime
            })
            .eq('id', logId);
          
          finalResult = result;
          searchSuccess = true;
          break; // Salir del loop si fue exitoso
          
        } else {
          const errorText = await response.text();
          console.error(`❌ Error HTTP ${response.status} en ${pythonUrl}: ${errorText}`);
          continue; // Probar siguiente URL
        }
        
      } catch (fetchError: any) {
        console.error(`⚠️ Error de conexión con ${pythonUrl}:`, fetchError);
        continue; // Probar siguiente URL
      }
    }

    if (!searchSuccess) {
      const executionTime = Date.now() - startTime;
      console.error("❌ Todos los intentos de conexión Python fallaron");
      
      await supabase
        .from('radar_logs')
        .update({
          status: 'failed',
          error: 'No se pudo conectar con servidor Python',
          execution_time_ms: executionTime
        })
        .eq('id', logId);
      
      return { success: false, error: 'Servidor Python no disponible' };
    }

    return { 
      success: true, 
      news: finalResult?.news || []
    };
    
  } catch (error: any) {
    console.error('💥 Error general en búsqueda de noticias:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Función para formatear noticias para WhatsApp
function formatNewsForWhatsApp(news: any[]): string {
  if (news.length === 0) {
    let message = "📰 *MONITOREO AUTOMÁTICO - NEWS RADAR*\n\n";
    message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
    message += "⚠️ No se encontraron noticias nuevas en esta búsqueda automática.\n\n";
    message += "Esto puede deberse a:\n";
    message += "• No hay noticias nuevas con las palabras clave configuradas\n";
    message += "• Las fuentes de noticias no están disponibles\n";
    message += "• El servidor de búsqueda está temporalmente inactivo\n\n";
    message += "Se continuará monitoreando automáticamente.\n\n";
    message += "🤖 News Radar - Envío Automático";
    return message;
  }
  
  let message = "📰 *NOTICIAS ENCONTRADAS AUTOMÁTICAMENTE*\n";
  message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
  
  news.slice(0, 8).forEach((item, index) => {
    message += `*${index + 1}.* ${item.title}\n`;
    if (item.summary) {
      message += `📝 ${item.summary.substring(0, 100)}...\n`;
    }
    if (item.sourceUrl && item.sourceUrl !== "#" && item.sourceUrl !== "N/A") {
      message += `🔗 ${item.sourceUrl}\n`;
    }
    message += "\n";
  });
  
  message += "━━━━━━━━━━━━━━━━━━━━\n";
  message += `🤖 News Radar - Envío Automático (${news.length} noticias)`;
  
  return message;
}

// Función para formatear noticias para Email
function formatNewsForEmail(news: any[]): string {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (news.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Monitoreo Automático - News Radar</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 20px; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
            .reason { background: #fef3c7; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📰 News Radar</h1>
              <p>Monitoreo Automático - ${date}</p>
            </div>
            <div class="content">
              <h2>⚠️ Sin noticias nuevas</h2>
              <p>No se encontraron noticias nuevas en esta búsqueda automática con los parámetros de monitoreo configurados.</p>
              <div class="reason">
                <strong>Posibles causas:</strong>
                <ul>
                  <li>No hay noticias nuevas con las palabras clave configuradas</li>
                  <li>Las fuentes de noticias no están disponibles temporalmente</li>
                  <li>El servidor de búsqueda está inactivo</li>
                </ul>
              </div>
              <p>Continuaremos monitoreando las fuentes y palabras clave configuradas automáticamente.</p>
            </div>
            <div class="footer">
              <p>Envío automático de News Radar</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Noticias Encontradas Automáticamente - News Radar</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background: white; padding: 20px; }
          .news-item { margin-bottom: 20px; padding: 15px; border-left: 4px solid #2563eb; background: #f8fafc; border-radius: 4px; }
          .news-title { font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #1e40af; }
          .news-summary { margin-bottom: 10px; color: #4b5563; }
          .news-source { font-size: 12px; color: #6b7280; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .link { color: #2563eb; text-decoration: none; }
          .link:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📰 Noticias Encontradas Automáticamente</h1>
            <p>${date}</p>
          </div>
          <div class="content">
            <p>Noticias encontradas con búsqueda automática usando tus parámetros de monitoreo:</p>
  `;

  news.slice(0, 8).forEach((item, index) => {
    html += `
      <div class="news-item">
        <div class="news-title">${index + 1}. ${item.title}</div>
        <div class="news-summary">${item.summary || item.description || 'Sin resumen disponible'}</div>
        <div class="news-source">
          Fuente: ${item.sourceName || 'Desconocida'} | 
          ${item.date ? new Date(item.date).toLocaleDateString('es-ES') : 'Sin fecha'}
          ${item.sourceUrl && item.sourceUrl !== "#" && item.sourceUrl !== "N/A" ? ` | <a href="${item.sourceUrl}" target="_blank" class="link">Leer más</a>` : ''}
        </div>
      </div>
    `;
  });

  html += `
          </div>
          <div class="footer">
            <p>Este correo fue enviado automáticamente por News Radar</p>
            <p>Total de noticias encontradas: ${news.length}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return html;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== INICIANDO ENVÍO AUTOMÁTICO CORREGIDO CON BÚSQUEDA REAL ===');
  console.log('Timestamp:', new Date().toISOString());

  try {
    const { type = 'whatsapp', scheduled = true, force = false } = await req.json().catch(() => ({}));
    console.log('📋 Parámetros:', { type, scheduled, force });

    // Configurar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener hora actual en Argentina (UTC-3)
    const now = new Date();
    const argTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const currentHour = argTime.getHours();
    const currentMinute = argTime.getMinutes();
    const currentDay = argTime.getDay();

    console.log(`⏰ Hora Argentina: ${currentHour}:${currentMinute.toString().padStart(2, '0')}, Día: ${currentDay}`);

    let subscriptionsTable = '';
    let logsTable = '';
    
    if (type === 'whatsapp') {
      subscriptionsTable = 'whatsapp_subscriptions';
      logsTable = 'whatsapp_automated_logs';
    } else {
      subscriptionsTable = 'email_subscriptions';
      logsTable = 'email_automated_logs';
    }

    // Obtener todas las suscripciones activas
    const { data: subscriptions, error: subsError } = await supabase
      .from(subscriptionsTable)
      .select('*')
      .eq('is_active', true);

    if (subsError) {
      console.error('❌ Error obteniendo suscripciones:', subsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Error obteniendo suscripciones: ${subsError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📱 Suscripciones encontradas: ${subscriptions?.length || 0}`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⏭️ No hay suscripciones activas');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No hay suscripciones activas',
        results: { sent: 0, total: 0, errors: 0 }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Filtrar suscripciones que deben ejecutarse ahora
    const subscriptionsToProcess = subscriptions.filter(subscription => {
      const phoneOrEmail = type === 'whatsapp' ? subscription.phone_number : subscription.email_address;
      
      console.log(`🔍 Evaluando ${phoneOrEmail}:`);
      
      if (force) {
        console.log(`  ✅ FORZADO - SE ENVIARÁ`);
        return true;
      }
      
      if (!scheduled) {
        console.log(`  ✅ INMEDIATO - SE ENVIARÁ`);
        return true;
      }
      
      // Parsear hora programada
      let scheduledHour: number;
      let scheduledMinute: number;
      
      try {
        if (subscription.scheduled_time.includes(':')) {
          [scheduledHour, scheduledMinute] = subscription.scheduled_time.split(':').map(Number);
        } else {
          scheduledHour = parseInt(subscription.scheduled_time);
          scheduledMinute = 0;
        }
      } catch (parseError) {
        console.log(`  ❌ Error parseando hora: ${subscription.scheduled_time}`);
        return false;
      }
      
      // Verificar si está en el rango de tiempo (tolerancia de 10 minutos)
      const scheduledTimeMinutes = scheduledHour * 60 + scheduledMinute;
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      const timeDifference = Math.abs(currentTimeMinutes - scheduledTimeMinutes);
      
      console.log(`  📅 Hora programada: ${scheduledHour}:${scheduledMinute.toString().padStart(2, '0')}`);
      console.log(`  🕐 Hora actual: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
      console.log(`  ⏱️ Diferencia: ${timeDifference} minutos`);
      
      if (timeDifference > 10) {
        console.log(`  ❌ Fuera del rango de tiempo (tolerancia: 10 min)`);
        return false;
      }
      
      // Para suscripciones semanales, verificar el día
      if (subscription.frequency === 'weekly') {
        if (!subscription.weekdays || !subscription.weekdays.includes(currentDay)) {
          console.log(`  ❌ Día incorrecto para frecuencia semanal`);
          return false;
        }
      }
      
      // Verificar si ya se envió hoy
      if (subscription.last_sent) {
        const lastSent = new Date(subscription.last_sent);
        const today = new Date(argTime.getFullYear(), argTime.getMonth(), argTime.getDate());
        const lastSentDate = new Date(lastSent.getFullYear(), lastSent.getMonth(), lastSent.getDate());
        
        if (lastSentDate.getTime() === today.getTime()) {
          console.log(`  ❌ Ya enviado hoy`);
          return false;
        }
      }
      
      console.log(`  ✅ DEBE ENVIARSE`);
      return true;
    });

    console.log(`📊 RESULTADO: ${subscriptionsToProcess.length} de ${subscriptions.length} suscripciones a procesar`);

    if (subscriptionsToProcess.length === 0) {
      console.log('⏭️ No hay suscripciones que procesar en este momento');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No hay suscripciones que procesar en este momento',
        results: { sent: 0, total: 0, errors: 0 }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    let totalNewsFound = 0;

    // **CORREGIDO: AGRUPAR USUARIOS ÚNICOS Y EJECUTAR BÚSQUEDA COMO PANTALLA PRINCIPAL**
    const uniqueUserIds = [...new Set(subscriptionsToProcess.map(s => s.user_id))];
    const userNewsCache = new Map<string, any[]>();

    console.log(`👥 Usuarios únicos a procesar: ${uniqueUserIds.length}`);

    // **EJECUTAR BÚSQUEDAS POR USUARIO USANDO LA MISMA LÓGICA QUE LA PANTALLA PRINCIPAL**
    for (const userId of uniqueUserIds) {
      console.log(`🔄 Ejecutando búsqueda para usuario: ${userId}`);
      const newsSearchResult = await executeNewsSearchLikeMainScreen(userId, supabase);
      
      if (newsSearchResult.success && newsSearchResult.news) {
        userNewsCache.set(userId, newsSearchResult.news);
        totalNewsFound = Math.max(totalNewsFound, newsSearchResult.news.length);
        console.log(`✅ Usuario ${userId}: ${newsSearchResult.news.length} noticias encontradas`);
      } else {
        userNewsCache.set(userId, []);
        console.log(`⚠️ Usuario ${userId}: Sin noticias - ${newsSearchResult.error}`);
      }
    }

    console.log(`📰 RESUMEN DE BÚSQUEDAS: ${totalNewsFound} noticias máximas encontradas`);

    // Procesar cada suscripción usando el cache de noticias
    for (const subscription of subscriptionsToProcess) {
      const phoneOrEmail = type === 'whatsapp' ? subscription.phone_number : subscription.email_address;
      
      try {
        console.log(`📤 Procesando envío para ${phoneOrEmail} (usuario: ${subscription.user_id})...`);

        // Obtener noticias del cache
        const freshNews = userNewsCache.get(subscription.user_id) || [];
        console.log(`📰 Noticias para ${phoneOrEmail}: ${freshNews.length}`);

        // Preparar mensaje
        let messageContent = '';
        if (type === 'whatsapp') {
          messageContent = formatNewsForWhatsApp(freshNews);
        } else {
          messageContent = formatNewsForEmail(freshNews);
        }

        let sendResult = { success: false, error: 'Método no implementado' };

        if (type === 'whatsapp') {
          // Envío WhatsApp
          const { data: whatsappConfigs, error: configError } = await supabase
            .from('user_whatsapp_configs')
            .select('*')
            .eq('user_id', subscription.user_id)
            .single();

          if (configError || !whatsappConfigs?.evolution_api_url) {
            throw new Error(`Configuración WhatsApp no encontrada: ${configError?.message || 'URL Evolution API faltante'}`);
          }

          const instanceName = "SenadoN8N";
          let cleanNumber = phoneOrEmail.replace(/\D/g, '');
          if (!cleanNumber.startsWith('54') && cleanNumber.length >= 10) {
            cleanNumber = '54' + cleanNumber;
          }

          console.log(`📱 Enviando WhatsApp a ${cleanNumber} con ${freshNews.length} noticias`);

          try {
            const whatsappPayload = {
              number: cleanNumber,
              text: messageContent
            };

            const response = await fetch(`${whatsappConfigs.evolution_api_url.trim()}/message/sendText/${instanceName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': whatsappConfigs.api_key || '',
                'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify(whatsappPayload)
            });

            const responseText = await response.text();
            console.log(`WhatsApp Response ${phoneOrEmail}: ${response.status} - ${responseText.substring(0, 200)}`);

            if (response.ok) {
              console.log(`✅ WhatsApp enviado exitosamente a ${phoneOrEmail}`);
              sendResult = { success: true };
            } else {
              console.log(`❌ Error WhatsApp ${response.status}: ${responseText}`);
              sendResult = { success: false, error: `HTTP ${response.status}: ${responseText}` };
            }
          } catch (whatsappError: any) {
            console.error(`💥 Error enviando WhatsApp:`, whatsappError);
            sendResult = { success: false, error: `Error WhatsApp: ${whatsappError.message}` };
          }

        } else {
          // Envío Email
          const { data: emailConfigs, error: configError } = await supabase
            .from('user_email_configs')
            .select('*')
            .eq('user_id', subscription.user_id)
            .single();

          if (configError || !emailConfigs?.smtp_host || !emailConfigs?.smtp_username || !emailConfigs?.smtp_password) {
            throw new Error(`Configuración email incompleta: ${configError?.message || 'Faltan datos SMTP'}`);
          }

          try {
            console.log(`📧 Enviando email a ${phoneOrEmail} con ${freshNews.length} noticias`);
            
            const emailPayload = {
              to: phoneOrEmail,
              subject: freshNews.length === 0 ? "Monitoreo Automático - News Radar" : "Noticias Encontradas Automáticamente - News Radar",
              html: messageContent,
              smtpConfig: {
                host: emailConfigs.smtp_host,
                port: emailConfigs.smtp_port || 587,
                username: emailConfigs.smtp_username,
                password: emailConfigs.smtp_password,
                useTLS: emailConfigs.use_tls !== false
              }
            };

            const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email-smtp', {
              body: emailPayload
            });

            if (emailError) {
              console.error(`❌ Error función email ${phoneOrEmail}:`, emailError);
              sendResult = { success: false, error: `Error función email: ${emailError.message}` };
            } else {
              console.log(`✅ Email enviado ${phoneOrEmail}:`, emailResult);
              sendResult = { success: true };
            }
          } catch (emailFunctionError: any) {
            console.error(`💥 Error función email ${phoneOrEmail}:`, emailFunctionError);
            sendResult = { success: false, error: `Error función email: ${emailFunctionError.message}` };
          }
        }

        // Registrar resultado
        if (sendResult.success) {
          successCount++;
          console.log(`✅ ENVIADO EXITOSAMENTE: ${phoneOrEmail} con ${freshNews.length} noticias`);

          // Actualizar last_sent
          await supabase
            .from(subscriptionsTable)
            .update({ last_sent: new Date().toISOString() })
            .eq('id', subscription.id);

        } else {
          errorCount++;
          console.log(`❌ ERROR ENVIANDO: ${phoneOrEmail} - ${sendResult.error}`);
          errors.push(`${phoneOrEmail}: ${sendResult.error}`);
        }

        // Crear log automático
        const logData = {
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          [type === 'whatsapp' ? 'phone_number' : 'email_address']: phoneOrEmail,
          message_content: messageContent,
          news_count: freshNews.length,
          status: sendResult.success ? 'sent' : 'failed',
          error_message: sendResult.success ? null : sendResult.error,
          execution_type: scheduled ? 'scheduled' : 'immediate'
        };

        const { error: logError } = await supabase.from(logsTable).insert(logData);
        if (logError) {
          console.error(`Error creando log para ${phoneOrEmail}:`, logError);
        }

      } catch (error: any) {
        errorCount++;
        console.error(`💥 ERROR GENERAL ${phoneOrEmail}:`, error);
        errors.push(`${phoneOrEmail}: ${error.message}`);

        // Crear log de error
        const logData = {
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          [type === 'whatsapp' ? 'phone_number' : 'email_address']: phoneOrEmail,
          message_content: '',
          news_count: 0,
          status: 'failed',
          error_message: error.message,
          execution_type: scheduled ? 'scheduled' : 'immediate'
        };

        await supabase.from(logsTable).insert(logData);
      }
    }

    console.log(`📊 RESUMEN FINAL CORREGIDO:`);
    console.log(`  👥 Usuarios procesados: ${uniqueUserIds.length}`);
    console.log(`  🔍 Búsquedas ejecutadas: ${uniqueUserIds.length}`);
    console.log(`  📰 Noticias máximas encontradas: ${totalNewsFound}`);
    console.log(`  📤 Suscripciones procesadas: ${subscriptionsToProcess.length}`);
    console.log(`  ✅ Envíos exitosos: ${successCount}`);
    console.log(`  ❌ Errores: ${errorCount}`);

    const response = {
      success: true,
      message: `Proceso automático completado: ${successCount} enviados, ${errorCount} errores`,
      results: {
        sent: successCount,
        errors: errorCount,
        total: subscriptionsToProcess.length,
        errorDetails: errors,
        newsFound: totalNewsFound,
        searchExecuted: true,
        usersProcessed: uniqueUserIds.length,
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 ERROR CRÍTICO:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: `Error crítico: ${error.message}`,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
