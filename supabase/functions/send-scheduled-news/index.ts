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

interface ScheduledNewsRequest {
  type: 'whatsapp' | 'email' | 'both';
  phoneNumbers?: string[];
  emails?: string[];
  force?: boolean;
  scheduled?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== PROCESANDO ENVÍO PROGRAMADO AUTOMÁTICO ===");
    console.log("Timestamp actual:", new Date().toISOString());
    
    const body = await req.json();
    const { type, scheduled, force }: ScheduledNewsRequest = body;
    console.log("Parámetros recibidos:", { type, scheduled, force });
    
    let results = {
      whatsappSent: 0,
      emailsSent: 0,
      errors: [] as string[],
      skipped: 0,
      totalNews: 0
    };

    // Obtener suscripciones activas de WhatsApp
    const { data: subscriptions, error: subError } = await supabase
      .from('whatsapp_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (subError) {
      console.error('Error obteniendo suscripciones:', subError);
      return new Response(JSON.stringify({ 
        success: false,
        error: subError.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('❌ No hay suscripciones activas');
      return new Response(JSON.stringify({ 
        success: true,
        message: "No hay suscripciones activas",
        results: { sent: 0, skipped: 0, errors: [], totalNews: 0 }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // CORREGIDO: Usar la hora local de Argentina correctamente
    const now = new Date();
    const argentinaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
    const currentTime = argentinaTime.toTimeString().slice(0, 5); // HH:MM
    const currentDay = argentinaTime.getDay(); // 0=domingo, 1=lunes, etc.

    console.log(`⏰ Hora UTC: ${now.toTimeString().slice(0, 5)}`);
    console.log(`⏰ Hora Argentina: ${currentTime}, Día: ${currentDay}`);
    console.log(`📱 Suscripciones encontradas: ${subscriptions.length}`);

    // Log detallado de cada suscripción
    subscriptions.forEach((sub, index) => {
      console.log(`📋 Suscripción ${index + 1}:`);
      console.log(`  - Teléfono: ${sub.phone_number}`);
      console.log(`  - Hora programada: ${sub.scheduled_time}`);
      console.log(`  - Frecuencia: ${sub.frequency}`);
      console.log(`  - Activa: ${sub.is_active}`);
      console.log(`  - Días (semanal): ${sub.weekdays}`);
      console.log(`  - Último envío: ${sub.last_sent || 'Nunca'}`);
    });

    // Verificar si alguna suscripción debe ejecutarse ahora
    const subscriptionsToProcess = subscriptions.filter(subscription => {
      if (force) {
        console.log(`🔄 MODO FORZADO: Procesando ${subscription.phone_number}`);
        return true;
      }
      
      const shouldSend = shouldSendMessage(subscription, currentTime, currentDay, argentinaTime);
      console.log(`🔍 ${subscription.phone_number}: ${shouldSend ? '✅ DEBE ENVIARSE' : '❌ NO DEBE ENVIARSE'}`);
      return shouldSend;
    });

    console.log(`📊 RESULTADO: ${subscriptionsToProcess.length} de ${subscriptions.length} suscripciones deben procesarse`);

    if (subscriptionsToProcess.length === 0 && !force) {
      console.log('⏭️ No hay suscripciones que deban ejecutarse en este momento');
      return new Response(JSON.stringify({ 
        success: true,
        message: `No hay suscripciones programadas para este momento (${currentTime})`,
        results: { sent: 0, skipped: subscriptions.length, errors: [], totalNews: 0 }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log(`🚀 Iniciando procesamiento de ${subscriptionsToProcess.length} suscripciones`);

    // OBTENER NOTICIAS (con fallback a mensaje sin noticias)
    const todayNews = await getAvailableNews();
    console.log(`📰 Noticias obtenidas: ${todayNews.length}`);
    results.totalNews = todayNews.length;
    
    // OBTENER CONFIGURACIÓN DE WHATSAPP del primer usuario activo
    const whatsappConfig = await getWhatsAppConfig();
    console.log("📋 Configuración WhatsApp:", whatsappConfig);
    
    for (const subscription of subscriptionsToProcess) {
      try {
        console.log(`📤 Enviando a ${subscription.phone_number}...`);

        let newsMessage: string;
        if (todayNews.length === 0) {
          newsMessage = "📰 *RESUMEN PROGRAMADO*\n\n⚠️ No hay noticias disponibles en este momento.\n\nVolveremos a enviar cuando tengamos nuevas noticias.\n\n🤖 News Radar";
        } else {
          newsMessage = formatNewsForWhatsApp(todayNews);
        }

        // Enviar mensaje vía WhatsApp
        const sent = await sendWhatsAppMessage(
          whatsappConfig, 
          subscription.phone_number, 
          newsMessage
        );
        
        if (sent) {
          // Actualizar última fecha de envío con la hora de Argentina
          await supabase
            .from('whatsapp_subscriptions')
            .update({ last_sent: argentinaTime.toISOString() })
            .eq('id', subscription.id);

          results.whatsappSent++;
          console.log(`✅ Mensaje enviado exitosamente a ${subscription.phone_number}`);
        } else {
          results.errors.push(`${subscription.phone_number}: Error al enviar`);
          console.error(`❌ Error enviando a ${subscription.phone_number}`);
        }

      } catch (error: any) {
        results.errors.push(`${subscription.phone_number}: ${error.message}`);
        console.error(`💥 Error procesando ${subscription.phone_number}:`, error);
      }
    }

    console.log(`🏁 RESUMEN FINAL: ${results.whatsappSent} enviados, ${results.errors.length} errores, ${results.totalNews} noticias`);
    
    return new Response(JSON.stringify({ 
      success: true,
      results,
      message: `Procesado: ${results.whatsappSent} enviados de ${subscriptionsToProcess.length} programados. Noticias: ${results.totalNews}`
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error("💥 Error general en envío programado:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

// FUNCIÓN CORREGIDA: Evaluación mejorada del horario programado
function shouldSendMessage(subscription: any, currentTime: string, currentDay: number, currentDateTime: Date): boolean {
  console.log(`🔍 Evaluando suscripción ${subscription.phone_number}:`);
  
  // Extraer hora y minuto para comparación
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const scheduledTimeStr = subscription.scheduled_time.substring(0, 5); // Solo HH:MM
  const [schedHour, schedMinute] = scheduledTimeStr.split(':').map(Number);
  
  console.log(`  ⏰ Hora actual: ${currentTime} (${currentHour}:${currentMinute})`);
  console.log(`  ⏰ Hora programada: ${scheduledTimeStr} (${schedHour}:${schedMinute})`);
  
  // CORREGIDO: Verificar si es exactamente la hora programada
  const isExactTime = currentHour === schedHour && currentMinute === schedMinute;
  
  if (!isExactTime) {
    console.log(`  ❌ No es la hora exacta - actual: ${currentHour}:${currentMinute}, programada: ${schedHour}:${schedMinute}`);
    return false;
  }

  console.log(`  ✅ Es la hora exacta de envío`);

  // Verificar si ya se envió HOY para evitar envíos duplicados
  if (subscription.last_sent) {
    const lastSentDate = new Date(subscription.last_sent);
    const currentDate = currentDateTime;
    
    // Verificar si el último envío fue HOY
    const lastSentDay = lastSentDate.toDateString();
    const currentDay_str = currentDate.toDateString();
    
    console.log(`  📅 Último envío: ${lastSentDate.toLocaleString()}`);
    console.log(`  📅 Día actual: ${currentDay_str}`);
    console.log(`  📅 Día último envío: ${lastSentDay}`);
    
    if (lastSentDay === currentDay_str) {
      console.log(`  ❌ Ya se envió HOY - no enviar de nuevo`);
      return false;
    }
  }

  console.log(`  ✅ No se envió hoy - proceder con envío`);

  // Para frecuencia diaria, enviar todos los días (si la hora coincide)
  if (subscription.frequency === 'daily') {
    console.log(`  📅 Suscripción diaria - DEBE ENVIAR`);
    return true;
  }

  // Para frecuencia semanal, verificar días de la semana
  if (subscription.frequency === 'weekly') {
    const weekdays = subscription.weekdays || [];
    const shouldSend = weekdays.includes(currentDay);
    console.log(`  📅 Suscripción semanal - día ${currentDay}, días programados: ${weekdays}, resultado: ${shouldSend ? 'DEBE ENVIAR' : 'NO DEBE ENVIAR'}`);
    return shouldSend;
  }

  console.log(`  ❓ Frecuencia desconocida: ${subscription.frequency}`);
  return false;
}

// NUEVA FUNCIÓN: Obtener noticias disponibles con múltiples fuentes
async function getAvailableNews(): Promise<any[]> {
  try {
    console.log("=== OBTENIENDO NOTICIAS DISPONIBLES ===");
    
    // Intentar primero obtener desde el cache/API local
    try {
      const response = await fetch("http://localhost:8000/api/news/today", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📰 Noticias del cache local: ${data.news?.length || 0}`);
        if (data.news && data.news.length > 0) {
          return data.news;
        }
      }
    } catch (localError) {
      console.log("ℹ️ Cache local no disponible, continuando...");
    }

    // Si no hay noticias locales, intentar obtener desde Supabase
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
          console.log(`📰 Noticias desde Supabase: ${results.news.length}`);
          return results.news;
        }
      }
    } catch (supabaseError) {
      console.log("ℹ️ No hay noticias en Supabase, continuando...");
    }

    console.log("📰 No hay noticias disponibles - se enviará mensaje informativo");
    return [];
    
  } catch (error: any) {
    console.error("Error obteniendo noticias:", error);
    return [];
  }
}

// NUEVA FUNCIÓN: Obtener configuración de WhatsApp
async function getWhatsAppConfig(): Promise<any> {
  try {
    // Obtener configuración de WhatsApp del primer usuario activo
    const { data: configs } = await supabase
      .from('user_whatsapp_configs')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (configs && configs.length > 0) {
      const config = configs[0];
      return {
        evolutionApiUrl: config.evolution_api_url || "",
        apiKey: config.api_key || "",
        connectionMethod: config.connection_method || "evolution"
      };
    }

    // Si no hay configuración de usuario, usar variables de entorno como fallback
    return {
      evolutionApiUrl: Deno.env.get("EVOLUTION_API_URL") || "",
      apiKey: Deno.env.get("WHATSAPP_API_KEY") || "",
      connectionMethod: "evolution"
    };
    
  } catch (error) {
    console.error("Error obteniendo configuración WhatsApp:", error);
    return {
      evolutionApiUrl: "",
      apiKey: "",
      connectionMethod: "evolution"
    };
  }
}

// Formatear mensaje para WhatsApp
function formatNewsForWhatsApp(news: any[]): string {
  let message = "📰 *RESUMEN PROGRAMADO DE NOTICIAS*\n";
  message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
  
  // Mostrar todas las noticias disponibles
  news.forEach((item, index) => {
    message += `*${index + 1}.* ${item.title}\n`;
    if (item.summary || item.description) {
      const summary = item.summary || item.description;
      message += `📝 ${summary.substring(0, 100)}...\n`;
    }
    // Solo incluir el link específico de la noticia
    if (item.sourceUrl && item.sourceUrl !== "#" && item.sourceUrl !== "N/A") {
      message += `🔗 ${item.sourceUrl}\n`;
    }
    message += "\n";
  });
  
  message += "━━━━━━━━━━━━━━━━━━━━\n";
  message += `🤖 Enviado automáticamente por News Radar (${news.length} noticias)`;
  
  return message;
}

// Función de envío de WhatsApp mejorada
async function sendWhatsAppMessage(config: any, phoneNumber: string, message: string): Promise<boolean> {
  try {
    console.log(`📱 Configuración para envío:`, {
      hasUrl: !!config.evolutionApiUrl,
      hasApiKey: !!config.apiKey,
      method: config.connectionMethod
    });

    if (!config.evolutionApiUrl || config.evolutionApiUrl.trim() === '') {
      console.error("❌ Evolution API URL no configurada");
      return false;
    }
    
    // Limpiar número de teléfono
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Si no empieza con código de país, agregar 54 (Argentina)
    if (!cleanNumber.startsWith('54') && cleanNumber.length >= 10) {
      cleanNumber = '54' + cleanNumber;
    }
    
    if (cleanNumber.length < 12) {
      console.error(`❌ Número inválido: ${phoneNumber} -> ${cleanNumber}`);
      return false;
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (config.apiKey && config.apiKey.trim() !== '') {
      headers['apikey'] = config.apiKey;
    }
    
    const payload = {
      number: cleanNumber,
      text: message
    };
    
    console.log(`📤 Enviando WhatsApp a ${cleanNumber} vía ${config.evolutionApiUrl}`);
    
    // Intentar múltiples endpoints
    const apiUrls = [
      `${config.evolutionApiUrl.trim()}/message/sendText/SenadoN8N`,
      `${config.evolutionApiUrl.trim()}/message/send-text/SenadoN8N`,
      `${config.evolutionApiUrl.trim()}/send-message/SenadoN8N`
    ];

    for (const apiUrl of apiUrls) {
      try {
        console.log(`🔗 Intentando URL: ${apiUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ WhatsApp enviado exitosamente a ${phoneNumber}:`, result);
          return true;
        } else {
          const errorText = await response.text();
          console.error(`❌ Error HTTP ${response.status} con ${apiUrl}: ${errorText}`);
          
          // Si es 404, probar siguiente URL
          if (response.status === 404) {
            continue;
          }
          
          return false;
        }
      } catch (fetchError: any) {
        console.error(`❌ Error de conexión con ${apiUrl}:`, fetchError.message);
        
        // Si no es el último URL, continuar
        if (apiUrl !== apiUrls[apiUrls.length - 1]) {
          continue;
        }
        
        return false;
      }
    }
    
    return false;
    
  } catch (error: any) {
    console.error(`💥 Error general enviando WhatsApp a ${phoneNumber}:`, error);
    return false;
  }
}

serve(handler);
