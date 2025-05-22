
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Clock, Download, Terminal } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import NewsCard from "@/components/NewsCard";
import SourcesConfig from "@/components/SourcesConfig";
import WhatsAppConfig from "@/components/WhatsAppConfig";
import EmailConfig from "@/components/EmailConfig";
import KeywordsConfig from "@/components/KeywordsConfig";
import NewsService from "@/services/NewsService";
import { NewsItem, PythonScriptExecutionStatus } from "@/types/news";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";

const Index = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState("noticias");
  const [includeTwitter, setIncludeTwitter] = useState(true);
  const [todayOnly, setTodayOnly] = useState(true);
  const [validateLinks, setValidateLinks] = useState(true);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [lastSearchTime, setLastSearchTime] = useState<Date | null>(null);
  const [pythonStatus, setPythonStatus] = useState<PythonScriptExecutionStatus | null>(null);
  const [pythonOutput, setPythonOutput] = useState<string[]>([]);
  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    // Fetch news on component mount
    fetchNews();
    
    // Load search settings
    const settings = NewsService.getSearchSettings();
    setKeywords(settings.keywords || []);
    setIncludeTwitter(settings.includeTwitter);
    setTodayOnly(settings.currentDateOnly || true);
    setValidateLinks(settings.validateLinks || true);
  }, []);

  useEffect(() => {
    // This effect will run when the selected tab changes to "noticias"
    // to refresh the news with the latest keywords
    if (selectedTab === "noticias") {
      // Load the latest keywords
      const settings = NewsService.getSearchSettings();
      setKeywords(settings.keywords || []);
    }
  }, [selectedTab]);
  
  // Set up interval to check Python script status
  useEffect(() => {
    if (!loading) return;
    
    const interval = setInterval(() => {
      const status = NewsService.getPythonScriptStatus();
      setPythonStatus(status);
      setSearchProgress(status.progress);
      
      // Simulate Python script output
      if (status.running && Math.random() > 0.7) {
        // Add a random output message
        const outputs = [
          "🔍 Buscando noticias en clarin.com...",
          "🔍 Buscando noticias en lanacion.com.ar...",
          "🔍 Buscando noticias en pagina12.com.ar...",
          "🔍 Buscando noticias en infobae.com...",
          "🔍 Buscando noticias en latecla.info...",
          "📄 Procesando artículo encontrado...",
          "📰 Noticia: Kicillof visitó 25 de Mayo y apuntó contra el intendente que ahora es libertario",
          "📰 Noticia: Milei criticó duramente a los gobernadores provinciales",
          "📰 Noticia: El Senado provincial aprobó la ley de emergencia económica",
          "🐦 Analizando tweets de @Senado_BA...",
          "🐦 Analizando tweets de @VeronicaMagario..."
        ];
        
        setPythonOutput(prev => [...prev, outputs[Math.floor(Math.random() * outputs.length)]]);
      }
      
      // If script completed, clear interval
      if (status.completed) {
        clearInterval(interval);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [loading]);

  const fetchNews = async () => {
    setLoading(true);
    setSearchProgress(0);
    setPythonStatus(null);
    setPythonOutput([]);
    
    try {
      // Update search settings with the current keywords
      const currentSettings = NewsService.getSearchSettings();
      // Re-fetch latest keywords in case they were updated in the keywords tab
      const latestSettings = NewsService.getSearchSettings();
      setKeywords(latestSettings.keywords || []);
      
      // Show initial Python output
      setPythonOutput([
        "🚀 Iniciando radar de noticias...",
        `🔍 Palabras clave: ${latestSettings.keywords.join(', ')}`,
        "🌐 Buscando en fuentes configuradas..."
      ]);
      
      NewsService.updateSearchSettings({
        ...currentSettings,
        includeTwitter: includeTwitter,
        keywords: latestSettings.keywords || [],
        currentDateOnly: todayOnly,
        validateLinks: validateLinks,
        deepScrape: true // Enable deep scraping of internal pages
      });
      
      const fetchedNews = await NewsService.getNews();
      setNews(Array.isArray(fetchedNews) ? fetchedNews : []);
      // Update the last search time
      setLastSearchTime(new Date());
      
      // Complete the progress bar
      setSearchProgress(100);
      
      // Add final Python output
      setPythonOutput(prev => [
        ...prev,
        `✅ Total de noticias encontradas: ${fetchedNews.length}`,
        "💾 Resultados guardados en /data/radar/resultados.csv"
      ]);
      
      toast({
        title: "Noticias actualizadas",
        description: `Se cargaron ${fetchedNews.length} noticias`,
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      setNews([]);
      
      // Add error to Python output
      setPythonOutput(prev => [
        ...prev,
        "❌ Error en la búsqueda de noticias",
        `❌ ${error}`
      ]);
      
      toast({
        title: "Error",
        description: "No se pudieron cargar las noticias",
        variant: "destructive",
      });
    } finally {
      // Ensure progress bar is complete
      setSearchProgress(100);
      
      // Reset progress after a delay
      setTimeout(() => {
        setSearchProgress(0);
        setLoading(false);
      }, 500);
    }
  };
  
  // Function to download results as CSV
  const downloadResults = () => {
    if (news && news.length > 0) {
      NewsService.downloadNewsAsCSV(news);
      toast({
        title: "Descarga iniciada",
        description: "Se está descargando el archivo resultados.csv"
      });
    } else {
      toast({
        title: "Sin resultados",
        description: "No hay noticias para descargar",
        variant: "destructive"
      });
    }
  };

  // Aseguramos que news siempre es un array para evitar errores
  const safeNews = Array.isArray(news) ? news : [];

  // Format the last search time
  const formatLastSearchTime = () => {
    if (!lastSearchTime) return "Nunca";
    return format(lastSearchTime, "dd/MM/yyyy HH:mm:ss", { locale: es });
  };

  // Format Python script execution time
  const getPythonScriptInfo = () => {
    if (!pythonStatus) return null;
    
    if (pythonStatus.running) {
      return "Ejecutando script de Python...";
    }
    
    if (pythonStatus.error) {
      return `Error: ${pythonStatus.error}`;
    }
    
    if (pythonStatus.completed) {
      const startTime = pythonStatus.startTime ? new Date(pythonStatus.startTime) : null;
      const endTime = pythonStatus.endTime ? new Date(pythonStatus.endTime) : null;
      
      if (startTime && endTime) {
        const duration = (endTime.getTime() - startTime.getTime()) / 1000;
        return `Script completado en ${duration.toFixed(1)} segundos`;
      }
      
      return "Script completado";
    }
    
    return null;
  };

  // Toggle Python output display
  const togglePythonOutput = () => {
    setShowOutput(!showOutput);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gradient bg-gradient-to-r from-blue-600 to-blue-900 bg-clip-text text-transparent">
          Radar de Noticias
        </h1>
        <p className="text-gray-600 mt-2">
          Monitoreo de noticias en tiempo real de las fuentes más importantes
        </p>
      </header>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-8">
          <TabsTrigger value="noticias">Noticias</TabsTrigger>
          <TabsTrigger value="palabras">Palabras</TabsTrigger>
          <TabsTrigger value="fuentes">Fuentes</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="noticias">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Noticias Monitoreadas</h2>
                  {keywords.length > 0 && (
                    <p className="text-gray-500 text-sm mt-1">
                      Filtrando por: {keywords.join(', ')}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Última actualización: {formatLastSearchTime()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    className="flex gap-2"
                    onClick={fetchNews}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex gap-2"
                    onClick={togglePythonOutput}
                  >
                    <Terminal className="h-4 w-4" />
                    {showOutput ? "Ocultar salida" : "Ver salida"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex gap-2"
                    onClick={downloadResults}
                    disabled={loading || safeNews.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Descargar CSV
                  </Button>
                </div>
              </div>
              
              {/* Progress bar that shows during search */}
              {loading && searchProgress > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-1">
                    {pythonStatus?.running 
                      ? "Ejecutando script de Python para buscar noticias..." 
                      : "Buscando noticias en todos los portales configurados..."}
                  </p>
                  {getPythonScriptInfo() && (
                    <p className="text-xs text-gray-500 mb-1">{getPythonScriptInfo()}</p>
                  )}
                  <Progress value={searchProgress} className="h-2" />
                </div>
              )}
              
              {/* Python script output console */}
              {(showOutput || loading) && pythonOutput.length > 0 && (
                <div className="mt-4 p-4 bg-black text-green-400 font-mono text-sm rounded-lg h-64 overflow-y-auto">
                  {pythonOutput.map((line, index) => (
                    <div key={index} className="py-1">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {loading && searchProgress < 100 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-[220px] bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : safeNews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {safeNews.map((item) => (
                  <NewsCard key={item.id} news={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No hay noticias disponibles{keywords.length > 0 ? ` con las palabras clave: ${keywords.join(', ')}` : ''}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={fetchNews}
                >
                  Actualizar noticias
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="palabras">
          <KeywordsConfig />
        </TabsContent>

        <TabsContent value="fuentes">
          <SourcesConfig />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppConfig />
        </TabsContent>
        
        <TabsContent value="email">
          <EmailConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
