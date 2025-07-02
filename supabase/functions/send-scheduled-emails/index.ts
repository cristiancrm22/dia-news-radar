
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.10';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ScheduledEmailRequest {
  force?: boolean;
  scheduled?: boolean;
}

// CORREGIDO: Función para obtener noticias usando parámetros del usuario
async function getNewsWithUserParameters(userId: string): Promise<any[]> {
  try {
    console.log(`🔍 OBTENIENDO NOTICIAS CON PARÁMETROS DEL USUARIO: ${userId}`);
    
    // **PASO 1: OBTENER PALABRAS CLAVE DEL USUARIO**
    const { data: keywords, error: keywordsError } = await supabase
      .from('user_keywords')
      .select('keyword')
      .eq('user_id', userId);

    if (keywordsError) {
      console.error('❌ Error obteniendo palabras clave:', keywordsError);
      return [];
    }

    const userKeywords = keywords?.map(k => k.keyword) || [];
    console.log(`📝 Palabras clave del usuario: ${userKeywords.join(', ')}`);

    // **PASO 2: OBTENER FUENTES HABILITADAS DEL USUARIO**
    const { data: sources, error: sourcesError } = await supabase
      .from('user_news_sources')
      .select('name, url')
      .eq('user_id', userId)
      .eq('enabled', true);

    if (sourcesError) {
      console.error('❌ Error obteniendo fuentes:', sourcesError);
      return [];
    }

    const enabledSources = sources || [];
    console.log(`📰 Fuentes habilitadas: ${enabledSources.map(s => s.name).join(', ')}`);

    // **PASO 3: OBTENER CONFIGURACIÓN DE BÚSQUEDA**
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

    // **PASO 4: OBTENER USUARIOS DE TWITTER**
    const { data: twitterUsers, error: twitterError } = await supabase
      .from('user_twitter_users')
      .select('twitter_username')
      .eq('user_id', userId);

    const userTwitterUsers = twitterUsers?.map(t => t.twitter_username) || [];
    console.log(`🐦 Usuarios de Twitter: ${userTwitterUsers.join(', ')}`);

    // **PASO 5: INTENTAR OBTENER NOTICIAS DESDE EL SERVIDOR PYTHON LOCAL**
    try {
      console.log('🐍 Intentando ejecutar búsqueda con parámetros del usuario...');
      
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

      console.log('📤 Payload para Python:', pythonPayload);

      const response = await fetch("http://localhost:8000/api/news/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pythonPayload)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.news && result.news.length > 0) {
          console.log(`✅ Noticias obtenidas desde Python: ${result.news.length}`);
          return result.news;
        }
      }
      
      console.log(`⚠️ Servidor Python no disponible o sin noticias`);
    } catch (pythonError) {
      console.log("⚠️ Error conectando con servidor Python:", pythonError);
    }

    // **PASO 6: FALLBACK A RADAR_LOGS PARA OBTENER NOTICIAS RECIENTES**
    try {
      const { data: radarLogs } = await supabase
        .from('radar_logs')
        .select('results')
        .eq('status', 'completed')
        .not('results', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (radarLogs && radarLogs.length > 0 && radarLogs[0].results) {
        const results = radarLogs[0].results as any;
        if (results.news && Array.isArray(results.news) && results.news.length > 0) {
          console.log(`📰 Noticias desde radar_logs: ${results.news.length}`);
          
          // Filtrar noticias por palabras clave del usuario
          let filteredNews = results.news;
          if (userKeywords.length > 0) {
            filteredNews = results.news.filter((item: any) => {
              const text = `${item.title} ${item.summary || item.description || ''}`.toLowerCase();
              return userKeywords.some(keyword => 
                text.includes(keyword.toLowerCase())
              );
            });
            console.log(`🔍 Noticias filtradas por palabras clave: ${filteredNews.length}`);
          }
          
          return filteredNews;
        }
      }
    } catch (supabaseError) {
      console.log("⚠️ Error obteniendo noticias desde radar_logs:", supabaseError);
    }

    console.log("📰 No se encontraron noticias con los parámetros del usuario");
    return [];
    
  } catch (error: any) {
    console.error('💥 Error obteniendo noticias con parámetros del usuario:', error);
    return [];
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== PROCESANDO ENVÍO PROGRAMADO DE EMAILS CON PARÁMETROS DE USUARIO ===");
    console.log("Timestamp actual:", new Date().toISOString());
    
    const body = await req.json();
    const { scheduled, force }: ScheduledEmailRequest = body;
    console.log("Parámetros recibidos:", { scheduled, force });
    
    let results = {
      emailsSent: 0,
      errors: [] as string[],
      skipped: 0,
      totalNews: 0
    };

    // Obtener suscripciones activas de email
    const { data: subscriptions, error: subError } = await supabase
      .from('email_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (subError) {
      console.error('Error obteniendo suscripciones de email:', subError);
      return new Response(JSON.stringify({ 
        success: false,
        error: subError.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('❌ No hay suscripciones de email activas');
      return new Response(JSON.stringify({ 
        success: true,
        message: "No hay suscripciones de email activas",
        results: { sent: 0, skipped: 0, errors: [], totalNews: 0 }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Usar la hora local de Argentina
    const now = new Date();
    const argentinaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
    const currentTime = argentinaTime.toTimeString().slice(0, 5); // HH:MM
    const currentDay = argentinaTime.getDay(); // 0=domingo, 1=lunes, etc.

    console.log(`⏰ Hora UTC: ${now.toTimeString().slice(0, 5)}`);
    console.log(`⏰ Hora Argentina: ${currentTime}, Día: ${currentDay}`);
    console.log(`📧 Suscripciones de email encontradas: ${subscriptions.length}`);

    // Verificar si alguna suscripción debe ejecutarse ahora
    const subscriptionsToProcess = subscriptions.filter(subscription => {
      if (force) {
        console.log(`🔄 MODO FORZADO: Procesando ${subscription.email_address}`);
        return true;
      }
      
      const shouldSend = shouldSendEmail(subscription, currentTime, currentDay, argentinaTime);
      console.log(`🔍 ${subscription.email_address}: ${shouldSend ? '✅ DEBE ENVIARSE' : '❌ NO DEBE ENVIARSE'}`);
      return shouldSend;
    });

    console.log(`📊 RESULTADO: ${subscriptionsToProcess.length} de ${subscriptions.length} suscripciones deben procesarse`);

    if (subscriptionsToProcess.length === 0 && !force) {
      console.log('⏭️ No hay suscripciones de email que deban ejecutarse en este momento');
      return new Response(JSON.stringify({ 
        success: true,
        message: `No hay suscripciones de email programadas para este momento (${currentTime})`,
        results: { sent: 0, skipped: subscriptions.length, errors: [], totalNews: 0 }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log(`🚀 Iniciando procesamiento de ${subscriptionsToProcess.length} suscripciones de email`);

    // Procesar cada suscripción individualmente con sus parámetros
    for (const subscription of subscriptionsToProcess) {
      try {
        console.log(`📤 Enviando email a ${subscription.email_address} para usuario ${subscription.user_id}...`);

        // **OBTENER NOTICIAS CON PARÁMETROS ESPECÍFICOS DEL USUARIO**
        const todayNews = await getNewsWithUserParameters(subscription.user_id);
        console.log(`📰 Noticias obtenidas para ${subscription.email_address}: ${todayNews.length}`);
        results.totalNews += todayNews.length;

        let emailContent: string;
        let emailSubject: string;
        
        if (todayNews.length === 0) {
          emailSubject = "Sin noticias nuevas - News Radar";
          emailContent = formatNoNewsEmailHTML();
        } else {
          emailSubject = "Noticias Monitoreadas - News Radar";
          emailContent = formatNewsEmailHTML(todayNews);
        }

        // Enviar email via función SMTP corregida
        const sent = await sendEmailViaSMTP(
          subscription.email_address, 
          emailSubject,
          emailContent,
          subscription.user_id
        );
        
        if (sent) {
          // Actualizar última fecha de envío
          await supabase
            .from('email_subscriptions')
            .update({ last_sent: argentinaTime.toISOString() })
            .eq('id', subscription.id);

          // Registrar log del mensaje automático
          await logAutomatedEmail(
            subscription.user_id,
            subscription.id,
            subscription.email_address,
            emailContent,
            todayNews.length,
            'sent',
            'scheduled'
          );

          results.emailsSent++;
          console.log(`✅ Email enviado exitosamente a ${subscription.email_address}`);
        } else {
          // Registrar log del error
          await logAutomatedEmail(
            subscription.user_id,
            subscription.id,
            subscription.email_address,
            emailContent,
            todayNews.length,
            'failed',
            'scheduled',
            'Error al enviar email'
          );

          results.errors.push(`${subscription.email_address}: Error al enviar`);
          console.error(`❌ Error enviando email a ${subscription.email_address}`);
        }

      } catch (error: any) {
        // Registrar log del error
        await logAutomatedEmail(
          subscription.user_id,
          subscription.id,
          subscription.email_address,
          '',
          0,
          'failed',
          'scheduled',
          error.message
        );

        results.errors.push(`${subscription.email_address}: ${error.message}`);
        console.error(`💥 Error procesando ${subscription.email_address}:`, error);
      }
    }

    console.log(`🏁 RESUMEN FINAL: ${results.emailsSent} emails enviados, ${results.errors.length} errores, ${results.totalNews} noticias total`);
    
    return new Response(JSON.stringify({ 
      success: true,
      results,
      message: `Procesado: ${results.emailsSent} emails enviados de ${subscriptionsToProcess.length} programados. Noticias: ${results.totalNews}`
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error("💥 Error general en envío programado de emails:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

// Registrar email automático en la base de datos
async function logAutomatedEmail(
  userId: string,
  subscriptionId: string,
  emailAddress: string,
  messageContent: string,
  newsCount: number,
  status: 'sent' | 'failed',
  executionType: 'scheduled' | 'manual',
  errorMessage?: string
): Promise<void> {
  try {
    await supabase
      .from('email_automated_logs')
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        email_address: emailAddress,
        message_content: messageContent,
        news_count: newsCount,
        status: status,
        execution_type: executionType,
        error_message: errorMessage
      });
    
    console.log(`📝 Log de email registrado para ${emailAddress}: ${status}`);
  } catch (error: any) {
    console.error(`❌ Error registrando log de email para ${emailAddress}:`, error);
  }
}

// Evaluación del horario programado para emails
function shouldSendEmail(subscription: any, currentTime: string, currentDay: number, currentDateTime: Date): boolean {
  console.log(`🔍 Evaluando suscripción de email ${subscription.email_address}:`);
  
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const scheduledTimeStr = subscription.scheduled_time.substring(0, 5);
  const [schedHour, schedMinute] = scheduledTimeStr.split(':').map(Number);
  
  console.log(`  ⏰ Hora actual: ${currentTime} (${currentHour}:${currentMinute})`);
  console.log(`  ⏰ Hora programada: ${scheduledTimeStr} (${schedHour}:${schedMinute})`);
  
  const isExactTime = currentHour === schedHour && currentMinute === schedMinute;
  
  if (!isExactTime) {
    console.log(`  ❌ No es la hora exacta`);
    return false;
  }

  console.log(`  ✅ Es la hora exacta de envío`);

  // Verificar si ya se envió HOY
  if (subscription.last_sent) {
    const lastSentDate = new Date(subscription.last_sent);
    const currentDate = currentDateTime;
    
    const lastSentDay = lastSentDate.toDateString();
    const currentDay_str = currentDate.toDateString();
    
    if (lastSentDay === currentDay_str) {
      console.log(`  ❌ Ya se envió HOY - no enviar de nuevo`);
      return false;
    }
  }

  console.log(`  ✅ No se envió hoy - proceder con envío`);

  if (subscription.frequency === 'daily') {
    console.log(`  📅 Suscripción diaria - DEBE ENVIAR`);
    return true;
  }

  if (subscription.frequency === 'weekly') {
    const weekdays = subscription.weekdays || [];
    const shouldSend = weekdays.includes(currentDay);
    console.log(`  📅 Suscripción semanal - día ${currentDay}, días programados: ${weekdays}, resultado: ${shouldSend ? 'DEBE ENVIAR' : 'NO DEBE ENVIAR'}`);
    return shouldSend;
  }

  console.log(`  ❓ Frecuencia desconocida: ${subscription.frequency}`);
  return false;
}

// Formatear HTML para email con noticias
function formatNewsEmailHTML(news: any[]): string {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Noticias Monitoreadas - News Radar</title>
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
            <h1>📰 Noticias Monitoreadas</h1>
            <p>${date}</p>
          </div>
          <div class="content">
            <p>Noticias encontradas con tus parámetros de monitoreo:</p>
  `;

  news.slice(0, 10).forEach((item, index) => {
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
            <p>Total de noticias: ${news.length}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return html;
}

// Formatear HTML para email sin noticias
function formatNoNewsEmailHTML(): string {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Sin noticias nuevas - News Radar</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden; }
          .header { background: #6b7280; color: white; padding: 20px; text-align: center; }
          .content { background: white; padding: 20px; text-align: center; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📰 News Radar</h1>
            <p>${date}</p>
          </div>
          <div class="content">
            <h2>⚠️ Sin noticias nuevas</h2>
            <p>No se encontraron noticias nuevas con los parámetros de monitoreo configurados.</p>
            <p>Continuaremos monitoreando las fuentes y palabras clave configuradas.</p>
          </div>
          <div class="footer">
            <p>Este correo fue enviado automáticamente por News Radar</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// CORREGIDO: Enviar email via función SMTP de Supabase
async function sendEmailViaSMTP(emailAddress: string, subject: string, htmlContent: string, userId: string): Promise<boolean> {
  try {
    console.log(`📧 Enviando email a ${emailAddress} usando configuración SMTP del usuario...`);
    
    // Obtener configuración SMTP del usuario
    const { data: emailConfig, error: configError } = await supabase
      .from('user_email_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (configError || !emailConfig) {
      console.error(`❌ No se encontró configuración SMTP para usuario ${userId}:`, configError);
      return false;
    }

    if (!emailConfig.smtp_host || !emailConfig.smtp_username || !emailConfig.smtp_password) {
      console.error(`❌ Configuración SMTP incompleta para usuario ${userId}`);
      return false;
    }

    const emailPayload = {
      to: emailAddress,
      subject: subject,
      html: htmlContent,
      smtpConfig: {
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port || 587,
        username: emailConfig.smtp_username,
        password: emailConfig.smtp_password,
        useTLS: emailConfig.use_tls !== false
      }
    };

    console.log(`📧 Invocando función send-email-smtp para ${emailAddress}...`);

    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email-smtp', {
      body: emailPayload
    });

    if (emailError) {
      console.error(`❌ Error en función send-email-smtp para ${emailAddress}:`, emailError);
      return false;
    }

    console.log(`✅ Email enviado exitosamente a ${emailAddress} via SMTP`);
    return true;
    
  } catch (error: any) {
    console.error(`💥 Error enviando email a ${emailAddress}:`, error);
    return false;
  }
}

serve(handler);
