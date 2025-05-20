import { NewsItem, NewsSource, Topic, WhatsAppConfig, EmailConfig, SearchSettings } from "@/types/news";
import PythonNewsAdapter, { fetchNewsFromPythonScript } from './PythonNewsAdapter';

// Configuration
const USE_MOCK_DATA = true; // Change to false in production
const USE_PYTHON_SCRAPER = true; // Set to true to use the Python script

// Default sources
const defaultSources: NewsSource[] = [
  { id: "1", name: "El País", url: "https://elpais.com", enabled: true },
  { id: "2", name: "BBC News", url: "https://www.bbc.com", enabled: true },
  { id: "3", name: "CNN", url: "https://www.cnn.com", enabled: true },
  { id: "4", name: "Twitter", url: "https://twitter.com", enabled: false },
  { id: "5", name: "La Nación", url: "https://www.lanacion.com.ar", enabled: true },
  { id: "6", name: "Clarín", url: "https://www.clarin.com.ar", enabled: true },
  { id: "7", name: "Infobae", url: "https://www.infobae.com", enabled: true },
  { id: "8", name: "Página 12", url: "https://www.pagina12.com.ar", enabled: true },
  { id: "9", name: "Ámbito", url: "https://www.ambito.com", enabled: true },
  { id: "10", name: "Perfil", url: "https://www.perfil.com", enabled: true }
];

// Default topics
const defaultTopics: Topic[] = [
  { id: "1", name: "Política", enabled: true },
  { id: "2", name: "Economía", enabled: true },
  { id: "3", name: "Tecnología", enabled: true },
  { id: "4", name: "Deportes", enabled: false },
  { id: "5", name: "Ciencia", enabled: true },
  { id: "6", name: "Inteligencia Artificial", enabled: true },
  { id: "7", name: "Medio Ambiente", enabled: true },
  { id: "8", name: "Internacional", enabled: true },
  { id: "9", name: "Gobierno Provincial", enabled: true },
  { id: "10", name: "Legislativo", enabled: true },
  { id: "11", name: "Educación", enabled: true }
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
  keywords: ["Magario", "Kicillof", "Espinosa"]
};

// Mock news data for when not using the Python scraper
const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "Nueva política económica anunciada por el gobierno",
    summary: "El gobierno ha anunciado una nueva política económica que busca estimular el crecimiento en sectores clave y reducir la inflación en los próximos meses.",
    date: new Date().toISOString(),
    sourceUrl: "https://elpais.com/economia/2023-05-15/nueva-politica-economica.html",
    sourceName: "El País",
    topics: ["Economía", "Política"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "2",
    title: "Avances en inteligencia artificial revolucionan la industria tecnológica",
    summary: "Los últimos avances en inteligencia artificial están transformando rápidamente la industria tecnológica, con nuevas aplicaciones que prometen cambiar la forma en que interactuamos con la tecnología.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.technologyreview.com/ai-advances",
    sourceName: "MIT Technology Review",
    topics: ["Tecnología", "Inteligencia Artificial"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "3",
    title: "Resultados de las elecciones regionales sorprenden a los analistas",
    summary: "Los resultados de las recientes elecciones regionales han sorprendido a muchos analistas políticos, con cambios significativos en el mapa electoral y nuevas fuerzas emergentes.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.bbc.com/news/elections",
    sourceName: "BBC News",
    topics: ["Política", "Elecciones"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "4",
    title: "Nuevo estudio sobre cambio climático advierte sobre consecuencias graves",
    summary: "Un nuevo estudio científico sobre el cambio climático advierte sobre consecuencias más graves de lo previsto si no se toman medidas urgentes para reducir las emisiones de carbono.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.nationalgeographic.com/environment/climate-change",
    sourceName: "National Geographic",
    topics: ["Medio Ambiente", "Ciencia"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "5",
    title: "Descubrimiento arqueológico revela antigua civilización desconocida",
    summary: "Un equipo de arqueólogos ha descubierto restos de una antigua civilización previamente desconocida, lo que podría cambiar nuestra comprensión de la historia humana en la región.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.archaeology.org/discoveries",
    sourceName: "Archaeology Magazine",
    topics: ["Historia", "Arqueología"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "6",
    title: "Innovaciones en energía renovable prometen soluciones sostenibles",
    summary: "Nuevas innovaciones en el campo de la energía renovable están ofreciendo soluciones más eficientes y sostenibles para la creciente demanda energética mundial.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.renewableenergyworld.com/innovations",
    sourceName: "Renewable Energy World",
    topics: ["Energía", "Medio Ambiente", "Tecnología"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "7",
    title: "Kicillof anuncia nuevo plan económico para la provincia",
    summary: "El gobernador Axel Kicillof presentó un ambicioso plan económico que busca revitalizar la economía provincial y generar nuevos empleos en sectores estratégicos.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.lanacion.com.ar/economia/kicillof-plan-economico-provincia-buenos-aires",
    sourceName: "La Nación",
    topics: ["Economía", "Política", "Provincia"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "8",
    title: "Debate político genera tensión entre el gobierno nacional y Kicillof",
    summary: "El intercambio de declaraciones entre funcionarios del gobierno nacional y el gobernador Kicillof escaló la tensión política en medio de negociaciones por fondos para la provincia.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.clarin.com/politica/tension-gobierno-kicillof-fondos",
    sourceName: "Clarín",
    topics: ["Política", "Gobierno"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "9",
    title: "KICILLOF participa en foro internacional sobre políticas públicas",
    summary: "El gobernador KICILLOF presentó las políticas de su administración en un foro internacional, generando interés entre diversos líderes regionales.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.pagina12.com.ar/politica/kicillof-foro-internacional-politicas",
    sourceName: "Página 12",
    topics: ["Política", "Internacional"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "10",
    title: "Milei critica duramente las políticas económicas provinciales",
    summary: "El presidente Javier Milei criticó duramente las políticas económicas de varias provincias, señalando problemas estructurales y deficiencias en la gestión.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.clarin.com.ar/economia/milei-criticas-provincias",
    sourceName: "Clarín",
    topics: ["Economía", "Política"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "11",
    title: "Fernández y su legado en la política argentina",
    summary: "Un análisis profundo sobre el impacto del ex-presidente Alberto Fernández en la política argentina y las consecuencias de sus decisiones en la economía actual.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.lanacion.com.ar/politica/alberto-fernandez-legado-politica-argentina",
    sourceName: "La Nación",
    topics: ["Política", "Historia"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "12",
    title: "Avances en la implementación de inteligencia artificial en Argentina",
    summary: "Empresas argentinas están adoptando rápidamente tecnologías de IA para mejorar sus operaciones y servicios, posicionando al país como líder regional en innovación.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.infobae.com/tecno/inteligencia-artificial-argentina-avances",
    sourceName: "Infobae",
    topics: ["Tecnología", "Inteligencia Artificial", "Economía"],
    imageUrl: "https://via.placeholder.com/300x200"
  }
];

// LocalStorage keys
const SOURCES_KEY = 'news_radar_sources';
const TOPICS_KEY = 'news_radar_topics';
const WHATSAPP_CONFIG_KEY = 'news_radar_whatsapp_config';
const EMAIL_CONFIG_KEY = 'news_radar_email_config';
const SEARCH_SETTINGS_KEY = 'news_radar_search_settings';

// Utility functions for text processing
const textUtils = {
  // Normaliza texto: convierte a minúsculas y quita acentos
  normalizeText(text: string): string {
    if (!text) return '';
    return text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  },
  
  // Comprueba si un texto contiene una consulta
  textContainsQuery(text: string, searchQuery: string): boolean {
    if (!text || !searchQuery) return false;
    return this.normalizeText(text).includes(this.normalizeText(searchQuery));
  },
  
  // Comprueba si un texto contiene alguna de las palabras en un array
  textContainsAnyWord(text: string, words: string[]): boolean {
    if (!text || !words || words.length === 0) return false;
    const normalizedText = this.normalizeText(text);
    return words.some(word => normalizedText.includes(this.normalizeText(word)));
  },
  
  // Puntúa la relevancia de una noticia para una consulta (más puntos = más relevante)
  scoreNewsRelevance(news: NewsItem, query: string): number {
    if (!news || !query) return 0;
    
    let score = 0;
    const normalizedQuery = this.normalizeText(query);
    
    // Título tiene más peso
    if (this.textContainsQuery(news.title, normalizedQuery)) score += 10;
    
    // Resumen
    if (this.textContainsQuery(news.summary, normalizedQuery)) score += 5;
    
    // Fuente
    if (this.textContainsQuery(news.sourceName, normalizedQuery)) score += 3;
    
    // Temas
    if (news.topics && Array.isArray(news.topics)) {
      if (news.topics.some(topic => this.textContainsQuery(topic, normalizedQuery))) {
        score += 4;
      }
    }
    
    // Coincidencia exacta tiene bonus
    if (this.normalizeText(news.title).includes(` ${normalizedQuery} `)) score += 5;
    
    return score;
  }
};

class NewsService {
  /**
   * Get news using either mock data, Python script, or API
   */
  static async getNews(): Promise<NewsItem[]> {
    try {
      const settings = this.getSearchSettings();
      
      // Check if we should use the Python scraper
      if (USE_PYTHON_SCRAPER) {
        console.log("Using Python scraper for news");
        return fetchNewsFromPythonScript({
          keywords: settings.keywords,
          includeTwitter: settings.includeTwitter,
          maxResults: settings.maxResults
        });
      }
      
      // If not using Python scraper, use the existing methods
      if (!USE_MOCK_DATA) {
        return this.getNewsFromRealSources(settings.keywords);
      }
      
      // Use mock data with delay
      return new Promise((resolve) => {
        setTimeout(() => {
          const validNews = Array.isArray(mockNews) ? mockNews : [];
          resolve(validNews);
        }, 500);
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      return [];
    }
  }

  /**
   * Search for news with specific query
   */
  static async searchNews(query: string, source?: string): Promise<NewsItem[]> {
    try {
      if (!query || query.trim() === "") {
        return this.getNews();
      }
      
      // If we're using the Python scraper, search with it
      if (USE_PYTHON_SCRAPER) {
        console.log(`Searching for "${query}" using Python scraper`);
        let sources: string[] | undefined;
        
        if (source) {
          sources = [source];
        } else {
          // Get enabled sources from settings
          const allSources = this.getSources();
          sources = allSources
            .filter(s => s.enabled)
            .map(s => s.url);
        }
        
        return fetchNewsFromPythonScript({
          keywords: [query],
          sources: sources,
          includeTwitter: this.getSearchSettings().includeTwitter,
          maxResults: this.getSearchSettings().maxResults
        });
      }

      // If not using Python scraper, fall back to existing search method
      if (!USE_MOCK_DATA) {
        return this.getNewsFromRealSources([query]);
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log(`Buscando noticias con términos: "${query}"`);
      
      // Filtering mock news data
      const allNews = Array.isArray(mockNews) ? mockNews : [];
      
      // Filtering and sorting logic
      let filteredNews = allNews.filter(item => {
        if (!item) return false;
        
        const titleContainsQuery = item.title.toLowerCase().includes(query.toLowerCase());
        const summaryContainsQuery = item.summary.toLowerCase().includes(query.toLowerCase());
        const sourceContainsQuery = item.sourceName.toLowerCase().includes(query.toLowerCase());
        
        return titleContainsQuery || summaryContainsQuery || sourceContainsQuery;
      });
      
      // If source is provided, filter by it
      if (source && filteredNews.length > 0) {
        filteredNews = filteredNews.filter(item => 
          item.sourceName.toLowerCase().includes(source.toLowerCase())
        );
      }
      
      return filteredNews;
    } catch (error) {
      console.error("Error searching news:", error);
      return [];
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

  // Get topics from localStorage or defaults
  static getTopics(): Topic[] {
    try {
      const savedTopics = localStorage.getItem(TOPICS_KEY);
      return savedTopics ? JSON.parse(savedTopics) : defaultTopics;
    } catch (error) {
      console.error("Error loading topics:", error);
      return defaultTopics;
    }
  }

  // Update topics in localStorage
  static updateTopics(topics: Topic[]): void {
    localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
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
      return savedSettings ? JSON.parse(savedSettings) : defaultSearchSettings;
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

  // Improved implementation for WhatsApp message processing using AI techniques
  static async processWhatsAppMessage(message: string): Promise<NewsItem[]> {
    try {
      if (!message) return [];
      
      message = message.trim().toLowerCase();
      
      // Palabras clave que pueden indicar qué quiere el usuario
      const keywordMap = {
        noticias: ['noticias', 'noticia', 'news', 'nuevas', 'recientes'],
        buscar: ['buscar', 'encontrar', 'busca', 'search', 'query', 'consulta'],
        sobre: ['sobre', 'acerca', 'de', 'about', 'regarding', 'relacionado'],
        fuente: ['fuente', 'medio', 'diario', 'periódico', 'source', 'from']
      };
      
      // Detectar intención del usuario basado en palabras clave
      const detectIntent = (msg: string): 'all' | 'search' | 'unknown' => {
        if (keywordMap.noticias.some(k => msg === k)) {
          return 'all';
        }
        
        if (keywordMap.noticias.some(k => msg.includes(k)) || 
            keywordMap.buscar.some(k => msg.includes(k))) {
          return 'search';
        }
        
        // Si el mensaje tiene más de 3 caracteres, asumimos que es una búsqueda
        if (msg.length > 3) {
          return 'search';
        }
        
        return 'unknown';
      };
      
      // Detectar la intención del mensaje
      const intent = detectIntent(message);
      
      switch(intent) {
        case 'all':
          // Retornar todas las noticias recientes
          return this.getNews();
          
        case 'search':
          // Extraer consulta y fuente si existe
          let query = message;
          let source = '';
          
          // Eliminar palabras clave del inicio para obtener la consulta pura
          for (const keyword of [...keywordMap.noticias, ...keywordMap.buscar]) {
            if (query.startsWith(keyword)) {
              query = query.substring(keyword.length).trim();
              // Eliminar caracteres especiales como ":" después de la palabra clave
              query = query.replace(/^[:;,.]+\s*/, '').trim();
              break;
            }
          }
          
          // Buscar si especifica una fuente
          const sourceIndicators = keywordMap.fuente.concat(keywordMap.sobre);
          for (const indicator of sourceIndicators) {
            const pattern = new RegExp(`\\s${indicator}\\s+([\\w\\s]+)(?:\\s|$)`, 'i');
            const match = query.match(pattern);
            if (match && match[1]) {
              source = match[1].trim();
              // Eliminar la parte de la fuente de la consulta
              query = query.replace(pattern, ' ').trim();
              break;
            }
          }
          
          console.log(`Intención detectada: búsqueda. Query: "${query}", Fuente: "${source}"`);
          return this.searchNews(query, source);
          
        default:
          console.log("Intención no reconocida, intentando buscar directamente:", message);
          return this.searchNews(message);
      }
    } catch (error) {
      console.error("Error processing WhatsApp message:", error);
      return []; // Return empty array on error to prevent filter issues
    }
  }

  static getNewsFromRealSources(keywords?: string[]): Promise<NewsItem[]> {
    // This function is now replaced by the Python scraper
    if (USE_PYTHON_SCRAPER) {
      return fetchNewsFromPythonScript({
        keywords: keywords || [],
        includeTwitter: this.getSearchSettings().includeTwitter,
        maxResults: this.getSearchSettings().maxResults
      });
    }
    
    const API_ENDPOINT = '/api';
    try {
      // Define search parameters
      const searchParams = new URLSearchParams();
      
      if (keywords && Array.isArray(keywords) && keywords.length > 0) {
        searchParams.append('keywords', keywords.join(','));
      }
      
      // Fetch from the API endpoint
      const response =  fetch(`${API_ENDPOINT}/news?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data =  response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format');
      }
      
      // Transform the API response to match our NewsItem interface
      const newsItems: NewsItem[] = data.map((item: any) => ({
        id: item.id || String(Math.random()),
        title: item.titulo || item.title || 'Sin título',
        summary: item.resumen || item.summary || '',
        date: item.fecha || item.date || new Date().toISOString(),
        sourceUrl: item.url || '#',
        sourceName: this.extractSourceNameFromUrl(item.url || '') || 'Fuente desconocida',
        topics: this.inferTopicsFromText(item.titulo + ' ' + item.resumen),
      }));
      
      return newsItems;
    } catch (error) {
      console.error('Error fetching news from API:', error);
      return this.getNews(); // Fallback to mock data
    }
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
