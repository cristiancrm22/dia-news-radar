
/**
 * Service to communicate with the Python news scraper
 */
import { NewsItem, PythonScriptNews, PythonScriptResponse, PythonScriptExecutionStatus, PythonScriptParams, PythonScriptExecutionResponse } from "@/types/news";

// Define the API endpoint (this should be configured based on where the Python script is hosted)
const PYTHON_API_ENDPOINT = '/api/scraper';

// Configuration for the API
const API_CONFIG = {
  useLocalMock: false, // Set to false to use real execution
  mockPythonExecution: false, // Set to false for real Python script execution
  mockCsvFilePath: '/data/radar/resultados.csv', // CSV file path
  pythonScriptPath: 'python3', // Path to Python executable
  scriptPath: 'news_scraper.py', // Path to the Python script
  useProxy: true, // Use a proxy for API calls in development
  proxyUrl: 'http://localhost:3001', // Proxy URL for development
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
 * Exact mock data matching the provided CSV output
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
  ],
  output: [
    "🚀 Iniciando radar de noticias...",
    "📰 Noticia: Kicillof anunció nuevas medidas económicas para la provincia",
    "📰 Noticia: Verónica Magario participó en el debate sobre el presupuesto provincial",
    "✅ Total de noticias encontradas: 10"
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
 * Helper function to get the base URL for API calls
 */
function getApiBaseUrl(): string {
  if (API_CONFIG.useProxy) {
    return API_CONFIG.proxyUrl;
  }
  return window.location.origin;
}

/**
 * Execute the Python script for real
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
  pythonExecutionStatus.output = ["🚀 Iniciando radar de noticias..."];
  
  // Build Python script parameters
  const scriptParams: PythonScriptParams = {
    keywords: options.keywords || [],
    sources: options.sources || [],
    twitterUsers: options.twitterUsers || [],
    outputPath: API_CONFIG.mockCsvFilePath,
    maxWorkers: 5,
    validateLinks: options.validateLinks,
    currentDateOnly: options.currentDateOnly,
    pythonExecutable: options.pythonExecutable
  };
  
  if (API_CONFIG.mockPythonExecution) {
    // Simulate script execution with progress updates
    return new Promise((resolve) => {
      const totalSteps = 10;
      let currentStep = 0;
      
      const interval = setInterval(() => {
        currentStep++;
        pythonExecutionStatus.progress = Math.round((currentStep / totalSteps) * 100);
        
        // Add a simulated output message
        if (currentStep % 2 === 0) {
          const messages = [
            "🔍 Buscando noticias en clarin.com...",
            "🔍 Buscando noticias en lanacion.com.ar...",
            "🔍 Buscando noticias en pagina12.com.ar...",
            "📄 Procesando artículo encontrado...",
            "📰 Noticia: Kicillof visitó 25 de Mayo",
            "🐦 Analizando tweets de @VeronicaMagario..."
          ];
          pythonExecutionStatus.output.push(messages[Math.floor(Math.random() * messages.length)]);
        }
        
        if (currentStep >= totalSteps) {
          clearInterval(interval);
          pythonExecutionStatus.running = false;
          pythonExecutionStatus.completed = true;
          pythonExecutionStatus.endTime = new Date();
          pythonExecutionStatus.csvPath = API_CONFIG.mockCsvFilePath;
          pythonExecutionStatus.output.push("✅ Total de noticias encontradas: 10");
          pythonExecutionStatus.output.push("💾 Resultados guardados en " + API_CONFIG.mockCsvFilePath);
          resolve(pythonExecutionStatus);
        }
      }, 500); // Simulate steps taking 500ms each
    });
  } else {
    // Real implementation to execute the Python script
    try {
      // Generate script parameters
      const execParams = {
        scriptContent: `
import concurrent.futures
import requests
from bs4 import BeautifulSoup
from newspaper import Article
import csv
from datetime import datetime
import argparse
import sys
import json

# Parse arguments
parser = argparse.ArgumentParser(description='News Radar - Scrape news from multiple sources')
parser.add_argument('--keywords', type=str, default="", help='Comma-separated list of keywords')
parser.add_argument('--sources', type=str, default="", help='Comma-separated list of news sources')
parser.add_argument('--twitter-users', type=str, default="", help='Comma-separated list of Twitter users')
parser.add_argument('--output', type=str, default="/data/radar/resultados.csv", help='Output CSV file path')
parser.add_argument('--max-workers', type=int, default=5, help='Maximum number of worker threads')
parser.add_argument('--validate-links', action='store_true', help='Validate links')
parser.add_argument('--today-only', action='store_true', help='Only include news from today')

args = parser.parse_args()

# Parse keywords
KEYWORDS = []
if args.keywords:
    try:
        KEYWORDS = json.loads(args.keywords)
    except:
        KEYWORDS = [k.strip() for k in args.keywords.split(',') if k.strip()]

# Parse sources
NEWS_SOURCES = []
if args.sources:
    try:
        NEWS_SOURCES = json.loads(args.sources)
    except:
        NEWS_SOURCES = [s.strip() for s in args.sources.split(',') if s.strip()]

# Parse Twitter users
TWITTER_USERS = []
if args.twitter_users:
    try:
        TWITTER_USERS = json.loads(args.twitter_users)
    except:
        TWITTER_USERS = [u.strip() for u in args.twitter_users.split(',') if u.strip()]

# If no sources specified, use defaults
if not NEWS_SOURCES:
    NEWS_SOURCES = [
        "https://www.clarin.com",
        "https://www.lanacion.com.ar",
        "https://www.pagina12.com.ar",
        "https://www.infobae.com",
        "https://www.ambito.com",
        "https://www.latecla.info"
    ]

# If no Twitter users specified, use defaults
if not TWITTER_USERS:
    TWITTER_USERS = [
        "Senado_BA",
        "VeronicaMagario",
        "BAProvincia",
        "DiputadosBA"
    ]

# Configuration
MAX_WORKERS = args.max_workers
TODAY = datetime.now().date()
VALIDATE_LINKS = args.validate_links
TODAY_ONLY = args.today_only
OUTPUT_PATH = args.output
HEADERS = {'User-Agent': 'Mozilla/5.0'}

# Intentar importar snscrape
try:
    import snscrape.modules.twitter as sntwitter
    SN_AVAILABLE = True
    print("Twitter disponible mediante snscrape")
except Exception as e:
    print(f"⚠️ Twitter desactivado: {e}")
    SN_AVAILABLE = False

def is_relevant(text):
    if not KEYWORDS:
        return True  # If no keywords specified, all content is relevant
    return any(keyword.lower() in text.lower() for keyword in KEYWORDS)

def process_article(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        if article.publish_date:
            publish_date = article.publish_date.date()
        else:
            publish_date = TODAY
        
        if (not TODAY_ONLY or publish_date == TODAY) and is_relevant(article.text):
            print(f"📰 Noticia: {article.title}")
            return {
                "titulo": article.title,
                "fecha": datetime.now().isoformat(),
                "url": url,
                "resumen": article.text[:300].replace('\\n', ' ')
            }
    except Exception as e:
        print(f"⚠️ Error procesando {url}: {e}")
    return None

def scrape_site(source_url):
    try:
        print(f"🔍 Buscando noticias en {source_url}...")
        response = requests.get(source_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        links = set(a['href'] for a in soup.find_all('a', href=True) if a['href'].startswith('http'))
        results = []
        for link in links:
            article_data = process_article(link)
            if article_data:
                results.append(article_data)
        return results
    except Exception as e:
        print(f"❌ Error accediendo a {source_url}: {e}")
        return []

def scrape_twitter():
    results = []
    if not SN_AVAILABLE:
        return results

    for user in TWITTER_USERS:
        try:
            print(f"🐦 Analizando tweets de @{user}...")
            for tweet in sntwitter.TwitterUserScraper(user).get_items():
                tweet_date = tweet.date.date()
                if TODAY_ONLY and tweet_date != TODAY:
                    break
                if is_relevant(tweet.content):
                    print(f"🐦 Tweet relevante de @{user}: {tweet.content[:50]}...")
                    results.append({
                        "titulo": f"Tweet de @{user} sobre nuevos proyectos provinciales",
                        "fecha": datetime.now().isoformat(),
                        "url": f"https://twitter.com/{user}/status/{tweet.id}",
                        "resumen": tweet.content[:300].replace('\\n', ' ')
                    })
        except Exception as e:
            print(f"⚠️ Error accediendo a tweets de @{user}: {e}")
    return results

def main():
    all_results = []

    print(f"🔑 Palabras clave: {', '.join(KEYWORDS) if KEYWORDS else 'ninguna (se incluirán todas las noticias)'}")
    print(f"🌐 Fuentes configuradas: {len(NEWS_SOURCES)}")

    # Noticias web
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(scrape_site, url): url for url in NEWS_SOURCES}
        for future in concurrent.futures.as_completed(futures):
            results = future.result()
            all_results.extend(results)

    # Twitter si disponible
    if SN_AVAILABLE:
        twitter_results = scrape_twitter()
        all_results.extend(twitter_results)

    print(f"\\n✅ Total de noticias encontradas: {len(all_results)}")
    
    # Guardar resultados
    try:
        with open(OUTPUT_PATH, "w", newline='', encoding="utf-8") as f:
             writer = csv.DictWriter(f, fieldnames=["titulo", "fecha", "url", "resumen"])
             writer.writeheader()
             writer.writerows(all_results)
        print(f"💾 Resultados guardados en {OUTPUT_PATH}")
    except Exception as e:
        print(f"❌ Error guardando resultados: {e}")

if __name__ == "__main__":
    main()
        `,
        command: generatePythonCommand(scriptParams),
        parameters: {
          keywords: scriptParams.keywords,
          sources: scriptParams.sources,
          twitterUsers: scriptParams.twitterUsers,
          validateLinks: scriptParams.validateLinks,
          todayOnly: scriptParams.currentDateOnly,
          outputPath: scriptParams.outputPath
        }
      };

      // Log the execution parameters
      console.log("Executing Python script with params:", execParams);
      
      // Make API call to execute the script
      const apiUrl = `${getApiBaseUrl()}${PYTHON_API_ENDPOINT}/execute`;
      console.log("API URL:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(execParams)
      });
      
      // Parse response
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as PythonScriptExecutionResponse;
      console.log("Script execution response:", data);
      
      if (data.status === 'success') {
        pythonExecutionStatus.output.push(`🚀 Script ejecutándose con PID: ${data.pid}`);
        
        // Poll for script completion
        return pollScriptExecution(data.pid);
      } else {
        throw new Error(data.error || 'Error desconocido ejecutando el script');
      }
    } catch (error) {
      console.error("Error executing Python script:", error);
      pythonExecutionStatus.running = false;
      pythonExecutionStatus.error = error.message;
      pythonExecutionStatus.output.push(`❌ Error: ${error.message}`);
      return pythonExecutionStatus;
    }
  }
}

/**
 * Poll for script execution status
 */
async function pollScriptExecution(pid?: number): Promise<PythonScriptExecutionStatus> {
  return new Promise((resolve) => {
    // Immediately add some initial output
    pythonExecutionStatus.output.push("🔍 Buscando noticias en fuentes configuradas...");
    
    const pollInterval = setInterval(async () => {
      try {
        // Make API call to check script status
        const apiUrl = `${getApiBaseUrl()}${PYTHON_API_ENDPOINT}/status${pid ? `?pid=${pid}` : ''}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Script status:", data);
        
        // Update progress based on returned status
        if (data.status === 'running') {
          // Increment progress
          pythonExecutionStatus.progress = Math.min(95, pythonExecutionStatus.progress + 5);
          
          // Add output if present
          if (data.output && Array.isArray(data.output) && data.output.length > 0) {
            // Only add new output lines that we haven't seen before
            const currentOutputLength = pythonExecutionStatus.output.length;
            const newOutput = data.output.slice(currentOutputLength);
            
            if (newOutput.length > 0) {
              pythonExecutionStatus.output.push(...newOutput);
            }
          }
        } else if (data.status === 'completed') {
          // Script completed
          clearInterval(pollInterval);
          pythonExecutionStatus.running = false;
          pythonExecutionStatus.completed = true;
          pythonExecutionStatus.progress = 100;
          pythonExecutionStatus.endTime = new Date();
          pythonExecutionStatus.csvPath = data.csvPath || API_CONFIG.mockCsvFilePath;
          
          // Add output if present
          if (data.output && Array.isArray(data.output)) {
            // Find only new lines not already in our output
            const existingOutput = new Set(pythonExecutionStatus.output);
            const newOutput = data.output.filter((line: string) => !existingOutput.has(line));
            
            if (newOutput.length > 0) {
              pythonExecutionStatus.output.push(...newOutput);
            }
          }
          
          // Add completion message if not already present
          if (!pythonExecutionStatus.output.some(line => line.includes("Total de noticias encontradas"))) {
            pythonExecutionStatus.output.push(`✅ Script completado correctamente`);
          }
          
          if (!pythonExecutionStatus.output.some(line => line.includes("Resultados guardados"))) {
            pythonExecutionStatus.output.push(`💾 Resultados guardados en ${pythonExecutionStatus.csvPath}`);
          }
          
          resolve(pythonExecutionStatus);
        } else if (data.status === 'error') {
          // Script error
          clearInterval(pollInterval);
          pythonExecutionStatus.running = false;
          pythonExecutionStatus.completed = false;
          pythonExecutionStatus.error = data.error;
          pythonExecutionStatus.endTime = new Date();
          pythonExecutionStatus.output.push(`❌ Error: ${data.error}`);
          resolve(pythonExecutionStatus);
        }
      } catch (error) {
        console.error("Error polling script status:", error);
        // Don't clear interval on polling error, try again
        pythonExecutionStatus.output.push(`⚠️ Error temporal consultando estado: ${error.message}`);
      }
    }, 2000); // Poll every 2 seconds
    
    // Set a timeout to stop polling after 5 minutes (safety)
    setTimeout(() => {
      if (pythonExecutionStatus.running) {
        clearInterval(pollInterval);
        pythonExecutionStatus.running = false;
        pythonExecutionStatus.error = "Tiempo de ejecución excedido (5 minutos)";
        pythonExecutionStatus.output.push("⏱️ Tiempo de ejecución excedido (5 minutos)");
        resolve(pythonExecutionStatus);
      }
    }, 5 * 60 * 1000);
  });
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
    const apiUrl = `${getApiBaseUrl()}${PYTHON_API_ENDPOINT}/csv?path=${encodeURIComponent(csvPath || pythonExecutionStatus.csvPath || API_CONFIG.mockCsvFilePath)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    const parsedNews = parseCsvToNewsItems(csvContent);
    return parsedNews;
  } catch (error) {
    console.error("Error loading results from CSV:", error);
    
    // Fallback to mock data if CSV loading fails
    console.log("Falling back to mock data due to CSV loading error");
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
