
import { supabase } from "@/integrations/supabase/client";

export interface EmailTestRequest {
  to: string;
  subject: string;
  content: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  useTLS?: boolean;
}

export class EmailService {
  static async sendTestEmail(emailData: EmailTestRequest): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      console.log("Enviando email de prueba usando Python script:", emailData);

      // Preparar el HTML del email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Email de Prueba - News Radar</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 20px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔍 News Radar</h1>
              <p>Email de Prueba</p>
            </div>
            <div class="content">
              <h2>¡Configuración de Email Exitosa!</h2>
              <p>Este es un email de prueba para verificar que tu configuración de correo electrónico está funcionando correctamente.</p>
              <p><strong>Contenido personalizado:</strong></p>
              <p>${emailData.content || 'No se proporcionó contenido personalizado.'}</p>
              <p>Si recibes este mensaje, significa que News Radar puede enviar emails correctamente usando tu configuración.</p>
            </div>
            <div class="footer">
              <p>Este email fue enviado por News Radar como parte de una prueba de configuración.</p>
              <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Llamar al endpoint del servidor Python
      const response = await fetch('http://localhost:8000/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smtp_host: emailData.smtpHost || 'smtp.gmail.com',
          smtp_port: emailData.smtpPort || 587,
          smtp_user: emailData.smtpUsername,
          smtp_pass: emailData.smtpPassword,
          to: emailData.to,
          subject: emailData.subject || "Prueba de Email - News Radar",
          html: htmlContent,
          use_tls: emailData.useTLS !== false
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log("Respuesta del servidor Python:", result);

      if (result.success) {
        return {
          success: true,
          message: result.message || "Email enviado correctamente"
        };
      } else {
        return {
          success: false,
          message: "Error al enviar email",
          error: result.error || "Error desconocido"
        };
      }

    } catch (error: any) {
      console.error("Error general al enviar email:", error);
      return {
        success: false,
        message: "Error al enviar email",
        error: error.message || "Error de conexión"
      };
    }
  }

  // Método para prueba de configuración de email
  static async testEmailConfiguration(config: any): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      return await this.sendTestEmail({
        to: config.email,
        subject: "Prueba de Configuración - News Radar",
        content: "Esta es una prueba de configuración de correo electrónico desde News Radar.",
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUsername: config.smtpUsername,
        smtpPassword: config.smtpPassword,
        useTLS: config.useTLS
      });
    } catch (error: any) {
      console.error("Error en testEmailConfiguration:", error);
      return {
        success: false,
        message: "Error al probar configuración de email",
        error: error.message || "Error desconocido"
      };
    }
  }

  // Método para enviar email general
  static async sendEmail(config: any, to: string, subject: string, html: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      return await this.sendTestEmail({
        to: to,
        subject: subject,
        content: html,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUsername: config.smtpUsername,
        smtpPassword: config.smtpPassword,
        useTLS: config.useTLS
      });
    } catch (error: any) {
      console.error("Error en sendEmail:", error);
      return {
        success: false,
        message: "Error al enviar email",
        error: error.message || "Error desconocido"
      };
    }
  }

  static async sendScheduledNews(emailConfig: any, newsContent: string): Promise<{ success: boolean; message: string }> {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Noticias Programadas - News Radar</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 20px; border-radius: 0 0 8px 8px; }
            .news-item { margin-bottom: 20px; padding: 15px; border-left: 4px solid #2563eb; background: #f8fafc; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔍 News Radar</h1>
              <p>Resumen de Noticias</p>
            </div>
            <div class="content">
              <h2>Noticias del día</h2>
              ${newsContent}
            </div>
            <div class="footer">
              <p>Este email fue enviado automáticamente por News Radar.</p>
              <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await fetch('http://localhost:8000/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smtp_host: emailConfig.smtpHost || 'smtp.gmail.com',
          smtp_port: emailConfig.smtpPort || 587,
          smtp_user: emailConfig.smtpUsername,
          smtp_pass: emailConfig.smtpPassword,
          to: emailConfig.email,
          subject: `Noticias del día - ${new Date().toLocaleDateString('es-ES')}`,
          html: htmlContent,
          use_tls: emailConfig.useTLS !== false
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          message: "Noticias enviadas por email correctamente"
        };
      } else {
        throw new Error(result.error || "Error en el envío");
      }

    } catch (error: any) {
      console.error("Error al enviar noticias por email:", error);
      return {
        success: false,
        message: error.message || "Error al enviar noticias por email"
      };
    }
  }
}
