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
    
    const body = await req.json();
    const { type, scheduled, force }: ScheduledNewsRequest = body;
    
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
      console.log('No hay suscripciones activas');
      return new Response(JSON.stringify({ 
        success: true,
        message: "No hay suscripciones activas",
        results: { sent: 0, skipped: 0, errors: [], totalNews: 0 }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDay = now.getDay(); // 0=domingo, 1=lunes, etc.

    console.log(`Hora actual: ${currentTime}, Día: ${currentDay}`);
    console.log(`Suscripciones encontradas: ${subscriptions.length}`);

    // Verificar si alguna suscripción debe ejecutarse ahora
    const subscriptionsToProcess = subscriptions.filter(subscription => {
      if (force) return true; // Si es forzado, procesar todas
      return shouldSendMessage(subscription, currentTime, currentDay);
    });

    if (subscriptionsToProcess.length === 0 && !force) {
      console.log('No hay suscripciones que deban ejecutarse en este momento');
      console.log('Detalle de suscripciones:');
      subscriptions.forEach(sub => {
        console.log(`- ${sub.phone_number}: programada ${sub.scheduled_time}, frecuencia ${sub.frequency}`);
      });
      return new Response(JSON.stringify({ 
        success: true,
        message: "No hay suscripciones programadas para este momento",
        results: { sent: 0, skipped: subscriptions.length, errors: [], totalNews: 0 }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log(`Suscripciones a procesar: ${subscriptionsToProcess.length}`);

    // EJECUTAR BÚSQUEDA DE NOTICIAS NUEVAS para envío programado
    const todayNews = await executeNewsSearchForScheduled();
    console.log(`Noticias obtenidas: ${todayNews.length}`);
    results.totalNews = todayNews.length;
    
    for (const subscription of subscriptionsToProcess) {
      try {
        console.log(`Enviando a ${subscription.phone_number}...`);

        let newsMessage: string;
        if (todayNews.length === 0) {
          newsMessage = "📰 *RESUMEN PROGRAMADO*\n\n⚠️ No hay noticias disponibles en este momento.\n\n🤖 News Radar";
        } else {
          newsMessage = formatNewsForWhatsApp(todayNews);
        }

        // Enviar mensaje vía WhatsApp
        const sent = await sendWhatsAppMessage(subscription.phone_number, newsMessage);
        
        if (sent) {
          // Actualizar última fecha de envío
          await supabase
            .from('whatsapp_subscriptions')
            .update({ last_sent: now.toISOString() })
            .eq('id', subscription.id);

          results.whatsappSent++;
          console.log(`✅ Mensaje enviado a ${subscription.phone_number}`);
        } else {
          results.errors.push(`${subscription.phone_number}: Error al enviar`);
          console.error(`❌ Error enviando a ${subscription.phone_number}`);
        }

      } catch (error: any) {
        results.errors.push(`${subscription.phone_number}: ${error.message}`);
        console.error(`💥 Error procesando ${subscription.phone_number}:`, error);
      }
    }

    console.log(`=== RESUMEN: ${results.whatsappSent} enviados, ${results.skipped} saltados, ${results.errors.length} errores ===`);
    
    return new Response(JSON.stringify({ 
      success: true,
      results,
      message: `Enviado: ${results.whatsappSent} WhatsApp. Noticias: ${results.totalNews}`
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error("Error en envío programado:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

function shouldSendMessage(subscription: any, currentTime: string, currentDay: number): boolean {
  // Extraer hora y minuto para comparación con tolerancia más amplia
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [schedHour, schedMinute] = subscription.scheduled_time.split(':').map(Number);
  
  // Calcular diferencia en minutos total
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const schedTotalMinutes = schedHour * 60 + schedMinute;
  const timeDiff = Math.abs(currentTotalMinutes - schedTotalMinutes);
  
  console.log(`Comparando horarios: actual ${currentTime} vs programado ${subscription.scheduled_time} (diff: ${timeDiff} min)`);
  
  // Tolerancia de 5 minutos para mayor flexibilidad
  if (timeDiff > 5) {
    console.log(`Fuera de horario - diferencia ${timeDiff} minutos`);
    return false;
  }

  // Para frecuencia diaria, enviar todos los días
  if (subscription.frequency === 'daily') {
    console.log(`Suscripción diaria - debe enviar`);
    return true;
  }

  // Para frecuencia semanal, verificar días de la semana
  if (subscription.frequency === 'weekly') {
    const weekdays = subscription.weekdays || [];
    const shouldSend = weekdays.includes(currentDay);
    console.log(`Suscripción semanal - día ${currentDay}, días programados: ${weekdays}, debe enviar: ${shouldSend}`);
    return shouldSend;
  }

  return false;
}

// NUEVA FUNCIÓN: Ejecutar búsqueda de noticias para envío programado
async function executeNewsSearchForScheduled(): Promise<any[]> {
  try {
    console.log("=== EJECUTANDO BÚSQUEDA DE NOTICIAS NUEVAS PARA ENVÍO PROGRAMADO ===");
    
    // Obtener configuración del primer usuario activo como fallback
    const { data: userConfigs } = await supabase
      .from('user_search_settings')
      .select('*')
      .limit(1);
    
    const { data: keywords } = await supabase
      .from('user_keywords')
      .select('keyword')
      .limit(10);
      
    const { data: sources } = await supabase
      .from('user_news_sources')
      .select('url')
      .eq('enabled', true)
      .limit(15);

    if (!keywords || !sources || keywords.length === 0 || sources.length === 0) {
      console.log("No hay configuración de keywords o fuentes");
      return [];
    }

    const config = userConfigs?.[0] || {
      validate_links: true,
      current_date_only: true,
      deep_scrape: true,
      max_results: 50
    };

    // URL para acceder al servidor Python desde el contenedor Edge Function
    const pythonServerUrl = "http://host.docker.internal:8000";
    
    console.log("Ejecutando scraper con configuración:", {
      keywords: keywords.length,
      sources: sources.length,
      config
    });

    const executeResponse = await fetch(`${pythonServerUrl}/api/scraper/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keywords: keywords.map(k => k.keyword),
        sources: sources.map(s => s.url),
        twitterUsers: [],
        validateLinks: config.validate_links,
        todayOnly: config.current_date_only,
        maxResults: config.max_results,
        deepScrape: config.deep_scrape,
        outputPath: `/tmp/scheduled_news_${Date.now()}.csv`
      })
    });

    if (!executeResponse.ok) {
      console.error(`Error ejecutando scraper: ${executeResponse.status}`);
      return [];
    }

    const executeData = await executeResponse.json();
    console.log("Scraper ejecutado:", executeData);

    // Esperar a que termine el proceso (sin límite de tiempo para envío programado)
    if (executeData.pid) {
      let attempts = 0;
      const maxAttempts = 120; // 20 minutos máximo para envío programado
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
        
        try {
          const statusResponse = await fetch(`${pythonServerUrl}/api/scraper/status?pid=${executeData.pid}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log(`Estado del scraper: ${statusData.status} (${attempts + 1}/${maxAttempts})`);
            
            if (statusData.status === 'completed') {
              // Obtener el CSV generado
              if (statusData.csvPath) {
                const csvResponse = await fetch(`${pythonServerUrl}/api/scraper/csv?path=${encodeURIComponent(statusData.csvPath)}`);
                if (csvResponse.ok) {
                  const csvContent = await csvResponse.text();
                  return parseCSVToNews(csvContent);
                }
              }
              break;
            } else if (statusData.status === 'error') {
              console.error("Error en el scraper:", statusData.error);
              break;
            }
          }
        } catch (error) {
          console.error("Error verificando estado:", error);
        }
        
        attempts++;
      }
    }

    console.log("No se pudieron obtener noticias del sistema principal");
    return [];
    
  } catch (error: any) {
    console.error("Error ejecutando búsqueda de noticias:", error);
    return [];
  }
}

function parseCSVToNews(csvContent: string): any[] {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length <= 1) return [];
    
    const news = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"(.*)"$/, '$1'));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"(.*)"$/, '$1'));
      
      if (values.length >= 4) {
        news.push({
          title: values[0] || 'Sin título',
          summary: values[3] || 'Sin resumen',
          date: values[1] || new Date().toISOString(),
          sourceUrl: values[2] || '#',
          sourceName: values[4] || 'Fuente desconocida',
          relevanceScore: values[5] || '1'
        });
      }
    }
    
    console.log(`Noticias parseadas del CSV: ${news.length}`);
    return news;
  } catch (error) {
    console.error("Error parseando CSV:", error);
    return [];
  }
}

// Formatear mensaje SIN el enlace del portal, solo el enlace específico de la noticia
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
async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL") || "";
    const apiKey = Deno.env.get("WHATSAPP_API_KEY") || "";
    const instanceName = Deno.env.get("WHATSAPP_INSTANCE_NAME") || "SenadoN8N";
    
    if (!evolutionApiUrl) {
      console.error("Evolution API URL no configurada en variables de entorno");
      return false;
    }
    
    // Limpiar número de teléfono
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Si no empieza con código de país, agregar 54 (Argentina)
    if (!cleanNumber.startsWith('54') && cleanNumber.length >= 10) {
      cleanNumber = '54' + cleanNumber;
    }
    
    if (cleanNumber.length < 12) {
      console.error(`Número inválido: ${phoneNumber} -> ${cleanNumber}`);
      return false;
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['apikey'] = apiKey;
    }
    
    const payload = {
      number: cleanNumber,
      text: message
    };
    
    console.log(`Enviando WhatsApp a ${cleanNumber} vía ${evolutionApiUrl}`);
    
    // Intentar múltiples endpoints
    const apiUrls = [
      `${evolutionApiUrl}/message/sendText/${instanceName}`,
      `${evolutionApiUrl}/message/send-text/${instanceName}`,
      `${evolutionApiUrl}/send-message/${instanceName}`
    ];

    for (const apiUrl of apiUrls) {
      try {
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
          console.log(`WhatsApp enviado exitosamente a ${phoneNumber}:`, result);
          return true;
        } else {
          const errorText = await response.text();
          console.error(`Error enviando WhatsApp a ${phoneNumber} con ${apiUrl}: ${response.status} - ${errorText}`);
          
          // Si es 404, probar siguiente URL
          if (response.status === 404) {
            continue;
          }
          
          return false;
        }
      } catch (fetchError: any) {
        console.error(`Error de conexión enviando WhatsApp a ${phoneNumber} con ${apiUrl}:`, fetchError);
        
        // Si no es el último URL, continuar
        if (apiUrl !== apiUrls[apiUrls.length - 1]) {
          continue;
        }
        
        return false;
      }
    }
    
    return false;
    
  } catch (error: any) {
    console.error(`Error general enviando WhatsApp a ${phoneNumber}:`, error);
    return false;
  }
}

serve(handler);
