
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppService } from './WhatsAppService';

export interface WhatsAppSubscription {
  id?: string;
  phoneNumber: string;
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
  phone_number: string;
  scheduled_time: string;
  is_active: boolean;
  frequency: 'daily' | 'weekly';
  weekdays: number[];
  created_at: string;
  last_sent?: string;
}

export class ScheduledWhatsAppService {
  
  static async addSubscription(subscription: Omit<WhatsAppSubscription, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string; subscription?: WhatsAppSubscription }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      console.log('Agregando suscripción:', subscription);

      // Verificar si ya existe una suscripción para este número usando RPC
      const { data: existing, error: existingError } = await supabase
        .rpc('check_existing_subscription', {
          p_user_id: user.id,
          p_phone_number: subscription.phoneNumber
        });

      if (existingError) {
        console.error('Error checking existing subscription:', existingError);
        return { success: false, error: existingError.message };
      }

      if (existing && existing.length > 0) {
        return { success: false, error: 'Ya existe una suscripción para este número' };
      }

      // Insertar nueva suscripción
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

      console.log('Suscripción agregada exitosamente:', data);

      const typedData = data as unknown as SubscriptionRow;
      
      return { 
        success: true, 
        subscription: {
          id: typedData.id,
          phoneNumber: typedData.phone_number,
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

  static async getSubscriptions(): Promise<{ success: boolean; subscriptions?: WhatsAppSubscription[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      console.log('Obteniendo suscripciones para usuario:', user.id);

      const { data, error } = await supabase
        .from('whatsapp_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting subscriptions:', error);
        return { success: false, error: error.message };
      }

      console.log('Suscripciones obtenidas:', data?.length || 0);

      const subscriptions = (data as unknown as SubscriptionRow[] || []).map((item: SubscriptionRow) => ({
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
      if (updates.lastSent !== undefined) updateData.last_sent = updates.lastSent;

      console.log('Actualizando suscripción:', id, updateData);

      const { error } = await supabase
        .from('whatsapp_subscriptions')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('Suscripción actualizada exitosamente');
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

      console.log('Eliminando suscripción:', id);

      const { error } = await supabase
        .from('whatsapp_subscriptions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('Suscripción eliminada exitosamente');
      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteSubscription:', error);
      return { success: false, error: error.message };
    }
  }

  // CORREGIDO: Método de envío inmediato que busca noticias nuevas
  static async sendNewsToSubscribers(): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
      console.log('=== ENVÍO INMEDIATO A SUSCRIPTORES ===');
      
      // Obtener configuración de WhatsApp
      const NewsService = (await import('./NewsService')).default;
      const config = await NewsService.getWhatsAppConfig();
      
      console.log('Configuración WhatsApp:', config);
      
      // Verificar que la configuración esté completa
      if (!config.evolutionApiUrl || config.evolutionApiUrl.trim() === '') {
        return { success: false, error: 'Evolution API URL no configurada. Configure WhatsApp primero.' };
      }

      // Obtener todas las suscripciones activas
      const subscriptionsResult = await this.getSubscriptions();
      if (!subscriptionsResult.success || !subscriptionsResult.subscriptions) {
        return { success: false, error: 'No se pudieron obtener las suscripciones' };
      }

      const activeSubscriptions = subscriptionsResult.subscriptions.filter(sub => sub.isActive);
      
      if (activeSubscriptions.length === 0) {
        return { success: false, error: 'No hay suscripciones activas' };
      }

      console.log(`Suscripciones activas encontradas: ${activeSubscriptions.length}`);

      // CORREGIDO: Para envío inmediato, obtener noticias usando el método normal (sin buscar nuevas)
      const todayNews = await this.getTodayNewsForImmediate();
      console.log(`Noticias obtenidas: ${todayNews.length}`);

      // Formatear mensaje
      let message: string;
      if (todayNews.length === 0) {
        message = "📰 *RESUMEN DE NOTICIAS*\n\n⚠️ No hay noticias disponibles en este momento.\n\n🤖 News Radar";
      } else {
        message = this.formatNewsForWhatsApp(todayNews);
      }

      let sent = 0;
      let errors: string[] = [];

      // Enviar a cada suscriptor
      for (const subscription of activeSubscriptions) {
        try {
          console.log(`Enviando a ${subscription.phoneNumber}...`);
          
          const result = await WhatsAppService.sendMessage(
            config,
            subscription.phoneNumber,
            message,
            (type, msg) => console.log(`${type}: ${msg}`)
          );

          if (result.success) {
            sent++;
            console.log(`✅ Enviado exitosamente a ${subscription.phoneNumber}`);
            // Actualizar última fecha de envío
            await this.updateSubscription(subscription.id!, { lastSent: new Date().toISOString() });
          } else {
            console.error(`❌ Error enviando a ${subscription.phoneNumber}: ${result.error}`);
            errors.push(`${subscription.phoneNumber}: ${result.error}`);
          }
        } catch (error: any) {
          console.error(`💥 Error procesando ${subscription.phoneNumber}:`, error);
          errors.push(`${subscription.phoneNumber}: ${error.message}`);
        }
      }

      console.log(`=== RESUMEN: ${sent} enviados, ${errors.length} errores ===`);

      return {
        success: sent > 0,
        results: {
          sent,
          total: activeSubscriptions.length,
          errors,
          totalNews: todayNews.length
        }
      };

    } catch (error: any) {
      console.error('Error in sendNewsToSubscribers:', error);
      return { success: false, error: error.message };
    }
  }

  // NUEVO: Método para obtener noticias para envío inmediato (sin buscar nuevas)
  private static async getTodayNewsForImmediate(): Promise<any[]> {
    try {
      console.log('Obteniendo noticias para envío inmediato...');
      
      // Primero intentar obtener noticias ya procesadas
      const response = await fetch("http://localhost:8000/api/news/today");
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Noticias obtenidas del cache: ${data.news?.length || 0}`);
        if (data.news && data.news.length > 0) {
          return data.news;
        }
      }
      
      // Si no hay noticias en cache, usar el servicio principal
      const NewsService = (await import('./NewsService')).default;
      const newsFromService = await NewsService.getNews();
      console.log(`Noticias del servicio principal: ${newsFromService.length}`);
      
      return newsFromService;
      
    } catch (error: any) {
      console.error(`Error obteniendo noticias: ${error.message}`);
      return [];
    }
  }

  // CORREGIDO: Formatear mensaje SIN el enlace del portal, solo el enlace específico de la noticia
  private static formatNewsForWhatsApp(news: any[]): string {
    let message = "📰 *RESUMEN DE NOTICIAS*\n";
    message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;
    
    // CORREGIDO: Enviar TODAS las noticias en lugar de limitar a 5
    news.forEach((item, index) => {
      message += `*${index + 1}.* ${item.title}\n`;
      if (item.summary) {
        message += `📝 ${item.summary.substring(0, 100)}...\n`;
      }
      // CORREGIDO: Solo incluir el link específico de la noticia (sin el enlace del portal)
      if (item.sourceUrl && item.sourceUrl !== "#" && item.sourceUrl !== "N/A") {
        message += `🔗 ${item.sourceUrl}\n`;
      }
      message += "\n";
    });
    
    message += "━━━━━━━━━━━━━━━━━━━━\n";
    message += `🤖 Enviado por News Radar (${news.length} noticias)`;
    
    return message;
  }
}
