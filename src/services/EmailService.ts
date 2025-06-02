
import { EmailConfig } from "@/types/news";
import { supabase } from "@/integrations/supabase/client";

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
      onLog?.('info', 'Enviando email a través de Resend');
      
      const payload = {
        to,
        subject,
        html: htmlContent,
        from: "News Radar <onboarding@resend.dev>"
      };
      
      onLog?.('info', 'Enviando email con Resend', payload);
      
      // Usar el cliente de Supabase en lugar de fetch directo
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: payload
      });
      
      if (error) {
        onLog?.('error', `Error de Supabase: ${error.message}`, error);
        return { 
          success: false, 
          error: `Error de Supabase: ${error.message}` 
        };
      }
      
      if (data?.error) {
        onLog?.('error', `Error del servidor: ${data.error}`, data);
        return { 
          success: false, 
          error: `Error del servidor: ${data.error}` 
        };
      }
      
      onLog?.('success', 'Email enviado correctamente con Resend', data);
      
      return { 
        success: true, 
        messageId: data?.data?.id 
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
