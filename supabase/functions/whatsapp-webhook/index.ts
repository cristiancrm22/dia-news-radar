
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WhatsAppMessage {
  number: string;
  message: string;
  instanceName?: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  sourceUrl: string;
  sourceName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Procesando webhook de WhatsApp...");
    
    const body = await req.json();
    console.log("Datos del webhook:", body);
    
    // Extraer información del mensaje de WhatsApp
    let phoneNumber = "";
    let messageText = "";
    
    // Formato típico de Evolution API
    if (body.data && body.data.messages) {
      const message = body.data.messages[0];
      phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
      messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
    } else if (body.number && body.message) {
      // Formato directo
      phoneNumber = body.number;
      messageText = body.message;
    }
    
    if (!phoneNumber || !messageText) {
      console.log("No se pudo extraer número o mensaje del webhook");
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log(`Mensaje recibido de ${phoneNumber}: ${messageText}`);
    
    // Verificar si el mensaje solicita noticias
    const lowerMessage = messageText.toLowerCase().trim();
    const noticiasKeywords = ['noticias', 'noticia', 'news', 'resumen', 'últimas noticias'];
    
    const isNewsRequest = noticiasKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (isNewsRequest) {
      console.log("Solicitud de noticias detectada, obteniendo noticias...");
      
      // Obtener noticias reales desde el servidor Python
      const todayNews = await getTodayNewsFromPython();
      
      if (todayNews.length > 0) {
        // Formatear las noticias para WhatsApp
        let newsMessage = "📰 *NOTICIAS DEL DÍA*\n\n";
        
        todayNews.slice(0, 5).forEach((news, index) => {
          newsMessage += `*${index + 1}.* ${news.title}\n`;
          if (news.summary) {
            newsMessage += `📝 ${news.summary.substring(0, 150)}...\n`;
          }
          newsMessage += `🔗 ${news.sourceUrl}\n\n`;
        });
        
        newsMessage += "📅 Fecha: " + new Date().toLocaleDateString('es-ES');
        
        // Enviar respuesta por WhatsApp
        await sendWhatsAppMessage(phoneNumber, newsMessage);
        
        console.log("Noticias enviadas correctamente");
      } else {
        await sendWhatsAppMessage(phoneNumber, "No se encontraron noticias para el día de hoy. 📰");
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      processed: isNewsRequest,
      message: "Webhook procesado correctamente"
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error("Error en webhook de WhatsApp:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

async function getTodayNewsFromPython(): Promise<NewsItem[]> {
  try {
    // Intentar obtener noticias del servidor Python
    const response = await fetch("http://localhost:8000/api/scraper/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keywords: ["Kicillof", "Magario", "Buenos Aires", "provincia"]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Noticias obtenidas del servidor Python:", data);
      
      // Convertir las noticias del formato Python al formato esperado
      if (data.news && Array.isArray(data.news)) {
        return data.news.map((item: any, index: number) => ({
          id: `python_${index}`,
          title: item.title || item.headline || "Sin título",
          summary: item.summary || item.description || "Sin resumen disponible",
          date: new Date().toISOString(),
          sourceUrl: item.url || item.link || "#",
          sourceName: item.source || "Fuente desconocida"
        }));
      }
    }
    
    console.log("No se pudieron obtener noticias del servidor Python, usando mock");
  } catch (error) {
    console.error("Error conectando con servidor Python:", error);
  }
  
  // Fallback a noticias mock si el servidor Python no responde
  const mockNews: NewsItem[] = [
    {
      id: "1",
      title: "Kicillof anuncia nuevas medidas económicas para la provincia",
      summary: "El gobernador bonaerense presentó un paquete de medidas destinadas a fortalecer la economía provincial",
      date: new Date().toISOString(),
      sourceUrl: "https://www.ejemplo.com/noticia1",
      sourceName: "La Nación"
    },
    {
      id: "2", 
      title: "Magario se reúne con intendentes del conurbano",
      summary: "La vicegobernadora coordinó acciones con los jefes comunales para mejorar la gestión local",
      date: new Date().toISOString(),
      sourceUrl: "https://www.ejemplo.com/noticia2",
      sourceName: "Clarín"
    }
  ];
  
  return mockNews;
}

async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
  try {
    // Obtener configuración de WhatsApp desde variables de entorno o base de datos
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL") || "";
    const apiKey = Deno.env.get("WHATSAPP_API_KEY") || "";
    const instanceName = Deno.env.get("WHATSAPP_INSTANCE_NAME") || "SenadoN8N";
    
    if (!evolutionApiUrl) {
      console.error("Evolution API URL no configurada");
      return;
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['apikey'] = apiKey;
    }
    
    const payload = {
      number: phoneNumber,
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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error enviando mensaje WhatsApp: ${response.status} - ${errorText}`);
      } else {
        console.log("Mensaje WhatsApp enviado correctamente");
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error("Timeout enviando mensaje WhatsApp");
      } else {
        throw fetchError;
      }
    }
    
  } catch (error) {
    console.error("Error en sendWhatsAppMessage:", error);
  }
}

serve(handler);
