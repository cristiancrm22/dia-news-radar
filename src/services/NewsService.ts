import { NewsItem, NewsSource, Topic, WhatsAppConfig } from "@/types/news";

// Mock data for development purposes
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
    sourceUrl: "https://www.lanacion.com/economia/kicillof-plan",
    sourceName: "La Nación",
    topics: ["Economía", "Política", "Provincia"],
    imageUrl: "https://via.placeholder.com/300x200"
  },
  {
    id: "8",
    title: "Debate político genera tensión entre el gobierno nacional y Kicillof",
    summary: "El intercambio de declaraciones entre funcionarios del gobierno nacional y el gobernador Kicillof escaló la tensión política en medio de negociaciones por fondos para la provincia.",
    date: new Date().toISOString(),
    sourceUrl: "https://www.clarin.com/politica/tension-gobierno-kicillof",
    sourceName: "Clarín",
    topics: ["Política", "Gobierno"],
    imageUrl: "https://via.placeholder.com/300x200"
  }
];

// Default sources
const defaultSources: NewsSource[] = [
  { id: "1", name: "El País", url: "https://elpais.com", enabled: true },
  { id: "2", name: "BBC News", url: "https://www.bbc.com", enabled: true },
  { id: "3", name: "CNN", url: "https://www.cnn.com", enabled: true },
  { id: "4", name: "Twitter", url: "https://twitter.com", enabled: false },
  { id: "5", name: "La Nación", url: "https://www.lanacion.com", enabled: true },
  { id: "6", name: "Clarín", url: "https://www.clarin.com", enabled: true }
];

// Default topics
const defaultTopics: Topic[] = [
  { id: "1", name: "Política", enabled: true },
  { id: "2", name: "Economía", enabled: true },
  { id: "3", name: "Tecnología", enabled: true },
  { id: "4", name: "Deportes", enabled: false },
  { id: "5", name: "Ciencia", enabled: true }
];

// Default WhatsApp config
const defaultWhatsAppConfig: WhatsAppConfig = {
  enabled: false,
  phoneNumber: "",
  apiKey: "",
  connectionMethod: "official",
  evolutionApiUrl: ""
};

// LocalStorage keys
const SOURCES_KEY = 'news_radar_sources';
const TOPICS_KEY = 'news_radar_topics';
const WHATSAPP_CONFIG_KEY = 'news_radar_whatsapp_config';

class NewsService {
  // Get all news (would be replaced with actual API calls in production)
  static getNews(): Promise<NewsItem[]> {
    // Simulate API call delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockNews);
      }, 1000);
    });
  }

  // Search news by query across all sources and topics
  static async searchNews(query: string, source?: string): Promise<NewsItem[]> {
    if (!query) return mockNews;
    
    // In a real implementation, this would call different APIs for each source
    // and combine the results. For now, we'll just filter the mock data.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    
    try {
      const lowerCaseQuery = query.toLowerCase();
      
      // Mejorado: busca coincidencias parciales en cualquier parte del texto
      let filteredNews = mockNews.filter(
        item => 
          item.title.toLowerCase().includes(lowerCaseQuery) || 
          item.summary.toLowerCase().includes(lowerCaseQuery) ||
          item.sourceName.toLowerCase().includes(lowerCaseQuery) ||
          item.topics.some(topic => topic.toLowerCase().includes(lowerCaseQuery))
      );
      
      console.log(`Búsqueda de "${query}" encontró ${filteredNews.length} resultados`);
      
      // Si no hay resultados, intentar buscar palabras individuales
      if (filteredNews.length === 0 && lowerCaseQuery.includes(" ")) {
        const queryWords = lowerCaseQuery.split(" ").filter(word => word.length > 2);
        console.log("Intentando búsqueda por palabras individuales:", queryWords);
        
        filteredNews = mockNews.filter(item => {
          const itemText = `${item.title.toLowerCase()} ${item.summary.toLowerCase()} ${item.topics.join(" ").toLowerCase()}`;
          return queryWords.some(word => itemText.includes(word));
        });
        
        console.log(`Búsqueda por palabras encontró ${filteredNews.length} resultados`);
      }
      
      // If source is specified, filter by source
      if (source) {
        const lowerCaseSource = source.toLowerCase();
        filteredNews = filteredNews.filter(
          item => item.sourceName.toLowerCase().includes(lowerCaseSource)
        );
      }
      
      return filteredNews;
    } catch (error) {
      console.error("Error filtering news:", error);
      return []; // Return empty array on error to prevent filter issues
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

  // Parse WhatsApp message to search for news
  static async processWhatsAppMessage(message: string): Promise<NewsItem[]> {
    try {
      message = message.trim().toLowerCase();
      
      if (message === "noticias") {
        // Return all recent news
        return this.getNews();
      }
      
      if (message.startsWith("noticias:")) {
        const query = message.substring("noticias:".length).trim();
        
        // Check if the query includes a source specification
        if (query.includes(" de ")) {
          const [topic, source] = query.split(" de ", 2);
          return this.searchNews(topic.trim(), source.trim());
        }
        
        // Otherwise just search for the topic
        return this.searchNews(query);
      }
      
      // Si el mensaje no tiene un formato específico, intentar buscarlo como una consulta general
      if (message.length > 0) {
        return this.searchNews(message);
      }
      
      // Return empty array for unrecognized commands
      return [];
    } catch (error) {
      console.error("Error processing WhatsApp message:", error);
      return []; // Return empty array on error to prevent filter issues
    }
  }
}

export default NewsService;
