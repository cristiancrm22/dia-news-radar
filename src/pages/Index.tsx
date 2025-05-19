
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import NewsCard from "@/components/NewsCard";
import SourcesConfig from "@/components/SourcesConfig";
import TopicsConfig from "@/components/TopicsConfig";
import WhatsAppConfig from "@/components/WhatsAppConfig";
import NewsService from "@/services/NewsService";
import { NewsItem } from "@/types/news";

const Index = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("noticias");

  useEffect(() => {
    // Fetch news on component mount
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const fetchedNews = await NewsService.getNews();
      setNews(Array.isArray(fetchedNews) ? fetchedNews : []);
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
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSearchResults();
  };

  const fetchSearchResults = async () => {
    if (!searchQuery.trim()) {
      fetchNews();
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Buscando noticias con términos: "${searchQuery}"`);
      const filteredNews = await NewsService.searchNews(searchQuery);
      
      // Asegurarnos de que siempre tenemos un array
      setNews(Array.isArray(filteredNews) ? filteredNews : []);
      
      if (filteredNews.length === 0) {
        toast({
          title: "Sin resultados",
          description: `No se encontraron noticias con el término "${searchQuery}"`,
        });
      } else {
        toast({
          title: "Búsqueda completada",
          description: `Se encontraron ${filteredNews.length} noticias con el término "${searchQuery}"`,
        });
      }
    } catch (error) {
      console.error("Error searching news:", error);
      setNews([]);
      toast({
        title: "Error",
        description: "Error al buscar noticias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Aseguramos que news siempre es un array para evitar errores
  const filteredNews = Array.isArray(news) ? news : [];

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
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="noticias">Noticias</TabsTrigger>
          <TabsTrigger value="fuentes">Fuentes</TabsTrigger>
          <TabsTrigger value="temas">Temas</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="noticias">
          <div className="flex flex-col md:flex-row items-start md:items-center mb-6 gap-4">
            <form onSubmit={handleSearch} className="flex w-full max-w-lg gap-2">
              <Input
                type="text"
                placeholder="Buscar noticias (nombres, apellidos, palabras)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit" variant="default">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </form>
            <Button 
              variant="outline" 
              className="flex gap-2"
              onClick={fetchNews}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[220px] bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : filteredNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNews.map((item) => (
                <NewsCard key={item.id} news={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron noticias para la búsqueda</p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={fetchNews}
                >
                  Ver todas las noticias
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fuentes">
          <SourcesConfig />
        </TabsContent>

        <TabsContent value="temas">
          <TopicsConfig />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
