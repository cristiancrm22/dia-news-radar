
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Clock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import NewsCard from "@/components/NewsCard";
import SourcesConfig from "@/components/SourcesConfig";
import WhatsAppConfig from "@/components/WhatsAppConfig";
import EmailConfig from "@/components/EmailConfig";
import KeywordsConfig from "@/components/KeywordsConfig";
import NewsService from "@/services/NewsService";
import { NewsItem, NewsSource } from "@/types/news";
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

  const fetchNews = async () => {
    setLoading(true);
    setSearchProgress(0);
    
    // Set up progress tracking
    const progressInterval = setInterval(() => {
      setSearchProgress(prev => {
        // Simulate progress up to 90% (the final 10% will be set when complete)
        if (prev < 90) {
          return prev + 5;
        }
        return prev;
      });
    }, 500);
    
    try {
      // Update search settings with the current keywords
      const currentSettings = NewsService.getSearchSettings();
      // Re-fetch latest keywords in case they were updated in the keywords tab
      const latestSettings = NewsService.getSearchSettings();
      setKeywords(latestSettings.keywords || []);
      
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
      
      toast({
        title: "Noticias actualizadas",
        description: `Se cargaron ${fetchedNews.length} noticias`,
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      setNews([]);
      toast({
        title: "Error",
        description: "No se pudieron cargar las noticias",
        variant: "destructive",
      });
    } finally {
      clearInterval(progressInterval);
      // Ensure progress bar is complete
      setSearchProgress(100);
      
      // Reset progress after a delay
      setTimeout(() => {
        setSearchProgress(0);
        setLoading(false);
      }, 500);
    }
  };

  // Aseguramos que news siempre es un array para evitar errores
  const safeNews = Array.isArray(news) ? news : [];

  // Format the last search time
  const formatLastSearchTime = () => {
    if (!lastSearchTime) return "Nunca";
    return format(lastSearchTime, "dd/MM/yyyy HH:mm:ss", { locale: es });
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
                <Button 
                  variant="default" 
                  className="flex gap-2"
                  onClick={fetchNews}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
              
              {/* Progress bar that shows during search */}
              {loading && searchProgress > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-1">Buscando noticias en todos los portales...</p>
                  <Progress value={searchProgress} className="h-2" />
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
