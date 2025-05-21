
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import NewsService from "@/services/NewsService";

const KeywordsConfig = () => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    // Load keywords and search history from settings
    const settings = NewsService.getSearchSettings();
    setKeywords(settings.keywords || []);
    setSearchHistory(settings.searchHistory || []);
  }, []);

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...keywords, newKeyword.trim()];
      setKeywords(updatedKeywords);
      setNewKeyword("");
      
      // Update search settings
      const currentSettings = NewsService.getSearchSettings();
      NewsService.updateSearchSettings({
        ...currentSettings,
        keywords: updatedKeywords
      });
      
      toast({
        title: "Palabra clave agregada",
        description: `Se agregó "${newKeyword.trim()}" a las palabras clave de monitoreo.`,
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
    
    toast({
      title: "Palabra clave eliminada",
      description: `Se eliminó "${keyword}" de las palabras clave de monitoreo.`,
    });
  };
  
  const useHistoryTerm = (term: string) => {
    if (!keywords.includes(term)) {
      const updatedKeywords = [...keywords, term];
      setKeywords(updatedKeywords);
      
      // Update search settings
      const currentSettings = NewsService.getSearchSettings();
      NewsService.updateSearchSettings({
        ...currentSettings,
        keywords: updatedKeywords
      });
      
      toast({
        title: "Palabra clave agregada",
        description: `Se agregó "${term}" del historial a las palabras clave de monitoreo.`,
      });
    } else {
      toast({
        title: "Palabra clave duplicada",
        description: `"${term}" ya está en la lista de palabras clave de monitoreo.`,
      });
    }
  };

  const clearHistory = () => {
    // Update search settings
    const currentSettings = NewsService.getSearchSettings();
    NewsService.updateSearchSettings({
      ...currentSettings,
      searchHistory: []
    });
    
    setSearchHistory([]);
    
    toast({
      title: "Historial limpiado",
      description: "Se ha borrado el historial de búsquedas.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Palabras Clave para Monitoreo</h2>
        <p className="text-gray-600">
          Configura las palabras clave que el Radar de Noticias monitoreará automáticamente
        </p>
        
        <div className="border rounded-lg p-6 bg-card">
          <div className="space-y-4">
            <Label htmlFor="keywords">Palabras clave actuales</Label>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1 py-2">
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
            ) : (
              <p className="text-gray-500 mb-4">No hay palabras clave configuradas.</p>
            )}
            
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
              <Button onClick={addKeyword} variant="default">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {searchHistory.length > 0 && (
        <div className="border rounded-lg p-6 bg-card">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Historial de búsquedas</Label>
              <Button variant="outline" size="sm" onClick={clearHistory}>
                Limpiar historial
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((term, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-secondary flex items-center"
                >
                  <span className="mr-1">{term}</span>
                  <button 
                    className="hover:bg-gray-200 rounded-full p-1"
                    onClick={() => useHistoryTerm(term)}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeywordsConfig;
