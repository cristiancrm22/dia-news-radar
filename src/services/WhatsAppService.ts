
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
        
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (config.apiKey) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        
        const payload = {
          number: cleanPhone,
          textMessage: {
            text: message
          }
        };
        
        onLog?.('info', 'Enviando mensaje via Evolution API', { url: config.evolutionApiUrl, payload });
        
        const response = await fetch(`${config.evolutionApiUrl.trim()}/message/sendText/${cleanPhone}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          onLog?.('error', `Error Evolution API HTTP ${response.status}: ${response.statusText}`, errorText);
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
}
