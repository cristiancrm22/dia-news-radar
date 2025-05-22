
/**
 * Service to communicate with the Python news scraper
 */
import { NewsItem, PythonScriptNews, PythonScriptResponse, PythonScriptExecutionStatus } from "@/types/news";

// Define the API endpoint (this should be configured based on where the Python script is hosted)
const PYTHON_API_ENDPOINT = '/api/scrape-news';

// Configuration for the API
const API_CONFIG = {
  useLocalMock: true, // Set to false in production
  mockPythonExecution: true, // Simulate Python script execution
  mockCsvFilePath: '/data/radar/resultados.csv', // Mock CSV file path
};

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
  twitterUsers?: string[];
}

// Store Python script execution status globally
const pythonExecutionStatus: PythonScriptExecutionStatus = {
  running: false,
  completed: false,
  progress: 0,
  startTime: undefined,
  endTime: undefined,
  csvPath: undefined,
};

/**
 * Mock data for local development (simulating Python script response)
 */
const mockPythonResponse: PythonScriptResponse = {
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
    },
    {
      titulo: "Senado_BA: Se aprobó en comisión el proyecto de Kicillof",
      fecha: new Date().toISOString(),
      url: "https://twitter.com/Senado_BA/status/1795123456789",
      resumen: "La comisión de Presupuesto del Senado Bonaerense aprobó por mayoría el proyecto del gobernador Kicillof para redistribuir fondos a municipios afectados por recortes nacionales.",
      linkValido: true
    },
    {
      titulo: "Tweet de @VeronicaMagario sobre nuevos proyectos provinciales",
      fecha: new Date().toISOString(),
      url: "https://twitter.com/VeronicaMagario/status/1795234567890",
      resumen: "Seguimos trabajando por una provincia más justa. Hoy presentamos nuevos proyectos para mejorar la calidad de vida de los bonaerenses.",
      linkValido: true
    }
  ]
};

/**
 * Simulate Python script execution
 */
export async function executePythonScript(options: NewsSearchOptions): Promise<PythonScriptExecutionStatus> {
  // If script is already running, return current status
  if (pythonExecutionStatus.running) {
    return pythonExecutionStatus;
  }

  console.log("Starting Python script execution with options:", options);
  
  // Reset status
  pythonExecutionStatus.running = true;
  pythonExecutionStatus.completed = false;
  pythonExecutionStatus.progress = 0;
  pythonExecutionStatus.error = undefined;
  pythonExecutionStatus.startTime = new Date();
  pythonExecutionStatus.endTime = undefined;
  
  if (API_CONFIG.mockPythonExecution) {
    // Simulate script execution with progress updates
    return new Promise((resolve) => {
      const totalSteps = 10;
      let currentStep = 0;
      
      const interval = setInterval(() => {
        currentStep++;
        pythonExecutionStatus.progress = Math.round((currentStep / totalSteps) * 100);
        
        if (currentStep >= totalSteps) {
          clearInterval(interval);
          pythonExecutionStatus.running = false;
          pythonExecutionStatus.completed = true;
          pythonExecutionStatus.endTime = new Date();
          pythonExecutionStatus.csvPath = API_CONFIG.mockCsvFilePath;
          resolve(pythonExecutionStatus);
        }
      }, 300); // Simulate steps taking 300ms each
    });
  } else {
    // Real implementation would call the backend API to execute the Python script
    try {
      const params = new URLSearchParams();
      
      // Pass keywords (KEYWORDS in Python script)
      if (options.keywords?.length) {
        params.append('keywords', options.keywords.join(','));
      }
      
      // Pass news sources (NEWS_SOURCES in Python script)
      if (options.sources?.length) {
        params.append('sources', options.sources.join(','));
      }
      
      // Pass Twitter users (TWITTER_USERS in Python script)
      if (options.twitterUsers?.length) {
        params.append('twitter_users', options.twitterUsers.join(','));
      }
      
      // Execute script endpoint
      const response = await fetch(`${PYTHON_API_ENDPOINT}/execute?${params.toString()}`);
      const data = await response.json();
      
      pythonExecutionStatus.running = false;
      pythonExecutionStatus.completed = true;
      pythonExecutionStatus.progress = 100;
      pythonExecutionStatus.endTime = new Date();
      
      if (data.status === 'success') {
        pythonExecutionStatus.csvPath = data.csvPath;
      } else {
        pythonExecutionStatus.error = data.error;
      }
      
      return pythonExecutionStatus;
    } catch (error) {
      console.error("Error executing Python script:", error);
      pythonExecutionStatus.running = false;
      pythonExecutionStatus.error = error.message;
      return pythonExecutionStatus;
    }
  }
}

/**
 * Get Python script execution status
 */
export function getPythonExecutionStatus(): PythonScriptExecutionStatus {
  return pythonExecutionStatus;
}

/**
 * Load results from CSV file generated by Python script
 */
export async function loadResultsFromCsv(csvPath?: string): Promise<NewsItem[]> {
  if (API_CONFIG.useLocalMock) {
    console.log("Using mock data instead of loading from CSV");
    return transformPythonResponseToNewsItems(mockPythonResponse);
  }
  
  try {
    // In a real implementation, this would call the backend API to get the CSV content
    const response = await fetch(`${PYTHON_API_ENDPOINT}/csv?path=${encodeURIComponent(csvPath || pythonExecutionStatus.csvPath || '')}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    const parsedNews = parseCsvToNewsItems(csvContent);
    return parsedNews;
  } catch (error) {
    console.error("Error loading results from CSV:", error);
    return [];
  }
}

/**
 * Parse CSV content to NewsItem array
 */
function parseCsvToNewsItems(csvContent: string): NewsItem[] {
  if (!csvContent) return [];
  
  // Simple CSV parser
  const lines = csvContent.split('\n');
  if (lines.length < 2) return []; // Need at least header + one data row
  
  const headers = lines[0].split(',');
  const titleIndex = headers.indexOf('titulo');
  const dateIndex = headers.indexOf('fecha');
  const urlIndex = headers.indexOf('url');
  const summaryIndex = headers.indexOf('resumen');
  
  if (titleIndex === -1 || dateIndex === -1 || urlIndex === -1 || summaryIndex === -1) {
    console.error("CSV headers do not match expected format");
    return [];
  }
  
  const newsItems: NewsItem[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;
    
    // Extract values and clean quotes if present
    const title = cleanCsvValue(values[titleIndex]);
    const date = cleanCsvValue(values[dateIndex]);
    const url = cleanCsvValue(values[urlIndex]);
    const summary = cleanCsvValue(values[summaryIndex]);
    
    // Extract source name from URL
    let sourceName = 'Fuente desconocida';
    try {
      const urlObj = new URL(url);
      sourceName = urlObj.hostname.replace('www.', '');
    } catch {}
    
    // Infer topics
    const topics = inferTopicsFromText(`${title} ${summary}`);
    
    newsItems.push({
      id: `python-${i}-${Date.now()}`,
      title,
      summary,
      date,
      sourceUrl: url,
      sourceName,
      topics,
    });
  }
  
  return newsItems;
}

/**
 * Clean CSV value (remove quotes, etc.)
 */
function cleanCsvValue(value: string): string {
  if (!value) return '';
  // Remove surrounding quotes
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.substring(1, value.length - 1);
  }
  // Replace double quotes with single quotes
  value = value.replace(/""/g, '"');
  return value;
}

/**
 * Fetch news from the Python script
 */
export async function fetchNewsFromPythonScript(options: NewsSearchOptions): Promise<NewsItem[]> {
  try {
    console.log("Fetching news from Python script with options:", options);
    
    // First execute the Python script
    const executionStatus = await executePythonScript(options);
    
    // If using mocks, directly return the mock data
    if (API_CONFIG.useLocalMock) {
      console.log("Using mock data for Python script response");
      
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
      
      // Filter news by keywords if provided - improved case-insensitive matching
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
      
      // Filter Twitter results unless includeTwitter is true
      if (options.includeTwitter === false) {
        mockData.data = mockData.data?.filter(item => !item.url.includes('twitter.com'));
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

    // If execution failed, return empty array
    if (executionStatus.error) {
      console.error("Python script execution failed:", executionStatus.error);
      return [];
    }
    
    // If execution completed, load results from CSV
    if (executionStatus.completed && executionStatus.csvPath) {
      return loadResultsFromCsv(executionStatus.csvPath);
    }
    
    // If execution is still running, return empty array for now
    return [];
  } catch (error) {
    console.error("Error fetching news from Python script:", error);
    throw error;
  }
}

/**
 * Transform the Python script response to our NewsItem format
 */
function transformPythonResponseToNewsItems(response: PythonScriptResponse): NewsItem[] {
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
 * Export CSV with current news results
 */
export function exportNewsToCSV(news: NewsItem[]): string {
  // Create CSV header
  const header = ["titulo", "fecha", "url", "resumen"].join(",") + "\n";
  
  // Create CSV content
  const rows = news.map(item => {
    // Format each field properly for CSV (handle commas, quotes, etc.)
    const formattedTitle = `"${item.title.replace(/"/g, '""')}"`;
    const formattedDate = `"${item.date}"`;
    const formattedUrl = `"${item.sourceUrl}"`;
    const formattedSummary = `"${item.summary.replace(/"/g, '""')}"`;
    
    return [formattedTitle, formattedDate, formattedUrl, formattedSummary].join(",");
  });
  
  // Combine header and rows
  const csvContent = header + rows.join("\n");
  
  return csvContent;
}

/**
 * Download CSV file with news results
 */
export function downloadNewsCSV(news: NewsItem[], filename = "resultados.csv"): void {
  const csvContent = exportNewsToCSV(news);
  
  // Create a Blob with the CSV content
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  
  // Create download link
  const link = document.createElement("a");
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Set link attributes
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  
  // Add to document, click to download, then remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
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
  executePythonScript,
  getPythonExecutionStatus,
  loadResultsFromCsv,
  validateUrl,
  exportNewsToCSV,
  downloadNewsCSV
};
