import { DatabaseService } from './DatabaseService';
import { WhatsAppService } from './WhatsAppService';
import NewsService from './NewsService';

export class ScheduledWhatsAppService {
  static async sendScheduledWhatsAppMessages() {
    try {
      const users = await DatabaseService.getAllUsers();

      for (const user of users) {
        if (user.emailConfig?.enabled && user.emailConfig?.frequency === 'daily') {
          const phoneNumbers = [user.phone]; // Array of phone numbers
          console.log(`Enviando WhatsApp programado a ${phoneNumbers.length} números para el usuario ${user.id}`);

          // Obtener la configuración de WhatsApp para el usuario
          const whatsAppConfig = await this.getWhatsAppConfigForUser(user.id);

          if (!whatsAppConfig) {
            console.warn(`No se encontró configuración de WhatsApp para el usuario ${user.id}. Omitiendo.`);
            continue;
          }

          // Obtener las noticias diarias
          const todayNews = await NewsService.getNews();

          // Formatear las noticias para WhatsApp
          let newsMessage: string;
          if (todayNews.length === 0) {
            newsMessage = "📰 *RESUMEN DIARIO*\n\n⚠️ No hay noticias disponibles.\n\n🤖 News Radar";
          } else {
            newsMessage = this.formatNewsForWhatsApp(todayNews);
          }

          // Enviar el mensaje de WhatsApp a cada número
          for (const phoneNumber of phoneNumbers) {
            try {
              console.log(`Enviando WhatsApp a ${phoneNumber} para el usuario ${user.id}`);
              const result = await WhatsAppService.sendMessage(whatsAppConfig, phoneNumber, newsMessage);

              if (result.success) {
                console.log(`✅ WhatsApp enviado a ${phoneNumber} para el usuario ${user.id}`);
              } else {
                console.error(`❌ Falló el envío de WhatsApp a ${phoneNumber} para el usuario ${user.id}: ${result.error}`);
              }
            } catch (error: any) {
              console.error(`💥 Error al enviar WhatsApp a ${phoneNumber} para el usuario ${user.id}: ${error.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al enviar mensajes programados de WhatsApp:', error);
    }
  }

  static async getWhatsAppConfigForUser(userId: string) {
    try {
      const config = await DatabaseService.getUserWhatsAppConfig(userId);
      
      return {
        phoneNumber: config.phoneNumber || '',
        apiKey: config.apiKey || '',
        connectionMethod: config.connectionMethod || 'official',
        evolutionApiUrl: config.evolutionApiUrl || ''
      };
    } catch (error) {
      console.error('Error getting WhatsApp config for user:', userId, error);
      return null;
    }
  }

  private static formatNewsForWhatsApp(news: any[]): string {
    let message = "📰 *RESUMEN DIARIO DE NOTICIAS*\n";
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
    message += "🤖 News Radar";
    
    return message;
  }
}
