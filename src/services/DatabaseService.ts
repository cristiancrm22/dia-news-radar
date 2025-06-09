import { supabase } from "@/integrations/supabase/client";
import { NewsSource, WhatsAppConfig, EmailConfig, SearchSettings } from "@/types/news";

export class DatabaseService {
  // Get current user ID
  private static async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuario no autenticado");
    }
    return user.id;
  }

  // Profile methods
  static async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }

  static async updateProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // News sources methods
  static async getUserSources(userId?: string): Promise<NewsSource[]> {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('user_news_sources')
      .select('*')
      .eq('user_id', currentUserId)
      .order('name');
    
    if (error) throw error;
    
    return data?.map(source => ({
      id: source.id,
      name: source.name,
      url: source.url,
      enabled: source.enabled
    })) || [];
  }

  static async updateUserSources(sources: NewsSource[], userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    // Delete existing sources
    await supabase
      .from('user_news_sources')
      .delete()
      .eq('user_id', currentUserId);
    
    // Insert new sources
    if (sources.length > 0) {
      const { error } = await supabase
        .from('user_news_sources')
        .insert(sources.map(source => ({
          user_id: currentUserId,
          name: source.name,
          url: source.url,
          enabled: source.enabled
        })));
      
      if (error) throw error;
    }
  }

  // Keywords methods
  static async getUserKeywords(userId?: string): Promise<string[]> {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('user_keywords')
      .select('keyword')
      .eq('user_id', currentUserId)
      .order('created_at');
    
    if (error) throw error;
    
    return data?.map(item => item.keyword) || [];
  }

  static async addUserKeyword(keyword: string, userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { error } = await supabase
      .from('user_keywords')
      .insert({
        user_id: currentUserId,
        keyword
      });
    
    if (error) throw error;
  }

  static async removeUserKeyword(keyword: string, userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { error } = await supabase
      .from('user_keywords')
      .delete()
      .eq('user_id', currentUserId)
      .eq('keyword', keyword);
    
    if (error) throw error;
  }

  static async updateUserKeywords(keywords: string[], userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    // Delete existing keywords
    await supabase
      .from('user_keywords')
      .delete()
      .eq('user_id', currentUserId);
    
    // Insert new keywords
    if (keywords.length > 0) {
      const { error } = await supabase
        .from('user_keywords')
        .insert(keywords.map(keyword => ({
          user_id: currentUserId,
          keyword
        })));
      
      if (error) throw error;
    }
  }

  // Twitter users methods
  static async getUserTwitterUsers(userId?: string): Promise<string[]> {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('user_twitter_users')
      .select('twitter_username')
      .eq('user_id', currentUserId)
      .order('created_at');
    
    if (error) throw error;
    
    return data?.map(item => item.twitter_username) || [];
  }

  static async updateUserTwitterUsers(usernames: string[], userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    // Delete existing Twitter users
    await supabase
      .from('user_twitter_users')
      .delete()
      .eq('user_id', currentUserId);
    
    // Insert new Twitter users
    if (usernames.length > 0) {
      const { error } = await supabase
        .from('user_twitter_users')
        .insert(usernames.map(username => ({
          user_id: currentUserId,
          twitter_username: username
        })));
      
      if (error) throw error;
    }
  }

  // Search settings methods
  static async getUserSearchSettings(userId?: string): Promise<SearchSettings> {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('user_search_settings')
      .select('*')
      .eq('user_id', currentUserId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Get keywords and twitter users separately
    const keywords = await this.getUserKeywords(currentUserId);
    const twitterUsers = await this.getUserTwitterUsers(currentUserId);
    
    return {
      maxResults: data?.max_results || 50,
      includeTwitter: data?.include_twitter ?? true,
      keywords: keywords,
      validateLinks: data?.validate_links ?? true,
      currentDateOnly: data?.current_date_only ?? true,
      searchHistory: [], // This could be stored separately if needed
      deepScrape: data?.deep_scrape ?? true,
      twitterUsers: twitterUsers,
      pythonScriptPath: data?.python_script_path || "python3",
      pythonExecutable: data?.python_executable || "python"
    };
  }

  static async upsertUserSearchSettings(settings: SearchSettings, userId: string): Promise<SearchSettings> {
    const { data, error } = await supabase
      .from('user_search_settings')
      .upsert({
        user_id: userId,
        max_results: settings.maxResults,
        include_twitter: settings.includeTwitter,
        validate_links: settings.validateLinks,
        current_date_only: settings.currentDateOnly,
        deep_scrape: settings.deepScrape,
        python_script_path: settings.pythonScriptPath,
        python_executable: settings.pythonExecutable,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user search settings:', error);
      throw error;
    }

    // Get keywords
    const keywords = await this.getUserKeywords(userId);
    
    // Get Twitter users
    const twitterUsers = await this.getUserTwitterUsers(userId);

    return {
      maxResults: data.max_results,
      includeTwitter: data.include_twitter,
      keywords: keywords,
      validateLinks: data.validate_links,
      currentDateOnly: data.current_date_only,
      searchHistory: [],
      deepScrape: data.deep_scrape,
      twitterUsers: twitterUsers,
      pythonScriptPath: data.python_script_path,
      pythonExecutable: data.python_executable
    };
  }

  static async updateUserSearchSettings(settings: SearchSettings, userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    // Update search settings
    const { error } = await supabase
      .from('user_search_settings')
      .upsert({
        user_id: currentUserId,
        max_results: settings.maxResults,
        include_twitter: settings.includeTwitter,
        validate_links: settings.validateLinks,
        current_date_only: settings.currentDateOnly,
        deep_scrape: settings.deepScrape,
        python_script_path: settings.pythonScriptPath,
        python_executable: settings.pythonExecutable
      });
    
    if (error) throw error;

    // Update keywords and Twitter users separately
    if (settings.keywords) {
      await this.updateUserKeywords(settings.keywords, currentUserId);
    }
    
    if (settings.twitterUsers) {
      await this.updateUserTwitterUsers(settings.twitterUsers, currentUserId);
    }
  }

  // WhatsApp config methods - REMOVED enabled validations
  static async getUserWhatsAppConfig(userId?: string): Promise<WhatsAppConfig> {
    const currentUserId = userId || await this.getCurrentUserId();
    
    if (!currentUserId) {
      console.log("No user ID, returning default WhatsApp config");
      return {
        phoneNumber: "",
        apiKey: "",
        connectionMethod: "official",
        evolutionApiUrl: ""
      };
    }

    console.log("Getting WhatsApp config for user:", currentUserId);

    try {
      const { data, error } = await supabase
        .from('user_whatsapp_configs')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching WhatsApp config:", error);
        throw error;
      }

      if (!data) {
        console.log("No WhatsApp config found, returning default");
        return {
          phoneNumber: "",
          apiKey: "",
          connectionMethod: "official",
          evolutionApiUrl: ""
        };
      }

      console.log("WhatsApp config data:", data);

      // Validate connection_method and provide fallback
      const connectionMethod = data.connection_method;
      const validConnectionMethods = ["official", "evolution", "businesscloud"] as const;
      const isValidConnectionMethod = validConnectionMethods.includes(connectionMethod as any);

      return {
        phoneNumber: data.phone_number || "",
        apiKey: data.api_key || "",
        connectionMethod: isValidConnectionMethod ? connectionMethod as "official" | "evolution" | "businesscloud" : "official",
        evolutionApiUrl: data.evolution_api_url || ""
      };
    } catch (error) {
      console.error("Error in getUserWhatsAppConfig:", error);
      return {
        phoneNumber: "",
        apiKey: "",
        connectionMethod: "official",
        evolutionApiUrl: ""
      };
    }
  }

  static async updateUserWhatsAppConfig(config: WhatsAppConfig, userId?: string): Promise<void> {
    const currentUserId = userId || await this.getCurrentUserId();
    
    if (!currentUserId) {
      throw new Error("Usuario no autenticado");
    }

    console.log("Updating WhatsApp config:", config);

    try {
      const { data, error } = await supabase
        .from('user_whatsapp_configs')
        .upsert({
          user_id: currentUserId,
          phone_number: config.phoneNumber || "",
          api_key: config.apiKey || "",
          connection_method: config.connectionMethod || "official",
          evolution_api_url: config.evolutionApiUrl || "",
          is_active: true, // Always active now
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error("Error updating WhatsApp config:", error);
        throw new Error(`Error al actualizar configuración de WhatsApp: ${error.message || error.details || 'Error desconocido'}`);
      }

      console.log("WhatsApp config updated successfully:", data);
    } catch (error) {
      console.error("Error in updateUserWhatsAppConfig:", error);
      throw error;
    }
  }

  // Email config methods
  static async getUserEmailConfig(userId?: string): Promise<EmailConfig> {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('user_email_configs')
      .select('*')
      .eq('user_id', currentUserId)
      .maybeSingle();
    
    if (error) throw error;
    
    // Get keywords for email config
    const keywords = await this.getUserKeywords(currentUserId);
    
    return {
      enabled: data?.is_active ?? false,
      email: data?.email_address || "",
      frequency: (data?.frequency as "daily" | "weekly") || "daily",
      time: data?.send_time || "08:00",
      keywords: keywords,
      lastSent: data?.last_sent || undefined,
      smtpHost: data?.smtp_host || "smtp.gmail.com",
      smtpPort: data?.smtp_port || 587,
      smtpUsername: data?.smtp_username || "",
      smtpPassword: data?.smtp_password || "",
      useTLS: data?.use_tls ?? true
    };
  }

  static async updateUserEmailConfig(config: EmailConfig, userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    console.log("Updating email config for user:", currentUserId, "with config:", config);
    
    // First, check if a config already exists
    const { data: existingConfig } = await supabase
      .from('user_email_configs')
      .select('id')
      .eq('user_id', currentUserId)
      .maybeSingle();
    
    const configData = {
      user_id: currentUserId,
      email_address: config.email,
      frequency: config.frequency,
      send_time: config.time,
      smtp_host: config.smtpHost,
      smtp_port: config.smtpPort,
      smtp_username: config.smtpUsername,
      smtp_password: config.smtpPassword,
      use_tls: config.useTLS,
      is_active: config.enabled
    };

    let result;
    if (existingConfig) {
      // Update existing config
      result = await supabase
        .from('user_email_configs')
        .update(configData)
        .eq('user_id', currentUserId);
    } else {
      // Insert new config
      result = await supabase
        .from('user_email_configs')
        .insert(configData);
    }
    
    if (result.error) {
      console.error("Error updating email config:", result.error);
      throw result.error;
    }

    // Update keywords if provided
    if (config.keywords) {
      await this.updateUserKeywords(config.keywords, currentUserId);
    }
  }

  // WhatsApp messages methods
  static async saveWhatsAppMessage(phoneNumber: string, message: string, direction: 'incoming' | 'outgoing', userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { error } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: currentUserId,
        phone_number: phoneNumber,
        message_text: message,
        direction: direction
      });
    
    if (error) throw error;
  }

  static async getWhatsAppMessages(phoneNumber?: string, userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    let query = supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });
    
    if (phoneNumber) {
      query = query.eq('phone_number', phoneNumber);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  // WhatsApp subscriptions methods
  static async getWhatsAppSubscriptions(userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('whatsapp_subscriptions')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async createWhatsAppSubscription(subscription: any, userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('whatsapp_subscriptions')
      .insert({
        user_id: currentUserId,
        phone_number: subscription.phoneNumber,
        frequency: subscription.frequency,
        scheduled_time: subscription.scheduledTime,
        weekdays: subscription.weekdays,
        is_active: subscription.isActive
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateWhatsAppSubscription(id: string, updates: any, userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('whatsapp_subscriptions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', currentUserId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteWhatsAppSubscription(id: string, userId?: string) {
    const currentUserId = userId || await this.getCurrentUserId();
    
    const { error } = await supabase
      .from('whatsapp_subscriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUserId);
    
    if (error) throw error;
  }
}
