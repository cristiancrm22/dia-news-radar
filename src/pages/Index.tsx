import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Clock, Download, Terminal, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, signOut } = useAuth();
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
  const [showOutput, setShowOutput] = useState(true);
  const [consoleAutoScroll, setConsoleAutoScroll] = useState(true);
  const [consoleRef, setConsoleRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    // Initialize NewsService with user ID when user changes
    if (user?.id) {
      NewsService.setUserId(user.id);
    } else {
      NewsService.setUserId(null);
    }
  }, [user]);

  useEffect(() => {
    // Load search settings
    const loadSettings = async () => {
      try {
        const settings = await NewsService.getSearchSettings();
        setKeywords(settings.keywords || []);
        setIncludeTwitter(settings.includeTwitter);
        setTodayOnly(settings.currentDateOnly || true);
        setValidateLinks(settings.validateLinks || true);
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    
    loadSettings();
  }, [user]);

  useEffect(() => {
    if (selectedTab === "noticias") {
      const loadKeywords = async () => {
        try {
          const settings = await NewsService.getSearchSettings();
          setKeywords(settings.keywords || []);
        } catch (error) {
          console.error("Error loading keywords:", error);
        }
      };
      loadKeywords();
    }
  }, [selectedTab]);

  useEffect(() => {
    if (consoleAutoScroll && consoleRef) {
      consoleRef.scrollTop = consoleRef.scrollHeight;
    }
  }, [pythonOutput, consoleAutoScroll, consoleRef]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      const status = NewsService.getPythonScriptStatus();
      setPythonStatus(status);
      setSearchProgress(status.progress);
      if (status.output && status.output.length > 0) {
        setPythonOutput(status.output);
      }
      if (status.completed || status.error) {
        clearInterval(interval);
        if (status.completed && !status.error && status.csvPath) {
          loadResultsFromCsv(status.csvPath);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  const loadResultsFromCsv = async (csvPath: string) => {
    try {
      const results = await NewsService.loadResultsFromCsv(csvPath);
      setNews(results);
      setLastSearchTime(new Date());
      toast.success("Resultados cargados", {
        description: `Se cargaron ${results.length} noticias desde el archivo CSV`,
      });
    } catch (error) {
      console.error("Error loading results from CSV:", error);
      toast.error("Error al cargar resultados", {
        description: `No se pudieron cargar los resultados: ${error.message}`
      });
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async () => {
    setLoading(true);
    setSearchProgress(0);
    setPythonStatus(null);
    setPythonOutput([]);
    try {
      // Get current settings and update them with UI state
      const currentSettings = await NewsService.getSearchSettings();
      const latestSettings = await NewsService.getSearchSettings();
      setKeywords(latestSettings.keywords || []);
      
      setPythonOutput([
        "🚀 Iniciando radar de noticias REAL...",
        `🔍 Palabras clave: ${latestSettings.keywords.join(', ')}`,
        "🌐 Buscando en fuentes configuradas..."
      ]);
      
      // Update search settings with current UI state and keywords from KeywordsConfig
      await NewsService.updateSearchSettings({
        ...currentSettings,
        includeTwitter: includeTwitter,
        keywords: latestSettings.keywords || [], // Use keywords from KeywordsConfig
        currentDateOnly: todayOnly,
        validateLinks: validateLinks,
        deepScrape: true
      });
      
      toast.info("Conectando al servidor Python...", {
        description: "Servidor Python detectado en http://localhost:8000"
      });
      
      const fetchedNews = await NewsService.getNews();
      setNews(Array.isArray(fetchedNews) ? fetchedNews : []);
      setLastSearchTime(new Date());
      setSearchProgress(100);
      toast.success("Noticias actualizadas", {
        description: `Se cargaron ${fetchedNews.length} noticias REALES`,
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      setNews([]);
      setPythonOutput(prev => [
        ...prev,
        "❌ Error en la búsqueda de noticias",
        `❌ ${error.message}`
      ]);
      toast.error("Error de conexión", {
        description: `No se pudieron cargar las noticias: ${error.message}`
      });
    } finally {
      const status = NewsService.getPythonScriptStatus();
      if (!status.running) {
        setLoading(false);
      }
    }
  };

  const downloadResults = () => {
    if (news && news.length > 0) {
      NewsService.downloadNewsAsCSV(news);
      toast.success("Descarga iniciada", {
        description: "Se está descargando el archivo resultados.csv"
      });
    } else {
      toast.error("Sin resultados", {
        description: "No hay noticias para descargar"
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Sesión cerrada exitosamente");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  const safeNews = Array.isArray(news) ? news : [];

  const formatLastSearchTime = () => {
    if (!lastSearchTime) return "Nunca";
    return format(lastSearchTime, "dd/MM/yyyy HH:mm:ss", { locale: es });
  };

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

  const togglePythonOutput = () => {
    setShowOutput(!showOutput);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gradient bg-gradient-to-r from-blue-600 to-blue-900 bg-clip-text text-transparent">
              Radar de Noticias
            </h1>
            <p className="text-gray-600 mt-2">
              Monitoreo de noticias en tiempo real de las fuentes más importantes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
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
              {showOutput && pythonOutput.length > 0 && (
                <div className="mt-4">
                  <div 
                    ref={setConsoleRef}
                    className="p-4 bg-black text-green-400 font-mono text-sm rounded-lg h-64 overflow-y-auto"
                  >
                    {pythonOutput.map((line, index) => (
                      <div key={index} className="py-1">
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <label className="flex items-center text-sm text-gray-500">
                      <input 
                        type="checkbox" 
                        checked={consoleAutoScroll} 
                        onChange={() => setConsoleAutoScroll(!consoleAutoScroll)}
                        className="mr-2"
                      />
                      Auto-scroll
                    </label>
                  </div>
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
                {safeNews.map((item, idx) => (
                  <NewsCard 
                    key={item.sourceUrl || idx} 
                    news={item}
                  />
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
