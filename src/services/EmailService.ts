import { EmailConfig } from "@/types/news";
import { sendEmailViaPython } from './PythonNewsAdapter';
import { supabase } from "@/integrations/supabase/client";

export class EmailService {
  /**
   * Send email using Python SMTP script (primary method)
   */
  static async sendEmailViaPython(config: EmailConfig, to: string, subject: string, html: string): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      console.log("Sending email via Python SMTP with config:", {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUsername: config.smtpUsername,
        to: to,
        subject: subject,
        useTLS: config.useTLS
      });
      
      // Asegurar que los parámetros estén correctamente formateados
      const pythonParams = {
        smtpHost: config.smtpHost || "smtp.gmail.com",
        smtpPort: config.smtpPort || 587,
        smtpUsername: config.smtpUsername,
        smtpPassword: config.smtpPassword,
        to: to,
        subject: subject,
        html: html,
        useTLS: config.useTLS !== false // Default true
      };
      
      console.log("Parámetros enviados al script Python:", {
        ...pythonParams,
        smtpPassword: "[PROTECTED]" // No mostrar la contraseña en los logs
      });
      
      const result = await sendEmailViaPython(pythonParams);
      
      console.log("Python email result:", result);
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
   * Send email - uses Python as primary method with better error handling
   */
  static async sendEmail(config: EmailConfig, to: string, subject: string, html: string): Promise<{success: boolean, message?: string, error?: string}> {
    console.log("EmailService.sendEmail called with config:", {
      enabled: config.enabled,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUsername: config.smtpUsername,
      to: to,
      subject: subject,
      useTLS: config.useTLS
    });
    
    // Validar configuración básica
    if (!config.smtpHost || !config.smtpUsername || !config.smtpPassword) {
      return {
        success: false,
        error: "Configuración de email incompleta. Verifique SMTP host, usuario y contraseña."
      };
    }
    
    if (!to || !subject) {
      return {
        success: false,
        error: "Destinatario y asunto son requeridos."
      };
    }
    
    // Intentar envío via Python SMTP directamente (método principal)
    console.log("Attempting to send email via Python SMTP...");
    const pythonResult = await this.sendEmailViaPython(config, to, subject, html);
    
    if (pythonResult.success) {
      console.log("Email sent successfully via Python");
      return pythonResult;
    }
    
    console.log("Python SMTP failed:", pythonResult.error);
    
    // Solo usar fallback si es absolutamente necesario
    return {
      success: false,
      error: `Error enviando email: ${pythonResult.error}`
    };
  }

  /**
   * Test email configuration with detailed logging
   */
  static async testEmailConfiguration(config: EmailConfig): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      console.log("Testing email configuration with:", {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUsername: config.smtpUsername,
        email: config.email,
        useTLS: config.useTLS
      });
      
      // Verificar que todos los parámetros necesarios estén presentes
      if (!config.smtpHost || !config.smtpUsername || !config.smtpPassword) {
        return {
          success: false,
          error: "Configuración incompleta. Faltan: servidor SMTP, usuario o contraseña."
        };
      }
      
      // Usar la dirección de email de la configuración como destinatario
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
            <li>Usuario: ${config.smtpUsername}</li>
            <li>TLS: ${config.useTLS ? 'Activado' : 'Desactivado'}</li>
          </ul>
          <p>Ahora podrá recibir resúmenes de noticias en este correo.</p>
          <br>
          <p>Saludos,<br>Equipo de News Radar</p>
        `
      );
      
      console.log("Test email result:", testResult);
      return testResult;
      
    } catch (error: any) {
      console.error("Error testing email configuration:", error);
      return {
        success: false,
        error: error.message || "Error al probar la configuración de correo"
      };
    }
  }

  /**
   * Send scheduled news emails
   */
  static async sendScheduledNewsEmails(
    emails: string[],
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<{ success: boolean; results?: any; error?: string }> {
    
    onLog?.('info', `Enviando noticias programadas por email a ${emails.length} direcciones`);
    
    try {
      // Obtener configuración y noticias
      const NewsService = (await import('./NewsService')).default;
      const config = await NewsService.getEmailConfig();
      
      if (!config.enabled) {
        onLog?.('error', 'Email no está habilitado en la configuración');
        return { success: false, error: 'Email no está habilitado' };
      }
      
      // Obtener noticias del día
      const todayNews = await NewsService.getNews();
      
      if (todayNews.length === 0) {
        onLog?.('info', 'No hay noticias para enviar hoy');
        return { success: true, results: { message: 'No hay noticias para enviar' } };
      }
      
      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // Generar HTML para las noticias
      const newsHtml = this.generateNewsEmailHTML(todayNews, 'daily');
      const subject = `Resumen diario de noticias - ${new Date().toLocaleDateString('es-ES')}`;
      
      // Enviar a cada email
      for (const email of emails) {
        try {
          const result = await this.sendEmail(config, email, subject, newsHtml);
          
          if (result.success) {
            results.sent++;
            onLog?.('success', `Email enviado correctamente a ${email}`);
          } else {
            results.failed++;
            results.errors.push(`${email}: ${result.error}`);
            onLog?.('error', `Error enviando a ${email}: ${result.error}`);
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${email}: ${error.message}`);
          onLog?.('error', `Error inesperado enviando a ${email}: ${error.message}`);
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
      onLog?.('error', `Error enviando noticias programadas por email: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  }

  // Generate HTML content for news email
  private static generateNewsEmailHTML(newsItems: any[], frequency: 'daily' | 'weekly'): string {
    const frequencyText = frequency === 'daily' ? 'diario' : 'semanal';
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
            <h1>Resumen ${frequencyText} de noticias</h1>
            <p>${date}</p>
          </div>
          <div class="content">
            <p>Aquí tienes tu resumen ${frequencyText} de noticias más relevantes:</p>
    `;

    if (newsItems.length === 0) {
      html += `
        <div class="news-item">
          <p>No se encontraron noticias nuevas para este período.</p>
        </div>
      `;
    } else {
      newsItems.slice(0, 10).forEach(item => {
        html += `
          <div class="news-item">
            <div class="news-title">${item.title}</div>
            <div class="news-summary">${item.summary || 'Sin resumen disponible'}</div>
            <div class="news-source">
              Fuente: ${item.sourceName || 'Desconocida'} | 
              ${item.date ? item.date : 'Fecha no disponible'}
              ${item.sourceUrl ? ` | <a href="${item.sourceUrl}" target="_blank">Leer más</a>` : ''}
            </div>
          </div>
        `;
      });
    }

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
}
