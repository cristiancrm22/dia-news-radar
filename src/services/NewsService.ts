import { NewsItem, NewsSource, WhatsAppConfig, EmailConfig, SearchSettings, PythonScriptExecutionStatus } from "@/types/news";
import PythonNewsAdapter, { 
  fetchNewsFromPythonScript, 
  downloadNewsCSV, 
  executePythonScript, 
  getPythonExecutionStatus, 
  loadResultsFromCsv 
} from './PythonNewsAdapter';
import { DatabaseService } from './DatabaseService';
import { toast } from "sonner";
import { EmailService } from './EmailService';
import { supabase } from "@/integrations/supabase/client";

// Configuration - REAL MODE ONLY
const USE_MOCK_DATA = false;
const USE_PYTHON_SCRAPER = true;
const FALLBACK_TO_MOCK = false; // DISABLED: No fallback to demo data

// Default sources (used as fallback when not authenticated)
const defaultSources: NewsSource[] = [
  { id: "1", name: "Clarín", url: "https://www.clarin.com", enabled: true },
  { id: "2", name: "La Nación", url: "https://www.lanacion.com.ar", enabled: true },
  { id: "3", name: "Página 12", url: "https://www.pagina12.com.ar", enabled: true },
  { id: "4", name: "Infobae", url: "https://www.infobae.com", enabled: true },
  { id: "5", name: "Ámbito", url: "https://www.ambito.com", enabled: true },
  { id: "6", name: "El Cronista", url: "https://www.cronista.com", enabled: true },
  { id: "7", name: "Perfil", url: "https://www.perfil.com", enabled: true },
  { id: "8", name: "El Día", url: "https://www.eldia.com.ar", enabled: true },
  { id: "9", name: "Hoy", url: "https://diariohoy.net", enabled: true },
  { id: "10", name: "La Tecla", url: "https://www.latecla.info", enabled: true },
  { id: "11", name: "Infocielo", url: "https://infocielo.com", enabled: true },
  { id: "12", name: "La Nueva", url: "https://www.lanueva.com", enabled: true },
  { id: "13", name: "Bahía Noticias", url: "https://www.bahianoticias.com", enabled: true },
  { id: "14", name: "Diputados BA", url: "https://diputadosbsas.com.ar", enabled: true }
];

// Default Twitter users
const defaultTwitterUsers: string[] = [
  "Senado_BA",
  "VeronicaMagario",
  "BAProvincia",
  "DiputadosBA"
];

// Default WhatsApp config
const defaultWhatsAppConfig: WhatsAppConfig = {
  enabled: false,
  phoneNumber: "",
  apiKey: "",
  connectionMethod: "official",
  evolutionApiUrl: ""
};

// Default email config
const defaultEmailConfig: EmailConfig = {
  enabled: false,
  email: "",
  frequency: "daily",
  time: "08:00",
  keywords: [],
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUsername: "",
  smtpPassword: "",
  useTLS: true
};

// Default search settings
const defaultSearchSettings: SearchSettings = {
  maxResults: 50,
  includeTwitter: true,
  keywords: ["Magario", "Kicillof", "Espinosa", "Milei"],
  validateLinks: true,
  currentDateOnly: true,
  searchHistory: [],
  deepScrape: true,
  twitterUsers: defaultTwitterUsers,
  pythonScriptPath: "python3",
  pythonExecutable: "python"
};

// LocalStorage keys (fallback when not authenticated)
const SOURCES_KEY = 'news_radar_sources';
const WHATSAPP_CONFIG_KEY = 'news_radar_whatsapp_config';
const EMAIL_CONFIG_KEY = 'news_radar_email_config';
const SEARCH_SETTINGS_KEY = 'news_radar_search_settings';
const TWITTER_USERS_KEY = 'news_radar_twitter_users';

class NewsService {
  private static currentUserId: string | null = null;
  private static user: any = null;

  static setUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  static setUser(user: any) {
    this.user = user;
  }

  /**
   * Get news using Python script execution - REAL MODE ONLY
   */
  static async getNews(): Promise<NewsItem[]> {
    const settings = await this.getSearchSettings();
    const enabledSources = await this.getSources().then(sources => sources.filter(source => source.enabled));
    
    // If no sources are enabled, show error
    if (enabledSources.length === 0) {
      throw new Error("No hay fuentes habilitadas. Por favor habilite al menos una fuente en la configuración.");
    }
    
    // If no keywords are configured, show warning
    if (!settings.keywords || settings.keywords.length === 0) {
      console.warn("No hay palabras clave configuradas. Se buscarán todas las noticias.");
    }
    
    const sourceUrls = enabledSources.map(source => source.url);
    
    console.log("Getting REAL news with settings:", {
      keywords: settings.keywords,
      sources: enabledSources.map(s => s.name),
      includeTwitter: settings.includeTwitter,
      maxResults: settings.maxResults,
      validateLinks: settings.validateLinks,
      currentDateOnly: settings.currentDateOnly
    });
    
    const scriptStatus = await executePythonScript({
      keywords: settings.keywords || [],
      sources: sourceUrls,
      includeTwitter: settings.includeTwitter,
      maxResults: settings.maxResults,
      validateLinks: settings.validateLinks,
      currentDateOnly: settings.currentDateOnly,
      deepScrape: settings.deepScrape,
      twitterUsers: settings.twitterUsers,
      pythonExecutable: settings.pythonExecutable
    });
    
    if (scriptStatus.completed && !scriptStatus.error && scriptStatus.csvPath) {
      const results = await loadResultsFromCsv(scriptStatus.csvPath);
      console.log("Loaded REAL results from CSV:", results.length, "news items");
      
      // Return ALL results, don't filter by keywords here since Python already did the filtering
      console.log("Returning all Python results without additional filtering:", results.length, "news items");
      return results;
    } else if (scriptStatus.error) {
      throw new Error(`Error ejecutando script: ${scriptStatus.error}`);
    } else {
      throw new Error("Script no completado correctamente");
    }
  }

  /**
   * Get Python script execution status
   */
  static getPythonScriptStatus(): PythonScriptExecutionStatus {
    return getPythonExecutionStatus();
  }

  /**
   * Load results from CSV file
   */
  static loadResultsFromCsv(csvPath?: string): Promise<NewsItem[]> {
    return loadResultsFromCsv(csvPath);
  }

  /**
   * Export current news results as CSV and trigger download
   */
  static downloadNewsAsCSV(news: NewsItem[]): void {
    try {
      downloadNewsCSV(news, "resultados.csv");
    } catch (error) {
      console.error("Error downloading CSV:", error);
    }
  }

  // Get sources from database or localStorage
  static async getSources(): Promise<NewsSource[]> {
    try {
      if (this.currentUserId) {
        return await DatabaseService.getUserSources(this.currentUserId);
      } else {
        const savedSources = localStorage.getItem(SOURCES_KEY);
        return savedSources ? JSON.parse(savedSources) : defaultSources;
      }
    } catch (error) {
      console.error("Error loading sources:", error);
      return defaultSources;
    }
  }

  // Update sources in database or localStorage
  static async updateSources(sources: NewsSource[]): Promise<void> {
    try {
      if (this.currentUserId) {
        await DatabaseService.updateUserSources(sources, this.currentUserId);
      } else {
        localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
      }
    } catch (error) {
      console.error("Error updating sources:", error);
      throw error;
    }
  }

  // Get Twitter users from database or localStorage
  static async getTwitterUsers(): Promise<string[]> {
    try {
      if (this.currentUserId) {
        return await DatabaseService.getUserTwitterUsers(this.currentUserId);
      } else {
        const savedUsers = localStorage.getItem(TWITTER_USERS_KEY);
        return savedUsers ? JSON.parse(savedUsers) : defaultTwitterUsers;
      }
    } catch (error) {
      console.error("Error loading Twitter users:", error);
      return defaultTwitterUsers;
    }
  }

  // Update Twitter users in database or localStorage
  static async updateTwitterUsers(users: string[]): Promise<void> {
    try {
      if (this.currentUserId) {
        await DatabaseService.updateUserTwitterUsers(users, this.currentUserId);
      } else {
        localStorage.setItem(TWITTER_USERS_KEY, JSON.stringify(users));
      }
      
      // Also update in search settings
      const currentSettings = await this.getSearchSettings();
      await this.updateSearchSettings({
        ...currentSettings,
        twitterUsers: users
      });
    } catch (error) {
      console.error("Error updating Twitter users:", error);
      throw error;
    }
  }

  // Get WhatsApp config from database or localStorage
  static async getWhatsAppConfig(userId?: string): Promise<WhatsAppConfig> {
    try {
      return await DatabaseService.getUserWhatsAppConfig(userId);
    } catch (error) {
      console.error("Error getting WhatsApp config:", error);
      return {
        enabled: false,
        phoneNumber: "",
        apiKey: "",
        connectionMethod: "official",
        evolutionApiUrl: ""
      };
    }
  }

  // Update WhatsApp config in database or localStorage
  static async updateWhatsAppConfig(config: WhatsAppConfig, userId?: string): Promise<void> {
    try {
      await DatabaseService.updateUserWhatsAppConfig(config, userId);
    } catch (error) {
      console.error("Error updating WhatsApp config:", error);
      throw error;
    }
  }

  // Get Email config from database or localStorage
  static async getEmailConfig(): Promise<EmailConfig> {
    try {
      if (this.currentUserId) {
        const dbConfig = await DatabaseService.getUserEmailConfig(this.currentUserId);
        // Merge with local storage for SMTP settings since they're not in DB yet
        const savedConfig = localStorage.getItem(EMAIL_CONFIG_KEY);
        const localConfig = savedConfig ? JSON.parse(savedConfig) : {};
        
        return {
          ...defaultEmailConfig,
          ...localConfig,
          ...dbConfig
        };
      } else {
        const savedConfig = localStorage.getItem(EMAIL_CONFIG_KEY);
        return savedConfig ? { ...defaultEmailConfig, ...JSON.parse(savedConfig) } : defaultEmailConfig;
      }
    } catch (error) {
      console.error("Error loading email config:", error);
      return defaultEmailConfig;
    }
  }

  // Update Email config in database or localStorage
  static async updateEmailConfig(config: EmailConfig): Promise<void> {
    try {
      if (this.currentUserId) {
        // Save basic config to database
        await DatabaseService.updateUserEmailConfig(config, this.currentUserId);
        // Save SMTP settings to localStorage (for now, until we add them to DB)
        localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(config));
      } else {
        localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(config));
      }
    } catch (error) {
      console.error("Error updating email config:", error);
      throw error;
    }
  }

  // Get search settings from database or localStorage
  static async getSearchSettings(): Promise<SearchSettings> {
    try {
      if (this.currentUserId) {
        const dbSettings = await DatabaseService.getUserSearchSettings(this.currentUserId);
        // Ensure we have all required fields with proper defaults
        return {
          ...defaultSearchSettings,
          ...dbSettings,
          twitterUsers: dbSettings.twitterUsers || defaultTwitterUsers,
          pythonScriptPath: dbSettings.pythonScriptPath || defaultSearchSettings.pythonScriptPath,
          pythonExecutable: dbSettings.pythonExecutable || defaultSearchSettings.pythonExecutable
        };
      } else {
        const savedSettings = localStorage.getItem(SEARCH_SETTINGS_KEY);
        const settings = savedSettings ? JSON.parse(savedSettings) : defaultSearchSettings;
        
        // Ensure backwards compatibility
        if (!settings.twitterUsers) {
          settings.twitterUsers = defaultTwitterUsers;
        }
        if (!settings.pythonScriptPath) {
          settings.pythonScriptPath = defaultSearchSettings.pythonScriptPath;
        }
        if (!settings.pythonExecutable) {
          settings.pythonExecutable = defaultSearchSettings.pythonExecutable;
        }
        
        return settings;
      }
    } catch (error) {
      console.error("Error loading search settings:", error);
      return defaultSearchSettings;
    }
  }

  // Update search settings in database or localStorage
  static async updateSearchSettings(settings: SearchSettings): Promise<void> {
    try {
      if (this.currentUserId) {
        // Use UPSERT approach to avoid duplicate key errors
        await DatabaseService.upsertUserSearchSettings(settings, this.currentUserId);
      } else {
        localStorage.setItem(SEARCH_SETTINGS_KEY, JSON.stringify(settings));
      }
    } catch (error) {
      console.error("Error updating search settings:", error);
      throw error;
    }
  }

  // Test email service 
  static async testEmailService(email: string): Promise<boolean> {
    try {
      console.log("Testing email service for:", email);
      
      const config = await this.getEmailConfig();
      const result = await EmailService.testEmailConfiguration({
        ...config,
        email: email
      });
      
      return result.success;
    } catch (error) {
      console.error("Error testing email service:", error);
      return false;
    }
  }

  // Send email with news summary
  static async sendNewsEmail(email: string, newsItems: NewsItem[], frequency: 'daily' | 'weekly'): Promise<boolean> {
    try {
      console.log("Sending news email to:", email);
      
      const config = await this.getEmailConfig();
      const subject = `Resumen de noticias ${frequency === 'daily' ? 'diario' : 'semanal'} - News Radar`;
      
      // Generate HTML content for the email
      const html = this.generateNewsEmailHTML(newsItems, frequency);
      
      const result = await EmailService.sendEmail(config, email, subject, html);
      
      return result.success;
    } catch (error) {
      console.error("Error sending news email:", error);
      return false;
    }
  }

  // Generate HTML content for news email
  private static generateNewsEmailHTML(newsItems: NewsItem[], frequency: 'daily' | 'weekly'): string {
    const frequencyText = frequency === 'daily' ? 'diario' : 'semanal';
    const date = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .news-item { margin-bottom: 20px; padding: 15px; border-left: 4px solid #3b82f6; background-color: #f8fafc; }
            .news-title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
            .news-summary { margin-bottom: 10px; }
            .news-source { font-size: 12px; color: #6b7280; }
            .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Resumen ${frequencyText} de noticias</h1>
            <p>${date}</p>
          </div>
          <div class="content">
            <p>Aquí tienes tu resumen ${frequencyText} de noticias más relevantes:</p>
    `;

    if (newsItems.length === 0) {
      html += `
        <div class="news-item">
          <p>No se encontraron noticias nuevas para este período.</p>
        </div>
      `;
    } else {
      newsItems.slice(0, 10).forEach(item => {
        html += `
          <div class="news-item">
            <div class="news-title">${item.title}</div>
            <div class="news-summary">${item.summary || 'Sin resumen disponible'}</div>
            <div class="news-source">
              Fuente: ${item.sourceName} | 
              ${item.date ? item.date : 'Fecha no disponible'}
              ${item.sourceUrl ? ` | <a href="${item.sourceUrl}" target="_blank">Leer más</a>` : ''}
            </div>
          </div>
        `;
      });
    }

    html += `
          </div>
          <div class="footer">
            <p>Este correo fue enviado automáticamente por News Radar</p>
            <p>Si no deseas recibir más correos, desactiva la opción en tu configuración</p>
          </div>
        </body>
      </html>
    `;

    return html;
  }

  // Send a WhatsApp message
  static async sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
    console.log(`Sending WhatsApp message to ${phone}: ${message}`);
    
    const config = await this.getWhatsAppConfig();
    
    // Save outgoing message to database if user is authenticated
    if (this.currentUserId) {
      try {
        await DatabaseService.saveWhatsAppMessage(phone, message, 'outgoing', this.currentUserId);
      } catch (error) {
        console.error("Error saving outgoing WhatsApp message:", error);
      }
    }
    
    // In a real implementation, this would call the WhatsApp Business API
    if (config.connectionMethod === "evolution" && config.evolutionApiUrl) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (config.apiKey) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        
        const response = await fetch(`${config.evolutionApiUrl.trim()}/message/sendText/${phone}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: phone.replace('+', ''),
            textMessage: message
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data && data.status === "success";
        }
        return false;
      } catch (error) {
        console.error("Error sending message via Evolution API:", error);
        return false;
      }
    } else {
      // Simulate API call for official WhatsApp API
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 1000);
      });
    }
  }

  // Process WhatsApp message for retrieving news - REAL MODE ONLY
  static async processWhatsAppMessage(message: string): Promise<NewsItem[]> {
    if (!message) return [];
    
    // Save incoming message to database if user is authenticated
    if (this.currentUserId) {
      try {
        await DatabaseService.saveWhatsAppMessage("unknown", message, 'incoming', this.currentUserId);
      } catch (error) {
        console.error("Error saving incoming WhatsApp message:", error);
      }
    }
    
    message = message.trim().toLowerCase();
    
    // Keywords that might indicate what the user wants
    const keywordMap = {
      noticias: ['noticias', 'noticia', 'news', 'nuevas', 'recientes'],
      buscar: ['buscar', 'encontrar', 'busca', 'search', 'query', 'consulta'],
      sobre: ['sobre', 'acerca', 'de', 'about', 'regarding', 'relacionado'],
      fuente: ['fuente', 'medio', 'diario', 'periódico', 'source', 'from']
    };
    
    // Detect user intent based on keywords
    const detectIntent = (msg: string): 'all' | 'search' | 'unknown' => {
      if (keywordMap.noticias.some(k => msg === k)) {
        return 'all';
      }
      
      if (keywordMap.noticias.some(k => msg.includes(k)) || 
          keywordMap.buscar.some(k => msg.includes(k))) {
        return 'search';
      }
      
      // If the message has more than 3 characters, assume it's a search
      if (msg.length > 3) {
        return 'search';
      }
      
      return 'unknown';
    };
    
    // Detect message intent
    const intent = detectIntent(message);
    
    switch(intent) {
      case 'all':
        // Return all recent news
        return this.getNews();
        
      case 'search':
        // Extract query and source if present
        let query = message;
        let source = '';
        
        // Remove keywords from the start to get the pure query
        for (const keyword of [...keywordMap.noticias, ...keywordMap.buscar]) {
          if (query.startsWith(keyword)) {
            query = query.substring(keyword.length).trim();
            // Remove special characters like ":" after the keyword
            query = query.replace(/^[:;,.]+\s*/, '').trim();
            break;
          }
        }
        
        // Look for source specification
        const sourceIndicators = keywordMap.fuente.concat(keywordMap.sobre);
        for (const indicator of sourceIndicators) {
          const pattern = new RegExp(`\\s${indicator}\\s+([\\w\\s]+)(?:\\s|$)`, 'i');
          const match = query.match(pattern);
          if (match && match[1]) {
            source = match[1].trim();
            // Remove the source part from the query
            query = query.replace(pattern, ' ').trim();
            break;
          }
        }
        
        console.log(`Detected intent: search. Query: "${query}", Source: "${source}"`);
        return this.searchNews(query, source);
        
      default:
        console.log("Intent not recognized, trying direct search:", message);
        return this.searchNews(message);
    }
  }

  /**
   * Search for news with specific query or keywords - REAL MODE ONLY
   */
  static async searchNews(query: string, source?: string, additionalKeywords?: string[]): Promise<NewsItem[]> {
    if ((!query || query.trim() === "") && (!additionalKeywords || additionalKeywords.length === 0)) {
      return this.getNews();
    }
    
    const keywords: string[] = [];
    
    if (query && query.trim() !== "") {
      keywords.push(query.trim());
      await this.addToSearchHistory(query.trim());
    }
    
    if (additionalKeywords && additionalKeywords.length > 0) {
      keywords.push(...additionalKeywords.filter(k => k.trim() !== ""));
    }
    
    console.log(`Searching REAL news for: ${keywords.join(', ')}`);
    
    let sources: string[] | undefined;
    
    if (source) {
      sources = [source];
    } else {
      const allSources = await this.getSources();
      const enabledSources = allSources.filter(s => s.enabled);
      
      if (enabledSources.length === 0) {
        throw new Error("No hay fuentes habilitadas. Por favor habilite al menos una fuente en la configuración.");
      }
      
      sources = enabledSources.map(s => s.url);
    }
    
    const settings = await this.getSearchSettings();
    
    return fetchNewsFromPythonScript({
      keywords: keywords,
      sources: sources,
      includeTwitter: settings.includeTwitter,
      maxResults: settings.maxResults,
      validateLinks: settings.validateLinks,
      currentDateOnly: settings.currentDateOnly,
      deepScrape: settings.deepScrape,
      twitterUsers: settings.twitterUsers,
      pythonExecutable: settings.pythonExecutable
    });
  }

  /**
   * Add a search term to the search history
   */
  static async addToSearchHistory(term: string): Promise<void> {
    try {
      const settings = await this.getSearchSettings();
      const history = settings.searchHistory || [];
      
      // Only add if it doesn't already exist
      if (!history.includes(term)) {
        // Add to beginning of array (most recent first)
        const newHistory = [term, ...history.slice(0, 19)]; // Keep last 20 items
        
        await this.updateSearchSettings({
          ...settings,
          searchHistory: newHistory
        });
      }
    } catch (error) {
      console.error("Error adding to search history:", error);
    }
  }

  /**
   * Get news from real sources - REAL MODE ONLY
   */
  static async getNewsFromRealSources(keywords?: string[]): Promise<NewsItem[]> {
    const settings = await this.getSearchSettings();
    const enabledSources = await this.getSources()
      .then(sources => sources.filter(source => source.enabled)
      .map(source => source.url));
      
    return fetchNewsFromPythonScript({
      keywords: keywords || [],
      sources: enabledSources,
      includeTwitter: settings.includeTwitter,
      maxResults: settings.maxResults,
      validateLinks: settings.validateLinks,
      currentDateOnly: settings.currentDateOnly,
      deepScrape: settings.deepScrape,
      twitterUsers: settings.twitterUsers,
      pythonExecutable: settings.pythonExecutable
    });
  }

  // Extract source name from URL
  private static extractSourceNameFromUrl(url: string): string {
    try {
      if (!url) return '';
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      
      // Extract the main domain name (e.g., clarin.com from www.clarin.com.ar)
      const domainParts = hostname.split('.');
      if (domainParts.length >= 2) {
        return domainParts[domainParts.length - 2];
      }
      return hostname;
    } catch {
      return '';
    }
  }

  // Infer topics from text based on keywords
  private static inferTopicsFromText(text: string): string[] {
    const topics: string[] = [];
    
    // Simple topic inference rules
    if (/econom[íi]a|inflaci[óo]n|d[óo]lar|finanzas|presupuesto/i.test(text)) {
      topics.push('Economía');
    }
    
    if (/pol[íi]tica|gobierno|presidente|ministro|diputado|senador|candidato|elecci[óo]n/i.test(text)) {
      topics.push('Política');
    }
    
    if (/senado|legislatura|parlamento|c[áa]mara|congreso/i.test(text)) {
      topics.push('Legislativo');
    }
    
    if (/kicillof|axel|gobernador/i.test(text)) {
      topics.push('Gobierno Provincial');
    }
    
    if (/magario|ver[óo]nica|vicegobernadora/i.test(text)) {
      topics.push('Gobierno Provincial');
    }
    
    // Ensure we have at least one topic
    if (topics.length === 0) {
      topics.push('General');
    }
    
    return topics;
  }
}

export default NewsService;
