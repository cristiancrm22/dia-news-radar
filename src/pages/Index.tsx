import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw, Mail, Filter, X, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import NewsCard from "@/components/NewsCard";
import SourcesConfig from "@/components/SourcesConfig";
import TopicsConfig from "@/components/TopicsConfig";
import WhatsAppConfig from "@/components/WhatsAppConfig";
import EmailConfig from "@/components/EmailConfig";
import NewsService from "@/services/NewsService";
import { NewsItem, NewsSource } from "@/types/news";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("noticias");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [availableSources, setAvailableSources] = useState<NewsSource[]>([]);
  const [includeTwitter, setIncludeTwitter] = useState(true);
  const [todayOnly, setTodayOnly] = useState(true);
  const [validateLinks, setValidateLinks] = useState(true);

  useEffect(() => {
    // Fetch news on component mount
    fetchNews();
    
    // Load available sources
    setAvailableSources(NewsService.getSources().filter(source => source.enabled));
    
    // Load search settings
    const settings = NewsService.getSearchSettings();
    setKeywords(settings.keywords || []);
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    setIsSearchActive(false);
    setSearchQuery("");
    setSelectedSource("");
    
    try {
      // Update search settings
      const currentSettings = NewsService.getSearchSettings();
      NewsService.updateSearchSettings({
        ...currentSettings,
        includeTwitter: includeTwitter,
        keywords: keywords
      });
      
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
    if (!searchQuery.trim() && keywords.length === 0 && !selectedSource) {
      fetchNews();
      return;
    }
    
    setLoading(true);
    setIsSearchActive(true);
    
    try {
      console.log(`Buscando noticias con términos: "${searchQuery}" y palabras clave: ${keywords.join(', ')} y fuente: "${selectedSource}"`);
      
      // Update search settings for twitter inclusion and save keywords
      const currentSettings = NewsService.getSearchSettings();
      NewsService.updateSearchSettings({
        ...currentSettings,
        includeTwitter: includeTwitter,
        keywords: keywords
      });
      
      const filteredNews = await NewsService.searchNews(searchQuery, selectedSource, keywords);
      
      // Asegurarnos de que siempre tenemos un array
      setNews(Array.isArray(filteredNews) ? filteredNews : []);
      
      if (filteredNews.length === 0) {
        let message = `No se encontraron noticias`;
        if (searchQuery) message += ` con el término "${searchQuery}"`;
        if (keywords.length > 0) message += ` con las palabras clave "${keywords.join(', ')}"`;
        if (selectedSource) message += ` en la fuente "${selectedSource}"`;
        
        toast({
          title: "Sin resultados",
          description: message,
        });
      } else {
        let message = `Se encontraron ${filteredNews.length} noticias`;
        if (searchQuery) message += ` con el término "${searchQuery}"`;
        if (keywords.length > 0) message += ` con las palabras clave "${keywords.join(', ')}"`;
        if (selectedSource) message += ` en la fuente "${selectedSource}"`;
        
        toast({
          title: "Búsqueda completada",
          description: message,
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

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
      
      // Update search settings
      const currentSettings = NewsService.getSearchSettings();
      NewsService.updateSearchSettings({
        ...currentSettings,
        keywords: [...keywords, newKeyword.trim()]
      });
    }
  };

  const removeKeyword = (keyword: string) => {
    const updatedKeywords = keywords.filter(k => k !== keyword);
    setKeywords(updatedKeywords);
    
    // Update search settings
    const currentSettings = NewsService.getSearchSettings();
    NewsService.updateSearchSettings({
      ...currentSettings,
      keywords: updatedKeywords
    });
  };

  // Aseguramos que news siempre es un array para evitar errores
  const safeNews = Array.isArray(news) ? news : [];

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
          <TabsTrigger value="fuentes">Fuentes</TabsTrigger>
          <TabsTrigger value="temas">Temas</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="noticias">
          <div className="flex flex-col space-y-6">
            <form onSubmit={handleSearch} className="flex flex-col space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="relative flex-grow">
                  <Input
                    type="text"
                    placeholder="Buscar noticias (nombres, apellidos, palabras)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Opciones de búsqueda</h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="source-filter">Filtrar por fuente</Label>
                        <select
                          id="source-filter"
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={selectedSource}
                          onChange={(e) => setSelectedSource(e.target.value)}
                        >
                          <option value="">Todas las fuentes</option>
                          {availableSources.map((source) => (
                            <option key={source.id} value={source.name}>
                              {source.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="twitter-option" 
                          checked={includeTwitter} 
                          onCheckedChange={(checked) => {
                            setIncludeTwitter(checked === true);
                          }}
                        />
                        <Label htmlFor="twitter-option">Incluir resultados de Twitter</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="today-option" 
                          checked={todayOnly} 
                          onCheckedChange={(checked) => {
                            setTodayOnly(checked === true);
                          }}
                        />
                        <Label htmlFor="today-option">Solo noticias de hoy</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="validate-links" 
                          checked={validateLinks} 
                          onCheckedChange={(checked) => {
                            setValidateLinks(checked === true);
                          }}
                        />
                        <Label htmlFor="validate-links">Validar enlaces</Label>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button type="submit" variant="default">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
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

              <div className="flex flex-col space-y-2">
                <Label htmlFor="keywords">Palabras clave para monitoreo</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                      {keyword}
                      <button 
                        type="button" 
                        onClick={() => removeKeyword(keyword)}
                        className="text-xs hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="keywords"
                    placeholder="Agregar palabra clave..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    className="flex-grow"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                  />
                  <Button type="button" onClick={addKeyword} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>
            </form>

            {loading ? (
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
                  {isSearchActive 
                    ? `No se encontraron noticias${searchQuery ? ` para "${searchQuery}"` : ''}${keywords.length > 0 ? ` con las palabras clave "${keywords.join(', ')}"` : ''}${selectedSource ? ` en ${selectedSource}` : ''}`
                    : "No hay noticias disponibles"}
                </p>
                {isSearchActive && (
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
          </div>
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
        
        <TabsContent value="email">
          <EmailConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
