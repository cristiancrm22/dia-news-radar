
/**
 * Service to communicate with the Python news scraper
 */
import { NewsItem } from "@/types/news";

// Define the API endpoint (this should be configured based on where the Python script is hosted)
const PYTHON_API_ENDPOINT = '/api/scrape-news';

// Configuration for the API
const API_CONFIG = {
  useLocalMock: true, // Set to false in production
};

/**
 * Interface for the Python script response
 */
interface PythonNewsResponse {
  status: 'success' | 'error';
  data?: {
    titulo: string;
    fecha: string;
    url: string;
    resumen: string;
    linkValido?: boolean;
  }[];
  error?: string;
}

/**
 * Options for news search
 */
export interface NewsSearchOptions {
  keywords: string[];
  sources?: string[];
  includeTwitter?: boolean;
  maxResults?: number;
  validateLinks?: boolean;
  currentDateOnly?: boolean;
  deepScrape?: boolean;
}

/**
 * Mock data for local development (simulating Python script response)
 */
const mockPythonResponse: PythonNewsResponse = {
  status: 'success',
  data: [
    {
      titulo: "Kicillof anunció nuevas medidas económicas para la provincia",
      fecha: new Date().toISOString(),
      url: "https://www.clarin.com/politica/axel-kicillof-anuncio-nuevas-medidas-economicas-provincia_0_abc123.html",
      resumen: "El gobernador Axel Kicillof presentó un paquete de medidas económicas destinadas a contrarrestar los efectos de la inflación en la provincia de Buenos Aires.",
      linkValido: true
    },
    {
      titulo: "Verónica Magario participó en el debate sobre el presupuesto provincial",
      fecha: new Date().toISOString(),
      url: "https://www.lanacion.com.ar/politica/veronica-magario-participo-debate-presupuesto-provincial-nid123456/",
      resumen: "La vicegobernadora Verónica Magario presidió la sesión del Senado bonaerense donde se debatió el presupuesto 2025 para la provincia de Buenos Aires.",
      linkValido: true
    },
    {
      titulo: "El Senado provincial aprobó la ley de emergencia económica",
      fecha: new Date().toISOString(),
      url: "https://www.pagina12.com.ar/senado-buenos-aires-ley-emergencia-economica-555666",
      resumen: "Con amplia mayoría, el Senado de la provincia de Buenos Aires aprobó la ley de emergencia económica impulsada por el gobierno de Axel Kicillof.",
      linkValido: true
    },
    {
      titulo: "Tensión entre Nación y Provincia por los fondos educativos",
      fecha: new Date().toISOString(),
      url: "https://www.infobae.com/politica/2025/05/18/tension-nacion-provincia-fondos-educativos/",
      resumen: "Crecen las tensiones entre el gobierno nacional y la provincia de Buenos Aires por el reparto de fondos destinados a educación.",
      linkValido: true
    },
    {
      titulo: "Espinosa criticó las políticas económicas del gobierno nacional",
      fecha: new Date().toISOString(),
      url: "https://www.ambito.com/politica/espinosa-critico-las-politicas-economicas-del-gobierno-nacional-n5123456",
      resumen: "El diputado Fernando Espinosa criticó duramente las políticas económicas implementadas por el gobierno nacional y su impacto en los municipios bonaerenses.",
      linkValido: true
    },
    {
      titulo: "Milei anunció nuevas medidas para reducir el gasto público",
      fecha: new Date().toISOString(),
      url: "https://www.latecla.info/politica/milei-anuncio-nuevas-medidas-reducir-gasto-publico",
      resumen: "El presidente Javier Milei presentó un paquete de medidas destinadas a reducir significativamente el gasto público y optimizar la administración estatal.",
      linkValido: true
    },
    {
      titulo: "Milei criticó duramente a los gobernadores provinciales",
      fecha: new Date().toISOString(),
      url: "https://www.latecla.info/politica/milei-critico-duramente-gobernadores-provinciales",
      resumen: "En una conferencia de prensa, el presidente Milei criticó la gestión de varios gobernadores provinciales y los acusó de no querer reducir gastos innecesarios.",
      linkValido: true
    },
    {
      titulo: "Kicillof visitó 25 de Mayo y apuntó contra el intendente que ahora es libertario",
      fecha: new Date().toISOString(),
      url: "https://www.latecla.info/158962-kicillof-visito-25-de-mayo-y-apunto-contra-el-intendente-que-ahora-es-libertario",
      resumen: "El gobernador Axel Kicillof realizó una visita a la localidad de 25 de Mayo donde criticó al intendente que recientemente se unió al partido libertario.",
      linkValido: true
    }
  ]
};

/**
 * Fetch news from the Python script
 */
export async function fetchNewsFromPythonScript(options: NewsSearchOptions): Promise<NewsItem[]> {
  try {
    if (API_CONFIG.useLocalMock) {
      // Return mock data for local development
      console.log("Using mock data for Python script response with options:", options);
      // Create a deep copy of mock data
      const mockData = JSON.parse(JSON.stringify(mockPythonResponse));
      
      // Filter news by sources if provided
      if (options.sources && options.sources.length > 0) {
        console.log("Filtering by sources:", options.sources);
        mockData.data = mockData.data?.filter(item => {
          try {
            const itemUrl = new URL(item.url);
            // Check if the item URL contains any of the source URLs
            return options.sources?.some(sourceUrl => {
              try {
                const source = new URL(sourceUrl);
                return itemUrl.hostname.includes(source.hostname) || 
                       source.hostname.includes(itemUrl.hostname);
              } catch {
                // If the source URL is invalid, try simple string matching
                return item.url.includes(sourceUrl);
              }
            });
          } catch {
            // If parsing URL fails, fall back to simple string matching
            return options.sources?.some(sourceUrl => item.url.includes(sourceUrl));
          }
        });
      }
      
      // Filter news by keywords if provided - improved matching
      if (options.keywords?.length) {
        // Convert all keywords to lowercase for case-insensitive matching
        const keywords = options.keywords.map(k => k.toLowerCase());
        console.log("Filtering by keywords:", keywords);
        
        mockData.data = mockData.data?.filter(item => 
          keywords.some(keyword => 
            (item.titulo?.toLowerCase().includes(keyword) || 
             item.resumen?.toLowerCase().includes(keyword))
          )
        );
      }
      
      // Filter by date if currentDateOnly is true
      if (options.currentDateOnly) {
        const today = new Date().toISOString().split('T')[0];
        mockData.data = mockData.data?.filter(item => {
          const itemDate = new Date(item.fecha).toISOString().split('T')[0];
          return itemDate === today;
        });
      }
      
      // Filter by valid links if validateLinks is true
      if (options.validateLinks) {
        mockData.data = mockData.data?.filter(item => item.linkValido !== false);
      }
      
      console.log("Found news items after filtering:", mockData.data?.length || 0);
      return transformPythonResponseToNewsItems(mockData);
    }

    // Prepare the request parameters
    const params = new URLSearchParams();
    if (options.keywords?.length) {
      params.append('keywords', options.keywords.join(','));
    }
    if (options.sources?.length) {
      params.append('sources', options.sources.join(','));
    }
    if (options.includeTwitter !== undefined) {
      params.append('include_twitter', options.includeTwitter.toString());
    }
    if (options.maxResults) {
      params.append('max_results', options.maxResults.toString());
    }
    if (options.validateLinks !== undefined) {
      params.append('validate_links', options.validateLinks.toString());
    }
    if (options.currentDateOnly !== undefined) {
      params.append('current_date_only', options.currentDateOnly.toString());
    }
    if (options.deepScrape !== undefined) {
      params.append('deep_scrape', options.deepScrape.toString());
    }

    // Make the API request
    console.log(`Fetching news from Python script with params: ${params.toString()}`);
    const response = await fetch(`${PYTHON_API_ENDPOINT}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const data: PythonNewsResponse = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.error || 'Unknown error from Python script');
    }
    
    return transformPythonResponseToNewsItems(data);
  } catch (error) {
    console.error("Error fetching news from Python script:", error);
    throw error;
  }
}

/**
 * Transform the Python script response to our NewsItem format
 */
function transformPythonResponseToNewsItems(response: PythonNewsResponse): NewsItem[] {
  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }
  
  // Filter out items with invalid links if they have linkValido property
  const validItems = response.data.filter(item => 
    item.linkValido === undefined || item.linkValido !== false
  );
  
  return validItems.map((item, index) => {
    try {
      // Extract domain for sourceName
      let sourceName = '';
      try {
        const url = new URL(item.url);
        sourceName = url.hostname.replace('www.', '');
      } catch (e) {
        sourceName = 'Fuente desconocida';
      }

      // Infer topics based on content
      const topics: string[] = inferTopicsFromText(`${item.titulo} ${item.resumen}`);

      return {
        id: `python-${index}-${Date.now()}`,
        title: item.titulo || 'Sin título',
        summary: item.resumen || '',
        date: item.fecha || new Date().toISOString(),
        sourceUrl: item.url,
        sourceName: sourceName,
        topics: topics,
      };
    } catch (error) {
      console.error("Error transforming news item:", error);
      return {
        id: `python-${index}-${Date.now()}`,
        title: item.titulo || 'Sin título',
        summary: item.resumen || '',
        date: item.fecha || new Date().toISOString(),
        sourceUrl: '#',
        sourceName: 'Fuente desconocida',
        topics: ['General'],
      };
    }
  });
}

/**
 * Validate if a URL is valid and working
 * This is a client-side validation, actual validation should be done server-side
 */
export async function validateUrl(url: string): Promise<boolean> {
  try {
    // For mock environment, always return true
    if (API_CONFIG.useLocalMock) {
      return true;
    }
    
    // In a real application, we would use a server-side function to check
    // Since we can't make cross-origin HEAD requests directly from the browser
    const response = await fetch(`${PYTHON_API_ENDPOINT}/validate?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error("Error validating URL:", error);
    return false;
  }
}

/**
 * Infer topics from text based on keywords
 */
function inferTopicsFromText(text: string): string[] {
  const topics: string[] = [];
  const normalizedText = text.toLowerCase();
  
  if (/econom[íi]a|inflaci[óo]n|d[óo]lar|finanzas|presupuesto|fiscal/i.test(normalizedText)) {
    topics.push('Economía');
  }
  
  if (/pol[íi]tica|gobierno|presidente|ministro|diputado|senador|candidato|elecci[óo]n/i.test(normalizedText)) {
    topics.push('Política');
  }
  
  if (/senado|legislatura|parlamento|c[áa]mara|congreso/i.test(normalizedText)) {
    topics.push('Legislativo');
  }
  
  if (/kicillof|axel|gobernador/i.test(normalizedText)) {
    topics.push('Gobierno Provincial');
  }
  
  if (/magario|ver[óo]nica|vicegobernadora/i.test(normalizedText)) {
    topics.push('Gobierno Provincial');
  }

  if (/educaci[óo]n|escuela|universidad|docente|estudiante/i.test(normalizedText)) {
    topics.push('Educación');
  }

  if (/salud|hospital|médico|enfermedad|pandemia|covid/i.test(normalizedText)) {
    topics.push('Salud');
  }
  
  // Ensure we have at least one topic
  if (topics.length === 0) {
    topics.push('General');
  }
  
  return topics;
}

export default {
  fetchNewsFromPythonScript,
  validateUrl
};
