
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
  }
];

// Default sources
const defaultSources: NewsSource[] = [
  { id: "1", name: "El País", url: "https://elpais.com", enabled: true },
  { id: "2", name: "BBC News", url: "https://www.bbc.com", enabled: true },
  { id: "3", name: "CNN", url: "https://www.cnn.com", enabled: true },
  { id: "4", name: "Twitter", url: "https://twitter.com", enabled: false }
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
  apiKey: ""
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

  // Search news by query (client-side filtering for demo purposes)
  static searchNews(query: string): NewsItem[] {
    if (!query) return mockNews;
    
    const lowerCaseQuery = query.toLowerCase();
    return mockNews.filter(
      item => 
        item.title.toLowerCase().includes(lowerCaseQuery) || 
        item.summary.toLowerCase().includes(lowerCaseQuery) ||
        item.topics.some(topic => topic.toLowerCase().includes(lowerCaseQuery))
    );
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
      return savedConfig ? JSON.parse(savedConfig) : defaultWhatsAppConfig;
    } catch (error) {
      console.error("Error loading WhatsApp config:", error);
      return defaultWhatsAppConfig;
    }
  }

  // Update WhatsApp config in localStorage
  static updateWhatsAppConfig(config: WhatsAppConfig): void {
    localStorage.setItem(WHATSAPP_CONFIG_KEY, JSON.stringify(config));
  }

  // In a real application, this would send a request to a WhatsApp API
  static sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
    console.log(`Sending WhatsApp message to ${phone}: ${message}`);
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }
}

export default NewsService;
