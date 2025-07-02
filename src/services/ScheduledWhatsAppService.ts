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

  // MEJORADO: Método de envío inmediato con validación completa
  static async sendNewsToSubscribers(): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
      console.log('=== ENVÍO INMEDIATO WHATSAPP CON VALIDACIÓN COMPLETA ===');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // **PASO 1: VERIFICAR CONFIGURACIÓN DE WHATSAPP**
      console.log('🔧 Verificando configuración de WhatsApp...');
      const { data: whatsappConfig, error: configError } = await supabase
        .from('user_whatsapp_configs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (configError || !whatsappConfig) {
        console.error('❌ No se encontró configuración de WhatsApp:', configError);
        return { success: false, error: 'Configuración de WhatsApp no encontrada. Configure su WhatsApp primero.' };
      }

      if (!whatsappConfig.evolution_api_url) {
        return { success: false, error: 'URL de Evolution API no configurada' };
      }

      console.log('✅ Configuración de WhatsApp válida');

      // **PASO 2: VERIFICAR SUSCRIPCIONES ACTIVAS**
      const { data: subscriptions, error: subsError } = await supabase
        .from('whatsapp_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (subsError) {
        console.error('❌ Error obteniendo suscripciones:', subsError);
        return { success: false, error: `Error obteniendo suscripciones: ${subsError.message}` };
      }

      if (!subscriptions || subscriptions.length === 0) {
        return { success: false, error: 'No hay suscripciones activas configuradas' };
      }

      console.log(`📱 Suscripciones activas encontradas: ${subscriptions.length}`);

      // **PASO 3: LLAMAR A LA FUNCIÓN EDGE MEJORADA**
      console.log('📤 Enviando a través de función Edge mejorada...');
      
      const { data, error } = await supabase.functions.invoke('send-scheduled-news', {
        body: {
          type: 'whatsapp',
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
            message: data.message || "Enviado con función Edge mejorada"
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
