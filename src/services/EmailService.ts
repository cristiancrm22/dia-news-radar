
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
      console.log("Enviando email de prueba con datos:", emailData);

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

      // Llamar a la función edge de Resend
      const { data, error } = await supabase.functions.invoke('send-email-resend', {
        body: {
          to: emailData.to,
          subject: emailData.subject || "Prueba de Email - News Radar",
          html: htmlContent,
          from: "News Radar <noreply@resend.dev>"
        }
      });

      console.log("Respuesta de la función edge:", { data, error });

      if (error) {
        console.error("Error en la función edge:", error);
        return {
          success: false,
          message: "Error al enviar email",
          error: error.message || "Error desconocido"
        };
      }

      if (data && data.success) {
        console.log("Email enviado exitosamente:", data);
        return {
          success: true,
          message: data.message || "Email enviado correctamente"
        };
      } else {
        console.error("Error en la respuesta:", data);
        return {
          success: false,
          message: "Error al enviar email",
          error: data?.error || "Respuesta inesperada del servidor"
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

      const { data, error } = await supabase.functions.invoke('send-email-resend', {
        body: {
          to: emailConfig.email,
          subject: `Noticias del día - ${new Date().toLocaleDateString('es-ES')}`,
          html: htmlContent,
          from: "News Radar <noticias@resend.dev>"
        }
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: "Noticias enviadas por email correctamente"
      };

    } catch (error: any) {
      console.error("Error al enviar noticias por email:", error);
      return {
        success: false,
        message: error.message || "Error al enviar noticias por email"
      };
    }
  }
}
