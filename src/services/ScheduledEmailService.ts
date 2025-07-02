import { supabase } from '@/integrations/supabase/client';
import { EmailService } from './EmailService';
import NewsService from './NewsService';

export interface EmailSubscription {
  id?: string;
  email: string;
  scheduledTime: string;
  isActive: boolean;
  frequency: 'daily' | 'weekly';
  weekdays?: number[];
  createdAt?: string;
  lastSent?: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  email_address: string;
  scheduled_time: string;
  is_active: boolean;
  frequency: 'daily' | 'weekly';
  weekdays: number[];
  created_at: string;
  last_sent?: string;
}

export class ScheduledEmailService {
  
  static async addSubscription(subscription: Omit<EmailSubscription, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string; subscription?: EmailSubscription }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      console.log('Agregando suscripción de email:', subscription);

      const { data, error } = await supabase
        .from('email_subscriptions' as any)
        .insert({
          user_id: user.id,
          email_address: subscription.email,
          scheduled_time: subscription.scheduledTime,
          is_active: subscription.isActive,
          frequency: subscription.frequency,
          weekdays: subscription.weekdays || []
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding email subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('Suscripción de email agregada exitosamente:', data);

      const typedData = data as unknown as SubscriptionRow;
      
      return { 
        success: true, 
        subscription: {
          id: typedData.id,
          email: typedData.email_address,
          scheduledTime: typedData.scheduled_time,
          isActive: typedData.is_active,
          frequency: typedData.frequency,
          weekdays: typedData.weekdays,
          createdAt: typedData.created_at,
          lastSent: typedData.last_sent
        }
      };
    } catch (error: any) {
      console.error('Error in addSubscription:', error);
      return { success: false, error: error.message };
    }
  }

  static async getSubscriptions(): Promise<{ success: boolean; subscriptions?: EmailSubscription[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      console.log('Obteniendo suscripciones de email para usuario:', user.id);

      const { data, error } = await supabase
        .from('email_subscriptions' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting email subscriptions:', error);
        return { success: false, error: error.message };
      }

      console.log('Suscripciones de email obtenidas:', data?.length || 0);

      const subscriptions = (data as unknown as SubscriptionRow[] || []).map((item: SubscriptionRow) => ({
        id: item.id,
        email: item.email_address,
        scheduledTime: item.scheduled_time,
        isActive: item.is_active,
        frequency: item.frequency,
        weekdays: item.weekdays,
        createdAt: item.created_at,
        lastSent: item.last_sent
      }));

      return { success: true, subscriptions };
    } catch (error: any) {
      console.error('Error in getSubscriptions:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateSubscription(id: string, updates: Partial<EmailSubscription>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const updateData: any = {};
      if (updates.scheduledTime !== undefined) updateData.scheduled_time = updates.scheduledTime;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
      if (updates.weekdays !== undefined) updateData.weekdays = updates.weekdays;
      if (updates.lastSent !== undefined) updateData.last_sent = updates.lastSent;

      console.log('Actualizando suscripción de email:', id, updateData);

      const { error } = await supabase
        .from('email_subscriptions' as any)
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating email subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('Suscripción de email actualizada exitosamente');
      return { success: true };
    } catch (error: any) {
      console.error('Error in updateSubscription:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteSubscription(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      console.log('Eliminando suscripción de email:', id);

      const { error } = await supabase
        .from('email_subscriptions' as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting email subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('Suscripción de email eliminada exitosamente');
      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteSubscription:', error);
      return { success: false, error: error.message };
    }
  }

  // MEJORADO: Método de envío inmediato con validación completa
  static async sendNewsToSubscribers(): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
      console.log('=== ENVÍO INMEDIATO EMAILS CON VALIDACIÓN COMPLETA ===');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // **PASO 1: VERIFICAR CONFIGURACIÓN DE EMAIL**
      console.log('🔧 Verificando configuración de email...');
      const { data: emailConfig, error: configError } = await supabase
        .from('user_email_configs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (configError || !emailConfig) {
        console.error('❌ No se encontró configuración de email:', configError);
        return { success: false, error: 'Configuración de email no encontrada. Configure su email SMTP primero.' };
      }

      if (!emailConfig.smtp_host || !emailConfig.smtp_username || !emailConfig.smtp_password) {
        return { success: false, error: 'Configuración de email incompleta (falta SMTP host, usuario o contraseña)' };
      }

      console.log('✅ Configuración de email válida');

      // **PASO 2: VERIFICAR SUSCRIPCIONES ACTIVAS**
      const { data: subscriptions, error: subsError } = await supabase
        .from('email_subscriptions' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (subsError) {
        console.error('❌ Error obteniendo suscripciones:', subsError);
        return { success: false, error: `Error obteniendo suscripciones: ${subsError.message}` };
      }

      if (!subscriptions || subscriptions.length === 0) {
        return { success: false, error: 'No hay suscripciones de email activas configuradas' };
      }

      console.log(`📧 Suscripciones de email activas encontradas: ${subscriptions.length}`);

      // **PASO 3: LLAMAR A LA FUNCIÓN EDGE MEJORADA**
      console.log('📧 Enviando emails a través de función Edge mejorada...');
      
      const { data, error } = await supabase.functions.invoke('send-scheduled-news', {
        body: {
          type: 'email',
          scheduled: false, // Envío inmediato
          force: true // Forzar envío independientemente de horarios
        }
      });

      if (error) {
        console.error('❌ Error en función Edge:', error);
        return { success: false, error: `Error en función Edge: ${error.message}` };
      }

      console.log('✅ Resultado de función Edge:', data);
      
      // Verificar si el resultado indica éxito
      if (data && typeof data === 'object') {
        const results = data.results || {};
        return {
          success: data.success !== false, // Si no está definido o es true, consideramos éxito
          results: {
            sent: results.sent || 0,
            total: results.total || subscriptions.length,
            errors: results.errors || 0,
            errorDetails: results.errorDetails || [],
            newsCount: results.newsCount || 0,
            message: data.message || "Emails enviados con función Edge mejorada"
          }
        };
      }

      return {
        success: true,
        results: {
          sent: 0,
          total: subscriptions.length,
          errors: 0,
          newsCount: 0,
          message: "Procesado correctamente"
        }
      };

    } catch (error: any) {
      console.error('💥 Error crítico en sendNewsToSubscribers:', error);
      return { success: false, error: `Error crítico: ${error.message}` };
    }
  }

  // Obtener noticias disponibles con múltiples fuentes
  private static async getAvailableNewsForImmediate(): Promise<any[]> {
    try {
      console.log('Obteniendo noticias para envío inmediato de emails...');
      
      try {
        const response = await fetch("http://localhost:8000/api/news/today");
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Noticias obtenidas del cache: ${data.news?.length || 0}`);
          if (data.news && data.news.length > 0) {
            return data.news;
          }
        }
      } catch (localError) {
        console.log('Cache local no disponible, intentando otras fuentes...');
      }
      
      try {
        const newsFromService = await NewsService.getNews();
        console.log(`Noticias del servicio principal: ${newsFromService.length}`);
        
        if (newsFromService.length > 0) {
          return newsFromService;
        }
      } catch (serviceError) {
        console.log('Servicio principal no disponible...');
      }
      
      console.log('No hay noticias disponibles de ninguna fuente');
      return [];
      
    } catch (error: any) {
      console.error(`Error obteniendo noticias: ${error.message}`);
      return [];
    }
  }

  // Formatear HTML para email con noticias
  private static formatNewsEmailHTML(news: any[]): string {
    const date = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Resumen de noticias - News Radar</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 20px; }
            .news-item { margin-bottom: 20px; padding: 15px; border-left: 4px solid #2563eb; background: #f8fafc; border-radius: 4px; }
            .news-title { font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #1e40af; }
            .news-summary { margin-bottom: 10px; color: #4b5563; }
            .news-source { font-size: 12px; color: #6b7280; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
            .link { color: #2563eb; text-decoration: none; }
            .link:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📰 Resumen de Noticias</h1>
              <p>${date}</p>
            </div>
            <div class="content">
              <p>Aquí tienes tu resumen diario de las noticias más relevantes:</p>
    `;

    news.slice(0, 10).forEach((item, index) => {
      html += `
        <div class="news-item">
          <div class="news-title">${index + 1}. ${item.title}</div>
          <div class="news-summary">${item.summary || item.description || 'Sin resumen disponible'}</div>
          <div class="news-source">
            Fuente: ${item.sourceName || 'Desconocida'} | 
            ${item.date ? new Date(item.date).toLocaleDateString('es-ES') : 'Sin fecha'}
            ${item.sourceUrl && item.sourceUrl !== "#" && item.sourceUrl !== "N/A" ? ` | <a href="${item.sourceUrl}" target="_blank" class="link">Leer más</a>` : ''}
          </div>
        </div>
      `;
    });

    html += `
            </div>
            <div class="footer">
              <p>Este correo fue enviado automáticamente por News Radar</p>
              <p>Total de noticias: ${news.length}</p>
              <p>Si no deseas recibir más correos, desactiva tu suscripción en la configuración</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return html;
  }

  // Formatear HTML para email sin noticias
  private static formatNoNewsEmailHTML(): string {
    const date = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Sin noticias hoy - News Radar</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden; }
            .header { background: #6b7280; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 20px; text-align: center; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📰 News Radar</h1>
              <p>${date}</p>
            </div>
            <div class="content">
              <h2>⚠️ No hay noticias disponibles</h2>
              <p>No se encontraron noticias nuevas para el día de hoy.</p>
              <p>Volveremos a buscar y enviar cuando tengamos nuevas noticias disponibles.</p>
            </div>
            <div class="footer">
              <p>Este correo fue enviado automáticamente por News Radar</p>
              <p>Si no deseas recibir más correos, desactiva tu suscripción en la configuración</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Método para obtener logs automáticos
  static async getAutomatedLogs(): Promise<{ success: boolean; logs?: any[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      console.log('Obteniendo logs automáticos de email para usuario:', user.id);

      const { data, error } = await supabase
        .from('email_automated_logs' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error getting email automated logs:', error);
        return { success: false, error: error.message };
      }

      console.log('Logs automáticos de email obtenidos:', data?.length || 0);

      return { success: true, logs: data || [] };
    } catch (error: any) {
      console.error('Error in getAutomatedLogs:', error);
      return { success: false, error: error.message };
    }
  }
}
