
import { EmailConfig } from "@/types/news";
import { sendEmailViaPython } from './PythonNewsAdapter';
import { supabase } from "@/integrations/supabase/client";

export class EmailService {
  /**
   * Send email using Python SMTP script (new primary method)
   */
  static async sendEmailViaPython(config: EmailConfig, to: string, subject: string, html: string): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      console.log("Sending email via Python SMTP...");
      
      const result = await sendEmailViaPython({
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUsername: config.smtpUsername,
        smtpPassword: config.smtpPassword,
        to: to,
        subject: subject,
        html: html,
        useTLS: config.useTLS
      });
      
      return result;
      
    } catch (error: any) {
      console.error("Error in sendEmailViaPython:", error);
      return {
        success: false,
        error: error.message || "Error enviando email via Python"
      };
    }
  }

  /**
   * Send email - now uses Python as primary method
   */
  static async sendEmail(config: EmailConfig, to: string, subject: string, html: string): Promise<{success: boolean, message?: string, error?: string}> {
    // First try Python SMTP
    const pythonResult = await this.sendEmailViaPython(config, to, subject, html);
    if (pythonResult.success) {
      return pythonResult;
    }
    
    console.log("Python SMTP failed, trying Supabase Edge Function fallback...");
    
    // Fallback to Supabase Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('send-email-smtp', {
        body: {
          to: to,
          subject: subject,
          html: html,
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpUsername: config.smtpUsername,
          smtpPassword: config.smtpPassword,
          useTLS: config.useTLS
        }
      });

      if (error) {
        console.error("Error in Supabase email function:", error);
        return {
          success: false,
          error: error.message || "Error enviando email"
        };
      }

      console.log("Email sent successfully via Supabase Edge Function:", data);
      return {
        success: true,
        message: data?.message || "Email enviado correctamente via Supabase"
      };
      
    } catch (error: any) {
      console.error("Error in email fallback:", error);
      return {
        success: false,
        error: error.message || "Error enviando email"
      };
    }
  }

  /**
   * Test email configuration
   */
  static async testEmailConfiguration(config: EmailConfig): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      console.log("Testing email configuration...");
      
      // Use the sendEmail function to send a test email
      const testResult = await this.sendEmail(
        config,
        config.email,
        "Prueba de configuración de correo - News Radar",
        `
          <h1>¡Configuración de correo exitosa!</h1>
          <p>Este es un correo de prueba de News Radar.</p>
          <p>Su configuración de correo electrónico está funcionando correctamente.</p>
          <p>Configuración utilizada:</p>
          <ul>
            <li>Servidor SMTP: ${config.smtpHost}</li>
            <li>Puerto: ${config.smtpPort}</li>
            <li>TLS: ${config.useTLS ? 'Activado' : 'Desactivado'}</li>
          </ul>
          <p>Ahora podrá recibir resúmenes de noticias en este correo.</p>
          <br>
          <p>Saludos,<br>Equipo de News Radar</p>
        `
      );
      
      return testResult;
      
    } catch (error: any) {
      console.error("Error testing email configuration:", error);
      return {
        success: false,
        error: error.message || "Error al probar la configuración de correo"
      };
    }
  }
}
