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

      // Permitimos múltiples suscripciones para el mismo número con diferentes horarios/configuraciones
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

  // MEJORADO: Método de envío inmediato con actualización automática de noticias
  static async sendNewsToSubscribers(): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
      console.log('=== ENVÍO INMEDIATO CON ACTUALIZACIÓN AUTOMÁTICA ===');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // **PASO 1: ACTUALIZAR NOTICIAS AUTOMÁTICAMENTE**
      console.log('🔄 Actualizando noticias antes del envío...');
      try {
        const updateResponse = await fetch("http://localhost:8000/api/news/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (updateResponse.ok) {
          const updateResult = await updateResponse.json();
          console.log(`✅ Noticias actualizadas: ${updateResult.total || 0} noticias`);
        } else {
          console.log('⚠️ No se pudieron actualizar las noticias, usando noticias existentes');
        }
      } catch (updateError) {
        console.log('⚠️ Error actualizando noticias, usando noticias existentes:', updateError);
      }

      // **PASO 2: USAR LA FUNCIÓN EDGE MEJORADA**
      console.log('📤 Enviando a través de función Edge con noticias actualizadas...');
      
      const { data, error } = await supabase.functions.invoke('send-scheduled-news', {
        body: {
          type: 'whatsapp',
          scheduled: false, // Envío inmediato
          force: true // Forzar envío
        }
      });

      if (error) {
        console.error('❌ Error en función Edge:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Resultado de función Edge:', data);
      
      return {
        success: true,
        results: data.results || {
          sent: 0,
          total: 0,
          errors: [],
          newsCount: 0,
          message: "Enviado con actualización automática de noticias"
        }
      };

    } catch (error: any) {
      console.error('Error in sendNewsToSubscribers:', error);
      return { success: false, error: error.message };
    }
  }

  // NUEVO: Método para obtener logs automáticos
  static async getAutomatedLogs(): Promise<{ success: boolean; logs?: any[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      console.log('Obteniendo logs automáticos para usuario:', user.id);

      const { data, error } = await supabase
        .from('whatsapp_automated_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error getting automated logs:', error);
        return { success: false, error: error.message };
      }

      console.log('Logs automáticos obtenidos:', data?.length || 0);

      return { success: true, logs: data || [] };
    } catch (error: any) {
      console.error('Error in getAutomatedLogs:', error);
      return { success: false, error: error.message };
    }
  }
}
