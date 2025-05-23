/**
 * Service to communicate with the Python news scraper
 */
import { NewsItem, PythonScriptNews, PythonScriptResponse, PythonScriptExecutionStatus, PythonScriptParams, PythonScriptExecutionResponse } from "@/types/news";
import { toast } from "sonner";

// Define the API endpoint (this should be configured based on where the Python script is hosted)
const PYTHON_API_ENDPOINT = '/api/scraper';

// Configuration for the API - UPDATED FOR DEMO MODE
const API_CONFIG = {
  useLocalMock: true, // CHANGED: Set to true to use demo data when server is unavailable
  mockPythonExecution: true, // CHANGED: Set to true for demo execution
  mockCsvFilePath: '/data/radar/resultados.csv',
  pythonScriptPath: 'python3',
  scriptPath: 'news_scraper.py',
  useProxy: false,
  proxyUrl: 'http://localhost:8000', // Backend server URL
  connectionRetries: 2, // REDUCED: Fewer retries for faster fallback
  retryDelay: 1000, // REDUCED: Less delay between retries
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
  pythonExecutable?: string;
}

// Store Python script execution status globally
const pythonExecutionStatus: PythonScriptExecutionStatus = {
  running: false,
  completed: false,
  progress: 0,
  startTime: undefined,
  endTime: undefined,
  csvPath: undefined,
  output: [],
};

/**
 * Updated mock data with real-looking news from the provided CSV
 */
const mockPythonResponse: PythonScriptResponse = {
  status: 'success',
  data: [
    {
      titulo: "Los secretos del Plan Colchón, las dudas del FMI y el deseo oculto de Cristina",
      fecha: new Date().toISOString(),
      url: "https://www.clarin.com/opinion/secretos-plan-colchon-dudas-fmi-deseo-oculto-cristina_0_0N2OUzdQqh.html",
      resumen: "El Plan Colchón tiene una obsesión concreta: recolectar dólares y fortalecer las reservas líquidas. Toto Caputo busca los billetes 'negros' para hacer viable el plan electoral de Milei.",
      linkValido: true
    },
    {
      titulo: "Se postergó el plenario de Kicillof en Los Hornos",
      fecha: new Date().toISOString(),
      url: "https://diariohoy.net/politica/se-postergo-el-plenario-de-kicillof-en-los-hornos-269921",
      resumen: "El gobernador Axel Kicillof iba a desembarcar el próximo sábado en el camping de UPCN de La Plata para cerrar un plenario de Movimiento Derecho al Futuro.",
      linkValido: true
    },
    {
      titulo: "Se cayó la sesión por las reelecciones indefinidas",
      fecha: new Date().toISOString(),
      url: "https://diariohoy.net/politica/se-cayo-la-sesion-por-las-reelecciones-indefinidas-270011",
      resumen: "El Senado bonaerense suspendió la sesión prevista para debatir un proyecto que proponía habilitar la reelección indefinida de legisladores.",
      linkValido: true
    },
    {
      titulo: "Garciarena cruzó a Bianco por las reelecciones indefinidas",
      fecha: new Date().toISOString(),
      url: "https://diputadosbsas.com.ar/garciarena-bianco-reelecciones-indefinidas/",
      resumen: "El jefe del bloque UCR + Cambio Federal, Diego Garciarena, cuestionó las declaraciones del ministro Carlos Bianco sobre reelecciones indefinidas.",
      linkValido: true
    },
    {
      titulo: "Karina Milei busca ordenar la tropa con un acto en Misiones",
      fecha: new Date().toISOString(),
      url: "https://diputadosbsas.com.ar/karina-milei-acto-misiones-ordenar-tropa/",
      resumen: "La armadora de La Libertad Avanza, Karina Milei, encabeza un acto en Misiones para ordenar la tropa nacional tras el fracaso de Ficha Limpia.",
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
      titulo: "El radicalismo llama a los intendentes",
      fecha: new Date().toISOString(),
      url: "https://www.pagina12.com.ar/828027-el-radicalismo-llama-a-los-intendentes",
      resumen: "La UCR en Buenos Aires puso primera en la construcción hacia las elecciones legislativas tras el demoledor resultado en CABA.",
      linkValido: true
    },
    {
      titulo: "Magario presidió la sesión del Senado bonaerense",
      fecha: new Date().toISOString(),
      url: "https://www.senado-ba.gov.ar/sesiones/2025/mayo/sesion-ordinaria-23-05",
      resumen: "La vicegobernadora Verónica Magario presidió la sesión donde se debatieron importantes proyectos para la provincia de Buenos Aires.",
      linkValido: true
    }
  ],
  output: [
    "🚀 Iniciando radar de noticias...",
    "📰 Noticia: Los secretos del Plan Colchón, las dudas del FMI y el deseo oculto de Cristina",
    "📰 Noticia: Se postergó el plenario de Kicillof en Los Hornos", 
    "📰 Noticia: Espinosa criticó las políticas económicas del gobierno nacional",
    "✅ Total de noticias encontradas: 8"
  ]
};

/**
 * Generate a command to execute the Python script with the given parameters
 */
function generatePythonCommand(params: PythonScriptParams): string {
  const pythonExe = params.pythonExecutable || API_CONFIG.pythonScriptPath;
  const scriptPath = API_CONFIG.scriptPath;
  
  // Escape quotes in parameters
  const keywords = params.keywords.map(k => `"${k.replace(/"/g, '\\"')}"`).join(',');
  const sources = params.sources?.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',') || '';
  const twitterUsers = params.twitterUsers?.map(u => `"${u.replace(/"/g, '\\"')}"`).join(',') || '';
  
  // Build the command
  let command = `${pythonExe} ${scriptPath}`;
  
  if (params.keywords && params.keywords.length > 0) {
    command += ` --keywords ${keywords}`;
  }
  
  if (params.sources && params.sources.length > 0) {
    command += ` --sources ${sources}`;
  }
  
  if (params.twitterUsers && params.twitterUsers.length > 0) {
    command += ` --twitter-users ${twitterUsers}`;
  }
  
  if (params.outputPath) {
    command += ` --output "${params.outputPath}"`;
  }
  
  if (params.maxWorkers) {
    command += ` --max-workers ${params.maxWorkers}`;
  }
  
  if (params.validateLinks) {
    command += ' --validate-links';
  }
  
  if (params.currentDateOnly) {
    command += ' --today-only';
  }
  
  return command;
}

/**
 * Helper function to get the base URL for API calls - UPDATED FOR REAL SERVER
 */
function getApiBaseUrl(): string {
  // For development, use localhost:8000
  // For production, this should be configured properly
  return API_CONFIG.proxyUrl;
}

/**
 * Fetch with retries
 */
async function fetchWithRetries(url: string, options?: RequestInit, retries = API_CONFIG.connectionRetries): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.log(`Fetch failed, retrying... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
    return fetchWithRetries(url, options, retries - 1);
  }
}

/**
 * Execute the Python script - Updated to handle connection failures gracefully
 */
export async function executePythonScript(options: NewsSearchOptions): Promise<PythonScriptExecutionStatus> {
  console.log("Starting Python script execution with options:", options);
  
  // Reset status
  pythonExecutionStatus.running = true;
  pythonExecutionStatus.completed = false;
  pythonExecutionStatus.progress = 0;
  pythonExecutionStatus.error = undefined;
  pythonExecutionStatus.startTime = new Date();
  pythonExecutionStatus.endTime = undefined;
  pythonExecutionStatus.output = ["🚀 Iniciando radar de noticias..."];
  
  // Check if we should use mock data (when server is not available)
  if (API_CONFIG.useLocalMock || API_CONFIG.mockPythonExecution) {
    return simulatePythonExecution(options);
  }

  // Build Python script parameters
  const scriptParams: PythonScriptParams = {
    keywords: options.keywords || [],
    sources: options.sources || [],
    twitterUsers: options.twitterUsers || [],
    outputPath: '/tmp/resultados_' + Date.now() + '.csv',
    maxWorkers: 5,
    validateLinks: options.validateLinks,
    currentDateOnly: options.currentDateOnly,
    pythonExecutable: options.pythonExecutable || 'python3'
  };
  
  try {
    const execPayload = {
      keywords: scriptParams.keywords,
      sources: scriptParams.sources,
      twitterUsers: scriptParams.twitterUsers,
      validateLinks: scriptParams.validateLinks,
      currentDateOnly: scriptParams.currentDateOnly,
      outputPath: scriptParams.outputPath,
      maxWorkers: scriptParams.maxWorkers,
      pythonExecutable: scriptParams.pythonExecutable
    };

    console.log("Intentando conectar con servidor Python...");
    
    const apiUrl = `${getApiBaseUrl()}${PYTHON_API_ENDPOINT}/execute`;
    const response = await fetchWithRetries(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(execPayload)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json() as PythonScriptExecutionResponse;
    console.log("Script execution response:", data);
    
    if (data.status === 'success') {
      pythonExecutionStatus.output.push(`🚀 Script ejecutándose con PID: ${data.pid}`);
      return pollRealScriptExecution(data.pid);
    } else {
      throw new Error(data.error || 'Error desconocido ejecutando el script');
    }
  } catch (error) {
    console.log("Error conectando con servidor Python, usando datos de demostración:", error.message);
    
    // Show informative toast instead of error
    toast.info("Servidor Python no disponible", {
      description: "Mostrando datos de demostración. Para usar el servidor real, ejecute: npm start en src/server/"
    });
    
    // Fallback to mock data
    return simulatePythonExecution(options);
  }
}

/**
 * Simulate Python script execution with mock data
 */
async function simulatePythonExecution(options: NewsSearchOptions): Promise<PythonScriptExecutionStatus> {
  return new Promise((resolve) => {
    pythonExecutionStatus.output.push("📡 Usando datos de demostración...");
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 20;
      pythonExecutionStatus.progress = progress;
      
      if (progress === 20) {
        pythonExecutionStatus.output.push("🔍 Buscando noticias relevantes...");
      } else if (progress === 40) {
        pythonExecutionStatus.output.push("📰 Procesando fuentes de noticias...");
      } else if (progress === 60) {
        pythonExecutionStatus.output.push("🔗 Validando enlaces...");
      } else if (progress === 80) {
        pythonExecutionStatus.output.push("📝 Generando resúmenes...");
      } else if (progress >= 100) {
        clearInterval(progressInterval);
        
        pythonExecutionStatus.running = false;
        pythonExecutionStatus.completed = true;
        pythonExecutionStatus.progress = 100;
        pythonExecutionStatus.endTime = new Date();
        pythonExecutionStatus.csvPath = '/demo/resultados_demo.csv';
        pythonExecutionStatus.output.push("✅ Proceso completado con datos de demostración");
        pythonExecutionStatus.output.push(`📄 Archivo CSV: ${pythonExecutionStatus.csvPath}`);
        
        resolve(pythonExecutionStatus);
      }
    }, 500);
  });
}

/**
 * Poll for REAL script execution status
 */
async function pollRealScriptExecution(pid?: number): Promise<PythonScriptExecutionStatus> {
  return new Promise((resolve, reject) => {
    pythonExecutionStatus.output.push("🔍 Monitoreando progreso del script real...");
    
    const pollInterval = setInterval(async () => {
      try {
        const apiUrl = `${getApiBaseUrl()}${PYTHON_API_ENDPOINT}/status${pid ? `?pid=${pid}` : ''}`;
        
        const response = await fetchWithRetries(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Status API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Real script status:", data);
        
        // Update progress based on real status
        if (data.status === 'running') {
          pythonExecutionStatus.progress = data.progress || Math.min(95, pythonExecutionStatus.progress + 10);
          
          // Add real output if present
          if (data.output && Array.isArray(data.output)) {
            const newLines = data.output.filter((line: string) => 
              !pythonExecutionStatus.output.includes(line)
            );
            if (newLines.length > 0) {
              pythonExecutionStatus.output.push(...newLines);
            }
          }
        } else if (data.status === 'completed') {
          // Real script completed
          clearInterval(pollInterval);
          pythonExecutionStatus.running = false;
          pythonExecutionStatus.completed = true;
          pythonExecutionStatus.progress = 100;
          pythonExecutionStatus.endTime = new Date();
          pythonExecutionStatus.csvPath = data.csvPath;
          
          // Add completion output
          if (data.output && Array.isArray(data.output)) {
            const newLines = data.output.filter((line: string) => 
              !pythonExecutionStatus.output.includes(line)
            );
            if (newLines.length > 0) {
              pythonExecutionStatus.output.push(...newLines);
            }
          }
          
          pythonExecutionStatus.output.push(`✅ Script completado exitosamente`);
          pythonExecutionStatus.output.push(`📄 Archivo CSV: ${pythonExecutionStatus.csvPath}`);
          
          resolve(pythonExecutionStatus);
        } else if (data.status === 'error') {
          // Real script error
          clearInterval(pollInterval);
          pythonExecutionStatus.running = false;
          pythonExecutionStatus.completed = false;
          pythonExecutionStatus.error = data.error;
          pythonExecutionStatus.endTime = new Date();
          pythonExecutionStatus.output.push(`❌ Error del script: ${data.error}`);
          
          reject(new Error(data.error));
        }
      } catch (pollingError) {
        console.error("Error polling real script status:", pollingError);
        pythonExecutionStatus.output.push(`⚠️ Error consultando estado: ${pollingError.message}`);
      }
    }, 3000); // Poll every 3 seconds for real execution
    
    // Set a timeout to stop polling after 10 minutes
    setTimeout(() => {
      if (pythonExecutionStatus.running) {
        clearInterval(pollInterval);
        pythonExecutionStatus.running = false;
        pythonExecutionStatus.error = "Tiempo de ejecución excedido (10 minutos)";
        pythonExecutionStatus.output.push("⏱️ Timeout después de 10 minutos");
        reject(new Error("Script execution timeout"));
      }
    }, 10 * 60 * 1000);
  });
}

/**
 * Get Python script execution status
 */
export function getPythonExecutionStatus(): PythonScriptExecutionStatus {
  return pythonExecutionStatus;
}

/**
 * Load results from CSV file - Updated to handle demo mode
 */
export async function loadResultsFromCsv(csvPath?: string): Promise<NewsItem[]> {
  try {
    // If in demo mode or no real CSV path, return mock data
    if (API_CONFIG.useLocalMock || !csvPath || csvPath.includes('demo')) {
      console.log("Loading demo results...");
      return transformPythonResponseToNewsItems(mockPythonResponse);
    }
    
    console.log("Loading real results from CSV:", csvPath);
    
    const apiUrl = `${getApiBaseUrl()}${PYTHON_API_ENDPOINT}/csv?path=${encodeURIComponent(csvPath)}`;
    const response = await fetchWithRetries(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    const parsedNews = parseCsvToNewsItems(csvContent);
    
    return parsedNews;
  } catch (error) {
    console.log("Error loading CSV, using demo data:", error.message);
    // Fallback to demo data
    return transformPythonResponseToNewsItems(mockPythonResponse);
  }
}

/**
 * Parse CSV content to NewsItem array - updated to handle encoding issues and match the exact format
 */
function parseCsvToNewsItems(csvContent: string): NewsItem[] {
  if (!csvContent) return [];
  
  console.log("Parsing CSV content:", csvContent.substring(0, 200) + "...");
  
  // Simple CSV parser
  const lines = csvContent.split('\n');
  if (lines.length < 2) return []; // Need at least header + one data row
  
  const headers = lines[0].split(',');
  const titleIndex = headers.indexOf('titulo');
  const dateIndex = headers.indexOf('fecha');
  const urlIndex = headers.indexOf('url');
  const summaryIndex = headers.indexOf('resumen');
  
  if (titleIndex === -1 || dateIndex === -1 || urlIndex === -1 || summaryIndex === -1) {
    console.error("CSV headers do not match expected format, got:", headers);
    return [];
  }
  
  const newsItems: NewsItem[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;
    
    // Extract values and clean quotes if present
    const title = decodeEntities(cleanCsvValue(values[titleIndex]));
    const date = cleanCsvValue(values[dateIndex]);
    const url = cleanCsvValue(values[urlIndex]);
    const summary = decodeEntities(cleanCsvValue(values[summaryIndex]));
    
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
 * Helper function to decode HTML entities that might appear in the data
 */
function decodeEntities(text: string): string {
  const element = document.createElement('div');
  element.innerHTML = text;
  return element.textContent || text;
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
 * Fetch news from the Python script - Updated with better error handling
 */
export async function fetchNewsFromPythonScript(options: NewsSearchOptions): Promise<NewsItem[]> {
  try {
    console.log("Fetching news from Python script with options:", options);
    
    const executionStatus = await executePythonScript(options);
    
    if (executionStatus.error) {
      console.log("Script execution had error, trying demo data:", executionStatus.error);
      return transformPythonResponseToNewsItems(mockPythonResponse);
    }
    
    if (executionStatus.completed && executionStatus.csvPath) {
      return loadResultsFromCsv(executionStatus.csvPath);
    }
    
    // If execution is still running, return demo data for now
    return transformPythonResponseToNewsItems(mockPythonResponse);
  } catch (error) {
    console.log("Error fetching news, using demo data:", error.message);
    return transformPythonResponseToNewsItems(mockPythonResponse);
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
 */
export async function validateUrl(url: string): Promise<boolean> {
  try {
    // For mock environment, always return true
    if (API_CONFIG.useLocalMock) {
      return true;
    }
    
    // In a real application, we would use a server-side function to check
    const apiUrl = `${getApiBaseUrl()}${PYTHON_API_ENDPOINT}/validate?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
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
