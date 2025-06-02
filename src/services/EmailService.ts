
import { EmailConfig } from "@/types/news";

export interface EmailSendResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export class EmailService {
  
  static async sendEmail(
    config: EmailConfig,
    to: string,
    subject: string,
    htmlContent: string,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<EmailSendResult> {
    
    onLog?.('info', `Iniciando envío de email a ${to}`);
    
    try {
      // Siempre usar Resend a través de la función Edge de Supabase
      onLog?.('info', 'Enviando email a través de Resend');
      
      const payload = {
        to,
        subject,
        html: htmlContent,
        from: "News Radar <onboarding@resend.dev>"
      };
      
      onLog?.('info', 'Enviando email con Resend', payload);
      
      const response = await fetch('https://zajgwopxogvsfpplcdie.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphamd3b3B4b2d2c2ZwcGxjZGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNTAzMTksImV4cCI6MjA2MzkyNjMxOX0.Qarj8I7767cuID6BR3AEY11ALiVH-MzT8Ht8XipwMGI`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphamd3b3B4b2d2c2ZwcGxjZGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNTAzMTksImV4cCI6MjA2MzkyNjMxOX0.Qarj8I7767cuID6BR3AEY11ALiVH-MzT8Ht8XipwMGI'
        },
        body: JSON.stringify(payload)
      });
      
      onLog?.('info', `Respuesta del servidor: ${response.status} - ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        onLog?.('error', `Error HTTP ${response.status}: ${response.statusText}`, { errorText });
        return { 
          success: false, 
          error: `Error HTTP ${response.status}: ${errorText}` 
        };
      }
      
      const result = await response.json();
      onLog?.('success', 'Email enviado correctamente con Resend', result);
      
      return { 
        success: true, 
        messageId: result.data?.id 
      };
      
    } catch (error: any) {
      onLog?.('error', `Error al enviar email: ${error.message}`, { 
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return { 
        success: false, 
        error: `Error de conexión: ${error.message}` 
      };
    }
  }

  static async testEmailConfiguration(
    config: EmailConfig,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<EmailSendResult> {
    
    if (!config.email) {
      onLog?.('error', 'No se ha configurado un email de destino');
      return { success: false, error: 'Email de destino requerido' };
    }

    const testSubject = "Prueba de configuración de correo - News Radar";
    const testHtml = `
      <h1>¡Configuración de correo exitosa!</h1>
      <p>Este es un correo de prueba de News Radar.</p>
      <p>Su configuración de correo electrónico está funcionando correctamente.</p>
      <p>Configuración utilizada:</p>
      <ul>
        <li>Servidor SMTP: Resend (servicio recomendado)</li>
        <li>Puerto: N/A</li>
        <li>TLS: Activado</li>
      </ul>
      <p>Ahora podrá recibir resúmenes de noticias en este correo.</p>
      <br>
      <p>Saludos,<br>Equipo de News Radar</p>
    `;

    return this.sendEmail(config, config.email, testSubject, testHtml, onLog);
  }
}
