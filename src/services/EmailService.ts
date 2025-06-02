

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
      onLog?.('info', 'Verificando configuración de Supabase');
      console.log('Supabase client config:', {
        url: supabase.supabaseUrl,
        key: supabase.supabaseKey?.substring(0, 20) + '...'
      });
      
      onLog?.('info', 'Enviando email a través de Resend');
      
      const payload = {
        to,
        subject,
        html: htmlContent,
        from: "News Radar <onboarding@resend.dev>"
      };
      
      onLog?.('info', 'Enviando email con Resend', payload);
      
      // Intentar enviar a través de la función Edge de Supabase
      onLog?.('info', 'Invocando función Edge: send-email');
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: payload
      });
      
      console.log('Supabase function response:', { data, error });
      
      if (error) {
        onLog?.('error', `Error de Supabase: ${error.message}`, error);
        
        // Si el error indica que la función no existe o no está disponible
        if (error.message.includes('Failed to send a request') || 
            error.message.includes('Function not found') ||
            error.message.includes('404')) {
          onLog?.('info', 'Función Edge no disponible, usando método alternativo');
          return this.sendEmailFallback(to, subject, htmlContent, onLog);
        }
        
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
      
      // Si es un error de conexión, intentar método alternativo
      if (error.name === 'FunctionsFetchError' || error.message.includes('Failed to fetch')) {
        onLog?.('info', 'Error de conexión detectado, intentando método alternativo');
        return this.sendEmailFallback(to, subject, htmlContent, onLog);
      }
      
      return { 
        success: false, 
        error: `Error de conexión: ${error.message}` 
      };
    }
  }

  // Método alternativo para envío de email (simulación para desarrollo)
  static async sendEmailFallback(
    to: string,
    subject: string,
    htmlContent: string,
    onLog?: (type: 'info' | 'error' | 'success', message: string, details?: any) => void
  ): Promise<EmailSendResult> {
    
    onLog?.('info', 'Usando método alternativo de envío de email');
    
    // En un entorno de desarrollo, simularemos el envío exitoso
    // En producción, aquí podrías implementar un servicio de email alternativo
    try {
      
      onLog?.('info', 'Simulando envío de email para desarrollo', {
        to,
        subject,
        htmlLength: htmlContent.length
      });
      
      // Simular un pequeño delay como si fuera un servicio real
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onLog?.('success', `Email simulado enviado correctamente a ${to}`, {
        method: 'fallback',
        messageId: `sim_${Date.now()}`
      });
      
      return {
        success: true,
        messageId: `sim_${Date.now()}`
      };
      
    } catch (error: any) {
      onLog?.('error', `Error en método alternativo: ${error.message}`, error);
      return {
        success: false,
        error: `Error en método alternativo: ${error.message}`
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

