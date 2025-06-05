
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
    console.log("=== PROCESANDO ENVÍO PROGRAMADO ===");
    
    const body = await req.json();
    const { type, scheduled }: ScheduledNewsRequest = body;
    
    let results = {
      whatsappSent: 0,
      emailsSent: 0,
      errors: [] as string[],
      skipped: 0
    };

    // Si es envío programado, obtener suscripciones activas
    if (scheduled) {
      console.log("Procesando suscripciones programadas...");
      
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
          results: { sent: 0, skipped: 0, errors: [] }
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      const currentDay = now.getDay(); // 0=domingo, 1=lunes, etc.

      console.log(`Hora actual: ${currentTime}, Día: ${currentDay}`);
      console.log(`Suscripciones encontradas: ${subscriptions.length}`);

      // Obtener noticias
      const todayNews = await getTodayNewsFromPython();
      
      for (const subscription of subscriptions) {
        try {
          // Verificar si es el momento de enviar
          const shouldSend = shouldSendMessage(subscription, currentTime, currentDay);
          
          if (!shouldSend) {
            console.log(`Saltando suscripción ${subscription.id} - no es el momento`);
            results.skipped++;
            continue;
          }

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
    }

    console.log(`=== RESUMEN: ${results.whatsappSent} enviados, ${results.skipped} saltados, ${results.errors.length} errores ===`);
    
    return new Response(JSON.stringify({ 
      success: true,
      results,
      message: `Enviado: ${results.whatsappSent} WhatsApp, ${results.emailsSent} emails`
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
  // Verificar hora (con tolerancia de 1 minuto)
  if (subscription.scheduled_time !== currentTime) {
    return false;
  }

  // Para frecuencia diaria, enviar todos los días
  if (subscription.frequency === 'daily') {
    return true;
  }

  // Para frecuencia semanal, verificar días de la semana
  if (subscription.frequency === 'weekly') {
    const weekdays = subscription.weekdays || [];
    return weekdays.includes(currentDay);
  }

  return false;
}

async function getTodayNewsFromPython(): Promise<any[]> {
  try {
    console.log("Obteniendo noticias del servidor Python...");
    
    const response = await fetch("http://localhost:8000/api/news/today", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Noticias obtenidas:", data.news?.length || 0);
      return data.news || [];
    }
    
    console.log("No se pudieron obtener noticias del servidor Python");
  } catch (error) {
    console.error("Error conectando con servidor Python:", error);
  }
  
  // Fallback a noticias mock
  return [
    {
      id: "1",
      title: "Noticias del día disponibles",
      summary: "Resumen automático de las principales noticias.",
      date: new Date().toISOString(),
      sourceUrl: "#",
      sourceName: "News Radar"
    }
  ];
}

function formatNewsForWhatsApp(news: any[]): string {
  let message = "📰 *RESUMEN PROGRAMADO DE NOTICIAS*\n";
  message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
  
  news.slice(0, 5).forEach((item, index) => {
    message += `*${index + 1}.* ${item.title}\n`;
    if (item.summary) {
      message += `📝 ${item.summary.substring(0, 100)}...\n`;
    }
    message += `📰 ${item.sourceName || 'Fuente desconocida'}\n`;
    if (item.sourceUrl && item.sourceUrl !== "#") {
      message += `🔗 ${item.sourceUrl}\n`;
    }
    message += "\n";
  });
  
  message += "━━━━━━━━━━━━━━━━━━━━\n";
  message += "🤖 Enviado automáticamente por News Radar";
  
  return message;
}

async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL") || "";
    const apiKey = Deno.env.get("WHATSAPP_API_KEY") || "";
    const instanceName = Deno.env.get("WHATSAPP_INSTANCE_NAME") || "SenadoN8N";
    
    if (!evolutionApiUrl) {
      console.error("Evolution API URL no configurada");
      return false;
    }
    
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
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
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`WhatsApp enviado exitosamente a ${phoneNumber}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`Error enviando WhatsApp a ${phoneNumber}: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error(`Error de conexión enviando WhatsApp a ${phoneNumber}:`, fetchError);
      return false;
    }
    
  } catch (error: any) {
    console.error(`Error general enviando WhatsApp a ${phoneNumber}:`, error);
    return false;
  }
}

serve(handler);
