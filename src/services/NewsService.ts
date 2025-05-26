import { NewsItem, NewsSource, WhatsAppConfig, EmailConfig, SearchSettings, PythonScriptExecutionStatus } from "@/types/news";
import PythonNewsAdapter, { 
  fetchNewsFromPythonScript, 
  downloadNewsCSV, 
  executePythonScript, 
  getPythonExecutionStatus, 
  loadResultsFromCsv 
} from './PythonNewsAdapter';
import { toast } from "sonner";

// Configuration - REAL MODE ONLY
const USE_MOCK_DATA = false;
const USE_PYTHON_SCRAPER = true;
const FALLBACK_TO_MOCK = false; // DISABLED: No fallback to demo data

// Default sources
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
  keywords: []
};

// Default search settings
const defaultSearchSettings: SearchSettings = {
  maxResults: 50,
  includeTwitter: true,
  keywords: ["Magario", "Kicillof", "Espinosa", "Milei"],
  validateLinks: true,
  currentDateOnly: true,
  searchHistory: [],
  deepScrape: true,  // Enable deep scraping by default
  twitterUsers: defaultTwitterUsers,
  pythonScriptPath: "python3",
  pythonExecutable: "python"
};

// LocalStorage keys
const SOURCES_KEY = 'news_radar_sources';
const WHATSAPP_CONFIG_KEY = 'news_radar_whatsapp_config';
const EMAIL_CONFIG_KEY = 'news_radar_email_config';
const SEARCH_SETTINGS_KEY = 'news_radar_search_settings';
const TWITTER_USERS_KEY = 'news_radar_twitter_users';

class NewsService {
  /**
   * Get news using Python script execution - REAL MODE ONLY
   */
  static async getNews(): Promise<NewsItem[]> {
    const settings = this.getSearchSettings();
    const enabledSources = this.getSources().filter(source => source.enabled);
    
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
      console.log("Loaded REAL results:", results.length, "news items");
      
      // Filter results by keywords if they are configured
      let filteredResults = results;
      if (settings.keywords && settings.keywords.length > 0) {
        filteredResults = results.filter(item => {
          const searchText = `${item.title} ${item.summary}`.toLowerCase();
          return settings.keywords.some(keyword => 
            searchText.includes(keyword.toLowerCase())
          );
        });
        console.log(`Filtered by keywords (${settings.keywords.join(', ')}):`, filteredResults.length, "news items");
      }
      
      return filteredResults;
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
   * Search for news with specific query or keywords - REAL MODE ONLY
   */
  static async searchNews(query: string, source?: string, additionalKeywords?: string[]): Promise<NewsItem[]> {
    if ((!query || query.trim() === "") && (!additionalKeywords || additionalKeywords.length === 0)) {
      return this.getNews();
    }
    
    const keywords: string[] = [];
    
    if (query && query.trim() !== "") {
      keywords.push(query.trim());
      this.addToSearchHistory(query.trim());
    }
    
    if (additionalKeywords && additionalKeywords.length > 0) {
      keywords.push(...additionalKeywords.filter(k => k.trim() !== ""));
    }
    
    console.log(`Searching REAL news for: ${keywords.join(', ')}`);
    
    let sources: string[] | undefined;
    
    if (source) {
      sources = [source];
    } else {
      const allSources = this.getSources();
      const enabledSources = allSources.filter(s => s.enabled);
      
      if (enabledSources.length === 0) {
        throw new Error("No hay fuentes habilitadas. Por favor habilite al menos una fuente en la configuración.");
      }
      
      sources = enabledSources.map(s => s.url);
    }
    
    const settings = this.getSearchSettings();
    
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
   * Export current news results as CSV and trigger download
   */
  static downloadNewsAsCSV(news: NewsItem[]): void {
    try {
      downloadNewsCSV(news, "resultados.csv");
    } catch (error) {
      console.error("Error downloading CSV:", error);
    }
  }
  
  /**
   * Add a search term to the search history
   */
  static addToSearchHistory(term: string): void {
    try {
      const settings = this.getSearchSettings();
      const history = settings.searchHistory || [];
      
      // Only add if it doesn't already exist
      if (!history.includes(term)) {
        // Add to beginning of array (most recent first)
        const newHistory = [term, ...history.slice(0, 19)]; // Keep last 20 items
        
        this.updateSearchSettings({
          ...settings,
          searchHistory: newHistory
        });
      }
    } catch (error) {
      console.error("Error adding to search history:", error);
    }
  }

  // Get sources from localStorage or defaults
  static getSources(): NewsSource[] {
    try {
      const savedSources = localStorage.getItem(SOURCES_KEY);
      return savedSources ? JSON.parse(savedSources) : defaultSources;
    } catch (error) {
      console.error("Error loading sources:", error);
      return defaultSources;
    }
  }

  // Update sources in localStorage
  static updateSources(sources: NewsSource[]): void {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
  }

  // Get Twitter users from localStorage or defaults
  static getTwitterUsers(): string[] {
    try {
      const savedUsers = localStorage.getItem(TWITTER_USERS_KEY);
      return savedUsers ? JSON.parse(savedUsers) : defaultTwitterUsers;
    } catch (error) {
      console.error("Error loading Twitter users:", error);
      return defaultTwitterUsers;
    }
  }

  // Update Twitter users in localStorage
  static updateTwitterUsers(users: string[]): void {
    localStorage.setItem(TWITTER_USERS_KEY, JSON.stringify(users));
    
    // Also update in search settings
    const currentSettings = this.getSearchSettings();
    this.updateSearchSettings({
      ...currentSettings,
      twitterUsers: users
    });
  }

  // Get WhatsApp config from localStorage or defaults
  static getWhatsAppConfig(): WhatsAppConfig {
    try {
      const savedConfig = localStorage.getItem(WHATSAPP_CONFIG_KEY);
      // Handle case where saved config doesn't have the new connectionMethod field
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        if (!parsedConfig.connectionMethod) {
          parsedConfig.connectionMethod = "official";
        }
        return parsedConfig;
      }
      return defaultWhatsAppConfig;
    } catch (error) {
      console.error("Error loading WhatsApp config:", error);
      return defaultWhatsAppConfig;
    }
  }

  // Update WhatsApp config in localStorage
  static updateWhatsAppConfig(config: WhatsAppConfig): void {
    localStorage.setItem(WHATSAPP_CONFIG_KEY, JSON.stringify(config));
  }

  // Get Email config from localStorage or defaults
  static getEmailConfig(): EmailConfig {
    try {
      const savedConfig = localStorage.getItem(EMAIL_CONFIG_KEY);
      return savedConfig ? JSON.parse(savedConfig) : defaultEmailConfig;
    } catch (error) {
      console.error("Error loading email config:", error);
      return defaultEmailConfig;
    }
  }

  // Update Email config in localStorage
  static updateEmailConfig(config: EmailConfig): void {
    localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(config));
  }

  // Get search settings from localStorage or defaults
  static getSearchSettings(): SearchSettings {
    try {
      const savedSettings = localStorage.getItem(SEARCH_SETTINGS_KEY);
      const settings = savedSettings ? JSON.parse(savedSettings) : defaultSearchSettings;
      
      // Ensure twitterUsers is included (for backwards compatibility)
      if (!settings.twitterUsers) {
        settings.twitterUsers = defaultTwitterUsers;
      }
      
      // Ensure Python script path is included
      if (!settings.pythonScriptPath) {
        settings.pythonScriptPath = defaultSearchSettings.pythonScriptPath;
      }
      
      // Ensure Python executable is included
      if (!settings.pythonExecutable) {
        settings.pythonExecutable = defaultSearchSettings.pythonExecutable;
      }
      
      return settings;
    } catch (error) {
      console.error("Error loading search settings:", error);
      return defaultSearchSettings;
    }
  }

  // Update search settings in localStorage
  static updateSearchSettings(settings: SearchSettings): void {
    localStorage.setItem(SEARCH_SETTINGS_KEY, JSON.stringify(settings));
  }

  // Test email service 
  static async testEmailService(email: string): Promise<boolean> {
    if (USE_MOCK_DATA) {
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 1000);
      });
    }
    
    try {
      const API_ENDPOINT = '/api';
      const response = await fetch(`${API_ENDPOINT}/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      return response.ok;
    } catch (error) {
      console.error("Error testing email service:", error);
      return false;
    }
  }

  // Send a WhatsApp message
  static async sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
    console.log(`Sending WhatsApp message to ${phone}: ${message}`);
    
    const config = this.getWhatsAppConfig();
    
    // In a real implementation, this would call the WhatsApp Business API
    // For now, we'll simulate a successful API call
    
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
   * Get news from real sources - REAL MODE ONLY
   */
  static async getNewsFromRealSources(keywords?: string[]): Promise<NewsItem[]> {
    const settings = this.getSearchSettings();
    const enabledSources = this.getSources()
      .filter(source => source.enabled)
      .map(source => source.url);
      
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
