
import { WhatsAppConfig } from "@/types/news";
import { supabase } from "@/integrations/supabase/client";

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
    
    onLog?.('info', `Iniciando envío de mensaje WhatsApp a ${phoneNumber}`);
    
    if (!config.enabled) {
      onLog?.('error', 'WhatsApp no está habilitado en la configuración');
      return { success: false, error: 'WhatsApp no habilitado' };
    }

    if (!phoneNumber || !message) {
      onLog?.('error', 'Número de teléfono o mensaje vacío');
      return { success: false, error: 'Datos incompletos' };
    }

    try {
      if (config.connectionMethod === "evolution" && config.evolutionApiUrl) {
        onLog?.('info', `Usando Evolution API: ${config.evolutionApiUrl}`);
        
        // Limpiar y validar el número de teléfono
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        if (cleanNumber.length < 10) {
          onLog?.('error', `Número de teléfono inválido: ${phoneNumber}. Debe tener al menos 10 dígitos.`);
          return { 
            success: false, 
            error: `Número de teléfono inválido: ${phoneNumber}. Debe tener al menos 10 dígitos.` 
          };
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (config.apiKey) {
          headers['apikey'] = config.apiKey;
        }
        
        // Usar la instancia configurada
        const instanceName = "SenadoN8N";
        
        const payload = {
          number: cleanNumber,
          text: message
        };
        
        const apiUrl = `${config.evolutionApiUrl.trim()}/message/sendText/${instanceName}`;
        
        onLog?.('info', 'Enviando mensaje via Evolution API', { 
          url: apiUrl, 
          payload,
          instanceName 
        });
        
        // Añadir timeout y mejor manejo de errores
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            onLog?.('error', `Error Evolution API HTTP ${response.status}: ${response.statusText}`, errorText);
            
            // Si el error es de instancia no encontrada, dar una sugerencia
            if (response.status === 404 && errorText.includes('instance does not exist')) {
              return { 
                success: false, 
                error: `Instancia "${instanceName}" no encontrada. Verifica el nombre de la instancia en Evolution Manager.` 
              };
            }
            
            // Si el error es de número no válido, dar una sugerencia específica
            if (response.status === 400 && errorText.includes('exists":false')) {
              return { 
                success: false, 
                error: `El número ${cleanNumber} no está registrado en WhatsApp o no es válido. Verifique que el número esté correcto y que tenga WhatsApp activo.` 
              };
            }
            
            return { 
              success: false, 
              error: `Error Evolution API: ${response.status} - ${errorText}` 
            };
          }
          
          const result = await response.json();
          onLog?.('success', 'Mensaje enviado correctamente via Evolution API', result);
          
          return { 
            success: true, 
            messageId: result.key?.id || result.messageId 
          };
          
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError') {
            onLog?.('error', 'Timeout: La conexión con Evolution API tardó demasiado (30s)');
            return { success: false, error: 'Timeout de conexión con Evolution API' };
          }
          
          throw fetchError;
        }
        
      } else {
        // Simulación para WhatsApp Business API oficial
        onLog?.('info', 'Simulando envío via WhatsApp Business API oficial');
        
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        onLog?.('success', 'Mensaje simulado enviado correctamente (WhatsApp Business API)');
        
        return { 
          success: true, 
          messageId: `sim_${Date.now()}` 
        };
      }
      
    } catch (error: any) {
      onLog?.('error', `Error al enviar mensaje WhatsApp: ${error.message}`, error);
      
      // Mejorar los mensajes de error según el tipo
      if (error.message.includes('fetch')) {
        return { 
          success: false, 
          error: `Error de conexión: Verifica que la URL de Evolution API sea correcta y que el servidor esté disponible. ${error.message}` 
        };
      }
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  static async testConfiguration(
    config: WhatsAppConfig,
    testPhone: string,
    testMessage: string,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<WhatsAppSendResult> {
    
    if (!testPhone) {
      onLog?.('error', 'No se ha especificado un número de teléfono para la prueba');
      return { success: false, error: 'Número de teléfono requerido' };
    }

    if (!testMessage) {
      testMessage = `🤖 Mensaje de prueba de News Radar\n\nConfiguración:\n- Método: ${config.connectionMethod}\n- API URL: ${config.evolutionApiUrl || 'N/A'}\n\n✅ WhatsApp funcionando correctamente!`;
    }

    return this.sendMessage(config, testPhone, testMessage, onLog);
  }

  // Función corregida para enviar noticias automáticamente
  static async sendScheduledNews(
    phoneNumbers: string[],
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<{ success: boolean; results?: any; error?: string }> {
    
    onLog?.('info', `Enviando noticias programadas a ${phoneNumbers.length} números`);
    
    try {
      // Obtener la configuración de WhatsApp actual
      const NewsService = (await import('./NewsService')).default;
      const config = await NewsService.getWhatsAppConfig();
      
      if (!config.enabled) {
        onLog?.('error', 'WhatsApp no está habilitado en la configuración');
        return { success: false, error: 'WhatsApp no está habilitado' };
      }
      
      // Obtener noticias del día
      const todayNews = await NewsService.getNews();
      
      if (todayNews.length === 0) {
        onLog?.('info', 'No hay noticias para enviar hoy');
        return { success: true, results: { message: 'No hay noticias para enviar' } };
      }
      
      // Formatear noticias para WhatsApp
      const newsMessage = this.formatNewsForWhatsApp(todayNews);
      
      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // Enviar a cada número usando la función que sabemos que funciona
      for (const phoneNumber of phoneNumbers) {
        try {
          const result = await this.sendMessage(
            config,
            phoneNumber,
            newsMessage,
            onLog
          );
          
          if (result.success) {
            results.sent++;
            onLog?.('success', `Noticias enviadas correctamente a ${phoneNumber}`);
          } else {
            results.failed++;
            results.errors.push(`${phoneNumber}: ${result.error}`);
            onLog?.('error', `Error enviando a ${phoneNumber}: ${result.error}`);
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${phoneNumber}: ${error.message}`);
          onLog?.('error', `Error inesperado enviando a ${phoneNumber}: ${error.message}`);
        }
      }
      
      onLog?.('success', `Proceso completado: ${results.sent} enviados, ${results.failed} fallidos`);
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
      onLog?.('error', `Error enviando noticias programadas: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  }

  // Función corregida para solicitar noticias manualmente - AHORA ES ENVÍO REAL
  static async requestTodayNews(
    phoneNumber: string,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<WhatsAppSendResult> {
    
    onLog?.('info', `Enviando noticias del día a ${phoneNumber} (ENVÍO REAL)`);
    
    try {
      // Obtener configuración y noticias
      const NewsService = (await import('./NewsService')).default;
      const config = await NewsService.getWhatsAppConfig();
      
      if (!config.enabled) {
        onLog?.('error', 'WhatsApp no está habilitado en la configuración');
        return { success: false, error: 'WhatsApp no está habilitado' };
      }
      
      const todayNews = await NewsService.getNews();
      
      if (todayNews.length === 0) {
        const noNewsMessage = "📰 *NOTICIAS DEL DÍA*\n\n⚠️ No hay noticias disponibles en este momento.\n\n🤖 News Radar";
        return this.sendMessage(config, phoneNumber, noNewsMessage, onLog);
      }
      
      // Formatear y enviar noticias usando la función real de envío
      const newsMessage = this.formatNewsForWhatsApp(todayNews);
      onLog?.('info', 'Enviando noticias reales (no simulación)');
      
      return this.sendMessage(config, phoneNumber, newsMessage, onLog);
      
    } catch (error: any) {
      onLog?.('error', `Error enviando noticias del día: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Función auxiliar para formatear noticias para WhatsApp
  private static formatNewsForWhatsApp(news: any[]): string {
    let message = "📰 *RESUMEN DIARIO DE NOTICIAS*\n";
    message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
    
    news.slice(0, 6).forEach((item, index) => {
      message += `*${index + 1}.* ${item.title}\n`;
      if (item.summary) {
        message += `📝 ${item.summary.substring(0, 120)}...\n`;
      }
      message += `📰 Fuente: ${item.sourceName || 'Desconocida'}\n`;
      if (item.sourceUrl) {
        message += `🔗 ${item.sourceUrl}\n`;
      }
      message += "\n";
    });
    
    message += "━━━━━━━━━━━━━━━━━━━━\n";
    message += "🤖 Enviado automáticamente por News Radar";
    
    return message;
  }
}
