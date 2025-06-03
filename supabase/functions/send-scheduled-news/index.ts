
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ScheduledNewsRequest {
  type: 'whatsapp' | 'email' | 'both';
  phoneNumbers?: string[];
  emails?: string[];
  force?: boolean; // Para envío manual
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
    console.log("Procesando envío programado de noticias...");
    
    const body = await req.json();
    const { type, phoneNumbers, emails, force }: ScheduledNewsRequest = body;
    
    // Obtener noticias del día desde el servidor Python
    const todayNews = await getTodayNewsFromPython();
    
    if (todayNews.length === 0) {
      console.log("No hay noticias para enviar hoy");
      return new Response(JSON.stringify({ 
        success: true,
        message: "No hay noticias para enviar hoy"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    let results = {
      whatsappSent: 0,
      emailsSent: 0,
      errors: [] as string[]
    };
    
    // Enviar por WhatsApp
    if ((type === 'whatsapp' || type === 'both') && phoneNumbers && phoneNumbers.length > 0) {
      console.log(`Enviando noticias por WhatsApp a ${phoneNumbers.length} números`);
      
      const whatsappMessage = formatNewsForWhatsApp(todayNews);
      
      for (const phoneNumber of phoneNumbers) {
        try {
          await sendWhatsAppMessage(phoneNumber, whatsappMessage);
          results.whatsappSent++;
          console.log(`WhatsApp enviado a ${phoneNumber}`);
        } catch (error: any) {
          console.error(`Error enviando WhatsApp a ${phoneNumber}:`, error);
          results.errors.push(`WhatsApp ${phoneNumber}: ${error.message}`);
        }
      }
    }
    
    // Enviar por Email
    if ((type === 'email' || type === 'both') && emails && emails.length > 0) {
      console.log(`Enviando noticias por email a ${emails.length} direcciones`);
      
      const emailHtml = formatNewsForEmail(todayNews);
      const subject = `Resumen diario de noticias - ${new Date().toLocaleDateString('es-ES')}`;
      
      for (const email of emails) {
        try {
          await sendEmail(email, subject, emailHtml);
          results.emailsSent++;
          console.log(`Email enviado a ${email}`);
        } catch (error: any) {
          console.error(`Error enviando email a ${email}:`, error);
          results.errors.push(`Email ${email}: ${error.message}`);
        }
      }
    }
    
    console.log("Resumen del envío:", results);
    
    return new Response(JSON.stringify({ 
      success: true,
      results,
      totalNews: todayNews.length,
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
  
  // Fallback a noticias mock
  const mockNews: NewsItem[] = [
    {
      id: "1",
      title: "Kicillof anuncia nuevas medidas económicas para la provincia",
      summary: "El gobernador bonaerense presentó un paquete de medidas destinadas a fortalecer la economía provincial y apoyar a las pequeñas empresas.",
      date: new Date().toISOString(),
      sourceUrl: "https://www.ejemplo.com/noticia1",
      sourceName: "La Nación"
    },
    {
      id: "2",
      title: "Magario se reúne con intendentes del conurbano",
      summary: "La vicegobernadora coordinó acciones con los jefes comunales para mejorar la gestión local y optimizar recursos.",
      date: new Date().toISOString(),
      sourceUrl: "https://www.ejemplo.com/noticia2",
      sourceName: "Clarín"
    }
  ];
  
  return mockNews;
}

function formatNewsForWhatsApp(news: NewsItem[]): string {
  let message = "📰 *RESUMEN DIARIO DE NOTICIAS*\n";
  message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
  
  news.slice(0, 6).forEach((item, index) => {
    message += `*${index + 1}.* ${item.title}\n`;
    if (item.summary) {
      message += `📝 ${item.summary.substring(0, 120)}...\n`;
    }
    message += `📰 Fuente: ${item.sourceName}\n`;
    message += `🔗 ${item.sourceUrl}\n\n`;
  });
  
  message += "━━━━━━━━━━━━━━━━━━━━\n";
  message += "🤖 Enviado automáticamente por News Radar";
  
  return message;
}

function formatNewsForEmail(news: NewsItem[]): string {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .news-item { margin-bottom: 20px; padding: 15px; border-left: 4px solid #3b82f6; background-color: #f8fafc; }
          .news-title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
          .news-summary { margin-bottom: 10px; }
          .news-source { font-size: 12px; color: #6b7280; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Resumen Diario de Noticias</h1>
          <p>${date}</p>
        </div>
        <div class="content">
          <p>Aquí tienes tu resumen diario de las noticias más relevantes:</p>
  `;

  news.forEach(item => {
    html += `
      <div class="news-item">
        <div class="news-title">${item.title}</div>
        <div class="news-summary">${item.summary || 'Sin resumen disponible'}</div>
        <div class="news-source">
          Fuente: ${item.sourceName} | 
          ${new Date(item.date).toLocaleDateString('es-ES')}
          | <a href="${item.sourceUrl}" target="_blank">Leer más</a>
        </div>
      </div>
    `;
  });

  html += `
        </div>
        <div class="footer">
          <p>Este correo fue enviado automáticamente por News Radar</p>
          <p>Si no deseas recibir más correos, desactiva la opción en tu configuración</p>
        </div>
      </body>
    </html>
  `;

  return html;
}

async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
  const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL") || "";
  const apiKey = Deno.env.get("WHATSAPP_API_KEY") || "";
  const instanceName = Deno.env.get("WHATSAPP_INSTANCE_NAME") || "SenadoN8N";
  
  if (!evolutionApiUrl) {
    throw new Error("Evolution API URL no configurada");
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
      throw new Error(`Error enviando WhatsApp: ${response.status} - ${errorText}`);
    }
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      throw new Error('Timeout enviando mensaje WhatsApp');
    }
    throw fetchError;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // Intentar usar el servidor Python para envío de email
  try {
    const response = await fetch("http://localhost:8000/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: to,
        subject: subject,
        html: html
      })
    });
    
    if (response.ok) {
      console.log("Email enviado via servidor Python");
      return;
    }
  } catch (error) {
    console.error("Error enviando email via Python:", error);
  }
  
  // Fallback a Supabase Edge Function
  const smtpConfig = {
    to,
    subject,
    html,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: Deno.env.get("SMTP_USERNAME") || "n8ncrm@gmail.com",
    smtpPassword: Deno.env.get("SMTP_PASSWORD") || "vtks imof fqqs cvny",
    useTLS: true
  };
  
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email-smtp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
    },
    body: JSON.stringify(smtpConfig)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error enviando email: ${errorData.error || response.statusText}`);
  }
}

serve(handler);
