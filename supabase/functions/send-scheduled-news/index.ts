
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call the Python news scraper
async function updateNewsData(): Promise<{ success: boolean; newsCount?: number; error?: string }> {
  try {
    console.log('🔄 Iniciando actualización automática de noticias...');
    
    // Call the local server to trigger news update
    const response = await fetch("http://localhost:8000/api/news/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Resultado de actualización:', result);
    
    return {
      success: true,
      newsCount: result.total || 0
    };
  } catch (error: any) {
    console.error('❌ Error actualizando noticias:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to get available news
async function getAvailableNews(): Promise<any[]> {
  try {
    console.log('📰 Obteniendo noticias disponibles...');
    
    // First try to get from local cache
    try {
      const response = await fetch("http://localhost:8000/api/news/today");
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Noticias en cache: ${data.news?.length || 0}`);
        return data.news || [];
      }
    } catch (localError) {
      console.log('⚠️ Cache local no disponible');
    }
    
    return [];
  } catch (error: any) {
    console.error('❌ Error obteniendo noticias:', error);
    return [];
  }
}

// Helper function to format news for WhatsApp
function formatNewsForWhatsApp(news: any[]): string {
  let message = "📰 *RESUMEN DE NOTICIAS*\n";
  message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
  
  if (news.length === 0) {
    message = "📰 *RESUMEN DE NOTICIAS*\n\n⚠️ No hay noticias disponibles en este momento.\n\nVolveremos a enviar cuando tengamos nuevas noticias.\n\n🤖 News Radar";
    return message;
  }
  
  news.forEach((item, index) => {
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
  message += `🤖 News Radar (${news.length} noticias)`;
  
  return message;
}

// Helper function to format news for Email
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
          <title>Sin noticias hoy - News Radar</title>
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
              <h2>⚠️ No hay noticias disponibles</h2>
              <p>No se encontraron noticias nuevas para el día de hoy.</p>
              <p>Volveremos a buscar y enviar cuando tengamos nuevas noticias disponibles.</p>
            </div>
            <div class="footer">
              <p>Este correo fue enviado automáticamente por News Radar</p>
              <p>Si no deseas recibir más correos, desactiva tu suscripción en la configuración</p>
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
        <title>Resumen de noticias - News Radar</title>
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
            <h1>📰 Resumen de Noticias</h1>
            <p>${date}</p>
          </div>
          <div class="content">
            <p>Aquí tienes tu resumen diario de las noticias más relevantes:</p>
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
            <p>Si no deseas recibir más correos, desactiva tu suscripción en la configuración</p>
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

  console.log('=== PROCESANDO ENVÍO PROGRAMADO AUTOMÁTICO ===');
  console.log('Timestamp actual:', new Date().toISOString());

  try {
    const { type = 'whatsapp', scheduled = true, force = false } = await req.json().catch(() => ({}));
    console.log('Parámetros recibidos:', { type, scheduled, force });

    // Configurar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener hora actual en Argentina (UTC-3)
    const now = new Date();
    const argTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const currentHour = argTime.getHours();
    const currentMinute = argTime.getMinutes();
    const currentDay = argTime.getDay(); // 0 = domingo, 1 = lunes, etc.

    console.log(`⏰ Hora UTC: ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
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
      return new Response(JSON.stringify({ error: subsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📱 Suscripciones encontradas: ${subscriptions?.length || 0}`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⏭️ No hay suscripciones activas');
      return new Response(JSON.stringify({ message: 'No hay suscripciones activas' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mostrar detalles de cada suscripción
    subscriptions.forEach((sub, index) => {
      const phoneOrEmail = type === 'whatsapp' ? sub.phone_number : sub.email_address;
      console.log(`📋 Suscripción ${index + 1}:`);
      console.log(`  - ${type === 'whatsapp' ? 'Teléfono' : 'Email'}: ${phoneOrEmail}`);
      console.log(`  - Hora programada: ${sub.scheduled_time}`);
      console.log(`  - Frecuencia: ${sub.frequency}`);
      console.log(`  - Activa: ${sub.is_active}`);
      console.log(`  - Días (semanal): ${sub.weekdays?.join(', ') || ''}`);
      console.log(`  - Último envío: ${sub.last_sent || 'Nunca'}`);
    });

    // Filtrar suscripciones que deben ejecutarse ahora
    const subscriptionsToProcess = subscriptions.filter(subscription => {
      const phoneOrEmail = type === 'whatsapp' ? subscription.phone_number : subscription.email_address;
      
      console.log(`🔍 Evaluando suscripción ${phoneOrEmail}:`);
      
      // Parsear la hora programada
      const [scheduledHour, scheduledMinute] = subscription.scheduled_time.split(':').map(Number);
      
      console.log(`  ⏰ Hora actual: ${currentHour}:${currentMinute.toString().padStart(2, '0')} (${currentHour}:${currentMinute})`);
      console.log(`  ⏰ Hora programada: ${scheduledHour}:${scheduledMinute.toString().padStart(2, '0')} (${scheduledHour}:${scheduledMinute})`);
      
      // Verificar si es la hora exacta (dentro de un margen de 1 minuto)
      const isCorrectTime = currentHour === scheduledHour && currentMinute === scheduledMinute;
      
      if (force) {
        console.log(`🔍 ${phoneOrEmail}: ✅ FORZADO - SE ENVIARÁ`);
        return true;
      }
      
      if (!scheduled) {
        console.log(`🔍 ${phoneOrEmail}: ✅ NO PROGRAMADO - SE ENVIARÁ`);
        return true;
      }
      
      if (!isCorrectTime) {
        console.log(`  ❌ No es la hora exacta - actual: ${currentHour}:${currentMinute}, programada: ${scheduledHour}:${scheduledMinute}`);
        console.log(`🔍 ${phoneOrEmail}: ❌ NO DEBE ENVIARSE`);
        return false;
      }
      
      // Para suscripciones semanales, verificar el día
      if (subscription.frequency === 'weekly') {
        if (!subscription.weekdays || !subscription.weekdays.includes(currentDay)) {
          console.log(`  ❌ Día incorrecto para suscripción semanal - día actual: ${currentDay}, días configurados: ${subscription.weekdays}`);
          console.log(`🔍 ${phoneOrEmail}: ❌ NO DEBE ENVIARSE`);
          return false;
        }
      }
      
      // Verificar si ya se envió hoy (solo para frecuencia diaria)
      if (subscription.frequency === 'daily' && subscription.last_sent) {
        const lastSent = new Date(subscription.last_sent);
        const today = new Date(argTime.getFullYear(), argTime.getMonth(), argTime.getDate());
        const lastSentDate = new Date(lastSent.getFullYear(), lastSent.getMonth(), lastSent.getDate());
        
        if (lastSentDate.getTime() === today.getTime()) {
          console.log(`  ❌ Ya se envió hoy - último envío: ${subscription.last_sent}`);
          console.log(`🔍 ${phoneOrEmail}: ❌ NO DEBE ENVIARSE`);
          return false;
        }
      }
      
      console.log(`🔍 ${phoneOrEmail}: ✅ DEBE ENVIARSE`);
      return true;
    });

    console.log(`📊 RESULTADO: ${subscriptionsToProcess.length} de ${subscriptions.length} suscripciones deben procesarse`);

    if (subscriptionsToProcess.length === 0) {
      console.log('⏭️ No hay suscripciones que deban ejecutarse en este momento');
      return new Response(JSON.stringify({ message: 'No hay suscripciones que deban ejecutarse en este momento' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // **PASO CRÍTICO: ACTUALIZAR NOTICIAS ANTES DEL ENVÍO**
    console.log('🔄 ACTUALIZANDO NOTICIAS ANTES DEL ENVÍO...');
    const updateResult = await updateNewsData();
    
    if (!updateResult.success) {
      console.log('⚠️ Error actualizando noticias, continuando con noticias existentes:', updateResult.error);
    } else {
      console.log(`✅ Noticias actualizadas correctamente: ${updateResult.newsCount} noticias`);
    }

    // Obtener las noticias disponibles después de la actualización
    const availableNews = await getAvailableNews();
    console.log(`📊 Noticias disponibles para envío: ${availableNews.length}`);

    // Preparar mensaje según el tipo
    let messageContent = '';
    if (type === 'whatsapp') {
      messageContent = formatNewsForWhatsApp(availableNews);
    } else {
      messageContent = formatNewsForEmail(availableNews);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Procesar cada suscripción
    for (const subscription of subscriptionsToProcess) {
      const phoneOrEmail = type === 'whatsapp' ? subscription.phone_number : subscription.email_address;
      
      try {
        console.log(`📤 Procesando envío a ${phoneOrEmail}...`);

        let sendResult = { success: false, error: 'Método no implementado' };

        if (type === 'whatsapp') {
          // Obtener configuración de WhatsApp
          const { data: whatsappConfigs } = await supabase
            .from('user_whatsapp_configs')
            .select('*')
            .eq('user_id', subscription.user_id)
            .single();

          if (!whatsappConfigs?.evolution_api_url) {
            throw new Error('Configuración de WhatsApp no encontrada');
          }

          // Enviar mensaje de WhatsApp
          const response = await fetch(`${whatsappConfigs.evolution_api_url}/message/sendText/newsradar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': whatsappConfigs.api_key || ''
            },
            body: JSON.stringify({
              number: phoneOrEmail,
              text: messageContent
            })
          });

          if (response.ok) {
            sendResult = { success: true };
          } else {
            const errorText = await response.text();
            sendResult = { success: false, error: `HTTP ${response.status}: ${errorText}` };
          }
        } else {
          // Obtener configuración de Email
          const { data: emailConfigs } = await supabase
            .from('user_email_configs')
            .select('*')
            .eq('user_id', subscription.user_id)
            .single();

          if (!emailConfigs?.smtp_host || !emailConfigs?.smtp_username || !emailConfigs?.smtp_password) {
            throw new Error('Configuración de email no encontrada o incompleta');
          }

          // Llamar a la función Edge de envío de email
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email-smtp', {
            body: {
              to: phoneOrEmail,
              subject: availableNews.length === 0 ? "No hay noticias hoy - News Radar" : "Resumen de noticias - News Radar",
              html: messageContent,
              smtpConfig: {
                host: emailConfigs.smtp_host,
                port: emailConfigs.smtp_port || 587,
                username: emailConfigs.smtp_username,
                password: emailConfigs.smtp_password,
                useTLS: emailConfigs.use_tls !== false
              }
            }
          });

          if (emailError) {
            sendResult = { success: false, error: emailError.message };
          } else {
            sendResult = { success: true };
          }
        }

        // Registrar el resultado
        if (sendResult.success) {
          successCount++;
          console.log(`✅ Enviado exitosamente a ${phoneOrEmail}`);

          // Actualizar fecha de último envío
          await supabase
            .from(subscriptionsTable)
            .update({ last_sent: new Date().toISOString() })
            .eq('id', subscription.id);

        } else {
          errorCount++;
          console.log(`❌ Error enviando a ${phoneOrEmail}: ${sendResult.error}`);
          errors.push(`${phoneOrEmail}: ${sendResult.error}`);
        }

        // Crear log automático
        const logData = {
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          [type === 'whatsapp' ? 'phone_number' : 'email_address']: phoneOrEmail,
          message_content: messageContent,
          news_count: availableNews.length,
          status: sendResult.success ? 'sent' : 'failed',
          error_message: sendResult.success ? null : sendResult.error,
          execution_type: scheduled ? 'scheduled' : 'immediate'
        };

        await supabase.from(logsTable).insert(logData);

      } catch (error: any) {
        errorCount++;
        console.error(`💥 Error procesando ${phoneOrEmail}:`, error);
        errors.push(`${phoneOrEmail}: ${error.message}`);

        // Crear log de error
        const logData = {
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          [type === 'whatsapp' ? 'phone_number' : 'email_address']: phoneOrEmail,
          message_content: messageContent,
          news_count: availableNews.length,
          status: 'failed',
          error_message: error.message,
          execution_type: scheduled ? 'scheduled' : 'immediate'
        };

        await supabase.from(logsTable).insert(logData);
      }
    }

    console.log(`📊 RESUMEN FINAL:`);
    console.log(`  ✅ Exitosos: ${successCount}`);
    console.log(`  ❌ Errores: ${errorCount}`);
    console.log(`  📰 Noticias enviadas: ${availableNews.length}`);
    console.log(`  🔄 Noticias actualizadas: ${updateResult.success ? 'Sí' : 'No'}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Procesado: ${successCount} exitosos, ${errorCount} errores`,
      results: {
        sent: successCount,
        errors: errorCount,
        total: subscriptionsToProcess.length,
        errorDetails: errors,
        newsCount: availableNews.length,
        newsUpdated: updateResult.success
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Error general en send-scheduled-news:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
