
import { WhatsAppConfig } from "@/types/news";

export interface WhatsAppSendResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export class WhatsAppService {
  
  static async sendMessage(
    config: WhatsAppConfig,
    phoneNumber: string,
    message: string,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<WhatsAppSendResult> {
    
    onLog?.('info', `=== ENVIANDO WHATSAPP A ${phoneNumber} ===`);
    
    if (!phoneNumber || !message) {
      onLog?.('error', 'Número o mensaje vacío');
      return { success: false, error: 'Datos incompletos' };
    }

    try {
      if (config.connectionMethod === "evolution" && config.evolutionApiUrl) {
        onLog?.('info', `Usando Evolution API: ${config.evolutionApiUrl}`);
        
        // Limpiar y validar número
        let cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Si no empieza con código de país, agregar 54 (Argentina)
        if (!cleanNumber.startsWith('54') && cleanNumber.length >= 10) {
          cleanNumber = '54' + cleanNumber;
        }
        
        onLog?.('info', `Número procesado: ${phoneNumber} -> ${cleanNumber}`);
        
        if (cleanNumber.length < 12) {
          onLog?.('error', `Número inválido: ${cleanNumber} (debe tener al menos 12 dígitos con código de país)`);
          return { 
            success: false, 
            error: `Número inválido: ${phoneNumber}. Debe incluir código de país (ej: +5491123456789)` 
          };
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        if (config.apiKey) {
          headers['apikey'] = config.apiKey;
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        
        const instanceName = "SenadoN8N";
        
        const payload = {
          number: cleanNumber,
          text: message
        };
        
        // URLs alternativas para probar
        const apiUrls = [
          `${config.evolutionApiUrl.trim()}/message/sendText/${instanceName}`,
          `${config.evolutionApiUrl.trim()}/message/send-text/${instanceName}`,
          `${config.evolutionApiUrl.trim()}/send-message/${instanceName}`
        ];
        
        onLog?.('info', `Probando envío con payload:`, payload);
        
        // Intentar con diferentes URLs
        for (const apiUrl of apiUrls) {
          try {
            onLog?.('info', `Intentando URL: ${apiUrl}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              onLog?.('error', 'Timeout de 20 segundos alcanzado');
              controller.abort();
            }, 20000);
            
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            onLog?.('info', `Respuesta recibida: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
              const errorText = await response.text();
              onLog?.('error', `Error HTTP ${response.status}:`, errorText);
              
              // Si es 404, probar siguiente URL
              if (response.status === 404) {
                continue;
              }
              
              if (response.status === 400) {
                return { 
                  success: false, 
                  error: `Error en formato de mensaje o número no válido: ${errorText}` 
                };
              }
              
              return { 
                success: false, 
                error: `Error Evolution API: ${response.status} - ${errorText}` 
              };
            }
            
            const result = await response.json();
            onLog?.('success', 'WhatsApp enviado correctamente', result);
            
            return { 
              success: true, 
              messageId: result.key?.id || result.messageId || result.id
            };
            
          } catch (fetchError: any) {
            onLog?.('error', `Error en fetch con ${apiUrl}: ${fetchError.message}`);
            
            if (fetchError.name === 'AbortError') {
              return { success: false, error: 'Timeout de conexión (20s)' };
            }
            
            // Si no es el último URL, continuar
            if (apiUrl !== apiUrls[apiUrls.length - 1]) {
              continue;
            }
            
            return { success: false, error: `Error de conexión: ${fetchError.message}` };
          }
        }
        
        return { success: false, error: 'No se pudo conectar con ningún endpoint de Evolution API' };
        
      } else {
        onLog?.('info', 'Modo simulación activado - WhatsApp no configurado');
        await new Promise(resolve => setTimeout(resolve, 1000));
        onLog?.('success', 'Mensaje simulado enviado');
        return { success: true, messageId: `sim_${Date.now()}` };
      }
      
    } catch (error: any) {
      onLog?.('error', `Error general: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  }

  static async testConfiguration(
    config: WhatsAppConfig,
    testPhone: string,
    testMessage: string,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<WhatsAppSendResult> {
    
    if (!testPhone) {
      return { success: false, error: 'Número de teléfono requerido' };
    }

    if (!testMessage) {
      testMessage = `🤖 Mensaje de prueba de News Radar\n\n✅ WhatsApp funcionando correctamente!\n\n${new Date().toLocaleString()}`;
    }

    return this.sendMessage(config, testPhone, testMessage, onLog);
  }

  static async requestTodayNews(
    phoneNumber: string,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<WhatsAppSendResult> {
    
    onLog?.('info', `=== ENVIANDO NOTICIAS A ${phoneNumber} ===`);
    
    try {
      const NewsService = (await import('./NewsService')).default;
      const config = await NewsService.getWhatsAppConfig();
      
      onLog?.('info', `Configuración WhatsApp obtenida`);
      
      const todayNews = await NewsService.getNews();
      onLog?.('info', `Noticias obtenidas: ${todayNews.length}`);
      
      let newsMessage: string;
      if (todayNews.length === 0) {
        newsMessage = "📰 *NOTICIAS DEL DÍA*\n\n⚠️ No hay noticias disponibles en este momento.\n\nIntentaremos más tarde.\n\n🤖 News Radar";
        onLog?.('info', 'Sin noticias - enviando mensaje informativo');
      } else {
        newsMessage = this.formatNewsForWhatsApp(todayNews);
        onLog?.('info', `Mensaje formateado con ${todayNews.length} noticias`);
      }
      
      return this.sendMessage(config, phoneNumber, newsMessage, onLog);
      
    } catch (error: any) {
      onLog?.('error', `Error: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  }

  static async sendScheduledNews(
    phoneNumbers: string[],
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<{ success: boolean; results?: any; error?: string }> {
    
    onLog?.('info', `=== ENVÍO PROGRAMADO A ${phoneNumbers.length} NÚMEROS ===`);
    
    try {
      const NewsService = (await import('./NewsService')).default;
      const config = await NewsService.getWhatsAppConfig();
      
      const todayNews = await NewsService.getNews();
      onLog?.('info', `Noticias obtenidas: ${todayNews.length}`);
      
      let newsMessage: string;
      if (todayNews.length === 0) {
        newsMessage = "📰 *RESUMEN DIARIO*\n\n⚠️ No hay noticias disponibles.\n\n🤖 News Radar";
        onLog?.('info', 'Sin noticias - mensaje informativo');
      } else {
        newsMessage = this.formatNewsForWhatsApp(todayNews);
        onLog?.('info', `Mensaje preparado con ${todayNews.length} noticias`);
      }
      
      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (const phoneNumber of phoneNumbers) {
        try {
          onLog?.('info', `Procesando ${phoneNumber}...`);
          
          const result = await this.sendMessage(config, phoneNumber, newsMessage, onLog);
          
          if (result.success) {
            results.sent++;
            onLog?.('success', `✅ Enviado a ${phoneNumber}`);
          } else {
            results.failed++;
            results.errors.push(`${phoneNumber}: ${result.error}`);
            onLog?.('error', `❌ Falló ${phoneNumber}: ${result.error}`);
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${phoneNumber}: ${error.message}`);
          onLog?.('error', `💥 Error ${phoneNumber}: ${error.message}`);
        }
      }
      
      onLog?.('success', `=== RESUMEN: ${results.sent} enviados, ${results.failed} fallidos ===`);
      return { 
        success: results.sent > 0, 
        results: {
          sent: results.sent,
          failed: results.failed,
          errors: results.errors,
          totalNews: todayNews.length
        }
      };
      
    } catch (error: any) {
      onLog?.('error', `Error general: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  }
  
  private static formatNewsForWhatsApp(news: any[]): string {
    let message = "📰 *RESUMEN DIARIO DE NOTICIAS*\n";
    message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
    
    // CORREGIDO: Enviar TODAS las noticias en lugar de limitar a 5
    news.forEach((item, index) => {
      message += `*${index + 1}.* ${item.title}\n`;
      if (item.summary) {
        message += `📝 ${item.summary.substring(0, 100)}...\n`;
      }
      message += `📰 ${item.sourceName || 'Fuente desconocida'}\n`;
      if (item.sourceUrl) {
        message += `🔗 ${item.sourceUrl}\n`;
      }
      message += "\n";
    });
    
    message += "━━━━━━━━━━━━━━━━━━━━\n";
    message += `🤖 News Radar (${news.length} noticias)`;
    
    return message;
  }
}
