import { EmailConfig } from "@/types/news";

export class EmailService {
  
  static async sendEmailViaPython(config: EmailConfig, to: string, subject: string, html: string): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      console.log("=== ENVÍO EMAIL VIA PYTHON ===");
      console.log("Config:", {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUsername: config.smtpUsername,
        to: to,
        subject: subject,
        useTLS: config.useTLS
      });
      
      const emailData = {
        smtp_host: config.smtpHost || "smtp.gmail.com",
        smtp_port: config.smtpPort || 587,
        smtp_user: config.smtpUsername,
        smtp_pass: config.smtpPassword,
        to: to,
        subject: subject,
        html: html,
        use_tls: config.useTLS !== false
      };
      
      console.log("Datos del email (sin password):", {
        ...emailData,
        smtp_pass: "[PROTEGIDO]"
      });
      
      const response = await fetch("http://localhost:8000/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData)
      });
      
      console.log("Respuesta del servidor:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error del servidor:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log("Resultado exitoso:", result);
      
      return result;
      
    } catch (error: any) {
      console.error("Error completo en sendEmailViaPython:", error);
      return {
        success: false,
        error: error.message || "Error enviando email via Python"
      };
    }
  }

  static async sendEmail(config: EmailConfig, to: string, subject: string, html: string): Promise<{success: boolean, message?: string, error?: string}> {
    console.log("=== INICIO SENDMAIL ===");
    
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
    
    return this.sendEmailViaPython(config, to, subject, html);
  }

  static async testEmailConfiguration(config: EmailConfig): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      console.log("=== PRUEBA DE EMAIL ===");
      
      if (!config.smtpHost || !config.smtpUsername || !config.smtpPassword) {
        return {
          success: false,
          error: "Configuración incompleta. Faltan: servidor SMTP, usuario o contraseña."
        };
      }
      
      const testHtml = `
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
      `;
      
      return this.sendEmailViaPython(
        config,
        config.email,
        "Prueba de configuración de correo - News Radar",
        testHtml
      );
      
    } catch (error: any) {
      console.error("Error testing email configuration:", error);
      return {
        success: false,
        error: error.message || "Error al probar la configuración de correo"
      };
    }
  }

  static async sendScheduledNewsEmails(
    emails: string[],
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<{ success: boolean; results?: any; error?: string }> {
    
    onLog?.('info', `Enviando noticias programadas por email a ${emails.length} direcciones`);
    
    try {
      const NewsService = (await import('./NewsService')).default;
      const config = await NewsService.getEmailConfig();
      
      if (!config.enabled) {
        onLog?.('error', 'Email no está habilitado en la configuración');
        return { success: false, error: 'Email no está habilitado' };
      }
      
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
      
      const newsHtml = this.generateNewsEmailHTML(todayNews, 'daily');
      const subject = `Resumen diario de noticias - ${new Date().toLocaleDateString('es-ES')}`;
      
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
