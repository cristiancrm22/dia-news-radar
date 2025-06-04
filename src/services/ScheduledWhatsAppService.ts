
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppService } from './WhatsAppService';
import NewsService from './NewsService';

export interface WhatsAppSubscription {
  id?: string;
  phoneNumber: string;
  scheduledTime: string;
  isActive: boolean;
  frequency: 'daily' | 'weekly';
  weekdays?: number[]; // Para frecuencia semanal: 0=domingo, 1=lunes, etc.
  createdAt?: string;
  lastSent?: string;
}

export class ScheduledWhatsAppService {
  
  static async addSubscription(subscription: Omit<WhatsAppSubscription, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string; subscription?: WhatsAppSubscription }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // Verificar si ya existe una suscripción para este número
      const { data: existing } = await supabase
        .from('whatsapp_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone_number', subscription.phoneNumber)
        .single();

      if (existing) {
        return { success: false, error: 'Ya existe una suscripción para este número' };
      }

      const { data, error } = await supabase
        .from('whatsapp_subscriptions')
        .insert({
          user_id: user.id,
          phone_number: subscription.phoneNumber,
          scheduled_time: subscription.scheduledTime,
          is_active: subscription.isActive,
          frequency: subscription.frequency,
          weekdays: subscription.weekdays || []
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding subscription:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        subscription: {
          id: data.id,
          phoneNumber: data.phone_number,
          scheduledTime: data.scheduled_time,
          isActive: data.is_active,
          frequency: data.frequency,
          weekdays: data.weekdays,
          createdAt: data.created_at,
          lastSent: data.last_sent
        }
      };
    } catch (error: any) {
      console.error('Error in addSubscription:', error);
      return { success: false, error: error.message };
    }
  }

  static async getSubscriptions(): Promise<{ success: boolean; subscriptions?: WhatsAppSubscription[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const { data, error } = await supabase
        .from('whatsapp_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting subscriptions:', error);
        return { success: false, error: error.message };
      }

      const subscriptions = data.map(item => ({
        id: item.id,
        phoneNumber: item.phone_number,
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

  static async updateSubscription(id: string, updates: Partial<WhatsAppSubscription>): Promise<{ success: boolean; error?: string }> {
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

      const { error } = await supabase
        .from('whatsapp_subscriptions')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating subscription:', error);
        return { success: false, error: error.message };
      }

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

      const { error } = await supabase
        .from('whatsapp_subscriptions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting subscription:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteSubscription:', error);
      return { success: false, error: error.message };
    }
  }

  static async processScheduledMessages(): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
      console.log('=== PROCESANDO MENSAJES PROGRAMADOS ===');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // Obtener todas las suscripciones activas
      const { data: subscriptions, error } = await supabase
        .from('whatsapp_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error getting active subscriptions:', error);
        return { success: false, error: error.message };
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No hay suscripciones activas');
        return { success: true, results: { message: 'No hay suscripciones activas' } };
      }

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      const currentDay = now.getDay(); // 0=domingo, 1=lunes, etc.

      console.log(`Hora actual: ${currentTime}, Día: ${currentDay}`);

      const results = {
        sent: 0,
        skipped: 0,
        errors: [] as string[]
      };

      for (const subscription of subscriptions) {
        try {
          console.log(`Procesando suscripción ${subscription.id} - ${subscription.phone_number}`);
          
          // Verificar si es el momento de enviar
          const shouldSend = this.shouldSendMessage(subscription, currentTime, currentDay);
          
          if (!shouldSend) {
            console.log(`Saltando suscripción ${subscription.id} - no es el momento`);
            results.skipped++;
            continue;
          }

          // Obtener configuración de WhatsApp
          const whatsappConfig = await NewsService.getWhatsAppConfig();
          if (!whatsappConfig.enabled) {
            console.log('WhatsApp no está habilitado');
            results.errors.push('WhatsApp no habilitado');
            continue;
          }

          // Obtener noticias
          const todayNews = await NewsService.getNews();
          console.log(`Noticias obtenidas: ${todayNews.length}`);

          let newsMessage: string;
          if (todayNews.length === 0) {
            newsMessage = "📰 *RESUMEN PROGRAMADO*\n\n⚠️ No hay noticias disponibles en este momento.\n\n🤖 News Radar";
          } else {
            newsMessage = this.formatNewsForWhatsApp(todayNews);
          }

          // Enviar mensaje
          const result = await WhatsAppService.sendMessage(
            whatsappConfig,
            subscription.phone_number,
            newsMessage
          );

          if (result.success) {
            // Actualizar última fecha de envío
            await supabase
              .from('whatsapp_subscriptions')
              .update({ last_sent: now.toISOString() })
              .eq('id', subscription.id);

            results.sent++;
            console.log(`✅ Mensaje enviado a ${subscription.phone_number}`);
          } else {
            results.errors.push(`${subscription.phone_number}: ${result.error}`);
            console.error(`❌ Error enviando a ${subscription.phone_number}: ${result.error}`);
          }

        } catch (error: any) {
          results.errors.push(`${subscription.phone_number}: ${error.message}`);
          console.error(`💥 Error procesando ${subscription.phone_number}:`, error);
        }
      }

      console.log(`=== RESUMEN: ${results.sent} enviados, ${results.skipped} saltados, ${results.errors.length} errores ===`);
      
      return { 
        success: true,
        results: {
          sent: results.sent,
          skipped: results.skipped,
          errors: results.errors,
          totalSubscriptions: subscriptions.length
        }
      };

    } catch (error: any) {
      console.error('Error in processScheduledMessages:', error);
      return { success: false, error: error.message };
    }
  }

  private static shouldSendMessage(subscription: any, currentTime: string, currentDay: number): boolean {
    // Verificar hora
    if (subscription.scheduled_time !== currentTime) {
      return false;
    }

    // Para frecuencia diaria, enviar todos los días
    if (subscription.frequency === 'daily') {
      return true;
    }

    // Para frecuencia semanal, verificar días de la semana
    if (subscription.frequency === 'weekly') {
      const weekdays = subscription.weekdays || [];
      return weekdays.includes(currentDay);
    }

    return false;
  }

  private static formatNewsForWhatsApp(news: any[]): string {
    let message = "📰 *RESUMEN PROGRAMADO DE NOTICIAS*\n";
    message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
    
    news.slice(0, 5).forEach((item, index) => {
      message += `*${index + 1}.* ${item.title}\n`;
      if (item.summary) {
        message += `📝 ${item.summary.substring(0, 100)}...\n`;
      }
      message += `📰 ${item.sourceName || 'Fuente desconocida'}\n`;
      if (item.sourceUrl) {
        message += `🔗 ${item.sourceUrl}\n`;
      }
      message += "\n";
    });
    
    message += "━━━━━━━━━━━━━━━━━━━━\n";
    message += "🤖 Enviado automáticamente por News Radar";
    
    return message;
  }
}
